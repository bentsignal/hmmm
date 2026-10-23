package chat.vera.messagelist

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.graphics.Rect
import android.graphics.drawable.GradientDrawable
import android.view.Choreographer
import android.view.View
import android.view.ViewGroup
import android.view.animation.PathInterpolator
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.views.modal.ReactModalHostView
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.sin
import kotlin.math.sqrt

data class LiftRequest(val rowId: String, val part: String?, val index: Int?, val shift: Float, val scale: Float, val origin: String)
data class LiftPieces(val frame: Rect, val views: List<View>, val card: Int?)

fun decodeLift(map: ReadableMap?): LiftRequest? {
  val id = map?.str("rowId") ?: return null
  fun number(key: String) = map.num(key)?.takeIf { it.isFinite() }?.toFloat()?.takeIf { it.isFinite() }
  return LiftRequest(id, map.str("part"), number("index")?.toInt(),
    number("shift") ?: 0f, (number("scale") ?: 1f).coerceAtLeast(0.01f), map.str("origin") ?: "start")
}

/** The real part moves above the menu's Dialog, then goes back to its parent. No bitmap or copy. */
class Lifter(private val units: Units, private val activityRoot: () -> ViewGroup?) {
  // Android's window overlay clips each child's RenderNode to its bounds.
  // Keep the plain-text card and the tapbacks inside those drawing bounds.
  private val margin = units.px(40f)
  private data class Piece(val view: View, val home: ViewGroup, val index: Int, val params: ViewGroup.LayoutParams,
    val frame: Rect, val x: Float, val y: Float)
  private data class Lifted(val request: LiftRequest, val holder: RowHolder, val cell: MessageCell,
    val pieces: LiftPieces, val moved: List<Piece>, val container: ViewGroup, var host: ViewGroup, val screen: IntArray, val card: View?)
  private var lifted: Lifted? = null
  private var animation: ValueAnimator? = null
  private var frame: Choreographer.FrameCallback? = null

  fun lift(request: LiftRequest, holder: RowHolder, pressedScale: Float? = null) {
    if (lifted?.request == request) return
    finish()
    val cell = holder.itemView as? MessageCell ?: return
    val pieces = cell.liftPieces(request.part, request.index) ?: return
    val root = activityRoot() ?: return
    val host = modalRoot(root)
    val screen = IntArray(2).also { cell.getLocationOnScreen(it) }
    screen[0] += pieces.frame.left
    screen[1] += pieces.frame.top
    val container = object : ViewGroup(cell.context) {
      override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {}
    }.apply {
      clipChildren = false
      clipToPadding = false
      importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      pivotX = margin + when (request.origin) { "end" -> pieces.frame.width().toFloat(); "middle" -> pieces.frame.width() / 2f; else -> 0f }
      pivotY = margin.toFloat()
    }
    val card = pieces.card?.let { color ->
      View(cell.context).apply {
        background = GradientDrawable().apply { setColor(color); cornerRadius = units.pxf(16f) }
        alpha = 0f
        container.addView(this)
        layout(margin - units.px(10f), margin - units.px(8f), margin + pieces.frame.width() + units.px(10f), margin + pieces.frame.height() + units.px(8f))
      }
    }
    val moved = pieces.views.mapNotNull { view ->
      val home = view.parent as? ViewGroup ?: return@mapNotNull null
      Piece(view, home, home.indexOfChild(view), view.layoutParams, Rect(view.left, view.top, view.right, view.bottom), view.translationX, view.translationY)
    }
    val pressed = pressedScale ?: pieces.views.firstOrNull()?.scaleX ?: 1f
    cell.beginLift()
    holder.setIsRecyclable(false)
    for (piece in moved) {
      val view = piece.view
      val position = IntArray(2).also { piece.home.getLocationOnScreen(it) }
      position[0] += piece.frame.left + piece.x.toInt() - piece.home.scrollX
      position[1] += piece.frame.top + piece.y.toInt() - piece.home.scrollY
      view.animate().cancel()
      view.scaleX = 1f
      view.scaleY = 1f
      view.translationX = 0f
      view.translationY = 0f
      piece.home.removeView(view)
      container.addView(view)
      val x = position[0] - screen[0] + margin
      val y = position[1] - screen[1] + margin
      view.layout(x, y, x + piece.frame.width(), y + piece.frame.height())
    }
    host.overlay.add(container)
    val current = Lifted(request, holder, cell, pieces, moved, container, host, screen, card)
    lifted = current
    place(current)
    container.scaleX = pressed
    container.scaleY = pressed
    // JS uses damping 19, mass 0.9, stiffness 230. Evaluate the same spring on each UI frame.
    animate(700, { spring(it * 0.7f) }) { progress ->
      container.scaleX = pressed + (request.scale - pressed) * progress
      container.scaleY = container.scaleX
      container.translationY = units.pxf(request.shift) * progress
      card?.alpha = progress.coerceIn(0f, 1f)
    }
    watchHost(current)
  }

  private fun place(current: Lifted) {
    val origin = IntArray(2).also { current.host.getLocationOnScreen(it) }
    val x = current.screen[0] - origin[0] - margin
    val y = current.screen[1] - origin[1] - margin
    current.container.layout(x, y, x + current.pieces.frame.width() + margin * 2, y + current.pieces.frame.height() + margin * 2)
  }

  /** RN Modal has its own window. Its public host exposes the Dialog on every supported Android version. */
  private fun modalRoot(root: ViewGroup): ViewGroup {
    fun find(view: View): ViewGroup? {
      if (view is ReactModalHostView && view.dialog?.isShowing == true) {
        return (view.dialog?.window?.decorView as? ViewGroup)?.let { find(it) ?: it }
      }
      if (view is ViewGroup) for (i in view.childCount - 1 downTo 0) find(view.getChildAt(i))?.let { return it }
      return null
    }
    return find(root) ?: root
  }

  private fun watchHost(current: Lifted) {
    val callback = object : Choreographer.FrameCallback {
      override fun doFrame(time: Long) {
        if (lifted !== current) return
        val host = activityRoot()?.let(::modalRoot)
        if (host != null && host !== current.host) {
          current.host.overlay.remove(current.container)
          current.host = host
          host.overlay.add(current.container)
          place(current)
        }
        Choreographer.getInstance().postFrameCallback(this)
      }
    }
    frame = callback
    Choreographer.getInstance().postFrameCallback(callback)
  }

  fun land() {
    val current = lifted ?: return
    val view = current.container
    val fromScale = view.scaleX
    val fromY = view.translationY
    val fromCard = current.card?.alpha ?: 0f
    val destination = IntArray(2).also { current.cell.getLocationOnScreen(it) }
    val dx = destination[0] + current.pieces.frame.left - current.screen[0]
    val dy = destination[1] + current.pieces.frame.top - current.screen[1]
    val easing = PathInterpolator(0.215f, 0.61f, 0.355f, 1f)
    animate(240, { easing.getInterpolation(it) }, onEnd = { finish() }) { progress ->
      view.scaleX = fromScale + (1f - fromScale) * progress
      view.scaleY = view.scaleX
      view.translationX = dx * progress
      view.translationY = fromY + (dy - fromY) * progress
      current.card?.alpha = fromCard * (1f - progress)
      if (!current.cell.isAttachedToWindow) view.alpha = 1f - progress
    }
  }

  fun finish() {
    animation?.removeAllListeners()
    animation?.cancel()
    animation = null
    frame?.let { Choreographer.getInstance().removeFrameCallback(it) }
    frame = null
    val current = lifted ?: return
    lifted = null
    // Original order, even when multiple views shared a parent.
    for (piece in current.moved.sortedBy { it.index }) {
      current.container.removeView(piece.view)
      piece.home.addView(piece.view, piece.index.coerceAtMost(piece.home.childCount), piece.params)
      piece.view.layout(piece.frame.left, piece.frame.top, piece.frame.right, piece.frame.bottom)
      piece.view.translationX = piece.x
      piece.view.translationY = piece.y
    }
    current.host.overlay.remove(current.container)
    current.cell.endLift()
    current.holder.setIsRecyclable(true)
  }

  private fun animate(ms: Long, easing: (Float) -> Float, onEnd: (() -> Unit)? = null, update: (Float) -> Unit) {
    animation?.removeAllListeners()
    animation?.cancel()
    animation = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = ms
      interpolator = android.view.animation.LinearInterpolator()
      addUpdateListener { update(easing(it.animatedValue as Float)) }
      onEnd?.let { addListener(object : AnimatorListenerAdapter() { override fun onAnimationEnd(animation: Animator) { it() } }) }
      start()
    }
  }

  private fun spring(seconds: Float): Float {
    val decay = 19.0 / (2 * 0.9)
    val frequency = sqrt(230 / 0.9 - decay * decay)
    return (1 - exp(-decay * seconds) * (cos(frequency * seconds) + decay / frequency * sin(frequency * seconds))).toFloat()
  }
}
