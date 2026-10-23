import UIKit

// Photos and videos: one alone, several in a carousel (stacked) or a deck of
// cards (bubbles), as on the `t3/stacked-media-carousel` branch.

/// One photo or video: the image (a video's poster), a play badge and its
/// length for videos, and a pulse while it uploads.
final class MediaTileView: UIView {
  let image = UIImageView()
  private let play = UIView()
  private let playGlyph = UIImageView()
  private let duration = UILabel()
  private let durationBack = UIView()
  private(set) var item: MediaItem?

  override init(frame: CGRect) {
    super.init(frame: frame)
    // The image rounds its own layer: a mask over a container would be
    // drawn offscreen every frame.
    layer.cornerRadius = Metrics.mediaRadius
    layer.cornerCurve = .continuous
    image.contentMode = .scaleAspectFill
    image.clipsToBounds = true
    image.layer.cornerRadius = Metrics.mediaRadius
    image.layer.cornerCurve = .continuous
    addSubview(image)
    play.backgroundColor = UIColor.black.withAlphaComponent(0.4)
    play.layer.cornerRadius = 24
    playGlyph.image = UIImage(systemName: "play.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 24))
    playGlyph.tintColor = .white
    playGlyph.contentMode = .center
    play.addSubview(playGlyph)
    addSubview(play)
    durationBack.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    durationBack.layer.cornerRadius = 10
    duration.font = .systemFont(ofSize: 12, weight: .semibold)
    duration.textColor = .white
    duration.textAlignment = .center
    addSubview(durationBack)
    addSubview(duration)
    isUserInteractionEnabled = false
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ item: MediaItem, theme: Theme, size: CGSize, badges: Bool = true) {
    let changed = item.id != self.item?.id
    self.item = item
    backgroundColor = theme.fill
    if changed { image.image = nil }
    Images.load(image, item.displayUrl, size: size)
    let video = item.kind == .video && badges
    play.isHidden = !video
    if video, let seconds = item.durationSeconds {
      duration.isHidden = false
      durationBack.isHidden = false
      let total = Int(seconds.rounded())
      duration.text = String(format: "%d:%02d", total / 60, total % 60)
    } else {
      duration.isHidden = true
      durationBack.isHidden = true
    }
    if item.uploading {
      if layer.animation(forKey: "pulse") == nil {
        let pulse = CABasicAnimation(keyPath: "opacity")
        pulse.fromValue = 1
        pulse.toValue = 0.8
        pulse.duration = 0.7
        pulse.autoreverses = true
        pulse.repeatCount = .infinity
        pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        layer.add(pulse, forKey: "pulse")
      }
    } else {
      layer.removeAnimation(forKey: "pulse")
    }
    accessibilityLabel = item.kind == .video ? "Video" : "Photo"
    setNeedsLayout()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    image.frame = bounds
    play.frame = CGRect(x: (bounds.width - 48) / 2, y: (bounds.height - 48) / 2, width: 48, height: 48)
    playGlyph.frame = play.bounds
    let size = duration.sizeThatFits(CGSize(width: 80, height: 20))
    durationBack.frame = CGRect(x: 8, y: bounds.height - 8 - 20, width: size.width + 16, height: 20)
    duration.frame = durationBack.frame
  }
}

/// Several photos in a stacked row: an edge-to-edge strip that snaps card
/// by card, each card with its own reactions under it.
final class CarouselView: UIScrollView, UIScrollViewDelegate {
  private var tiles: [MediaTileView] = []
  private let chips = ReactionPool<ChipView>()
  private(set) var layout: CarouselLayout?
  /// Where the reader left it, so a recycled row comes back the same.
  var onOffset: ((CGFloat) -> Void)?

  override init(frame: CGRect) {
    super.init(frame: frame)
    showsHorizontalScrollIndicator = false
    showsVerticalScrollIndicator = false
    alwaysBounceHorizontal = true
    decelerationRate = .fast
    scrollsToTop = false
    delegate = self
    clipsToBounds = true
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ layout: CarouselLayout, theme: Theme, offset: CGFloat, animated: Bool) {
    let sameItems = self.layout?.items.map(\.id) == layout.items.map(\.id)
    self.layout = layout
    while tiles.count < layout.items.count {
      let tile = MediaTileView()
      addSubview(tile)
      tiles.append(tile)
    }
    for (index, tile) in tiles.enumerated() {
      guard index < layout.items.count else {
        tile.isHidden = true
        continue
      }
      tile.isHidden = false
      tile.frame = layout.cards[index]
      tile.set(layout.items[index], theme: theme, size: layout.cards[index].size)
    }
    chips.update(
      layout.chips, id: \.id, frame: \.frame, in: self, animated: animated,
      make: { ChipView() }, set: { $0.set($1, theme: theme) },
      popIn: { Pop.popIn($0, duration: 0.28, overshoot: 1.06, delay: 0.15) },
      popOut: { Pop.popOut($0, duration: 0.14) }
    )
    contentSize = CGSize(width: layout.contentWidth, height: bounds.height)
    if !sameItems || !isTracking && !isDecelerating {
      let maxOffset = max(0, layout.contentWidth - bounds.width)
      contentOffset = CGPoint(x: min(offset, maxOffset), y: 0)
    }
  }

  /// The card at a point in this view's bounds.
  func index(at point: CGPoint) -> Int? {
    layout?.cards.firstIndex { $0.contains(point) }
  }

  func chip(at point: CGPoint) -> ChipLayout? {
    layout?.chips.first { $0.frame.insetBy(dx: -4, dy: -4).contains(point) }
  }

  func cardFrame(_ index: Int) -> CGRect? {
    guard let layout, index < layout.cards.count else { return nil }
    return layout.cards[index]
  }

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    onOffset?(contentOffset.x)
  }

  /// Snap to the start of a card, at most one card past where the swipe began.
  func scrollViewWillEndDragging(_ scrollView: UIScrollView, withVelocity velocity: CGPoint, targetContentOffset: UnsafeMutablePointer<CGPoint>) {
    guard let layout, !layout.cards.isEmpty else { return }
    let starts = layout.cards.map(\.minX)
    let maxOffset = max(0, layout.contentWidth - bounds.width)
    let current = contentOffset.x
    let nearest = starts.enumerated().min { abs($0.element - current) < abs($1.element - current) }?.offset ?? 0
    var target = nearest
    if velocity.x > 0.2, starts[nearest] <= current { target = min(nearest + 1, starts.count - 1) }
    if velocity.x < -0.2, starts[nearest] >= current { target = max(nearest - 1, 0) }
    targetContentOffset.pointee.x = min(starts[target], maxOffset)
  }
}

/// Several photos in a bubble: a deck of cards. Drag the front card away,
/// left or right, and the next comes forward.
final class DeckView: UIView, UIGestureRecognizerDelegate {
  private var cards: [MediaTileView] = [MediaTileView(), MediaTileView()]
  private let dim = UIView()
  private var dots: [UIView] = []
  private(set) var layout: DeckLayout?
  private(set) var index = 0
  private var theme = Theme()
  private lazy var pan = UIPanGestureRecognizer(target: self, action: #selector(dragged(_:)))
  var onIndex: ((Int) -> Void)?

  override init(frame: CGRect) {
    super.init(frame: frame)
    // The next card behind, then the front card.
    addSubview(cards[1])
    cards[1].addSubview(dim)
    addSubview(cards[0])
    pan.delegate = self
    addGestureRecognizer(pan)
  }

  required init?(coder: NSCoder) { fatalError() }

  var front: MediaTileView { cards[0] }

  func set(_ layout: DeckLayout, theme: Theme, index: Int) {
    self.layout = layout
    self.theme = theme
    self.index = min(max(0, index), layout.items.count - 1)
    while dots.count < min(layout.items.count, 12) {
      let dot = UIView()
      dot.layer.cornerRadius = 3
      addSubview(dot)
      dots.append(dot)
    }
    for (offset, dot) in dots.enumerated() { dot.isHidden = offset >= min(layout.items.count, 12) }
    dim.backgroundColor = theme.background.withAlphaComponent(0.15)
    show(animated: false)
  }

  private func cardFrame(_ index: Int) -> CGRect {
    guard let layout else { return .zero }
    let size = layout.sizes[index]
    return CGRect(x: 0, y: layout.cardTop, width: size.width, height: size.height)
  }

  private func show(animated: Bool) {
    guard let layout, !layout.items.isEmpty else { return }
    let next = (index + 1) % layout.items.count
    for (card, item) in [(cards[0], index), (cards[1], next)] {
      card.transform = .identity
      card.frame = cardFrame(item)
      card.set(layout.items[item], theme: theme, size: layout.sizes[item], badges: card === cards[0])
    }
    dim.frame = cards[1].bounds
    behind(progress: 0)
    let count = min(layout.items.count, 12)
    let total = CGFloat(count) * 6 + CGFloat(count - 1) * 4
    let width = layout.sizes[index].width
    for (offset, dot) in dots.prefix(count).enumerated() {
      dot.frame = CGRect(x: (width - total) / 2 + CGFloat(offset) * 10, y: layout.dotsY, width: 6, height: 6)
      dot.backgroundColor = offset == index % count ? theme.foreground : theme.muted.withAlphaComponent(0.4)
    }
  }

  /// The card behind comes forward as the front one is dragged away.
  private func behind(progress: CGFloat) {
    let p = min(1, max(0, progress))
    let scale = 0.94 + 0.06 * p
    cards[1].transform = CGAffineTransform(translationX: 0, y: -10 * (1 - p)).scaledBy(x: scale, y: scale)
    cards[1].alpha = 0.7 + 0.3 * p
    dim.alpha = 1 - p
  }

  override func gestureRecognizerShouldBegin(_ gesture: UIGestureRecognizer) -> Bool {
    guard gesture === pan, let layout, layout.items.count > 1 else { return false }
    let velocity = pan.velocity(in: self)
    return abs(velocity.x) > abs(velocity.y)
  }

  @objc private func dragged(_ pan: UIPanGestureRecognizer) {
    let x = pan.translation(in: self).x
    switch pan.state {
    case .changed:
      cards[0].transform = CGAffineTransform(translationX: x, y: 0).rotated(by: (12 * .pi / 180) * x / 200)
      behind(progress: abs(x) / 200)
    case .ended, .cancelled:
      let velocity = pan.velocity(in: self).x
      if abs(x) < 70 && abs(velocity) < 600 || pan.state == .cancelled {
        UIView.animate(withDuration: 0.4, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0) {
          self.cards[0].transform = .identity
          self.behind(progress: 0)
        }
        return
      }
      let direction: CGFloat = (abs(x) >= 70 ? x : velocity) < 0 ? -1 : 1
      UIView.animate(withDuration: 0.16, delay: 0, options: [.curveEaseOut]) {
        self.cards[0].transform = CGAffineTransform(translationX: 260 * direction, y: 0).rotated(by: direction * 12 * .pi / 180)
        self.behind(progress: 1)
      } completion: { _ in
        guard let layout = self.layout else { return }
        self.index = (self.index + 1) % layout.items.count
        self.onIndex?(self.index)
        self.show(animated: false)
      }
    default:
      break
    }
  }
}
