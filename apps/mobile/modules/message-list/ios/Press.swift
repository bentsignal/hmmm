import UIKit
import UIKit.UIGestureRecognizerSubclass

/// Watches a finger down on the list without ever recognizing, so it
/// blocks nothing: it reports where a press starts, and when it ends,
/// moves away, or is cancelled.
final class PressTracker: UIGestureRecognizer {
  var onBegan: ((CGPoint) -> Void)?
  var onEnded: (() -> Void)?
  private var start: CGPoint = .zero

  override init(target: Any?, action: Selector?) {
    super.init(target: target, action: action)
    cancelsTouchesInView = false
    delaysTouchesBegan = false
    delaysTouchesEnded = false
  }

  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    guard touches.count == 1, let touch = touches.first, event.allTouches?.count == 1 else {
      finish()
      return
    }
    start = touch.location(in: view)
    onBegan?(start)
  }

  override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
    guard let touch = touches.first else { return }
    let point = touch.location(in: view)
    if hypot(point.x - start.x, point.y - start.y) > 10 { finish() }
  }

  override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) { finish() }
  override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) { finish() }

  private func finish() {
    onEnded?()
    if state == .possible { state = .failed }
  }
}

/// The part being pressed shrinks to 0.96 over the long press (as in the
/// React Native list), then springs back when it's held or let go.
final class PressShrink {
  private weak var pressed: UIView?
  private var pending: DispatchWorkItem?
  static let scale: CGFloat = 0.96
  /// How long a hold takes; the shrink fills it.
  static let holdDuration = 0.32
  /// A tap or the start of a scroll doesn't shrink anything.
  static let delay = 0.08

  /// Starts shrinking `find()`'s view a moment from now, unless it's over.
  func begin(_ find: @escaping () -> UIView?) {
    cancel()
    let work = DispatchWorkItem { [weak self] in
      guard let self, let view = find(), Self.shrinks(view) else { return }
      self.pressed = view
      UIView.animate(
        withDuration: Self.holdDuration - Self.delay, delay: 0,
        options: [.curveEaseOut, .allowUserInteraction, .beginFromCurrentState]
      ) {
        view.transform = CGAffineTransform(scaleX: Self.scale, y: Self.scale)
      }
    }
    pending = work
    DispatchQueue.main.asyncAfter(deadline: .now() + Self.delay, execute: work)
  }

  /// Springs back (damping 14, stiffness 320 in the RN list).
  func release() {
    cancel()
    guard let view = pressed else { return }
    pressed = nil
    UIView.animate(
      withDuration: 0.45, delay: 0, usingSpringWithDamping: 0.45, initialSpringVelocity: 0,
      options: [.allowUserInteraction, .beginFromCurrentState]
    ) {
      view.transform = .identity
    }
  }

  /// Whatever is shrunk now goes back at once (it's being lifted).
  func reset() {
    cancel()
    pressed?.layer.removeAllAnimations()
    pressed?.transform = .identity
    pressed = nil
  }

  private func cancel() {
    pending?.cancel()
    pending = nil
  }

  /// Parts that shrink: not cards in a deck or a carousel, which move.
  static func shrinks(_ view: UIView) -> Bool {
    if view.superview is DeckView || view.superview is CarouselView { return false }
    return view is BubbleView || view is MediaTileView || view is FileView || view is LinkCardView || view is QuoteView
  }
}
