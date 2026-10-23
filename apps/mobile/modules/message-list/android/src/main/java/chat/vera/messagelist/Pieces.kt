package chat.vera.messagelist

import android.animation.ValueAnimator
import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.text.TextPaint
import android.view.View
import android.view.ViewOutlineProvider
import android.widget.ImageView
import com.bumptech.glide.RequestManager
import com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions
import com.bumptech.glide.request.RequestOptions

// The small pieces cells are made of, each drawn by hand where that's
// cheaper than a tree of views: photos, monograms, tapbacks, chips, dots.

/** Loads photos: the list's Glide, which expo-image configured. */
class Images(val requests: RequestManager) {
  private val fade = DrawableTransitionOptions.withCrossFade(150)

  /** Loads `url` into `view`, decoded at the view's size. */
  fun load(view: ImageView, url: String?, width: Int, height: Int, circle: Boolean = false) {
    if (url == null || width <= 0 || height <= 0) {
      requests.clear(view)
      view.setImageDrawable(null)
      return
    }
    var request = requests.load(url).override(width, height)
    request = if (circle) request.apply(RequestOptions.circleCropTransform()) else request.centerCrop()
    request.transition(fade).into(view)
  }

  /** Starts loading a photo a row will need soon, at the size it will be drawn. */
  fun preload(url: String, width: Int, height: Int) {
    if (width <= 0 || height <= 0) return
    requests.load(url).override(width, height).centerCrop().preload(width, height)
  }
}

/**
 * An image view whose size never depends on its image, so a photo
 * arriving doesn't ask the list to lay out again (which, mid-fling, would
 * redo every visible row for each photo that loads).
 */
@SuppressLint("AppCompatCustomView")
open class FixedImageView(context: Context) : ImageView(context) {
  private var settingImage = false

  override fun setImageDrawable(drawable: Drawable?) {
    settingImage = true
    super.setImageDrawable(drawable)
    settingImage = false
  }

  override fun requestLayout() {
    if (!settingImage) super.requestLayout()
  }
}

/** A round photo, or initials on the theme's gray gradient when there's none. */
class AvatarView(context: Context, private val units: Units) : FixedImageView(context) {
  private var person: Person? = null
  private var theme: Theme = Theme.DEFAULT
  private var sizeDp = 28f
  private val fill = Paint(Paint.ANTI_ALIAS_FLAG)
  private val text = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
    textAlign = Paint.Align.CENTER
    typeface = Fonts.semibold
    color = 0xFFFFFFFF.toInt()
  }
  private var gradientFor = 0

  init {
    scaleType = ScaleType.CENTER_CROP
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun bind(person: Person, theme: Theme, sizeDp: Float, images: Images) {
    val changed = person.avatarUrl != this.person?.avatarUrl || sizeDp != this.sizeDp
    this.person = person
    this.theme = theme
    if (sizeDp != this.sizeDp) {
      this.sizeDp = sizeDp
      requestLayout()
    }
    if (changed || drawable == null) {
      val size = units.px(sizeDp)
      images.load(this, person.avatarUrl, size, size, circle = true)
    }
    invalidate()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    val size = units.px(sizeDp)
    setMeasuredDimension(size, size)
  }

  override fun onDraw(canvas: Canvas) {
    if (drawable == null) {
      val size = width.toFloat()
      val key = theme.monogramTop * 31 + theme.monogramBottom + width
      if (gradientFor != key) {
        fill.shader = LinearGradient(0f, 0f, 0f, size, theme.monogramTop, theme.monogramBottom, Shader.TileMode.CLAMP)
        gradientFor = key
      }
      canvas.drawCircle(size / 2f, size / 2f, size / 2f, fill)
      val initials = person?.initials ?: ""
      text.textSize = size * 0.4f
      val y = size / 2f - (text.descent() + text.ascent()) / 2f
      canvas.drawText(initials, size / 2f, y, text)
      return
    }
    super.onDraw(canvas)
  }
}

/**
 * A photo or a video's poster, its size known before it loads, with
 * rounded corners on the fill color until it does. Videos get a play
 * badge and their length.
 */
class MediaView(context: Context, private val units: Units) : FixedImageView(context) {
  var item: MediaItem? = null
    private set
  private var widthPx = 0
  private var heightPx = 0
  private var radiusPx = units.pxf(16f)
  private val badge = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x66000000 }
  private val pill = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0x80000000.toInt() }
  private val white = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = 0xFFFFFFFF.toInt() }
  private val durationText = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
    color = 0xFFFFFFFF.toInt()
    typeface = Fonts.semibold
  }
  private val triangle = Path()
  private var duration: String? = null
  private var pulse: ValueAnimator? = null

  init {
    scaleType = ScaleType.CENTER_CROP
    clipToOutline = true
    outlineProvider = object : ViewOutlineProvider() {
      override fun getOutline(view: View, outline: Outline) {
        outline.setRoundRect(0, 0, view.width, view.height, radiusPx)
      }
    }
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun setSize(width: Int, height: Int, radiusDp: Float = 16f) {
    if (width != widthPx || height != heightPx) {
      widthPx = width
      heightPx = height
      requestLayout()
    }
    radiusPx = units.pxf(radiusDp)
    invalidateOutline()
  }

  fun bind(item: MediaItem, theme: Theme, images: Images) {
    val previous = this.item
    this.item = item
    setBackgroundColor(theme.fill)
    if (previous?.shownUrl != item.shownUrl || drawable == null) {
      images.load(this, item.shownUrl, widthPx, heightPx)
    }
    duration = item.durationSeconds?.let { formatDuration(it) }
    durationText.textSize = units.sp(theme.caption.size)
    if (item.uploading) startPulse() else stopPulse()
    invalidate()
  }

  private fun startPulse() {
    if (pulse != null) return
    pulse = ValueAnimator.ofFloat(0.8f, 1f).apply {
      duration = 1400
      repeatMode = ValueAnimator.REVERSE
      repeatCount = ValueAnimator.INFINITE
      addUpdateListener { imageAlpha = ((it.animatedValue as Float) * 255).toInt() }
      start()
    }
  }

  private fun stopPulse() {
    pulse?.cancel()
    pulse = null
    imageAlpha = 255
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    stopPulse()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (item?.uploading == true) startPulse()
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(widthPx, heightPx)
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)
    if (item?.isVideo != true) return
    val cx = width / 2f
    val cy = height / 2f
    canvas.drawCircle(cx, cy, units.pxf(24f), badge)
    val s = units.pxf(9f)
    triangle.reset()
    triangle.moveTo(cx - s * 0.7f, cy - s)
    triangle.lineTo(cx + s, cy)
    triangle.lineTo(cx - s * 0.7f, cy + s)
    triangle.close()
    canvas.drawPath(triangle, white)
    val label = duration ?: return
    val padX = units.pxf(8f)
    val padY = units.pxf(2f)
    val textWidth = durationText.measureText(label)
    val textHeight = durationText.descent() - durationText.ascent()
    val left = units.pxf(8f)
    val bottom = height - units.pxf(8f)
    val rect = RectF(left, bottom - textHeight - padY * 2, left + textWidth + padX * 2, bottom)
    canvas.drawRoundRect(rect, rect.height() / 2, rect.height() / 2, pill)
    canvas.drawText(label, left + padX, rect.bottom - padY - durationText.descent(), durationText)
  }
}

fun formatDuration(seconds: Double): String {
  val total = Math.round(seconds).toInt()
  val hours = total / 3600
  val minutes = (total % 3600) / 60
  val rest = total % 60
  return if (hours > 0) String.format("%d:%02d:%02d", hours, minutes, rest)
  else String.format("%d:%02d", minutes, rest)
}

/**
 * iMessage's tapbacks over a bubble's top corner: a round bubble per
 * reaction (two people who sent ❤️ show two), the newest in front at the
 * corner and up to two more fanned out behind it toward the middle. Each
 * pops in when it arrives and shrinks away when taken back.
 */
class TapbacksView(context: Context, private val units: Units) : View(context) {
  companion object {
    const val SIZE = 34f
    const val EMOJI = 18f
    const val STACK_OFFSET = 14f
    const val MAX_SHOWN = 3

    /** How far the front tapback reaches down over the bubble's top. */
    val OVERLAP = Math.round(SIZE * 0.25f).toFloat()

    /** How far past the bubble's side the front tapback's center sits. */
    val CENTER_INSET = Math.round(SIZE * 0.1f).toFloat()

    /** The room tapbacks need above a bubble. */
    val SPACE = SIZE - OVERLAP
  }

  private class Item(val key: String, var emoji: String, var mine: Boolean) {
    var scale = 1f
    var alpha = 1f
    var leaving = false
    var animator: ValueAnimator? = null
  }

  private var items = ArrayList<Item>()
  private var theme = Theme.DEFAULT

  /** The bubble's side: tapbacks fan toward the middle of the screen. */
  var incoming = true
  private val circle = Paint(Paint.ANTI_ALIAS_FLAG)
  private val ring = Paint(Paint.ANTI_ALIAS_FLAG)
  private val emojiPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.CENTER }

  init {
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  val shownCount: Int
    get() = items.count { !it.leaving }

  /** Every reaction as its own tapback, newest last, the last three shown. */
  fun bind(reactions: List<Reaction>, theme: Theme, animate: Boolean) {
    this.theme = theme
    val wanted = ArrayList<Item>()
    for (reaction in reactions) {
      for (n in 0 until reaction.count.coerceIn(1, MAX_SHOWN)) {
        // Yours is the newest of its kind.
        val mine = reaction.mine && n == reaction.count.coerceIn(1, MAX_SHOWN) - 1
        wanted.add(Item("${reaction.key}#$n", reaction.shown, mine))
      }
    }
    val shown = wanted.takeLast(MAX_SHOWN)
    if (!animate) {
      items.forEach { it.animator?.cancel() }
      items = ArrayList(shown)
      invalidate()
      return
    }
    val byKey = items.associateBy { it.key }
    val next = ArrayList<Item>()
    for (item in shown) {
      val old = byKey[item.key]
      if (old != null && !old.leaving) {
        old.emoji = item.emoji
        old.mine = item.mine
        next.add(old)
      } else {
        next.add(item)
        popIn(item)
      }
    }
    val keys = shown.map { it.key }.toSet()
    for (old in items) {
      if (old.key !in keys && !old.leaving) {
        old.leaving = true
        next.add(0, old)
        popOut(old)
      }
    }
    items = next
    invalidate()
  }

  private fun popIn(item: Item, from: Float = 0.3f) {
    item.scale = from
    item.alpha = 0f
    item.animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 320
      addUpdateListener {
        val t = it.animatedValue as Float
        // 0.3 → 1.12 by 60%, then back to 1, fading in on the way up.
        item.scale = if (t < 0.6f) from + (1.12f - from) * EASE_OUT.getInterpolation(t / 0.6f)
        else 1.12f - 0.12f * EASE.getInterpolation((t - 0.6f) / 0.4f)
        item.alpha = minOf(1f, t / 0.6f)
        invalidate()
      }
      start()
    }
  }

  private fun popOut(item: Item) {
    item.animator?.cancel()
    val from = item.scale
    item.animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 160
      addUpdateListener {
        val t = it.animatedValue as Float
        item.scale = from * (1f - t)
        item.alpha = 1f - t
        if (t >= 1f) items.remove(item)
        invalidate()
      }
      start()
    }
  }

  /** As wide as the tapbacks fanned out; positioned by the cell. */
  fun contentWidth(): Int {
    val count = maxOf(1, items.count { !it.leaving })
    return units.px(SIZE + (count - 1) * STACK_OFFSET)
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(units.px(SIZE + (MAX_SHOWN - 1) * STACK_OFFSET), units.px(SIZE))
  }

  override fun onDraw(canvas: Canvas) {
    val size = units.pxf(SIZE)
    val step = units.pxf(STACK_OFFSET)
    val radius = size / 2f
    ring.color = theme.background
    emojiPaint.textSize = units.pxf(EMOJI)
    val shown = items.filter { !it.leaving }
    val leaving = items.filter { it.leaving }
    // The front one (newest) sits at the corner: the right end for an
    // incoming bubble, the left for yours.
    fun centerX(slot: Int, count: Int): Float {
      val fromCorner = (count - 1 - slot) * step
      return if (incoming) width - radius - fromCorner else radius + fromCorner
    }
    for (item in leaving) drawItem(canvas, item, centerX(shown.size, shown.size + 1), radius)
    shown.forEachIndexed { slot, item -> drawItem(canvas, item, centerX(slot, shown.size), radius) }
  }

  private fun drawItem(canvas: Canvas, item: Item, cx: Float, radius: Float) {
    if (item.alpha <= 0f || item.scale <= 0f) return
    val cy = radius
    canvas.save()
    canvas.scale(item.scale, item.scale, cx, cy)
    val alpha = (item.alpha * 255).toInt()
    ring.alpha = alpha
    canvas.drawCircle(cx, cy, radius, ring)
    circle.color = if (item.mine) theme.bubbleOutgoing else theme.bubbleIncoming
    circle.alpha = (item.alpha * android.graphics.Color.alpha(circle.color)).toInt()
    canvas.drawCircle(cx, cy, radius - units.pxf(1f), circle)
    emojiPaint.alpha = alpha
    val y = cy - (emojiPaint.descent() + emojiPaint.ascent()) / 2f
    canvas.drawText(item.emoji, cx, y, emojiPaint)
    canvas.restore()
  }
}

/** The three typing dots, each brightening and swelling in turn. */
class DotsView(context: Context, private val units: Units) : View(context) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private var dotDp = 8f
  private var gapDp = 4f
  private var animator: ValueAnimator? = null
  private var phase = 0f

  fun bind(color: Int, dotDp: Float, gapDp: Float) {
    paint.color = color
    if (dotDp != this.dotDp || gapDp != this.gapDp) {
      this.dotDp = dotDp
      this.gapDp = gapDp
      requestLayout()
    }
  }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(units.px(dotDp * 3 + gapDp * 2), units.px(dotDp * 1.1f))
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 1300
      repeatCount = ValueAnimator.INFINITE
      interpolator = android.view.animation.LinearInterpolator()
      addUpdateListener {
        phase = it.animatedValue as Float
        invalidate()
      }
      start()
    }
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    animator?.cancel()
    animator = null
  }

  override fun onDraw(canvas: Canvas) {
    val dot = units.pxf(dotDp)
    val gap = units.pxf(gapDp)
    val base = paint.alpha
    for (index in 0 until 3) {
      // Each dot's pulse a fifth of the wave after the one before: up for
      // the first quarter, down by half, then resting.
      var t = (phase - index * 0.2f) % 1f
      if (t < 0) t += 1f
      val up = when {
        t < 0.25f -> EASE.getInterpolation(t / 0.25f)
        t < 0.5f -> 1f - EASE.getInterpolation((t - 0.25f) / 0.25f)
        else -> 0f
      }
      val scale = 0.85f + 0.2f * up
      paint.alpha = ((0.35f + 0.65f * up) * 255).toInt()
      val cx = dot / 2f + index * (dot + gap)
      canvas.drawCircle(cx, height / 2f, dot / 2f * scale, paint)
    }
    paint.alpha = base
  }
}

/** Overlapping photos, each ringed in the page's color. */
class FacesView(context: Context, private val units: Units) : android.view.ViewGroup(context) {
  private var sizeDp = 18f
  private var overlapDp = 4f
  private var ringDp = 1f
  private val ring = Paint(Paint.ANTI_ALIAS_FLAG)
  private val avatars = ArrayList<AvatarView>()

  init {
    setWillNotDraw(false)
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun bind(people: List<Person>, theme: Theme, images: Images, sizeDp: Float, overlapDp: Float, ringDp: Float, max: Int) {
    this.sizeDp = sizeDp
    this.overlapDp = overlapDp
    this.ringDp = ringDp
    ring.color = theme.background
    val shown = people.take(max)
    while (avatars.size < shown.size) {
      AvatarView(context, units).also {
        avatars.add(it)
        addView(it)
      }
    }
    avatars.forEachIndexed { index, view ->
      val person = shown.getOrNull(index)
      view.visibility = if (person == null) GONE else VISIBLE
      if (person != null) view.bind(person, theme, sizeDp, images)
    }
    requestLayout()
  }

  private val count get() = avatars.count { it.visibility == VISIBLE }

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    avatars.forEach { if (it.visibility == VISIBLE) it.measure(0, 0) }
    val n = count
    val box = sizeDp + ringDp * 2
    val width = if (n == 0) 0f else box + (n - 1) * (box - overlapDp - ringDp * 2)
    setMeasuredDimension(units.px(width), if (n == 0) 0 else units.px(box))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    val ringPx = units.px(ringDp)
    val step = units.px(sizeDp - overlapDp)
    var x = ringPx
    // The first drawn on top, as in the React Native list.
    for ((index, view) in avatars.withIndex()) {
      if (view.visibility != VISIBLE) continue
      view.layout(x, ringPx, x + view.measuredWidth, ringPx + view.measuredHeight)
      view.z = (avatars.size - index).toFloat() * 0.001f
      x += step
    }
  }

  override fun dispatchDraw(canvas: Canvas) {
    // Rings under each photo, drawn in reverse so the first is on top.
    val n = count
    val visible = avatars.filter { it.visibility == VISIBLE }
    for (index in n - 1 downTo 0) {
      val view = visible[index]
      val cx = view.left + view.width / 2f
      val cy = view.top + view.height / 2f
      canvas.drawCircle(cx, cy, view.width / 2f + units.pxf(ringDp), ring)
      drawChild(canvas, view, drawingTime)
    }
  }
}
