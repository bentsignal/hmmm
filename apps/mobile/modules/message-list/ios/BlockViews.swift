import UIKit

// The views a message is built from: text, bubbles (with the tail), file
// rows, link cards, and quotes. Each is set from a precomputed layout, so
// configuring one is setting frames and content.

/// Draws attributed text exactly the way `measure` sized it.
final class TextView: UIView {
  var text: NSAttributedString? {
    didSet {
      if text !== oldValue { setNeedsDisplay() }
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    isOpaque = false
    backgroundColor = .clear
    contentMode = .redraw
    isUserInteractionEnabled = false
    // Core Animation replays the drawing off the main thread.
    layer.drawsAsynchronously = true
  }

  required init?(coder: NSCoder) { fatalError() }

  override func draw(_ rect: CGRect) {
    text?.draw(with: bounds, options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine], context: nil)
  }

  /// The index of the link or mention span at a point, if any.
  func spanIndex(at point: CGPoint) -> Int? {
    guard let text, bounds.contains(point) else { return nil }
    let storage = NSTextStorage(attributedString: text)
    let manager = NSLayoutManager()
    let container = NSTextContainer(size: CGSize(width: bounds.width, height: .greatestFiniteMagnitude))
    container.lineFragmentPadding = 0
    manager.addTextContainer(container)
    storage.addLayoutManager(manager)
    var fraction: CGFloat = 0
    let glyph = manager.glyphIndex(for: point, in: container, fractionOfDistanceThroughGlyph: &fraction)
    let lineRect = manager.lineFragmentRect(forGlyphAt: glyph, effectiveRange: nil)
    guard lineRect.insetBy(dx: 0, dy: -4).contains(point) else { return nil }
    let index = manager.characterIndexForGlyph(at: glyph)
    guard index < text.length else { return nil }
    return text.attribute(.spanIndex, at: index, effectiveRange: nil) as? Int
  }
}

/// The bubble's tail (bubble-shape.tsx): 22 × 27 points, its top-right
/// corner on the bubble's right edge, 20 above the bottom. Drawn in the
/// bubble's color, under the content; mirrored for incoming bubbles.
final class TailView: UIView {
  override class var layerClass: AnyClass { CAShapeLayer.self }
  private var shape: CAShapeLayer { layer as! CAShapeLayer }

  static let path: CGPath = {
    let path = UIBezierPath()
    path.move(to: CGPoint(x: 22, y: 0))
    path.addCurve(to: CGPoint(x: 11.48, y: 19.93), controlPoint1: CGPoint(x: 22, y: 12.35), controlPoint2: CGPoint(x: 11.48, y: 15.7))
    path.addCurve(to: CGPoint(x: 13.58, y: 25.21), controlPoint1: CGPoint(x: 11.48, y: 22.54), controlPoint2: CGPoint(x: 12.49, y: 23.61))
    // The round tip: an arc of radius 1.03 to (12.33, 26.73).
    path.addArc(withCenter: CGPoint(x: 12.72, y: 25.78), radius: 1.03, startAngle: -0.585, endAngle: 1.96, clockwise: true)
    path.addCurve(to: CGPoint(x: 0.11, y: 20), controlPoint1: CGPoint(x: 4.58, y: 23.49), controlPoint2: CGPoint(x: 2.61, y: 20))
    path.addLine(to: CGPoint(x: 0, y: 20))
    path.addLine(to: CGPoint(x: 0, y: 0))
    path.close()
    return path.cgPath
  }()

  override init(frame: CGRect) {
    super.init(frame: frame)
    shape.path = Self.path
    isUserInteractionEnabled = false
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(color: UIColor, side: Side) {
    shape.fillColor = color.cgColor
    transform = side == .right ? .identity : CGAffineTransform(scaleX: -1, y: 1)
  }
}

final class BubbleView: UIView {
  let text = TextView()
  private let tail = TailView(frame: CGRect(x: 0, y: 0, width: 22, height: 27))
  private var tailSide: Side?

  override init(frame: CGRect) {
    super.init(frame: frame)
    addSubview(tail)
    addSubview(text)
    layer.cornerCurve = .circular
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ box: TextBox, bubble: BubbleStyle?) {
    text.text = box.string
    text.frame = box.frame
    backgroundColor = bubble?.fill
    layer.cornerRadius = bubble?.radius ?? 0
    layer.borderWidth = bubble?.border == nil ? 0 : 1
    layer.borderColor = bubble?.border?.cgColor
    tailSide = bubble?.tail
    if let side = bubble?.tail, let fill = bubble?.fill {
      tail.isHidden = false
      tail.set(color: fill, side: side)
    } else {
      tail.isHidden = true
    }
    placeTail()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    placeTail()
  }

  private func placeTail() {
    guard let tailSide else { return }
    // bounds/center, not frame: the tail may be mirrored.
    tail.bounds = CGRect(x: 0, y: 0, width: 22, height: 27)
    let x = tailSide == .right ? bounds.width - 11 : 11
    tail.center = CGPoint(x: x, y: bounds.height - 20 + 13.5)
  }
}

/// A file: an icon, its name, and its size.
final class FileView: UIView {
  private let icon = UIView()
  private let glyph = UIImageView()
  private let name = TextView()
  private let size = TextView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    layer.cornerRadius = 16
    layer.cornerCurve = .continuous
    icon.layer.cornerRadius = 8
    icon.layer.cornerCurve = .continuous
    glyph.contentMode = .center
    glyph.image = UIImage(systemName: "doc.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 20))
    addSubview(icon)
    icon.addSubview(glyph)
    addSubview(name)
    addSubview(size)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(name: TextBox, size: TextBox, icon frame: CGRect, theme: Theme) {
    backgroundColor = theme.bubbleIncoming
    icon.backgroundColor = theme.accent
    glyph.tintColor = theme.onAccent
    icon.frame = frame
    glyph.frame = icon.bounds
    self.name.text = name.string
    self.name.frame = name.frame
    self.size.text = size.string
    self.size.frame = size.frame
  }
}

/// A link's preview: an image, the site, the title, and a description.
final class LinkCardView: UIView {
  let image = UIImageView()
  private let site = TextView()
  private let title = TextView()
  private let detail = TextView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    layer.cornerRadius = 16
    layer.cornerCurve = .continuous
    layer.borderWidth = 1 / UIScreen.main.scale
    image.contentMode = .scaleAspectFill
    image.clipsToBounds = true
    image.layer.cornerRadius = 16
    image.layer.cornerCurve = .continuous
    image.layer.maskedCorners = [.layerMinXMinYCorner, .layerMaxXMinYCorner]
    [image, site, title, detail].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ layout: LinkCardLayout, theme: Theme) {
    backgroundColor = theme.backgroundElevated
    layer.borderColor = theme.separator.cgColor
    image.backgroundColor = theme.fill
    if let frame = layout.image {
      image.isHidden = false
      image.frame = frame
      Images.load(image, layout.card.imageUrl, size: frame.size)
    } else {
      image.isHidden = true
      Images.cancel(image)
    }
    for (view, box) in [(site, layout.site), (title, layout.title), (detail, layout.description)] {
      view.isHidden = box == nil
      view.text = box?.string
      view.frame = box?.frame ?? .zero
    }
  }
}

/// The message a reply answers (bubbles): a bordered card.
final class QuoteView: UIView {
  private let author = TextView()
  private let text = TextView()
  let thumbnail = UIImageView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    layer.cornerRadius = 16
    layer.borderWidth = 1
    thumbnail.contentMode = .scaleAspectFill
    thumbnail.clipsToBounds = true
    thumbnail.layer.cornerRadius = 6
    [author, text, thumbnail].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(author: TextBox, text: TextBox, thumbnail frame: CGRect?, url: URL?, theme: Theme) {
    layer.borderColor = theme.separator.cgColor
    self.author.text = author.string
    self.author.frame = author.frame
    self.text.text = text.string
    self.text.frame = text.frame
    thumbnail.backgroundColor = theme.fill
    if let frame {
      thumbnail.isHidden = false
      thumbnail.frame = frame
      Images.load(thumbnail, url, size: frame.size)
    } else {
      thumbnail.isHidden = true
    }
  }
}

/// A stroked path: the reply curve (bubbles) and the quote elbow (stacked).
final class LineView: UIView {
  override class var layerClass: AnyClass { CAShapeLayer.self }
  private var shape: CAShapeLayer { layer as! CAShapeLayer }

  enum Kind { case replyCurve(Side), elbow }
  var kind: Kind = .elbow

  override init(frame: CGRect) {
    super.init(frame: frame)
    shape.fillColor = nil
    shape.lineWidth = 2
    shape.lineCap = .round
    isUserInteractionEnabled = false
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ kind: Kind, color: UIColor) {
    self.kind = kind
    shape.strokeColor = color.cgColor
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let path = UIBezierPath()
    let b = bounds
    switch kind {
    case let .replyCurve(side):
      // Down from the quote, curving into the reply's side.
      let x = side == .left ? b.minX + 1 : b.maxX - 1
      let end = side == .left ? b.maxX : b.minX
      path.move(to: CGPoint(x: x, y: b.minY))
      path.addLine(to: CGPoint(x: x, y: max(b.minY, b.maxY - 10)))
      path.addQuadCurve(to: CGPoint(x: end, y: b.maxY - 1), controlPoint: CGPoint(x: x, y: b.maxY - 1))
    case .elbow:
      // Up from the avatar's center, then right to the quoted face.
      path.move(to: CGPoint(x: b.minX + 1, y: b.maxY))
      path.addLine(to: CGPoint(x: b.minX + 1, y: b.minY + 10))
      path.addQuadCurve(to: CGPoint(x: b.minX + 11, y: b.minY + 1), controlPoint: CGPoint(x: b.minX + 1, y: b.minY + 1))
      path.addLine(to: CGPoint(x: b.maxX, y: b.minY + 1))
    }
    shape.path = path.cgPath
  }
}

/// A reply's line above a stacked row: an elbow, the quoted face, and text.
final class QuoteLineView: UIView {
  private let elbow = LineView()
  private let face = AvatarView()
  private let text = TextView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    [elbow, face, text].forEach(addSubview)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(face frame: CGRect, person: Person, text box: TextBox, elbow elbowFrame: CGRect, theme: Theme) {
    elbow.frame = elbowFrame
    elbow.set(.elbow, color: theme.separator)
    face.frame = frame
    face.set(person, size: frame.width, theme: theme)
    text.text = box.string
    text.frame = box.frame
  }
}
