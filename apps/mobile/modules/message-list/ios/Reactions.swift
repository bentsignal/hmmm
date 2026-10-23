import UIKit

// Reactions are data: native draws any emoji (as text) or image with its
// count, never knowing which reactions exist. Tapbacks sit over a bubble's
// top corner; chips go under stacked messages. Both pop in and shrink out.

protocol ReactionView: UIView {
  var reactionId: String { get }
}

enum Pop {
  /// 0% scale .3 → 60% scale `overshoot`, opaque → 100% scale 1.
  static func popIn(_ view: UIView, duration: Double, overshoot: CGFloat, delay: Double = 0) {
    let scale = CAKeyframeAnimation(keyPath: "transform.scale")
    scale.values = [0.3, overshoot, 1]
    scale.keyTimes = [0, 0.6, 1]
    let opacity = CAKeyframeAnimation(keyPath: "opacity")
    opacity.values = [0, 1, 1]
    opacity.keyTimes = [0, 0.6, 1]
    let group = CAAnimationGroup()
    group.animations = [scale, opacity]
    group.duration = duration
    group.beginTime = CACurrentMediaTime() + delay
    group.fillMode = .backwards
    view.layer.add(group, forKey: "pop")
  }

  static func popOut(_ view: UIView, duration: Double) {
    view.isUserInteractionEnabled = false
    UIView.animate(withDuration: duration, delay: 0, options: [.curveEaseIn, .beginFromCurrentState]) {
      view.transform = CGAffineTransform(scaleX: 0.01, y: 0.01)
      view.alpha = 0
    } completion: { _ in
      view.removeFromSuperview()
      view.transform = .identity
      view.alpha = 1
    }
  }
}

final class TapbackView: UIView, ReactionView {
  private(set) var reactionId = ""
  private(set) var layout: TapbackLayout?
  private let emoji = UILabel()
  private let image = UIImageView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    emoji.textAlignment = .center
    emoji.font = .systemFont(ofSize: 18)
    image.contentMode = .scaleAspectFit
    addSubview(emoji)
    addSubview(image)
    layer.borderWidth = 1
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ layout: TapbackLayout, theme: Theme) {
    self.layout = layout
    reactionId = layout.id
    backgroundColor = layout.tinted ? theme.bubbleOutgoing : theme.bubbleIncoming
    layer.borderColor = theme.background.cgColor
    layer.cornerRadius = layout.frame.width / 2
    if let url = layout.reaction.imageUrl {
      emoji.isHidden = true
      image.isHidden = false
      Images.load(image, url, size: CGSize(width: 22, height: 22))
    } else {
      emoji.isHidden = false
      image.isHidden = true
      emoji.text = layout.reaction.emoji ?? layout.reaction.label
    }
    accessibilityLabel = layout.reaction.label
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    emoji.frame = bounds.offsetBy(dx: 0.45, dy: 0)
    image.frame = bounds.insetBy(dx: 6, dy: 6)
  }
}

final class ChipView: UIView, ReactionView {
  private(set) var reactionId = ""
  private(set) var layout: ChipLayout?
  private let text = TextView()
  private let image = UIImageView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    image.contentMode = .scaleAspectFit
    addSubview(text)
    addSubview(image)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ layout: ChipLayout, theme: Theme) {
    self.layout = layout
    reactionId = layout.id
    backgroundColor = layout.reaction.mine ? theme.accent.withAlphaComponent(0.2) : theme.fill
    layer.cornerRadius = Metrics.chipHeight / 2
    text.text = layout.text.string
    text.frame = layout.text.frame
    if let url = layout.reaction.imageUrl {
      image.isHidden = false
      image.frame = CGRect(x: 8, y: (Metrics.chipHeight - 16) / 2, width: 16, height: 16)
      Images.load(image, url, size: CGSize(width: 16, height: 16))
    } else {
      image.isHidden = true
    }
    accessibilityLabel = "\(layout.reaction.label) \(layout.reaction.count)"
  }
}

/// Keeps a set of reaction views in step with their layouts: new ones pop
/// in, gone ones shrink out, and the rest move (inside the caller's
/// animation, if any).
final class ReactionPool<View: UIView & ReactionView> {
  private(set) var views: [String: View] = [:]
  private var spare: [View] = []

  func update<Layout>(
    _ layouts: [Layout],
    id: (Layout) -> String,
    frame: (Layout) -> CGRect,
    in container: UIView,
    animated: Bool,
    make: () -> View,
    set: (View, Layout) -> Void,
    popIn: (View) -> Void,
    popOut: (View) -> Void
  ) {
    var next: [String: View] = [:]
    for layout in layouts {
      let key = id(layout)
      if let view = views.removeValue(forKey: key) {
        set(view, layout)
        view.frame = frame(layout)
        next[key] = view
      } else {
        let view = spare.popLast() ?? make()
        view.layer.removeAllAnimations()
        view.transform = .identity
        view.alpha = 1
        view.isUserInteractionEnabled = true
        UIView.performWithoutAnimation {
          set(view, layout)
          view.frame = frame(layout)
        }
        container.addSubview(view)
        next[key] = view
        if animated { popIn(view) }
      }
    }
    for (_, view) in views {
      if animated {
        popOut(view)
      } else {
        view.removeFromSuperview()
        spare.append(view)
      }
    }
    views = next
  }

  func bringToFront(order: [String]) {
    for key in order {
      if let view = views[key] { view.superview?.bringSubviewToFront(view) }
    }
  }
}
