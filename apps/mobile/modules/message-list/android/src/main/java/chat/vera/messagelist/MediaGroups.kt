package chat.vera.messagelist

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.text.TextPaint
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.OrientationHelper
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.SnapHelper
import kotlin.math.abs

// Several photos and videos in one message. Stacked rows: an edge-to-edge
// carousel that snaps card by card, each card with its own reactions under
// it. Bubbles: a deck of cards swiped left and right, like Messages. The
// React Native design is on the branch `t3/stacked-media-carousel`
// (carousel-layout.ts, bubble-layout.ts, bubble-deck.tsx).

object CarouselSizes {
  const val CARD_HEIGHT = 200f
  const val MIN_CARD_WIDTH = 130f
  const val MAX_CARD_WIDTH = 250f
  const val CARD_GAP = 6f

  /** The row's padding on the right, which the carousel scrolls under. */
  const val BLEED = 16f

  fun cardWidth(item: MediaItem): Float {
    if (item.width <= 0 || item.height <= 0) return CARD_HEIGHT
    return (CARD_HEIGHT * item.width / item.height).coerceIn(MIN_CARD_WIDTH, MAX_CARD_WIDTH)
  }
}

object DeckSizes {
  const val CARD_WIDTH = 220f
  const val MIN_HEIGHT = 160f
  const val MAX_HEIGHT = 280f

  /** How far the card behind peeks out above the front one. */
  const val PEEK = 10f
  const val DOTS = 6f
  const val DOTS_GAP = 6f

  fun cardHeight(item: MediaItem): Float {
    if (item.width <= 0 || item.height <= 0) return CARD_WIDTH
    return (CARD_WIDTH * item.height / item.width).coerceIn(MIN_HEIGHT, MAX_HEIGHT)
  }
}

/** How tall a row of chips is in `width`, laid out as `ChipsView` lays them out. */
object ChipMetrics {
  private val emoji = TextPaint(Paint.ANTI_ALIAS_FLAG)
  private val count = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { typeface = Fonts.semibold }

  fun height(reactions: List<Reaction>, widthPx: Int, theme: Theme, units: Units): Int {
    if (reactions.isEmpty()) return 0
    emoji.textSize = units.sp(13f)
    count.textSize = units.sp(theme.footnote.size)
    val gap = units.px(4f)
    val chip = units.px(26f)
    var x = 0
    var lines = 1
    for (reaction in reactions) {
      val w = Math.ceil((units.pxf(16f) + emoji.measureText(reaction.shown) + units.pxf(4f) + count.measureText(reaction.count.toString())).toDouble()).toInt()
      if (x > 0 && x + w > widthPx) {
        lines++
        x = 0
      }
      x += w + gap
    }
    return units.px(4f) + lines * chip + (lines - 1) * gap
  }
}

/** Settles a fling on the next card's start, one card at a time. */
class StartSnapHelper : SnapHelper() {
  private var helper: OrientationHelper? = null

  private fun helper(manager: RecyclerView.LayoutManager): OrientationHelper {
    val current = helper
    if (current != null && current.layoutManager === manager) return current
    return OrientationHelper.createHorizontalHelper(manager).also { helper = it }
  }

  override fun calculateDistanceToFinalSnap(manager: RecyclerView.LayoutManager, target: View): IntArray {
    val h = helper(manager)
    return intArrayOf(h.getDecoratedStart(target) - h.startAfterPadding, 0)
  }

  override fun findSnapView(manager: RecyclerView.LayoutManager): View? {
    val h = helper(manager)
    val lm = manager as? LinearLayoutManager ?: return null
    // At the end, the last card is where it can go.
    if (lm.findLastCompletelyVisibleItemPosition() == manager.itemCount - 1 && manager.itemCount > 1) {
      val first = lm.findFirstVisibleItemPosition()
      val view = manager.findViewByPosition(first) ?: return null
      return if (abs(h.getDecoratedStart(view) - h.startAfterPadding) < h.getDecoratedMeasurement(view) / 2) view
      else manager.findViewByPosition(first + 1)
    }
    var best: View? = null
    var distance = Int.MAX_VALUE
    for (index in 0 until manager.childCount) {
      val child = manager.getChildAt(index) ?: continue
      val d = abs(h.getDecoratedStart(child) - h.startAfterPadding)
      if (d < distance) {
        distance = d
        best = child
      }
    }
    return best
  }

  override fun findTargetSnapPosition(manager: RecyclerView.LayoutManager, velocityX: Int, velocityY: Int): Int {
    val view = findSnapView(manager) ?: return RecyclerView.NO_POSITION
    val position = manager.getPosition(view)
    val h = helper(manager)
    val ahead = h.getDecoratedStart(view) - h.startAfterPadding < 0
    val next = when {
      velocityX > 0 -> if (ahead) position + 1 else position + 1
      velocityX < 0 -> if (ahead) position else position - 1
      else -> position
    }
    return next.coerceIn(0, manager.itemCount - 1)
  }
}

/** One card of a carousel: the photo, and its chips under it. */
class CarouselCard(context: Context, private val units: Units, private val images: Images) : ViewGroup(context) {
  val media = MediaView(context, units)
  private val chips = ChipsView(context, units)
  private var cardWidth = 0
  private var laneHeight = 0

  init {
    clipChildren = false
    addView(media)
    addView(chips)
  }

  fun bind(rowId: String, index: Int, item: MediaItem, theme: Theme, lane: Int, animate: Boolean) {
    cardWidth = units.px(CarouselSizes.cardWidth(item))
    laneHeight = lane
    media.setSize(cardWidth, units.px(CarouselSizes.CARD_HEIGHT))
    media.bind(item, theme, images)
    media.pressTarget = Target("media", rowId, part = item.part, index = index)
    media.holdTarget = HoldTarget(rowId, item.part, index)
    chips.bind(item.reactions, theme, rowId, item.part, animate)
    requestLayout()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    media.measure(0, 0)
    chips.measure(MeasureSpec.makeMeasureSpec(cardWidth, MeasureSpec.AT_MOST), MeasureSpec.UNSPECIFIED)
    setMeasuredDimension(cardWidth, media.measuredHeight + laneHeight)
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    media.layout(0, 0, media.measuredWidth, media.measuredHeight)
    chips.layout(0, media.measuredHeight, chips.measuredWidth, media.measuredHeight + chips.measuredHeight)
  }
}

/** A carousel's cards. */
class CarouselAdapter(private val units: Units, private val images: Images) :
  RecyclerView.Adapter<CarouselAdapter.Holder>() {
  class Holder(val card: CarouselCard) : RecyclerView.ViewHolder(card)

  var rowId = ""
  var items: List<MediaItem> = emptyList()
  var theme = Theme.DEFAULT
  var lane = 0

  init {
    setHasStableIds(true)
  }

  override fun getItemId(position: Int): Long = items[position].id.hashCode().toLong()

  override fun getItemViewType(position: Int): Int = VIEW_TYPE

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = Holder(CarouselCard(parent.context, units, images))

  override fun getItemCount() = items.size

  override fun onBindViewHolder(holder: Holder, position: Int) {
    holder.card.bind(rowId, position, items[position], theme, lane, animate = false)
  }

  override fun onBindViewHolder(holder: Holder, position: Int, payloads: MutableList<Any>) {
    holder.card.bind(rowId, position, items[position], theme, lane, animate = payloads.isNotEmpty())
  }

  companion object {
    /** Shared by every carousel's pool, apart from the list's own types. */
    const val VIEW_TYPE = 0x7ca0
  }
}

/**
 * A stacked row's photos and videos, two or more, across the row: each
 * card as tall as the others and as wide as its photo's shape, the next
 * one peeking past the edge, settling card by card.
 */
@SuppressLint("ViewConstructor")
class CarouselView(context: Context, private val units: Units, images: Images, pool: RecyclerView.RecycledViewPool) :
  RecyclerView(context) {
  private val cards = CarouselAdapter(units, images)
  private val manager = LinearLayoutManager(context, HORIZONTAL, false)
  private var heightPx = 0

  init {
    layoutManager = manager
    manager.recycleChildrenOnDetach = true
    manager.initialPrefetchItemCount = 3
    setRecycledViewPool(pool)
    adapter = cards
    itemAnimator = null
    clipToPadding = false
    clipChildren = false
    overScrollMode = OVER_SCROLL_NEVER
    isHorizontalScrollBarEnabled = false
    takesHorizontal = true
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    addItemDecoration(object : ItemDecoration() {
      override fun getItemOffsets(outRect: android.graphics.Rect, view: View, parent: RecyclerView, state: State) {
        val position = parent.getChildAdapterPosition(view)
        outRect.right = if (position == state.itemCount - 1) 0 else units.px(CarouselSizes.CARD_GAP)
      }
    })
    StartSnapHelper().attachToRecyclerView(this)
  }

  /** The tallest of the cards' chip rows, which every card leaves room for. */
  fun heldMedia(part: String?, index: Int?): View? {
    for (at in 0 until childCount) {
      val card = getChildAt(at) as? CarouselCard ?: continue
      if (card.media.holdTarget?.part == part || getChildAdapterPosition(card) == index) return card.media
    }
    return null
  }

  fun laneHeight(items: List<MediaItem>, theme: Theme): Int =
    items.maxOf { ChipMetrics.height(it.reactions, units.px(CarouselSizes.cardWidth(it)), theme, units) }

  fun bind(rowId: String, items: List<MediaItem>, theme: Theme, rightBleed: Int, animate: Boolean) {
    val lane = laneHeight(items, theme)
    heightPx = units.px(CarouselSizes.CARD_HEIGHT) + lane
    setPadding(0, 0, rightBleed, 0)
    val sameRow = cards.rowId == rowId
    val sameItems = sameRow && cards.items.map { it.id } == items.map { it.id }
    cards.rowId = rowId
    cards.theme = theme
    cards.lane = lane
    val before = cards.items
    cards.items = items
    if (sameItems) {
      for (index in items.indices) {
        if (before[index] != items[index] || animate) cards.notifyItemChanged(index, if (animate) PAYLOAD else null)
      }
    } else {
      @SuppressLint("NotifyDataSetChanged")
      cards.notifyDataSetChanged()
      if (!sameRow) manager.scrollToPositionWithOffset(0, 0)
    }
    requestLayout()
  }

  override fun onMeasure(widthSpec: Int, heightSpec: Int) {
    super.onMeasure(widthSpec, MeasureSpec.makeMeasureSpec(heightPx, MeasureSpec.EXACTLY))
  }

  companion object {
    val PAYLOAD = Any()
  }
}

/**
 * Bubbles' photos and videos, two or more: a deck you flick through where
 * it is. The front card follows the finger, tilting as it goes, and past a
 * short swipe flies off either way while the one behind rises into its
 * place. Dots under it say which card is in front.
 */
@SuppressLint("ViewConstructor")
class DeckView(context: Context, private val units: Units, private val images: Images) : ViewGroup(context) {
  private val front = MediaView(context, units)
  private val back = MediaView(context, units)
  private val dots = Paint(Paint.ANTI_ALIAS_FLAG)
  private var items: List<MediaItem> = emptyList()
  private var theme = Theme.DEFAULT
  private var rowId = ""
  private var cardWidth = 0
  private var cardHeight = 0
  private var alignEnd = false

  /** Which card is in front. */
  var current = 0
    private set

  /** Told when another card comes to the front (its reactions show then). */
  var onCurrent: ((Int) -> Unit)? = null

  private val slop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var dragging = false
  private var drag = 0f
  private var throwing = false
  private val tracker = android.view.VelocityTracker.obtain()

  init {
    setWillNotDraw(false)
    clipChildren = false
    addView(back)
    addView(front)
    takesHorizontal = true
  }

  val currentItem: MediaItem?
    get() = items.getOrNull(current)

  fun bind(rowId: String, items: List<MediaItem>, theme: Theme, maxWidth: Int, alignEnd: Boolean) {
    if (rowId != this.rowId) current = 0
    this.rowId = rowId
    this.items = items
    this.theme = theme
    this.alignEnd = alignEnd
    if (current >= items.size) current = 0
    cardWidth = minOf(units.px(DeckSizes.CARD_WIDTH), maxWidth)
    cardHeight = units.px(items.maxOf { DeckSizes.cardHeight(it) })
    front.setSize(cardWidth, cardHeight)
    back.setSize(cardWidth, cardHeight)
    showCards()
    requestLayout()
  }

  private fun showCards() {
    val item = items.getOrNull(current) ?: return
    front.bind(item, theme, images)
    front.pressTarget = Target("media", rowId, part = item.part, index = current)
    front.holdTarget = HoldTarget(rowId, item.part, current)
    val next = items[(current + 1) % items.size]
    back.bind(next, theme, images)
    if (android.os.Build.VERSION.SDK_INT >= 31) {
      back.setRenderEffect(android.graphics.RenderEffect.createBlurEffect(units.pxf(8f), units.pxf(8f), android.graphics.Shader.TileMode.CLAMP))
    }
    resetDrag()
    invalidate()
  }

  private fun resetDrag() {
    drag = 0f
    front.translationX = 0f
    front.rotation = 0f
    applyBack(0f)
  }

  private fun applyBack(gone: Float) {
    back.translationY = -units.pxf(DeckSizes.PEEK) * (1f - gone)
    val scale = 0.94f + 0.06f * gone
    back.scaleX = scale
    back.scaleY = scale
    back.alpha = 0.7f + 0.3f * gone
  }

  private fun setDrag(dx: Float) {
    drag = dx
    front.translationX = dx
    front.rotation = (dx / units.pxf(200f) * 12f).coerceIn(-12f, 12f)
    applyBack(minOf(1f, abs(dx) / (cardWidth + units.pxf(40f))))
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    front.measure(0, 0)
    back.measure(0, 0)
    val height = units.px(DeckSizes.PEEK) + cardHeight + units.px(DeckSizes.DOTS_GAP + DeckSizes.DOTS)
    setMeasuredDimension(cardWidth, height)
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    val top = units.px(DeckSizes.PEEK)
    for (card in listOf(back, front)) {
      card.layout(0, top, cardWidth, top + cardHeight)
      card.pivotX = cardWidth / 2f
      card.pivotY = cardHeight.toFloat()
    }
  }

  override fun onDraw(canvas: Canvas) {
    val n = items.size
    if (n < 2) return
    val size = units.pxf(DeckSizes.DOTS)
    val gap = units.pxf(4f)
    val total = n * size + (n - 1) * gap
    var x = (width - total) / 2f
    val cy = height - size / 2f
    for (index in 0 until n) {
      dots.color = if (index == current) theme.foreground else withAlpha(theme.muted, 0.4f)
      canvas.drawCircle(x + size / 2f, cy, size / 2f, dots)
      x += size + gap
    }
  }

  override fun onInterceptTouchEvent(event: MotionEvent): Boolean = handle(event, intercepting = true)

  @SuppressLint("ClickableViewAccessibility")
  override fun onTouchEvent(event: MotionEvent): Boolean = handle(event, intercepting = false)

  private fun handle(event: MotionEvent, intercepting: Boolean): Boolean {
    if (throwing || items.size < 2) return false
    tracker.addMovement(event)
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = event.rawX
        downY = event.rawY
        dragging = false
        tracker.clear()
        tracker.addMovement(event)
        return !intercepting
      }
      MotionEvent.ACTION_MOVE -> {
        val dx = event.rawX - downX
        val dy = event.rawY - downY
        if (!dragging) {
          if (abs(dy) > slop && abs(dy) > abs(dx)) return false
          if (abs(dx) > slop) {
            dragging = true
            parent?.requestDisallowInterceptTouchEvent(true)
            downX = event.rawX
          }
        }
        if (dragging) setDrag(event.rawX - downX)
        return dragging
      }
      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        if (!dragging) return false
        dragging = false
        tracker.computeCurrentVelocity(1000)
        val flung = abs(tracker.xVelocity) > units.pxf(600f) && Math.signum(tracker.xVelocity) == Math.signum(drag)
        if (event.actionMasked == MotionEvent.ACTION_UP && (abs(drag) > units.pxf(70f) || flung)) throwAway()
        else settleBack()
        return true
      }
    }
    return false
  }

  private fun settleBack() {
    val from = drag
    android.animation.ValueAnimator.ofFloat(1f, 0f).apply {
      duration = 260
      interpolator = android.view.animation.OvershootInterpolator(1.2f)
      addUpdateListener { setDrag(from * (it.animatedValue as Float)) }
      start()
    }
  }

  private fun throwAway() {
    throwing = true
    val from = drag
    val to = Math.signum(drag) * (cardWidth + units.pxf(40f))
    android.animation.ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 160
      addUpdateListener { setDrag(from + (to - from) * (it.animatedValue as Float)) }
      addListener(object : android.animation.AnimatorListenerAdapter() {
        override fun onAnimationEnd(animation: android.animation.Animator) {
          current = (current + 1) % items.size
          performHapticFeedback(android.view.HapticFeedbackConstants.CLOCK_TICK)
          showCards()
          throwing = false
          onCurrent?.invoke(current)
        }
      })
      start()
    }
  }
}
