package chat.vera.messagelist

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.DisplayMetrics
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewTreeObserver
import android.view.animation.DecelerateInterpolator
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.LinearSmoothScroller
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.util.ArrayDeque
import java.util.concurrent.Executors
import kotlin.math.abs

/**
 * The native message list (see src/features/native-list/contract.ts): a
 * RecyclerView laid out from the bottom, newest row at position 0.
 *
 * JavaScript sends rows; they're read and diffed off the main thread, then
 * applied in one pass, so a page of older messages costs data, not a burst
 * of view creation. Rows added above the reader (older pages) don't move
 * anything on screen; a message arriving at the bottom animates in; and
 * scrolled away from the bottom, nothing visible moves.
 */
@SuppressLint("ViewConstructor")
class MessageListView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onEvent by EventDispatcher()

  private val units = Units(context)
  private val images = Images(Glide.with(context.applicationContext))
  private val mediaPool = RecyclerView.RecycledViewPool().apply { setMaxRecycledViews(CarouselAdapter.VIEW_TYPE, 24) }
  private val env = CellEnv(units, images, mediaPool)
  private val rows = RowsAdapter(env)
  private val manager = ListLayoutManager(context)
  private val animator = ListItemAnimator(units)
  private val recycler = RecyclerView(context)

  private val main = Handler(Looper.getMainLooper())
  private val work = Executors.newSingleThreadExecutor { runnable -> Thread(runnable, "MessageList").apply { priority = Thread.NORM_PRIORITY - 1 } }

  /** The last rows sent to be read, as the worker thread sees them. */
  @Volatile private var workerRows: List<Row> = emptyList()
  private var pendingRows: ReadableArray? = null
  private var rowsChanged = false

  private var behavior = Behavior.DEFAULT
  private var insetTop = 0f
  private var insetBottom = 0f
  private var followKeyboard = false
  private var keyboard = 0

  /** How much of `insets.bottom` the keyboard covers, from JavaScript; null for the navigation bar. */
  private var keyboardOverlap: Int? = null

  /** Holding the keyboard height while a modal over the list takes the keyboard (`keyboardFrozen`). */
  private var keyboardFrozen = false
  private var keyboardEase: ValueAnimator? = null
  private var imeAnimating = false
  private var initialRowId: String? = null

  private var shown = false
  private var placeWhenSized = false
  private var readySent = false
  private var hasBubbles = false

  // What was last reported, so each event is sent once per change.
  private var olderAt = -1
  private var newerAt = -1
  private var nearLatest: Boolean? = null
  private var visibleFirst = -1
  private var visibleLast = -1
  private var visibleSentAt = 0L
  private var visiblePending = false

  /** When recent arrivals came, for the firehose rule. */
  private val arrivalTimes = ArrayDeque<Long>()
  private var firehose = false

  override val shouldUseAndroidLayout = true

  init {
    tracing = (context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
    if (tracing) {
      val paint = android.text.TextPaint().apply { textSize = units.sp(17f) }
      val fm = paint.fontMetricsInt
      android.util.Log.i("MessageList", "17sp: font padding ${units.dp((fm.bottom - fm.top).toFloat())} dp, without ${units.dp((fm.descent - fm.ascent).toFloat())} dp, spacing ${units.dp(paint.fontSpacing)} dp")
    }
    clipChildren = false
    clipToPadding = false
    recycler.layoutManager = manager
    recycler.adapter = rows
    recycler.itemAnimator = animator
    recycler.setHasFixedSize(true)
    recycler.clipToPadding = false
    recycler.clipChildren = false
    recycler.overScrollMode = View.OVER_SCROLL_NEVER
    recycler.isVerticalScrollBarEnabled = false
    recycler.setItemViewCacheSize(4)
    recycler.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    manager.initialPrefetchItemCount = 4
    animator.restingAlpha = { holder -> if ((holder as? RowHolder)?.row?.id == rows.liftedRowId && rows.liftedRowId != null) 0f else 1f }
    addView(recycler, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

    rows.onAccessibilityTarget = { target -> send(target.event()) }
    rows.onAccessibilityHold = { holder -> hold(holder, null) }
    env.onDeckChanged = { cell -> cell.deckChanged() }

    recycler.addOnScrollListener(object : RecyclerView.OnScrollListener() {
      override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
        scrolledPx += abs(dy)
        timed({ "onScrolled" }) {
          report(dy)
          preload()
        }
      }
    })
    watchKeyboard()
  }

  // MARK: Props

  fun setRows(array: ReadableArray?) {
    pendingRows = array
    rowsChanged = true
  }

  fun setTheme(map: ReadableMap?) {
    val theme = decodeTheme(map)
    if (theme == env.theme) return
    env.theme = theme
    if (rows.itemCount > 0) {
      animator.animate = false
      rows.notifyItemRangeChanged(0, rows.itemCount)
      layoutNow()
      animator.animate = true
    }
  }

  fun setBehavior(map: ReadableMap?) {
    behavior = decodeBehavior(map)
    animator.moveMs = behavior.moveMs
    animator.fadeMs = behavior.fadeMs
  }

  fun setInsets(map: ReadableMap?) {
    insetTop = map?.num("top")?.toFloat() ?: 0f
    insetBottom = map?.num("bottom")?.toFloat() ?: 0f
    keyboardOverlap = map?.num("keyboardOverlap")?.let { units.px(it.toFloat()) }
    applyPadding()
  }

  fun setKeyboardFrozen(frozen: Boolean) {
    if (frozen == keyboardFrozen) return
    keyboardFrozen = frozen
    if (frozen) {
      keyboardEase?.cancel()
      return
    }
    // Following again: ease to where the keyboard is now, if it moved meanwhile.
    val target = keyboardLift(ViewCompat.getRootWindowInsets(this))
    if (target == keyboard) return
    keyboardEase = ValueAnimator.ofInt(keyboard, target).apply {
      duration = KEYBOARD_EASE_MS
      interpolator = EASE
      addUpdateListener { setKeyboardLift(it.animatedValue as Int) }
      start()
    }
  }

  fun setAlignTop(alignTop: Boolean) {
    if (alignTop == manager.alignTop) return
    manager.alignTop = alignTop
    layoutNow()
  }

  fun setKeyboard(enabled: Boolean) {
    followKeyboard = enabled
    if (!enabled) keyboard = 0 else keyboard = keyboardLift(ViewCompat.getRootWindowInsets(this))
    applyPadding()
  }

  fun setLiftedRowId(id: String?) {
    if (id == rows.liftedRowId) return
    rows.liftedRowId = id
    for (index in 0 until recycler.childCount) {
      val holder = recycler.getChildViewHolder(recycler.getChildAt(index)) as? RowHolder ?: continue
      val lifted = id != null && holder.row?.id == id
      val view = holder.itemView
      view.animate().cancel()
      if (lifted) view.alpha = 0f
      // Back in place once the menu has closed over it.
      else if (view.alpha < 1f) view.animate().alpha(1f).setDuration(120).start()
    }
  }

  fun setInitialRowId(id: String?) {
    if (!shown) initialRowId = id
  }

  /** Applies the props that changed together, once they're all in. */
  fun commit() {
    if (!rowsChanged) return
    rowsChanged = false
    val array = pendingRows
    work.execute {
      val next = decodeRows(array)
      val before = workerRows
      workerRows = next
      val diff = if (before.isEmpty()) null else DiffUtil.calculateDiff(RowsDiff(before, next), false)
      main.post { timed({ "apply ${next.size} rows" }) { apply(next, diff) } }
    }
  }

  // MARK: Applying rows

  private fun apply(next: List<Row>, diff: DiffUtil.DiffResult?) {
    val before = rows.rows
    hasBubbles = next.any { it is MessageRow && !it.stacked }
    if (!shown || before.isEmpty()) {
      animator.animate = false
      rows.apply(next, null)
      animator.animate = true
      if (next.isNotEmpty()) {
        if (width == 0 || height == 0) placeWhenSized = true else placeInitially(next)
      }
      return
    }
    val wasAtBottom = distanceFromLatest()?.let { it <= units.pxf(behavior.nearLatestPoints) } == true
    val beforeIds = HashSet<String>(before.size * 2)
    before.forEach { beforeIds.add(it.id) }
    // Rows kept from before: new ones under the first are at the bottom
    // (arrivals, who's typing); new ones past the last are an older page.
    val firstKept = next.indexOfFirst { it.id in beforeIds }.let { if (it < 0) next.size else it }
    val lastKept = next.indexOfLast { it.id in beforeIds }
    var insertedCount = 0
    val shownIn = HashSet<String>()
    val arrivals = HashSet<String>()
    val rising = HashSet<String>()
    for ((index, row) in next.withIndex()) {
      if (row.id in beforeIds) continue
      insertedCount++
      if (index > lastKept) continue
      if (index < firstKept) {
        if (!wasAtBottom) continue
        if (row is MessageRow && row.arrived) arrivals.add(row.id)
        if (row !is TypingRow) rising.add(row.id)
      }
      shownIn.add(row.id)
    }
    val changed = insertedCount + (before.size - (next.size - insertedCount))
    countArrivals(next.take(firstKept).count { it is MessageRow && it.arrived && it.id !in beforeIds })
    // A firehose or a big change: everything takes its place at once.
    animator.animate = !firehose && changed <= BIG_CHANGE
    animator.inserted = shownIn
    animator.rising = rising
    animator.handoff = handoff(before, next, arrivals)
    rows.apply(next, diff)
    val newestInserted = firstKept > 0
    if (wasAtBottom && newestInserted) manager.scrollToPositionWithOffset(0, 0)
    layoutNow()
    animator.inserted = emptySet()
    animator.rising = emptySet()
    animator.handoff = null
    animator.animate = true
    recycler.post { report(0) }
  }

  /**
   * A message from someone who was typing, arriving as their indicator
   * goes (bubbles): it grows out of the typing bubble instead of rising in.
   */
  private fun handoff(before: List<Row>, next: List<Row>, arrivals: Set<String>): String? {
    val typing = before.firstOrNull() as? TypingRow ?: return null
    if (typing.stacked || next.any { it.id == typing.id }) return null
    val message = next.firstOrNull() as? MessageRow ?: return null
    if (message.id !in arrivals || message.isOwn || message.stacked) return null
    if (typing.people.none { it.id == message.author.id }) return null
    if (message.blocks.lastOrNull() !is TextBlock) return null
    return message.id
  }

  /** Counts arrivals in the firehose window: past `firehoseFrom`, they show at once until it's down to `firehoseUntil`. */
  private fun countArrivals(count: Int) {
    val now = SystemClock.uptimeMillis()
    repeat(count) { arrivalTimes.addLast(now) }
    while (arrivalTimes.isNotEmpty() && now - arrivalTimes.first() > behavior.firehoseWindowMs) arrivalTimes.removeFirst()
    val recent = arrivalTimes.size
    if (!firehose && recent >= behavior.firehoseFrom) firehose = true
    else if (firehose && recent <= behavior.firehoseUntil) firehose = false
  }

  /** Opens on `initialRowId`, centered, or on the newest row. */
  private fun placeInitially(next: List<Row>) {
    val target = initialRowId?.let { id -> next.indexOfFirst { it.id == id } } ?: -1
    if (target > 0) {
      manager.scrollToPositionWithOffset(target, visibleHeight() / 2)
    } else {
      manager.scrollToPositionWithOffset(0, 0)
    }
    layoutNow()
    if (target > 0) centerOn(target)
    shown = true
    recycler.viewTreeObserver.addOnPreDrawListener(object : ViewTreeObserver.OnPreDrawListener {
      override fun onPreDraw(): Boolean {
        recycler.viewTreeObserver.removeOnPreDrawListener(this)
        if (!readySent) {
          readySent = true
          // On the frame after it's drawn placed.
          recycler.postOnAnimation { send(mapOf("type" to "ready")) }
        }
        report(0)
        preload()
        return true
      }
    })
  }

  /** Moves a laid-out row to the middle of what's visible. */
  private fun centerOn(position: Int) {
    val view = manager.findViewByPosition(position) ?: return
    val middle = recycler.paddingTop + visibleHeight() / 2
    val center = (view.top + view.bottom) / 2
    val delta = center - middle
    if (abs(delta) > 1) {
      recycler.scrollBy(0, delta)
    }
  }

  private fun visibleHeight() = recycler.height - recycler.paddingTop - recycler.paddingBottom

  /**
   * Measures and lays out the list now, rather than on a later frame (React
   * Native doesn't lay out native children itself), so a change and its
   * animation start in the same frame.
   */
  private fun layoutNow() {
    if (width == 0 || height == 0) return
    recycler.measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
    recycler.layout(0, 0, width, height)
  }

  // MARK: Insets and the keyboard

  private fun applyPadding() {
    val top = units.px(insetTop)
    val bottom = units.px(insetBottom) + keyboard
    if (recycler.paddingTop == top && recycler.paddingBottom == bottom) return
    recycler.setPadding(0, top, 0, bottom)
    layoutNow()
  }

  /** How far the keyboard lifts the list: its height, less the inset JavaScript already leaves under the composer. */
  private fun keyboardLift(insets: WindowInsetsCompat?): Int {
    if (insets == null || !followKeyboard) return 0
    val ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
    val covered = keyboardOverlap ?: insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
    return maxOf(0, ime - covered)
  }

  /** The keyboard moved: followed unless it's frozen. */
  private fun followKeyboard(lift: Int) {
    if (keyboardFrozen) return
    keyboardEase?.cancel()
    setKeyboardLift(lift)
  }

  private fun setKeyboardLift(lift: Int) {
    if (lift == keyboard) return
    keyboard = lift
    applyPadding()
  }

  /** Follows the keyboard frame by frame as it opens, closes, or is dragged down. */
  private fun watchKeyboard() {
    ViewCompat.setWindowInsetsAnimationCallback(
      this,
      object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
        override fun onPrepare(animation: WindowInsetsAnimationCompat) {
          if (animation.typeMask and WindowInsetsCompat.Type.ime() != 0) imeAnimating = true
        }

        override fun onProgress(insets: WindowInsetsCompat, running: MutableList<WindowInsetsAnimationCompat>): WindowInsetsCompat {
          if (running.any { it.typeMask and WindowInsetsCompat.Type.ime() != 0 }) followKeyboard(keyboardLift(insets))
          return insets
        }

        override fun onEnd(animation: WindowInsetsAnimationCompat) {
          if (animation.typeMask and WindowInsetsCompat.Type.ime() == 0) return
          imeAnimating = false
          followKeyboard(keyboardLift(ViewCompat.getRootWindowInsets(this@MessageListView)))
        }
      },
    )
    ViewCompat.setOnApplyWindowInsetsListener(this) { _, insets ->
      if (!imeAnimating) followKeyboard(keyboardLift(insets))
      insets
    }
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    setKeyboardLift(keyboardLift(ViewCompat.getRootWindowInsets(this)))
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (w != oldw && oldw != 0 && rows.itemCount > 0) {
      // Widths come from the row's width: rebind for the new one.
      animator.animate = false
      rows.notifyItemRangeChanged(0, rows.itemCount)
      post { animator.animate = true }
    }
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    if (placeWhenSized && width > 0 && height > 0) {
      placeWhenSized = false
      post { placeInitially(rows.rows) }
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    revealAnimator?.cancel()
  }

  // MARK: Where the reader is

  /** How far the newest row's bottom is below the visible bottom, or null when it's off screen. */
  private fun distanceFromLatest(): Float? {
    if (rows.itemCount == 0) return 0f
    val view = manager.findViewByPosition(0) ?: return null
    return (view.bottom - (recycler.height - recycler.paddingBottom)).toFloat().coerceAtLeast(0f)
  }

  private fun report(dy: Int) {
    if (!shown || rows.itemCount == 0) return
    val first = manager.findFirstVisibleItemPosition()
    val last = manager.findLastVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION) return
    val near = distanceFromLatest()?.let { it <= units.pxf(behavior.nearLatestPoints) } == true
    if (near != nearLatest) {
      nearLatest = near
      send(mapOf("type" to "nearLatest", "near" to near))
    }
    if (first != visibleFirst || last != visibleLast) {
      val now = SystemClock.uptimeMillis()
      if (now - visibleSentAt >= VISIBLE_MS) sendVisible()
      else if (!visiblePending) {
        visiblePending = true
        main.postDelayed({
          visiblePending = false
          sendVisible()
        }, VISIBLE_MS - (now - visibleSentAt))
      }
    }
    // Asks for older rows well before the top, so a fling never reaches it.
    val count = rows.itemCount
    val average = averageRowHeight()
    val ahead = behavior.loadAheadScreens * maxOf(1, visibleHeight())
    if (olderAt != count && olderRowsWithin(rows.rows, last, units.dp(ahead), env.theme, units.fontScale)) {
      olderAt = count
      send(mapOf("type" to "reachedOlder"))
    }
    if (dy > 0 && first * average < ahead && newerAt != count) {
      newerAt = count
      send(mapOf("type" to "reachedNewer"))
    }
  }

  /** The rows on screen now, if they changed since last sent. */
  private fun sendVisible() {
    val first = manager.findFirstVisibleItemPosition()
    val last = manager.findLastVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION || (first == visibleFirst && last == visibleLast)) return
    visibleFirst = first
    visibleLast = last
    visibleSentAt = SystemClock.uptimeMillis()
    val ids = ArrayList<String>()
    for (position in first..last) rows.rows.getOrNull(position)?.let { ids.add(it.id) }
    send(mapOf("type" to "visible", "rowIds" to ids))
  }

  private fun averageRowHeight(): Float {
    val n = recycler.childCount
    if (n == 0) return units.pxf(60f)
    var total = 0
    for (index in 0 until n) total += recycler.getChildAt(index).height
    return maxOf(units.pxf(20f), total.toFloat() / n)
  }

  /** Starts loading the photos of the rows just past the screen, at the size they'll be drawn. */
  private fun preload() = timed({ "preload" }) { preloadNow() }

  private fun preloadNow() {
    val last = manager.findLastVisibleItemPosition()
    val first = manager.findFirstVisibleItemPosition()
    if (last == RecyclerView.NO_POSITION) return
    val range = (last + 1..minOf(rows.itemCount - 1, last + PRELOAD_AHEAD)) + (maxOf(0, first - 3) until first)
    // A few at a time: each request costs main-thread time, and a fling
    // brings new rows into range every frame.
    var started = 0
    for (position in range) {
      if (started >= PRELOADS_PER_FRAME) break
      val row = rows.rows.getOrNull(position) as? MessageRow ?: continue
      for (block in row.blocks) {
        when (block) {
          is MediaBlock -> for ((index, item) in block.items.withIndex()) {
            val key = "${item.shownUrl}#${row.stacked}"
            if (!preloaded.add(key)) continue
            started++
            if (block.items.size == 1) {
              val max = if (row.stacked) recycler.width else (recycler.width * env.theme.bubbleMaxWidthFraction).toInt()
              val w = minOf(units.px(240f), max)
              val h = if (item.width > 0 && item.height > 0) minOf(units.px(300f), w * item.height / item.width) else w
              images.preload(item.shownUrl, w, h)
            } else if (row.stacked) {
              images.preload(item.shownUrl, units.px(CarouselSizes.cardWidth(item)), units.px(CarouselSizes.CARD_HEIGHT))
            } else if (index < 2) {
              val w = units.px(DeckSizes.CARD_WIDTH)
              images.preload(item.shownUrl, w, units.px(block.items.maxOf { DeckSizes.cardHeight(it) }))
            }
          }
          else -> Unit
        }
      }
    }
    if (preloaded.size > 2000) preloaded.clear()
  }

  private val preloaded = HashSet<String>()

  // MARK: Events

  private fun send(event: Map<String, Any>) {
    onEvent(event)
  }

  private fun press(target: Target) = send(target.event())

  /** A hold (or double tap) on a row: its part's frame in window coordinates, for the menu. */
  private fun hold(holder: RowHolder, hit: Hit?) {
    val row = holder.row as? MessageRow ?: return
    val cell = holder.itemView as? MessageCell ?: return
    val target = hit?.hold ?: HoldTarget(row.id, row.blocks.firstOrNull { it is TextBlock }?.part ?: row.blocks.firstOrNull()?.part)
    val rect = cell.holdRect(hit?.holdView)
    val origin = IntArray(2)
    cell.getLocationInWindow(origin)
    val frame = mapOf(
      "x" to units.dp((origin[0] + rect.left).toFloat()).toDouble(),
      "y" to units.dp((origin[1] + rect.top).toFloat()).toDouble(),
      "width" to units.dp(rect.width().toFloat()).toDouble(),
      "height" to units.dp(rect.height().toFloat()).toDouble(),
    )
    val event = HashMap<String, Any>()
    event["type"] = "hold"
    event["rowId"] = target.rowId
    target.part?.let { event["part"] = it }
    target.index?.let { event["index"] = it }
    event["frame"] = frame
    cell.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    send(event)
  }

  // MARK: Benchmarks

  /** Pixels the list scrolled through, as its scroll listener reports them (for `benchFling`). */
  private var scrolledPx = 0L
  private var bench: android.view.Choreographer.FrameCallback? = null

  /**
   * For benchmarks: scrolls toward older rows at a constant `speed` (dp a
   * second) for `ms`, by `scrollBy` each frame on from wherever the list
   * is, with no fling physics, so the list's own older-page path runs as in
   * a real fling. At the oldest row it waits there, counting the time,
   * until older rows arrive. Resolves with how far it went (dp) and how
   * long it was stuck at the oldest row (`edgeMs`), as the React Native
   * list's benchmark (Reanimated's `scrollTo` in a frame callback) does.
   */
  fun benchFling(speed: Double, ms: Double, promise: expo.modules.kotlin.Promise) {
    bench?.let { android.view.Choreographer.getInstance().removeFrameCallback(it) }
    recycler.stopScroll()
    val pxPerMs = units.pxf(speed.toFloat()) / 1000.0
    var last = 0L
    var elapsed = 0.0
    var edge = 0.0
    var owed = 0.0
    val start = scrolledPx
    val callback = object : android.view.Choreographer.FrameCallback {
      override fun doFrame(frameTimeNanos: Long) {
        if (last != 0L) {
          val dt = (frameTimeNanos - last) / 1e6
          elapsed += dt
          owed += pxPerMs * dt
          val step = owed.toInt()
          if (step > 0) {
            val before = scrolledPx
            // Toward older rows: up, in the list laid out from the bottom.
            recycler.scrollBy(0, -step)
            val moved = abs(scrolledPx - before)
            owed -= step
            if (moved == 0L) {
              // At the oldest row: waiting there for an older page.
              edge += dt
              owed = 0.0
            }
          }
        }
        last = frameTimeNanos
        if (elapsed >= ms) {
          bench = null
          promise.resolve(mapOf("travelled" to units.dp((scrolledPx - start).toFloat()).toDouble(), "edgeMs" to edge))
          return
        }
        android.view.Choreographer.getInstance().postFrameCallback(this)
      }
    }
    bench = callback
    android.view.Choreographer.getInstance().postFrameCallback(callback)
  }

  // MARK: Scrolling from JavaScript

  fun scrollToLatest(animated: Boolean) {
    if (rows.itemCount == 0) return
    if (!animated) {
      recycler.stopScroll()
      manager.scrollToPositionWithOffset(0, 0)
      return
    }
    // From far away, jump close first so the scroll is short.
    if (manager.findFirstVisibleItemPosition() > JUMP_FROM) manager.scrollToPositionWithOffset(JUMP_FROM, 0)
    recycler.post {
      val scroller = object : LinearSmoothScroller(context) {
        override fun getVerticalSnapPreference() = SNAP_TO_END
        override fun calculateSpeedPerPixel(displayMetrics: DisplayMetrics) = 40f / displayMetrics.densityDpi
      }
      scroller.targetPosition = 0
      manager.startSmoothScroll(scroller)
    }
  }

  fun scrollToRow(id: String, animated: Boolean) {
    val position = rows.rows.indexOfFirst { it.id == id }
    if (position < 0) return
    if (!animated || abs(position - manager.findFirstVisibleItemPosition()) > JUMP_FROM) {
      recycler.stopScroll()
      manager.scrollToPositionWithOffset(position, visibleHeight() / 2)
      layoutNow()
      centerOn(position)
      return
    }
    val scroller = object : LinearSmoothScroller(context) {
      override fun calculateDtToFit(viewStart: Int, viewEnd: Int, boxStart: Int, boxEnd: Int, snapPreference: Int) =
        (boxStart + (boxEnd - boxStart) / 2) - (viewStart + (viewEnd - viewStart) / 2)
    }
    scroller.targetPosition = position
    manager.startSmoothScroll(scroller)
  }

  // MARK: Touch: taps, holds, and dragging times in

  private var revealAnimator: ValueAnimator? = null

  private fun setReveal(px: Float) {
    env.reveal = px
    for (index in 0 until recycler.childCount) (recycler.getChildAt(index) as? MessageCell)?.applyReveal()
  }

  private val touch = Touch()

  init {
    recycler.addOnItemTouchListener(touch)
  }

  /**
   * Taps, double taps, and holds, with the React Native list's timings (a
   * double tap within 200 ms, a hold at 320 ms), plus dragging the list
   * left to bring times in (bubbles). Links, mentions, chips and the like
   * fire on the first tap; a tap on a message or photo waits 200 ms to be
   * sure it isn't the first of a double tap, which holds it instead.
   */
  private inner class Touch : RecyclerView.OnItemTouchListener {
    private val slop = ViewConfiguration.get(context).scaledTouchSlop
    private var downX = 0f
    private var downY = 0f
    private var horizontalTaken = false
    private var revealing = false

    /** Still a tap: not moved past the slop, not held, not a fling being stopped. */
    private var tapping = false

    /** A tap's press, waiting to see if a second tap makes it a double tap. */
    private var pendingTap: Runnable? = null
    private var lastTapUp = 0L
    private var lastTapX = 0f
    private var lastTapY = 0f

    /** This touch is the second of a double tap. */
    private var second = false

    private val holdRunnable = Runnable {
      tapping = false
      val (holder, hit) = under(downX, downY) ?: return@Runnable
      hold(holder, hit)
    }

    private fun under(x: Float, y: Float): Pair<RowHolder, Hit>? {
      val child = recycler.findChildViewUnder(x, y) ?: return null
      val holder = recycler.getChildViewHolder(child) as? RowHolder ?: return null
      val hit = hitTest(child, x - child.left - child.translationX, y - child.top - child.translationY)
      return holder to hit
    }

    private fun cancelTap() {
      tapping = false
      main.removeCallbacks(holdRunnable)
    }

    override fun onInterceptTouchEvent(rv: RecyclerView, e: MotionEvent): Boolean {
      when (e.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = e.x
          downY = e.y
          revealing = false
          revealAnimator?.cancel()
          val stoppedScroll = rv.scrollState != RecyclerView.SCROLL_STATE_IDLE
          tapping = !stoppedScroll
          second = pendingTap != null &&
            e.eventTime - lastTapUp <= DOUBLE_TAP_MS &&
            abs(e.x - lastTapX) < slop * 2 && abs(e.y - lastTapY) < slop * 2
          if (second) {
            pendingTap?.let { main.removeCallbacks(it) }
            pendingTap = null
          }
          val hit = under(e.x, e.y)
          horizontalTaken = hit?.second?.horizontal == true
          if (tapping && !second && hit?.first?.row is MessageRow) main.postDelayed(holdRunnable, LONG_PRESS_MS)
        }
        MotionEvent.ACTION_MOVE -> {
          if (tapping && (abs(e.x - downX) > slop || abs(e.y - downY) > slop)) cancelTap()
          if (revealing || horizontalTaken || !hasBubbles || rv.scrollState == RecyclerView.SCROLL_STATE_DRAGGING) return revealing
          val dx = e.x - downX
          val dy = e.y - downY
          if (dx < -slop && abs(dx) > abs(dy) * 1.2f) {
            revealing = true
            downX = e.x
            cancelTap()
            rv.parent?.requestDisallowInterceptTouchEvent(true)
            return true
          }
        }
        MotionEvent.ACTION_UP -> {
          main.removeCallbacks(holdRunnable)
          if (tapping) tapped(e)
          tapping = false
        }
        MotionEvent.ACTION_CANCEL -> cancelTap()
      }
      return false
    }

    private fun tapped(e: MotionEvent) {
      val found = under(e.x, e.y) ?: return
      val (holder, hit) = found
      if (second) {
        second = false
        if (holder.row is MessageRow) hold(holder, hit)
        return
      }
      val target = hit.press ?: return
      if (target.immediate) {
        press(target)
        return
      }
      lastTapUp = e.eventTime
      lastTapX = e.x
      lastTapY = e.y
      val fire = Runnable {
        pendingTap = null
        press(target)
      }
      pendingTap = fire
      main.postDelayed(fire, DOUBLE_TAP_MS)
    }

    override fun onTouchEvent(rv: RecyclerView, e: MotionEvent) {
      if (!revealing) return
      when (e.actionMasked) {
        MotionEvent.ACTION_MOVE -> setReveal((downX - e.x).coerceIn(0f, units.pxf(MessageCell.REVEAL_WIDTH)))
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          revealing = false
          val from = env.reveal
          // Settles back with one small overshoot, not a long wobble.
          revealAnimator = ValueAnimator.ofFloat(from, 0f).apply {
            duration = 360
            interpolator = android.view.animation.OvershootInterpolator(0.8f)
            addUpdateListener { setReveal(it.animatedValue as Float) }
            start()
          }
        }
      }
    }

    override fun onRequestDisallowInterceptTouchEvent(disallowIntercept: Boolean) {
      if (disallowIntercept) cancelTap()
    }
  }

  companion object {
    /** More rows than this changing at once take their places without animating. */
    private const val BIG_CHANGE = 30
    private const val PRELOAD_AHEAD = 10
    private const val PRELOADS_PER_FRAME = 3
    private const val JUMP_FROM = 20

    /** The React Native list's: a double tap's second tap within this, and a hold. */
    private const val DOUBLE_TAP_MS = 200L
    private const val LONG_PRESS_MS = 320L

    /** `visible` at most this often. */
    private const val VISIBLE_MS = 100L

    /** About the keyboard's own duration, for easing to it after `keyboardFrozen`. */
    private const val KEYBOARD_EASE_MS = 250L
  }
}
