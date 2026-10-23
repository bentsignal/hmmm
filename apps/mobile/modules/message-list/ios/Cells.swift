import UIKit

// The list's cells, one class per row kind. The list is flipped (newest at
// the bottom), so each cell flips its content back. Cells are recycled:
// configuring one sets frames and content from its row's precomputed
// layout, reusing the part views it already has.

/// What cells share: the theme and state that outlives a recycled cell.
final class ListState {
  var theme = Theme()
  var behavior = Behavior()
  /// Where each carousel was left, by row and block.
  var carouselOffsets: [String: CGFloat] = [:]
  /// The front card of each deck, by row and block.
  var deckIndices: [String: Int] = [:]
  /// Highlighted rows whose tint has already faded.
  var highlightsShown: Set<String> = []
  /// How far the list is dragged left to reveal times.
  var reveal: CGFloat = 0
  var liftedRowId: String?
  /// Custom rows' React views, by row ID (CustomRows.swift).
  var customRows: [String: CustomRowView] = [:]
}

/// What a tap or hold landed on.
struct Hit {
  var event: [String: Any]
  /// The part's frame, in the cell's content view.
  var frame: CGRect
  var view: UIView?
}

class RowCell: UICollectionViewCell {
  private(set) var rowId: String?

  override init(frame: CGRect) {
    super.init(frame: frame)
    // The list is upside down; turn the content back.
    contentView.transform = CGAffineTransform(scaleX: 1, y: -1)
    contentView.clipsToBounds = false
    clipsToBounds = false
  }

  required init?(coder: NSCoder) { fatalError() }

  /// Sets the row. `animated` is true when this is the same row updating
  /// on screen, inside the list's animation.
  func configure(_ row: Row, _ layout: RowLayout, state: ListState, animated: Bool) {
    rowId = row.id
    contentView.alpha = state.liftedRowId == row.id ? 0 : 1
  }

  func setReveal(_ reveal: CGFloat) {}

  /// VoiceOver's double tap: the row's main action.
  var onActivate: (() -> Void)?

  override func accessibilityActivate() -> Bool {
    guard let onActivate else { return false }
    onActivate()
    return true
  }

  func hit(at point: CGPoint, hold: Bool) -> Hit? { nil }


  override func prepareForReuse() {
    super.prepareForReuse()
    Self.removeAnimations(contentView.layer)
  }

  private static func removeAnimations(_ layer: CALayer) {
    layer.removeAllAnimations()
    layer.sublayers?.forEach(removeAnimations)
  }

  /// A new row fades in as it rises into place.
  func fadeIn(duration: Double) {
    let fade = CABasicAnimation(keyPath: "opacity")
    fade.fromValue = 0
    fade.toValue = 1
    fade.duration = duration
    fade.timingFunction = CAMediaTimingFunction(controlPoints: 0.25, 0.1, 0.25, 1)
    contentView.layer.add(fade, forKey: "fadeIn")
  }
}

// MARK: Message

final class MessageCell: RowCell {
  private let highlight = UIView()
  /// Everything but the revealed time; your own rows slide left in it.
  private let body = UIView()
  /// The parts, dimmed while sending.
  private let parts = UIView()
  private let name = TextView()
  private let headerTime = TextView()
  private let avatar = AvatarView()
  private let revealTime = TextView()
  private let replyCurve = LineView()
  private let tapbacks = ReactionPool<TapbackView>()
  private let chips = ReactionPool<ChipView>()

  private var bubbles: [BubbleView] = []
  private var tiles: [MediaTileView] = []
  private var carousels: [CarouselView] = []
  private var decks: [DeckView] = []
  private var files: [FileView] = []
  private var cards: [LinkCardView] = []
  private var quotes: [QuoteView] = []
  private var quoteLines: [QuoteLineView] = []
  private var footers: [FooterView] = []

  /// The view drawn for each part, in order.
  private var partViews: [UIView] = []
  /// Part of this message is lifted into the menu (see Lift.swift): an
  /// update waits until it's back.
  var isLifted = false {
    didSet {
      guard !isLifted, let (row, layout, state) = pendingConfigure else { return }
      pendingConfigure = nil
      configure(row, layout, state: state, animated: false)
    }
  }
  private var pendingConfigure: (Row, RowLayout, ListState)?
  var bodyView: UIView { body }
  private(set) var layout: MessageLayout?
  private(set) var message: MessageRow?

  override init(frame: CGRect) {
    super.init(frame: frame)
    highlight.isUserInteractionEnabled = false
    contentView.addSubview(highlight)
    contentView.addSubview(body)
    body.addSubview(parts)
    body.addSubview(replyCurve)
    body.addSubview(name)
    body.addSubview(headerTime)
    body.addSubview(avatar)
    contentView.addSubview(revealTime)
  }

  required init?(coder: NSCoder) { fatalError() }

  override func layoutSubviews() {
    super.layoutSubviews()
    let bounds = contentView.bounds
    highlight.frame = bounds
    body.bounds = bounds
    body.center = CGPoint(x: bounds.midX, y: bounds.midY)
    parts.frame = body.bounds
  }

  override func configure(_ row: Row, _ rowLayout: RowLayout, state: ListState, animated: Bool) {
    guard let message = row.message, case let .message(layout) = rowLayout else { return }
    let sameRow = rowId == row.id
    if isLifted, sameRow {
      pendingConfigure = (row, rowLayout, state)
      return
    }
    super.configure(row, rowLayout, state: state, animated: animated)
    let animate = animated && sameRow
    let theme = state.theme
    self.layout = layout
    self.message = message
    let apply = {
      self.place(row.id, message, layout, state: state, animated: animate)
    }
    if animate { apply() } else { UIView.performWithoutAnimation(apply) }
    accessibilityLabel = message.accessibilityLabel
    isAccessibilityElement = true
    highlightIfNeeded(row.id, message, state: state, theme: theme, sameRow: sameRow)
    setReveal(state.reveal)
  }

  private func place(_ rowId: String, _ message: MessageRow, _ layout: MessageLayout, state: ListState, animated: Bool) {
    let theme = state.theme
    let bounds = CGRect(x: 0, y: 0, width: contentView.bounds.width, height: layout.height)
    body.bounds = bounds
    body.center = CGPoint(x: bounds.midX, y: bounds.midY)
    parts.frame = bounds
    highlight.frame = bounds
    parts.alpha = message.status == .sending ? 0.5 : 1

    /// A view that was hidden (or is new) takes its place without flying in
    /// from wherever it last was, fading in if the row is animating; one
    /// already showing moves within the animation.
    func show(_ view: UIView, _ configure: () -> Void) {
      guard view.isHidden else { return configure() }
      UIView.performWithoutAnimation(configure)
      view.isHidden = false
      if animated {
        let fade = CABasicAnimation(keyPath: "opacity")
        fade.fromValue = 0
        fade.duration = 0.2
        view.layer.add(fade, forKey: "show")
      }
    }

    // The sender's name and photo, and a stacked row's time.
    if let box = layout.name {
      show(name) {
        name.text = box.string
        name.frame = box.frame
      }
    } else {
      name.isHidden = true
    }
    if let box = layout.headerTime {
      show(headerTime) {
        headerTime.text = box.string
        headerTime.frame = box.frame
      }
      headerTime.alpha = message.status == nil ? 1 : 0
    } else {
      headerTime.isHidden = true
    }
    if let (person, frame) = layout.avatar {
      show(avatar) {
        avatar.frame = frame
        avatar.set(person, size: frame.width, theme: theme)
      }
    } else {
      avatar.isHidden = true
    }

    // The parts, reusing views of each kind in order.
    var used: [ObjectIdentifier: Int] = [:]
    func take<V: UIView>(_ pool: inout [V], make: () -> V) -> V {
      let key = ObjectIdentifier(V.self)
      let index = used[key, default: 0]
      used[key] = index + 1
      if index < pool.count { return pool[index] }
      let view = make()
      view.isHidden = true
      pool.append(view)
      parts.addSubview(view)
      return view
    }
    var views: [UIView] = []
    for part in layout.parts {
      let key = "\(rowId)#\(part.blockIndex)"
      switch part.content {
      case let .text(box, bubble, _):
        let view = take(&bubbles) { BubbleView() }
        show(view) {
          view.frame = part.frame
          view.set(box, bubble: bubble)
        }
        views.append(view)
      case let .media(item, _):
        let view = take(&tiles) { MediaTileView() }
        show(view) {
          view.frame = part.frame
          view.set(item, theme: theme, size: part.frame.size)
        }
        views.append(view)
      case let .carousel(carousel):
        let view = take(&carousels) { CarouselView() }
        show(view) {
          view.frame = part.frame
          view.onOffset = nil
          view.set(carousel, theme: theme, offset: state.carouselOffsets[key] ?? 0, animated: animated)
          view.onOffset = { [weak state] offset in state?.carouselOffsets[key] = offset }
        }
        views.append(view)
      case let .deck(deck):
        let view = take(&decks) { DeckView() }
        show(view) {
          view.frame = part.frame
          view.set(deck, theme: theme, index: state.deckIndices[key] ?? 0)
          view.onIndex = { [weak state] index in state?.deckIndices[key] = index }
        }
        views.append(view)
      case let .file(nameBox, sizeBox, icon, _):
        let view = take(&files) { FileView() }
        show(view) {
          view.frame = part.frame
          view.set(name: nameBox, size: sizeBox, icon: icon, theme: theme)
        }
        views.append(view)
      case let .linkCard(card):
        let view = take(&cards) { LinkCardView() }
        show(view) {
          view.frame = part.frame
          view.set(card, theme: theme)
        }
        views.append(view)
      case let .quote(author, text, thumbnail, url, _):
        let view = take(&quotes) { QuoteView() }
        show(view) {
          view.frame = part.frame
          view.set(author: author, text: text, thumbnail: thumbnail, url: url, theme: theme)
        }
        views.append(view)
      case let .quoteLine(face, person, text, elbow, _):
        let view = take(&quoteLines) { QuoteLineView() }
        show(view) {
          view.frame = part.frame
          view.set(face: face, person: person, text: text, elbow: elbow, theme: theme)
        }
        views.append(view)
      }
    }
    let pooled: [UIView] = bubbles + tiles + carousels + decks + files + cards + quotes + quoteLines
    for view in pooled where !views.contains(where: { $0 === view }) {
      view.isHidden = true
    }
    partViews = views

    if let frame = layout.replyCurve {
      show(replyCurve) {
        replyCurve.frame = frame
        replyCurve.set(.replyCurve(message.isOwn ? .right : .left), color: theme.separator)
      }
    } else {
      replyCurve.isHidden = true
    }

    // Lines under the message.
    for (index, piece) in layout.footer.enumerated() {
      if index >= footers.count {
        let view = FooterView()
        view.isHidden = true
        footers.append(view)
        parts.addSubview(view)
      }
      show(footers[index]) { footers[index].set(piece, theme: theme) }
    }
    for view in footers.dropFirst(layout.footer.count) { view.isHidden = true }

    // Reactions: tapbacks over the corner, or chips under the message.
    tapbacks.update(
      layout.tapbacks, id: \.id, frame: \.frame, in: body, animated: animated,
      make: { TapbackView() }, set: { $0.set($1, theme: theme) },
      popIn: { Pop.popIn($0, duration: 0.32, overshoot: 1.12) },
      popOut: { Pop.popOut($0, duration: 0.16) }
    )
    tapbacks.bringToFront(order: layout.tapbacks.sorted { $0.zIndex < $1.zIndex }.map(\.id))
    chips.update(
      layout.chips, id: \.id, frame: \.frame, in: body, animated: animated,
      make: { ChipView() }, set: { $0.set($1, theme: theme) },
      // The space opens first, then the chips appear in it.
      popIn: { Pop.popIn($0, duration: 0.28, overshoot: 1.06, delay: state.behavior.moveMs / 2000) },
      popOut: { Pop.popOut($0, duration: 0.14) }
    )

    if let box = layout.revealTime {
      show(revealTime) {
        revealTime.text = box.string
        revealTime.frame = box.frame
      }
    } else {
      revealTime.isHidden = true
    }
    accessibilityCustomActions = nil
  }

  private func highlightIfNeeded(_ rowId: String, _ message: MessageRow, state: ListState, theme: Theme, sameRow: Bool) {
    highlight.backgroundColor = theme.highlight
    // Already fading on this row: let it finish.
    if sameRow, highlight.layer.animationKeys() != nil { return }
    highlight.layer.removeAllAnimations()
    guard message.highlighted, !state.highlightsShown.contains(rowId) else {
      highlight.alpha = 0
      return
    }
    state.highlightsShown.insert(rowId)
    // Holds for 0.8 s, then fades over 1.6 s. Core Animation, not
    // UIView.animate: the first rows arrive inside React Native's prop
    // update, which turns UIView animations off.
    highlight.alpha = 0
    let fade = CAKeyframeAnimation(keyPath: "opacity")
    fade.values = [1, 1, 0]
    fade.keyTimes = [0, NSNumber(value: 0.8 / 2.4), 1]
    fade.timingFunctions = [CAMediaTimingFunction(name: .linear), CAMediaTimingFunction(name: .easeInEaseOut)]
    fade.duration = 2.4
    highlight.layer.add(fade, forKey: "highlight")
  }

  override func setReveal(_ reveal: CGFloat) {
    let reveal = message?.layout == .bubbles ? reveal : 0
    revealTime.alpha = reveal / Metrics.revealWidth
    revealTime.transform = CGAffineTransform(translationX: -reveal, y: 0)
    body.transform = layout?.slides == true ? CGAffineTransform(translationX: -reveal, y: 0) : .identity
  }

  /// A message from someone typing grows out of their indicator: its first
  /// bubble starts as the typing bubble and opens to its full size.
  func grow(from typing: CGRect, duration: Double) {
    guard let bubble = partViews.first as? BubbleView else { return }
    let final = bubble.frame
    UIView.performWithoutAnimation {
      bubble.frame = CGRect(x: final.minX, y: final.maxY - typing.height, width: typing.width, height: typing.height)
      bubble.text.alpha = 0
    }
    UIView.animate(withDuration: duration, delay: 0, options: [.beginFromCurrentState]) {
      bubble.frame = final
    }
    UIView.animate(withDuration: 0.22, delay: duration / 3, options: []) {
      bubble.text.alpha = 1
    }
  }

  // MARK: Lifting into the menu

  /// The held part (by the `part` and `index` a hold reported) and its
  /// tapbacks, in the message's coordinates. `frameOnly` asks just where
  /// it goes (while its views are out).
  func liftPieces(part: String?, index: Int?, frameOnly: Bool = false) -> LiftPieces? {
    guard let layout else { return nil }
    func holds(_ candidate: PartLayout) -> Bool {
      guard let part else { return false }
      if candidate.part == part { return true }
      switch candidate.content {
      case let .media(item, _): return item.part == part
      case let .carousel(carousel): return carousel.items.contains { $0.part == part }
      case let .deck(deck): return deck.items.contains { $0.part == part }
      default: return false
      }
    }
    guard let at = layout.parts.firstIndex(where: holds) ?? (layout.parts.isEmpty ? nil : 0) else { return nil }
    let held = layout.parts[at]
    if frameOnly { return LiftPieces(frame: held.frame, views: []) }
    guard at < partViews.count else { return nil }
    var views = [partViews[at]]
    // Its tapbacks go with it: those over this part's top corner.
    let corner = held.frame.insetBy(dx: -Metrics.tapbackOverhang - 1, dy: -Metrics.tapbackSpace - 1)
    for tapback in layout.tapbacks
      where (part != nil && tapback.part == part) || (tapback.frame.midY < held.frame.minY + 10 && corner.contains(tapback.frame)) {
      if let view = tapbacks.views[tapback.id] { views.append(view) }
    }
    return LiftPieces(frame: held.frame, views: views)
  }

  // MARK: Taps and holds

  override func hit(at point: CGPoint, hold: Bool) -> Hit? {
    guard let layout, let message, let rowId else { return nil }
    let point = body.convert(point, from: contentView)
    var base: [String: Any] = ["rowId": rowId]

    func press(_ target: String, _ extra: [String: Any] = [:], frame: CGRect, view: UIView? = nil) -> Hit {
      var event = base
      event["type"] = hold ? "hold" : "press"
      if !hold { event["element"] = target }
      for (key, value) in extra { event[key] = value }
      return Hit(event: event, frame: body.convert(frame, to: contentView), view: view)
    }

    if !hold {
      for tapback in layout.tapbacks.reversed() where tapback.frame.insetBy(dx: -6, dy: -6).contains(point) {
        return press("reaction", ["part": tapback.part, "reactionKey": tapback.reaction.key], frame: tapback.frame)
      }
      for chip in layout.chips where chip.frame.insetBy(dx: -2, dy: -2).contains(point) {
        return press("reaction", ["part": chip.part, "reactionKey": chip.reaction.key], frame: chip.frame)
      }
      if let (_, frame) = layout.avatar, frame.insetBy(dx: -4, dy: -4).contains(point) {
        return press("author", ["accountId": message.author.id], frame: frame)
      }
      if let name = layout.name, name.frame.insetBy(dx: -4, dy: -4).contains(point) {
        return press("author", ["accountId": message.author.id], frame: name.frame)
      }
      for (index, piece) in layout.footer.enumerated() where index < footers.count {
        if footers[index].frame.insetBy(dx: -4, dy: -6).contains(point) {
          switch piece {
          case .replies: return press("replies", frame: footers[index].frame)
          case .notSent: return press("notSent", frame: footers[index].frame)
          case .edited: break
          }
        }
      }
    }

    for (index, part) in layout.parts.enumerated() where index < partViews.count {
      let view = partViews[index]
      guard part.frame.contains(point) else { continue }
      if let id = part.part { base["part"] = id }
      let local = view.convert(point, from: body)
      switch part.content {
      case .text:
        if !hold, let bubble = view as? BubbleView,
           let span = bubble.text.spanIndex(at: bubble.text.convert(local, from: bubble)),
           case let .text(spans, _, _) = message.blocks[part.blockIndex], span < spans.count {
          let span = spans[span]
          if span.style == .link { return press("link", ["url": span.url ?? span.text], frame: part.frame, view: view) }
          if span.style == .mention { return press("mention", ["accountId": span.accountId ?? ""], frame: part.frame, view: view) }
        }
        return press("message", frame: part.frame, view: view)
      case let .media(item, _):
        return press("media", ["index": 0, "part": item.part], frame: part.frame, view: view)
      case let .carousel(carousel):
        guard let strip = view as? CarouselView else { break }
        let inStrip = strip.convert(point, from: body)
        if !hold, let chip = strip.chip(at: inStrip) {
          return press("reaction", ["part": chip.part, "reactionKey": chip.reaction.key], frame: strip.convert(chip.frame, to: body))
        }
        if let card = strip.index(at: inStrip), let frame = strip.cardFrame(card) {
          return press("media", ["index": card, "part": carousel.items[card].part], frame: strip.convert(frame, to: body), view: view)
        }
        return nil
      case let .deck(deck):
        guard let stack = view as? DeckView else { break }
        let card = stack.index
        return press("media", ["index": card, "part": deck.items[card].part], frame: stack.convert(stack.front.frame, to: body), view: stack.front)
      case let .file(_, _, _, url):
        return press("file", ["url": url], frame: part.frame, view: view)
      case let .linkCard(card):
        return press("linkCard", ["url": card.card.url], frame: part.frame, view: view)
      case let .quote(_, _, _, _, messageId), let .quoteLine(_, _, _, _, messageId):
        return press("quote", ["messageId": messageId], frame: part.frame, view: view)
      }
    }
    if message.layout == .stacked || hold && layout.bounds.contains(point) {
      // A stacked row is one target, edge to edge.
      return press("message", frame: hold ? layout.bounds : body.bounds)
    }
    return nil
  }

  // MARK: Accessibility

  /// The part the message's own reactions belong to: its text.
  static func messagePart(_ message: MessageRow) -> String {
    for block in message.blocks {
      if case let .text(_, _, part) = block { return part ?? "message" }
    }
    return message.blocks.first?.part ?? "message"
  }

  func accessibilityActions(send: @escaping ([String: Any]) -> Void) -> [UIAccessibilityCustomAction] {
    guard let message, let rowId else { return [] }
    var actions: [UIAccessibilityCustomAction] = []
    func action(_ name: String, _ event: [String: Any]) {
      var event = event
      event["type"] = "press"
      event["rowId"] = rowId
      if let target = event.removeValue(forKey: "target") { event["element"] = target }
      actions.append(UIAccessibilityCustomAction(name: name) { _ in send(event); return true })
    }
    for block in message.blocks {
      switch block {
      case let .text(spans, _, _):
        for span in spans where span.style == .link {
          action(span.text, ["target": "link", "url": span.url ?? span.text])
        }
      case let .media(items, _):
        for (index, item) in items.enumerated() {
          action(item.kind == .video ? "Video \(index + 1)" : "Photo \(index + 1)", ["target": "media", "index": index, "part": item.part])
        }
      case let .file(name, _, url, _):
        action(name, ["target": "file", "url": url])
      case let .linkCard(card):
        action(card.title ?? card.site, ["target": "linkCard", "url": card.url])
      case let .quote(author, _, _, messageId, _):
        action(author.name, ["target": "quote", "messageId": messageId])
      default:
        break
      }
    }
    for reaction in message.reactions {
      action("\(reaction.label) \(reaction.count)", ["target": "reaction", "reactionKey": reaction.key, "part": Self.messagePart(message)])
    }
    for line in message.footer where line.kind != .edited {
      action(line.text, ["target": line.kind == .replies ? "replies" : "notSent"])
    }
    return actions
  }
}

/// A line under a message: "2 replies" with faces, "Edited", "Not sent".
final class FooterView: UIView {
  private let label = TextView()
  private let icon = UIImageView()
  private let chevron = UIImageView()
  private var faces: [AvatarView] = []

  override init(frame: CGRect) {
    super.init(frame: frame)
    icon.image = UIImage(systemName: "exclamationmark.circle.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 12))
    icon.contentMode = .center
    chevron.image = UIImage(systemName: "chevron.right", withConfiguration: UIImage.SymbolConfiguration(pointSize: 10, weight: .bold))
    chevron.contentMode = .center
    addSubview(icon)
    addSubview(chevron)
    addSubview(label)
  }

  required init?(coder: NSCoder) { fatalError() }

  func set(_ piece: FooterPiece, theme: Theme) {
    icon.isHidden = true
    chevron.isHidden = true
    backgroundColor = nil
    faces.forEach { $0.isHidden = true }
    switch piece {
    case let .edited(box):
      frame = box.frame
      label.text = box.string
      label.frame = bounds
    case let .notSent(frame, iconFrame, box):
      self.frame = frame
      icon.isHidden = false
      icon.tintColor = theme.destructive
      icon.frame = iconFrame
      label.text = box.string
      label.frame = box.frame
    case let .replies(frame, people, box, pill, chevronFrame):
      self.frame = frame
      if pill {
        backgroundColor = theme.fill
        layer.cornerRadius = frame.height / 2
      }
      while faces.count < people.count {
        let face = AvatarView()
        insertSubview(face, belowSubview: label)
        faces.append(face)
      }
      // The first face is on top.
      for (index, (person, faceFrame)) in people.enumerated() {
        let face = faces[index]
        face.isHidden = false
        face.frame = faceFrame
        face.set(person, size: faceFrame.width, theme: theme, ring: 1)
        sendSubviewToBack(face)
      }
      label.text = box.string
      label.frame = box.frame
      if let chevronFrame {
        chevron.isHidden = false
        chevron.tintColor = theme.muted
        chevron.frame = chevronFrame
      }
    }
  }
}

// MARK: Headers, notices, fallbacks

final class TextRowCell: RowCell {
  private let label = TextView()
  private let leftRule = CAGradientLayer()
  private let rightRule = CAGradientLayer()

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.addSubview(label)
    leftRule.startPoint = CGPoint(x: 0, y: 0.5)
    leftRule.endPoint = CGPoint(x: 1, y: 0.5)
    rightRule.startPoint = CGPoint(x: 1, y: 0.5)
    rightRule.endPoint = CGPoint(x: 0, y: 0.5)
    contentView.layer.addSublayer(leftRule)
    contentView.layer.addSublayer(rightRule)
    isAccessibilityElement = true
  }

  required init?(coder: NSCoder) { fatalError() }

  override func configure(_ row: Row, _ layout: RowLayout, state: ListState, animated: Bool) {
    super.configure(row, layout, state: state, animated: animated)
    var rules = false
    let box: TextBox
    switch layout {
    case let .header(text, _, hasRules):
      box = text
      rules = hasRules
      accessibilityTraits = .header
    case let .notice(text, _), let .fallback(text, _):
      box = text
      accessibilityTraits = .staticText
    default:
      return
    }
    UIView.performWithoutAnimation {
      label.text = box.string
      label.frame = box.frame
    }
    accessibilityLabel = box.string.string
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    leftRule.isHidden = !rules
    rightRule.isHidden = !rules
    if rules {
      // Strongest next to the label, fading out toward the edges.
      let colors = [state.theme.separator.withAlphaComponent(0).cgColor, state.theme.separator.cgColor]
      leftRule.opacity = 0.6
      rightRule.opacity = 0.6
      leftRule.colors = colors
      rightRule.colors = colors
      let y = box.frame.midY
      let pad = state.theme.horizontalPadding
      leftRule.frame = CGRect(x: pad, y: y, width: max(0, box.frame.minX - 12 - pad), height: 1)
      rightRule.frame = CGRect(x: box.frame.maxX + 12, y: y, width: max(0, contentView.bounds.width - pad - box.frame.maxX - 12), height: 1)
    }
    CATransaction.commit()
  }
}

// MARK: Typing

final class TypingCell: RowCell {
  private let bubble = BubbleView()
  private var faces: [AvatarView] = []
  private let overflow = TextView()
  private let overflowBack = UIView()
  private let label = TextView()
  private let dots = (0..<3).map { _ in UIView() }
  private var layout: TypingLayout?

  override init(frame: CGRect) {
    super.init(frame: frame)
    contentView.addSubview(overflowBack)
    contentView.addSubview(overflow)
    contentView.addSubview(bubble)
    contentView.addSubview(label)
    dots.forEach(contentView.addSubview)
    isAccessibilityElement = true
  }

  required init?(coder: NSCoder) { fatalError() }

  override func configure(_ row: Row, _ rowLayout: RowLayout, state: ListState, animated: Bool) {
    guard case let .typing(layout) = rowLayout, case let .typing(_, people, label) = row.content else { return }
    super.configure(row, rowLayout, state: state, animated: animated)
    self.layout = layout
    let theme = state.theme
    UIView.performWithoutAnimation {
      while faces.count < layout.faces.count {
        let face = AvatarView()
        contentView.insertSubview(face, at: 0)
        faces.append(face)
      }
      for (index, face) in faces.enumerated() {
        guard index < layout.faces.count else {
          face.isHidden = true
          continue
        }
        let (person, frame) = layout.faces[index]
        face.isHidden = false
        face.frame = frame.insetBy(dx: -layout.faceRing, dy: -layout.faceRing)
        face.set(person, size: face.frame.width, theme: theme, ring: layout.faceRing)
      }
      // The first face is on top.
      for face in faces.prefix(layout.faces.count) { contentView.sendSubviewToBack(face) }
      if let box = layout.overflow {
        overflow.isHidden = false
        overflowBack.isHidden = layout.bubble == nil
        overflow.text = box.string
        overflow.frame = box.frame.insetBy(dx: 0, dy: (box.frame.height - 16) / 2)
        overflowBack.frame = box.frame
        overflowBack.backgroundColor = theme.bubbleIncoming
        overflowBack.layer.cornerRadius = box.frame.height / 2
      } else {
        overflow.isHidden = true
        overflowBack.isHidden = true
      }
      if let frame = layout.bubble {
        bubble.isHidden = false
        bubble.frame = frame
        bubble.set(TextBox(string: NSAttributedString(), frame: .zero), bubble: BubbleStyle(fill: theme.bubbleIncoming, border: nil, radius: frame.height / 2, tail: .left))
      } else {
        bubble.isHidden = true
      }
      if let box = layout.label {
        self.label.isHidden = false
        self.label.text = box.string
        self.label.frame = box.frame
      } else {
        self.label.isHidden = true
      }
      for (index, dot) in dots.enumerated() {
        dot.frame = layout.dots[index]
        dot.layer.cornerRadius = layout.dots[index].width / 2
        dot.backgroundColor = theme.muted
      }
    }
    accessibilityLabel = label.isEmpty ? people.map(\.name).joined(separator: ", ") : label
    animateDots()
  }

  /// 1300 ms loop: each dot brightens and grows in turn.
  private func animateDots() {
    let now = CACurrentMediaTime()
    for (index, dot) in dots.enumerated() {
      if dot.layer.animation(forKey: "typing") != nil { continue }
      let opacity = CAKeyframeAnimation(keyPath: "opacity")
      opacity.values = [0.35, 1, 0.35, 0.35]
      let scale = CAKeyframeAnimation(keyPath: "transform.scale")
      scale.values = [0.85, 1.05, 0.85, 0.85]
      for animation in [opacity, scale] {
        animation.keyTimes = [0, 0.25, 0.5, 1]
        animation.timingFunctions = Array(repeating: CAMediaTimingFunction(name: .easeInEaseOut), count: 3)
      }
      let group = CAAnimationGroup()
      group.animations = [opacity, scale]
      group.duration = 1.3
      group.repeatCount = .infinity
      group.beginTime = now + Double(index) * 0.26
      group.fillMode = .backwards
      group.isRemovedOnCompletion = false
      dot.layer.add(group, forKey: "typing")
    }
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    dots.forEach { $0.layer.removeAnimation(forKey: "typing") }
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil, layout != nil { animateDots() }
  }

  /// Appearing: grows from its bottom-left corner.
  func appear() {
    let anchor = CGPoint(x: layout?.bubble?.minX ?? 16, y: layout?.height ?? contentView.bounds.height)
    let view = contentView
    view.alpha = 0
    let size = view.bounds.size
    let dx = anchor.x - size.width / 2
    let dy = anchor.y - size.height / 2
    // Scale about the anchor, inside the cell's flip.
    let flip = CGAffineTransform(scaleX: 1, y: -1)
    view.transform = flip.translatedBy(x: dx, y: dy).scaledBy(x: 0.75, y: 0.75).translatedBy(x: -dx, y: -dy)
    UIView.animate(withDuration: 0.315, delay: 0.105, options: [.allowUserInteraction]) {
      view.alpha = 1
      view.transform = flip
    }
  }

}
