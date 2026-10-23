import UIKit

// Every row's height and the frames of everything in it, computed from data
// (text sizes, media dimensions) before a cell ever shows it. This runs off
// the main thread and is cached per row and width, so a cell only sets
// frames and content. The numbers match the React Native list
// (features/conversation): see .plans/native-message-list.md.

/// Text with the frame it's drawn in (relative to its container).
struct TextBox {
  var string: NSAttributedString
  var frame: CGRect
  var lines: Int = 0
}

enum Side { case left, right }

struct BubbleStyle {
  var fill: UIColor?
  var border: UIColor?
  var radius: CGFloat
  /// The side the tail is drawn on, or nil for none.
  var tail: Side?
}

struct TapbackLayout {
  /// Unique within the row: the reaction part, key, and copy.
  var id: String
  var part: String
  var reaction: Reaction
  var tinted: Bool
  var frame: CGRect
  var zIndex: Int
}

struct ChipLayout {
  var id: String
  var part: String
  var reaction: Reaction
  var text: TextBox
  var frame: CGRect
}

struct CarouselLayout {
  var items: [MediaItem]
  /// Each card's frame in the strip's content.
  var cards: [CGRect]
  var chips: [ChipLayout]
  var contentWidth: CGFloat
  var leadingInset: CGFloat
}

struct DeckLayout {
  var items: [MediaItem]
  /// Each card's size; the front card is drawn at the top-left of the box.
  var sizes: [CGSize]
  var cardTop: CGFloat
  var dotsY: CGFloat
}

struct LinkCardLayout {
  var card: Block.LinkCard
  var image: CGRect?
  var site: TextBox?
  var title: TextBox?
  var description: TextBox?
  /// A link with no preview: a link icon beside its host and address.
  var icon: CGRect?
}

enum PartContent {
  /// A text bubble, plain stacked text, or jumbo emoji (no bubble).
  case text(TextBox, bubble: BubbleStyle?, spans: [Span])
  case media(MediaItem, radius: CGFloat)
  case carousel(CarouselLayout)
  case deck(DeckLayout)
  case file(name: TextBox, size: TextBox, icon: CGRect, url: String)
  case linkCard(LinkCardLayout)
  /// A reply's quote card (bubbles).
  case quote(author: TextBox, text: TextBox, thumbnail: CGRect?, thumbnailUrl: URL?, messageId: String)
  /// A reply's quote line above a stacked row: an 18pt face and one line.
  case quoteLine(face: CGRect, person: Person, text: TextBox, elbow: CGRect, messageId: String)
}

struct PartLayout {
  var frame: CGRect
  var content: PartContent
  var part: String?
  var blockIndex: Int
}

enum FooterPiece {
  case replies(frame: CGRect, faces: [(Person, CGRect)], label: TextBox, pill: Bool, chevron: CGRect?)
  case edited(TextBox)
  case notSent(frame: CGRect, icon: CGRect, label: TextBox)
}

struct MessageLayout {
  var height: CGFloat
  var parts: [PartLayout] = []
  var name: TextBox?
  var avatar: (person: Person, frame: CGRect)?
  var headerTime: TextBox?
  var tapbacks: [TapbackLayout] = []
  var chips: [ChipLayout] = []
  var footer: [FooterPiece] = []
  var replyCurve: CGRect?
  /// The time revealed by dragging the list left (bubbles).
  var revealTime: TextBox?
  /// Your own bubbles slide left as times are revealed.
  var slides = false
  /// Everything the message draws, for the frame a hold reports.
  var bounds: CGRect = .zero
}

struct TypingLayout {
  var height: CGFloat
  var faces: [(Person, CGRect)]
  var faceRing: CGFloat
  var bubble: CGRect?
  var label: TextBox?
  var dots: [CGRect]
  var overflow: TextBox?
}

enum RowLayout {
  case message(MessageLayout)
  case header(TextBox, height: CGFloat, rules: Bool)
  case notice(TextBox, height: CGFloat)
  case typing(TypingLayout)
  case fallback(TextBox, height: CGFloat)
  /// A custom row drawn by React, as tall as React laid it out.
  case custom(height: CGFloat)

  var height: CGFloat {
    switch self {
    case let .message(layout): return layout.height
    case let .header(_, height, _), let .notice(_, height), let .fallback(_, height): return height
    case let .custom(height): return height
    case let .typing(layout): return layout.height
    }
  }
}

enum Metrics {
  static let bubbleAvatar: CGFloat = 28
  static let avatarGap: CGFloat = 10
  static let tailDrop: CGFloat = 7
  static let partGap: CGFloat = 4
  static let tapback: CGFloat = 34
  static let tapbackPeek: CGFloat = 14
  static let tapbackSpace: CGFloat = 25
  static let tapbackOverhang: CGFloat = 14
  static let nameSpace: CGFloat = 22
  static let mediaWidth: CGFloat = 240
  static let mediaMaxHeight: CGFloat = 300
  static let mediaRadius: CGFloat = 16
  static let cardWidth: CGFloat = 256
  static let replyIndent: CGFloat = 22
  static let revealWidth: CGFloat = 72
  static let chipHeight: CGFloat = 26
  static let carouselHeight: CGFloat = 200
  static let carouselGap: CGFloat = 6
  static let deckWidth: CGFloat = 220
  static let typingBubble = CGSize(width: 60, height: 38)
}

/// Measures text the way `TextView` draws it.
func measure(_ string: NSAttributedString, width: CGFloat, maxLines: Int = 0, lineHeight: CGFloat) -> CGSize {
  guard string.length > 0 else { return .zero }
  let rect = string.boundingRect(
    with: CGSize(width: max(1, width), height: .greatestFiniteMagnitude),
    options: [.usesLineFragmentOrigin, .usesFontLeading],
    context: nil
  )
  var height = ceil(rect.height)
  if maxLines > 0 { height = min(height, CGFloat(maxLines) * lineHeight) }
  return CGSize(width: min(ceil(rect.width), width), height: max(height, lineHeight))
}

struct Measurer {
  let theme: Theme
  let width: CGFloat
  /// Custom rows React has laid out, by row ID (CustomRows.swift).
  var customHeights: [String: CGFloat] = [:]

  func layout(_ row: Row) -> RowLayout {
    switch row.content {
    case let .message(message):
      return .message(message.layout == .bubbles ? bubbles(message) : stacked(message))
    case let .header(style, label):
      // A day separator (stacked) draws between rules; a time header doesn't.
      return style == "day" ? stackedHeader(label: label) : header(style: style, label: label)
    case let .notice(spans):
      return notice(spans)
    case let .typing(layout, people, label):
      return .typing(typing(layout: layout, people: people, label: label))
    case let .custom(text):
      if let height = customHeights[row.id] { return .custom(height: height) }
      return fallback(text)
    case let .fallback(text):
      return fallback(text)
    }
  }

  /// Plain text in a row's place: an unknown kind, or a custom row React
  /// hasn't drawn yet.
  func fallback(_ text: String) -> RowLayout {
    let attributes = Fonts.attributes(Fonts.system(theme.caption.size), theme.muted, lineHeight: theme.caption.lineHeight, alignment: .center)
    let string = NSAttributedString(string: text, attributes: attributes)
    let size = measure(string, width: width - 64, lineHeight: theme.caption.lineHeight)
    return .fallback(TextBox(string: string, frame: CGRect(x: 32, y: 8, width: width - 64, height: size.height)), height: size.height + 16)
  }

  // MARK: Text

  func spansString(_ spans: [Span], size: CGFloat, lineHeight: CGFloat, color: UIColor, mentionColor: UIColor, italic: Bool = false) -> NSAttributedString {
    let result = NSMutableAttributedString()
    let base = Fonts.attributes(Fonts.system(size, italic: italic), color, lineHeight: lineHeight)
    for (index, span) in spans.enumerated() {
      var attributes = base
      switch span.style {
      case .bold: attributes[.font] = Fonts.system(size, .semibold)
      case .italic: attributes[.font] = Fonts.system(size, italic: true)
      case .code: attributes[.font] = UIFont.monospacedSystemFont(ofSize: size * 0.94, weight: .regular)
      case .link:
        attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
        attributes[.spanIndex] = index
      case .mention:
        attributes[.font] = Fonts.system(size, .semibold)
        attributes[.foregroundColor] = mentionColor
        attributes[.spanIndex] = index
      case nil: break
      }
      result.append(NSAttributedString(string: span.text, attributes: attributes))
    }
    return result
  }

  func plain(_ text: String, _ size: CGFloat, _ color: UIColor, weight: UIFont.Weight = .regular, lineHeight: CGFloat? = nil, italic: Bool = false, alignment: NSTextAlignment = .natural, truncate: Bool = false) -> NSAttributedString {
    NSAttributedString(string: text, attributes: Fonts.attributes(
      Fonts.system(size, weight, italic: italic), color, lineHeight: lineHeight, alignment: alignment,
      lineBreak: truncate ? .byTruncatingTail : .byWordWrapping
    ))
  }

  func box(_ string: NSAttributedString, x: CGFloat, y: CGFloat, maxWidth: CGFloat, lineHeight: CGFloat, maxLines: Int = 0) -> TextBox {
    let size = measure(string, width: maxWidth, maxLines: maxLines, lineHeight: lineHeight)
    return TextBox(string: string, frame: CGRect(x: x, y: y, width: size.width, height: size.height), lines: maxLines)
  }

  // MARK: Reactions

  /// Tapbacks for a part: each person's reaction is its own, and only the
  /// newest three show, the newest in front at the corner.
  func tapbacks(_ reactions: [Reaction], part: String, over frame: CGRect, side: Side) -> [TapbackLayout] {
    var copies: [(Reaction, Bool, String)] = []
    // Only the newest three show, so only the last three copies matter.
    for reaction in reactions.suffix(3) {
      let count = max(1, reaction.count)
      for copy in max(0, count - 3)..<count {
        let tinted = reaction.mine && copy == count - 1
        copies.append((reaction, tinted, "\(part)|\(reaction.key)|\(copy)"))
      }
    }
    let shown = Array(copies.suffix(3))
    let size = Metrics.tapback
    let top = frame.minY - Metrics.tapbackSpace
    return shown.enumerated().map { index, copy in
      let behind = CGFloat(shown.count - 1 - index)
      let x: CGFloat
      if side == .right {
        // Incoming: the top-right corner, older ones toward the middle.
        x = frame.maxX + Metrics.tapbackOverhang - size - behind * Metrics.tapbackPeek
      } else {
        x = frame.minX - Metrics.tapbackOverhang + behind * Metrics.tapbackPeek
      }
      return TapbackLayout(id: copy.2, part: part, reaction: copy.0, tinted: copy.1, frame: CGRect(x: x, y: top, width: size, height: size), zIndex: index)
    }
  }

  /// The width of a tapback fan.
  func fanWidth(_ reactions: [Reaction]) -> CGFloat {
    let count = min(3, reactions.reduce(0) { $0 + max(1, $1.count) })
    return count == 0 ? 0 : Metrics.tapback + CGFloat(count - 1) * Metrics.tapbackPeek
  }

  func chipText(_ reaction: Reaction) -> NSAttributedString {
    let color = reaction.mine ? theme.accent : theme.muted
    let result = NSMutableAttributedString()
    if reaction.imageUrl == nil {
      result.append(plain(reaction.emoji ?? reaction.label, 13, color, lineHeight: 18))
      result.append(plain(" ", 4, color, lineHeight: 18))
    }
    result.append(plain("\(reaction.count)", 13, color, weight: .semibold, lineHeight: 18))
    return result
  }

  /// Chips laid out in rows that wrap within `width`, starting at the origin.
  func chips(_ reactions: [Reaction], part: String, origin: CGPoint, width: CGFloat) -> (chips: [ChipLayout], height: CGFloat) {
    guard !reactions.isEmpty else { return ([], 0) }
    var x: CGFloat = 0
    var y: CGFloat = 4
    var result: [ChipLayout] = []
    for reaction in reactions {
      let string = chipText(reaction)
      let textSize = measure(string, width: 200, lineHeight: 18)
      let imageWidth: CGFloat = reaction.imageUrl == nil ? 0 : 20
      let chipWidth = 8 + imageWidth + textSize.width + 8
      if x > 0 && x + chipWidth > width {
        x = 0
        y += Metrics.chipHeight + 4
      }
      let frame = CGRect(x: origin.x + x, y: origin.y + y, width: chipWidth, height: Metrics.chipHeight)
      let text = TextBox(string: string, frame: CGRect(x: 8 + imageWidth, y: (Metrics.chipHeight - textSize.height) / 2, width: textSize.width, height: textSize.height))
      result.append(ChipLayout(id: "\(part)|\(reaction.key)", part: part, reaction: reaction, text: text, frame: frame))
      x += chipWidth + 4
    }
    return (result, y + Metrics.chipHeight)
  }

  // MARK: Media sizes

  func mediaSize(_ item: MediaItem, maxWidth: CGFloat) -> CGSize {
    let width = min(Metrics.mediaWidth, maxWidth)
    let height = min(Metrics.mediaMaxHeight, (width * item.height / item.width).rounded())
    return CGSize(width: width, height: max(60, height))
  }

  func carouselCardSize(_ item: MediaItem) -> CGSize {
    let height = Metrics.carouselHeight
    let width = min(250, max(130, (height * item.width / item.height).rounded()))
    return CGSize(width: width, height: height)
  }

  func deckCardSize(_ item: MediaItem) -> CGSize {
    let width = Metrics.deckWidth
    return CGSize(width: width, height: min(280, max(160, (width * item.height / item.width).rounded())))
  }

  // MARK: Bubbles

  func bubbles(_ message: MessageRow) -> MessageLayout {
    let pad = theme.horizontalPadding
    let incomingGroup = !message.isOwn && message.showAuthor
    let column = incomingGroup ? Metrics.bubbleAvatar + Metrics.avatarGap : 0
    let rowWidth = width - pad * 2
    // 75% of the row inside its margins, as the React Native list's
    // `max-w-[75%]` (not rounded: a wrap there is a point narrower).
    var maxBubble = min(rowWidth * theme.bubbleMaxWidthFraction, rowWidth - column)
    let left = pad + column
    let right = width - pad
    let side: Side = message.isOwn ? .right : .left
    let tapbackSide: Side = message.isOwn ? .left : .right
    let textColor = message.isOwn ? theme.textOutgoing : theme.textIncoming
    let bubbleColor = message.isOwn ? theme.bubbleOutgoing : theme.bubbleIncoming
    let mentionColor = message.isOwn ? theme.textOutgoing : theme.accent
    let hasLinkCard = message.blocks.contains { if case .linkCard = $0 { return true } else { return false } }
    // The message's own reactions go on its text (or its first part).
    let reactionBlock = message.blocks.firstIndex { if case .text = $0 { return true } else { return false } } ?? 0
    let lastTextBlock = message.blocks.lastIndex { block in
      if case let .text(_, jumbo, _) = block { return !jumbo }
      return false
    }

    var layout = MessageLayout(height: 0)
    layout.slides = message.isOwn
    var y = message.startsGroup ? theme.runGap : theme.rowGap
    let top = y

    var nameWidth: CGFloat = 0
    if incomingGroup && message.startsGroup {
      let string = plain(message.author.name, theme.name.size, theme.muted, lineHeight: theme.name.lineHeight, truncate: true)
      let name = box(string, x: left + 12, y: 0, maxWidth: maxBubble - 24, lineHeight: theme.name.lineHeight, maxLines: 1)
      layout.name = name
      nameWidth = name.frame.width
    }

    var indent: CGFloat = 0
    var quoteFrame: CGRect?
    var bodyTop: CGFloat?
    for (index, block) in message.blocks.enumerated() {
      let first = layout.parts.isEmpty
      let reactions: [Reaction]
      switch block {
      case let .media(items, _) where items.count == 1: reactions = items[0].reactions
      case let .media(items, _): reactions = mergedReactions(items)
      default: reactions = index == reactionBlock ? message.reactions : []
      }
      let fan = fanWidth(reactions)

      // Size the part first; its x depends on its width.
      let available = maxBubble - indent
      var size: CGSize
      var content: PartContent
      var tail: Bool = false
      switch block {
      case let .text(spans, jumbo, _):
        if jumbo {
          let string = spansString(spans, size: theme.jumbo.size, lineHeight: theme.jumbo.lineHeight, color: theme.foreground, mentionColor: theme.accent)
          let text = box(string, x: 0, y: 0, maxWidth: available, lineHeight: theme.jumbo.lineHeight)
          size = text.frame.size
          content = .text(text, bubble: nil, spans: spans)
        } else {
          let string = spansString(spans, size: theme.body.size, lineHeight: theme.body.lineHeight, color: textColor, mentionColor: mentionColor)
          var text = box(string, x: 14, y: 8, maxWidth: available - 28, lineHeight: theme.body.lineHeight)
          text.frame.size.width = max(text.frame.width, 1)
          size = CGSize(width: text.frame.width + 28, height: text.frame.height + 16)
          tail = message.endsGroup && !hasLinkCard && index == lastTextBlock
          content = .text(text, bubble: BubbleStyle(fill: bubbleColor, border: nil, radius: theme.bubbleRadius, tail: tail ? side : nil), spans: spans)
        }
      case let .deleted(label, _):
        let string = plain(label, theme.body.size, theme.muted, lineHeight: theme.body.lineHeight, italic: true)
        let text = box(string, x: 14, y: 8, maxWidth: available - 28, lineHeight: theme.body.lineHeight)
        size = CGSize(width: text.frame.width + 28, height: text.frame.height + 16)
        content = .text(text, bubble: BubbleStyle(fill: nil, border: theme.separator, radius: theme.bubbleRadius, tail: nil), spans: [])
      case let .media(items, _):
        if items.count == 1 {
          size = mediaSize(items[0], maxWidth: available)
          content = .media(items[0], radius: Metrics.mediaRadius)
        } else {
          let sizes = items.map(deckCardSize)
          let tallest = sizes.prefix(3).map(\.height).max() ?? 220
          size = CGSize(width: Metrics.deckWidth, height: 10 + tallest + 6 + 6)
          content = .deck(DeckLayout(items: items, sizes: sizes, cardTop: 10, dotsY: 10 + tallest + 6))
        }
      case let .file(name, sizeLabel, url, _):
        size = CGSize(width: min(Metrics.cardWidth, available), height: 64)
        let nameBox = box(plain(name, 15, theme.foreground, weight: .semibold, lineHeight: 20, truncate: true), x: 64, y: 12, maxWidth: size.width - 76, lineHeight: 20, maxLines: 1)
        let sizeBox = box(plain(sizeLabel, 13, theme.muted, lineHeight: 18, truncate: true), x: 64, y: 32, maxWidth: size.width - 76, lineHeight: 18, maxLines: 1)
        content = .file(name: nameBox, size: sizeBox, icon: CGRect(x: 12, y: 12, width: 40, height: 40), url: url)
      case let .linkCard(card):
        let card = linkCard(card, width: min(Metrics.cardWidth, available))
        size = CGSize(width: min(Metrics.cardWidth, available), height: card.height)
        content = .linkCard(card.layout)
      case let .quote(author, text, thumbnailUrl, messageId, _):
        let thumb: CGFloat = thumbnailUrl == nil ? 0 : 40
        let authorBox = box(plain(author.name, 12, theme.muted, weight: .semibold, lineHeight: 16, truncate: true), x: 12, y: 6, maxWidth: available - 24 - thumb, lineHeight: 16, maxLines: 1)
        let textBox = box(plain(text, 13, theme.muted, lineHeight: 17), x: 12, y: 22, maxWidth: available - 24 - thumb, lineHeight: 17, maxLines: 2)
        let innerHeight = 16 + textBox.frame.height
        size = CGSize(width: max(authorBox.frame.width, textBox.frame.width) + 24 + thumb, height: innerHeight + 12)
        let thumbnail = thumbnailUrl == nil ? nil : CGRect(x: size.width - 12 - 32, y: (size.height - 32) / 2, width: 32, height: 32)
        content = .quote(author: authorBox, text: textBox, thumbnail: thumbnail, thumbnailUrl: thumbnailUrl, messageId: messageId)
      case .unknown:
        continue
      }

      let x = side == .right ? right - indent - size.width : left + indent
      // Room above the part: the name, and the tapbacks over its corner.
      var above: CGFloat = first ? 0 : Metrics.partGap
      if first {
        if layout.name != nil {
          let fanLeft = x + size.width + Metrics.tapbackOverhang - fan
          let besideName = fan == 0 || fanLeft >= left + 12 + nameWidth + 6
          above = besideName ? max(Metrics.nameSpace, fan > 0 ? Metrics.tapbackSpace : 0) : Metrics.nameSpace + Metrics.tapbackSpace
        } else if fan > 0 {
          above = Metrics.tapbackSpace
        }
      } else if fan > 0 {
        above += Metrics.tapbackSpace - Metrics.partGap
      }
      y += above
      if first, layout.name != nil {
        layout.name?.frame.origin.y = y - Metrics.nameSpace
        if fan > 0, above > Metrics.tapbackSpace { layout.name?.frame.origin.y = y - above }
      }
      let frame = CGRect(x: x, y: y, width: size.width, height: size.height)
      if case .quote = content {
        quoteFrame = frame
        indent = Metrics.replyIndent
        maxBubble -= 0
      } else if quoteFrame != nil, bodyTop == nil {
        bodyTop = frame.minY
      }
      layout.parts.append(PartLayout(frame: frame, content: content, part: partId(block, message: message), blockIndex: index))
      if fan > 0 {
        let partKey = reactionPart(block, message: message)
        var anchor = frame
        if case let .deck(deck) = content {
          // A deck's tapbacks go on its front card.
          anchor = CGRect(origin: CGPoint(x: frame.minX, y: frame.minY + deck.cardTop), size: deck.sizes[0])
          if side == .right { anchor.origin.x = frame.maxX - deck.sizes[0].width }
        }
        layout.tapbacks += tapbacks(reactions, part: partKey, over: anchor, side: tapbackSide)
      }
      y = frame.maxY + (tail ? Metrics.tailDrop : 0)
    }

    if let quoteFrame, let bodyTop {
      // The "L" from the quote down into the reply, on the reply's side.
      let x = side == .right ? right - 12 - 7 : left + 12
      layout.replyCurve = CGRect(x: x, y: quoteFrame.maxY, width: 7, height: bodyTop + 19 - quoteFrame.maxY)
    }

    // Lines under the message.
    for line in message.footer {
      switch line.kind {
      case .edited:
        let string = plain(line.text, theme.caption.size, theme.muted, lineHeight: theme.caption.lineHeight)
        var text = box(string, x: 0, y: y + 2, maxWidth: maxBubble, lineHeight: theme.caption.lineHeight, maxLines: 1)
        text.frame.origin.x = side == .right ? right - 4 - text.frame.width : left + 4
        layout.footer.append(.edited(text))
        y = text.frame.maxY
      case .notSent:
        layout.footer.append(notSent(line.text, y: y + 2, side: side, left: left, right: right, maxWidth: maxBubble))
        y += 2 + theme.caption.lineHeight
      case .replies:
        let piece = replies(line, y: y + 4, side: side, left: left, right: right, maxWidth: maxBubble, pill: false)
        layout.footer.append(piece)
        y += 4 + 18
      }
    }
    if message.status == .failed, !message.footer.contains(where: { $0.kind == .notSent }) {
      // `failed` without a footer line still says so.
      layout.footer.append(notSent("Not sent", y: y + 2, side: side, left: left, right: right, maxWidth: maxBubble))
      y += 2 + theme.caption.lineHeight
    }

    if incomingGroup && message.endsGroup {
      layout.avatar = (message.author, CGRect(x: pad, y: y - Metrics.bubbleAvatar, width: Metrics.bubbleAvatar, height: Metrics.bubbleAvatar))
    }

    // The time revealed at the right edge, beside the bubble.
    let firstTop = layout.parts.first?.frame.minY ?? top
    let time = plain(message.timeLabel, theme.caption.size, theme.muted, lineHeight: theme.caption.lineHeight, alignment: .right)
    let timeY = firstTop + (y - firstTop - theme.caption.lineHeight) / 2
    layout.revealTime = TextBox(string: time, frame: CGRect(x: width, y: max(0, timeY), width: Metrics.revealWidth - 12, height: theme.caption.lineHeight))

    layout.height = ceil(y)
    layout.bounds = layout.parts.reduce(CGRect.null) { $0.union($1.frame) }
    return layout
  }

  func notSent(_ text: String, y: CGFloat, side: Side, left: CGFloat, right: CGFloat, maxWidth: CGFloat) -> FooterPiece {
    let string = plain(text, theme.caption.size, theme.destructive, lineHeight: theme.caption.lineHeight, truncate: true)
    var label = box(string, x: 0, y: 0, maxWidth: maxWidth - 24, lineHeight: theme.caption.lineHeight, maxLines: 1)
    let width = 12 + 4 + label.frame.width
    let x = side == .right ? right - 4 - width : left + 4
    label.frame.origin.x = 16
    let icon = CGRect(x: 0, y: (theme.caption.lineHeight - 12) / 2, width: 12, height: 12)
    return .notSent(frame: CGRect(x: x, y: y, width: width, height: theme.caption.lineHeight), icon: icon, label: label)
  }

  func replies(_ line: FooterLine, y: CGFloat, side: Side, left: CGFloat, right: CGFloat, maxWidth: CGFloat, pill: Bool) -> FooterPiece {
    let faces = Array(line.people.prefix(3))
    let faceSize: CGFloat = 18
    let facesWidth = faces.isEmpty ? 0 : faceSize + CGFloat(faces.count - 1) * (faceSize - 6)
    let string = plain(line.text, 13, pill ? theme.foreground : theme.accent, weight: .semibold, lineHeight: 18, truncate: true)
    var label = box(string, x: 0, y: 0, maxWidth: maxWidth - facesWidth - 40, lineHeight: 18, maxLines: 1)
    let gap: CGFloat = faces.isEmpty ? 0 : 6
    if pill {
      let chevron: CGFloat = 6 + 8
      let width = 6 + facesWidth + gap + label.frame.width + chevron + 10
      var placed: [(Person, CGRect)] = []
      for (index, person) in faces.enumerated() {
        placed.append((person, CGRect(x: 6 + CGFloat(index) * (faceSize - 6), y: 4, width: faceSize, height: faceSize)))
      }
      label.frame.origin = CGPoint(x: 6 + facesWidth + gap, y: 4)
      let chevronFrame = CGRect(x: label.frame.maxX + 6, y: 4 + 5, width: 8, height: 8)
      return .replies(frame: CGRect(x: left, y: y, width: width, height: 26), faces: placed, label: label, pill: true, chevron: chevronFrame)
    }
    let width = facesWidth + gap + label.frame.width
    let x = side == .right ? right - width : left + 4
    var placed: [(Person, CGRect)] = []
    // Your own messages read right to left: the label, then the faces.
    let facesX: CGFloat = side == .right ? label.frame.width + gap : 0
    label.frame.origin = CGPoint(x: side == .right ? 0 : facesWidth + gap, y: 0)
    for (index, person) in faces.enumerated() {
      placed.append((person, CGRect(x: facesX + CGFloat(index) * (faceSize - 6), y: 0, width: faceSize, height: faceSize)))
    }
    return .replies(frame: CGRect(x: x, y: y, width: width, height: faceSize), faces: placed, label: label, pill: false, chevron: nil)
  }

  func linkCard(_ card: Block.LinkCard, width: CGFloat) -> (layout: LinkCardLayout, height: CGFloat) {
    var layout = LinkCardLayout(card: card)
    let noTitle = card.title?.isEmpty ?? true
    let noDescription = card.description?.isEmpty ?? true
    if card.imageUrl == nil, noTitle, noDescription {
      // No preview (link-preview-card.tsx): an icon, the host, the address.
      let textX: CGFloat = 12 + 36 + 12
      let inner = width - textX - 12
      let host = box(plain(card.site, 15, theme.foreground, weight: .semibold, lineHeight: 20, truncate: true), x: textX, y: 10, maxWidth: inner, lineHeight: 20, maxLines: 1)
      let address = box(plain(card.url, 13, theme.muted, lineHeight: 18, truncate: true), x: textX, y: 32, maxWidth: inner, lineHeight: 18, maxLines: 1)
      layout.title = host
      layout.description = address
      layout.icon = CGRect(x: 12, y: 12, width: 36, height: 36)
      return (layout, 60)
    }
    var y: CGFloat = 0
    if card.imageUrl != nil {
      layout.image = CGRect(x: 0, y: 0, width: width, height: 134)
      y = 134
    }
    y += 10
    let inner = width - 24
    if !card.site.isEmpty {
      let site = box(plain(card.site.uppercased(), 12, theme.muted, lineHeight: 16, truncate: true), x: 12, y: y, maxWidth: inner, lineHeight: 16, maxLines: 1)
      layout.site = site
      y = site.frame.maxY + 2
    }
    if let title = card.title, !title.isEmpty {
      let text = box(plain(title, 15, theme.foreground, weight: .semibold, lineHeight: 20), x: 12, y: y, maxWidth: inner, lineHeight: 20, maxLines: 2)
      layout.title = text
      y = text.frame.maxY + 2
    }
    if let description = card.description, !description.isEmpty {
      let text = box(plain(description, 13, theme.muted, lineHeight: 18), x: 12, y: y, maxWidth: inner, lineHeight: 18, maxLines: 2)
      layout.description = text
      y = text.frame.maxY + 2
    }
    return (layout, y - 2 + 10)
  }

  func mergedReactions(_ items: [MediaItem]) -> [Reaction] {
    var merged: [String: (Reaction, Int, Bool)] = [:]
    var order: [String] = []
    for item in items {
      for reaction in item.reactions {
        if let existing = merged[reaction.key] {
          merged[reaction.key] = (existing.0, existing.1 + reaction.count, existing.2 || reaction.mine)
        } else {
          merged[reaction.key] = (reaction, reaction.count, reaction.mine)
          order.append(reaction.key)
        }
      }
    }
    return order.compactMap { key in
      guard let (reaction, count, mine) = merged[key] else { return nil }
      return Reaction(copying: reaction, count: count, mine: mine)
    }
  }

  /// The part a block reports for taps and holds.
  func partId(_ block: Block, message: MessageRow) -> String? {
    if case let .media(items, part) = block { return part ?? (items.count == 1 ? items[0].part : nil) }
    return block.part
  }

  /// The part the block's reactions belong to.
  func reactionPart(_ block: Block, message: MessageRow) -> String {
    if case let .media(items, part) = block { return items.count == 1 ? items[0].part : (part ?? items[0].part) }
    return block.part ?? "message"
  }

  // MARK: Stacked

  func stacked(_ message: MessageRow) -> MessageLayout {
    let pad = theme.horizontalPadding
    let avatar = theme.avatarSize
    let contentX = pad + avatar + 12
    let contentWidth = width - contentX - pad
    var layout = MessageLayout(height: 0)
    var y: CGFloat = 0

    // A reply's quote line goes above the row.
    var blocks = Array(message.blocks.enumerated())
    if let quoteIndex = blocks.firstIndex(where: { if case .quote = $0.element { return true } else { return false } }),
       case let .quote(author, text, _, messageId, _) = blocks[quoteIndex].element {
      let string = NSMutableAttributedString(attributedString: plain(author.name + " ", 13, theme.muted, weight: .semibold, lineHeight: 18, truncate: true))
      string.append(plain(text.replacingOccurrences(of: "\n", with: " "), 13, theme.muted, lineHeight: 18, truncate: true))
      let lineY: CGFloat = 16
      let faceX = pad + 17 + 22 + 4
      let textBox = box(string, x: faceX + 18 + 6, y: lineY, maxWidth: width - (faceX + 24) - pad, lineHeight: 18, maxLines: 1)
      let face = CGRect(x: faceX, y: lineY, width: 18, height: 18)
      let elbow = CGRect(x: pad + 17, y: lineY + 9, width: 22, height: 12 + 6)
      let frame = CGRect(x: 0, y: 0, width: width, height: lineY + 18)
      layout.parts.append(PartLayout(frame: frame, content: .quoteLine(face: face, person: author, text: textBox, elbow: elbow, messageId: messageId), part: nil, blockIndex: blocks[quoteIndex].offset))
      blocks.remove(at: quoteIndex)
      y = lineY + 18 + 6
    } else {
      y = message.startsGroup ? 20 : 6
    }

    if message.startsGroup && message.showAuthor {
      layout.avatar = (message.author, CGRect(x: pad, y: y, width: avatar, height: avatar))
      let name = box(plain(message.author.name, 15, theme.foreground, weight: .bold, lineHeight: 20, truncate: true), x: contentX, y: y, maxWidth: contentWidth * 0.7, lineHeight: 20, maxLines: 1)
      layout.name = name
      let time = box(plain(message.timeLabel, theme.caption.size, theme.muted, lineHeight: 20, truncate: true), x: name.frame.maxX + 8, y: y, maxWidth: contentWidth - name.frame.width - 8, lineHeight: 20, maxLines: 1)
      layout.headerTime = time
      y += 20 + 4
    }

    let edited = message.footer.first { $0.kind == .edited }
    let lastText = blocks.last { if case .text = $0.element { return true } else { return false } }?.offset
    var first = true
    for (index, block) in blocks {
      if !first { y += Metrics.partGap }
      first = false
      var frame: CGRect
      var content: PartContent
      var chipReactions: [Reaction] = []
      switch block {
      case let .text(spans, jumbo, _):
        let style = jumbo ? theme.jumbo : theme.body
        let string = NSMutableAttributedString(attributedString: spansString(spans, size: style.size, lineHeight: style.lineHeight, color: theme.foreground, mentionColor: theme.accent))
        if let edited, index == lastText {
          string.append(plain(" (\(edited.text.lowercased()))", theme.caption.size, theme.muted, lineHeight: style.lineHeight))
        }
        let text = box(string, x: 0, y: 0, maxWidth: contentWidth, lineHeight: style.lineHeight)
        frame = CGRect(x: contentX, y: y, width: text.frame.width, height: text.frame.height)
        content = .text(text, bubble: nil, spans: spans)
      case let .deleted(label, _):
        let text = box(plain(label, theme.body.size, theme.muted, lineHeight: theme.body.lineHeight, italic: true), x: 0, y: 0, maxWidth: contentWidth, lineHeight: theme.body.lineHeight)
        frame = CGRect(x: contentX, y: y, width: text.frame.width, height: text.frame.height)
        content = .text(text, bubble: nil, spans: [])
      case let .media(items, _):
        if items.count == 1 {
          let size = mediaSize(items[0], maxWidth: contentWidth)
          frame = CGRect(x: contentX, y: y, width: size.width, height: size.height)
          content = .media(items[0], radius: Metrics.mediaRadius)
          chipReactions = items[0].reactions
        } else {
          var x: CGFloat = 0
          var cards: [CGRect] = []
          var allChips: [ChipLayout] = []
          var chipsHeight: CGFloat = 0
          for item in items {
            let size = carouselCardSize(item)
            let card = CGRect(x: x, y: 0, width: size.width, height: size.height)
            cards.append(card)
            let placed = chips(item.reactions, part: item.part, origin: CGPoint(x: card.minX, y: card.maxY), width: card.width)
            allChips += placed.chips
            chipsHeight = max(chipsHeight, placed.height)
            x += size.width + Metrics.carouselGap
          }
          let contentWidth = x - Metrics.carouselGap + pad
          // Edge to edge: the strip runs to the screen's right edge.
          frame = CGRect(x: contentX, y: y, width: width - contentX, height: Metrics.carouselHeight + chipsHeight)
          content = .carousel(CarouselLayout(items: items, cards: cards, chips: allChips, contentWidth: contentWidth, leadingInset: 0))
        }
      case let .file(name, sizeLabel, url, _):
        let cardWidth = min(Metrics.cardWidth, contentWidth)
        frame = CGRect(x: contentX, y: y, width: cardWidth, height: 64)
        let nameBox = box(plain(name, 15, theme.foreground, weight: .semibold, lineHeight: 20, truncate: true), x: 64, y: 12, maxWidth: cardWidth - 76, lineHeight: 20, maxLines: 1)
        let sizeBox = box(plain(sizeLabel, 13, theme.muted, lineHeight: 18, truncate: true), x: 64, y: 32, maxWidth: cardWidth - 76, lineHeight: 18, maxLines: 1)
        content = .file(name: nameBox, size: sizeBox, icon: CGRect(x: 12, y: 12, width: 40, height: 40), url: url)
      case let .linkCard(card):
        let cardWidth = min(Metrics.cardWidth, contentWidth)
        let measured = linkCard(card, width: cardWidth)
        frame = CGRect(x: contentX, y: y, width: cardWidth, height: measured.height)
        content = .linkCard(measured.layout)
      case .quote, .unknown:
        continue
      }
      layout.parts.append(PartLayout(frame: frame, content: content, part: partId(block, message: message), blockIndex: index))
      y = frame.maxY
      if !chipReactions.isEmpty {
        let placed = chips(chipReactions, part: reactionPart(block, message: message), origin: CGPoint(x: contentX, y: y), width: contentWidth)
        layout.chips += placed.chips
        y += placed.height
      }
    }

    for line in message.footer {
      switch line.kind {
      case .edited:
        continue
      case .notSent:
        layout.footer.append(notSent(line.text, y: y + 2, side: .left, left: contentX - 4, right: width - pad, maxWidth: contentWidth))
        y += 2 + theme.caption.lineHeight
      case .replies:
        let piece = replies(line, y: y + 6, side: .left, left: contentX, right: width - pad, maxWidth: contentWidth, pill: true)
        layout.footer.append(piece)
        y += 6 + 26
      }
    }
    if message.status == .failed, !message.footer.contains(where: { $0.kind == .notSent }) {
      layout.footer.append(notSent("Not sent", y: y + 2, side: .left, left: contentX - 4, right: width - pad, maxWidth: contentWidth))
      y += 2 + theme.caption.lineHeight
    }
    if !message.reactions.isEmpty {
      let placed = chips(message.reactions, part: reactionPartForMessage(message), origin: CGPoint(x: contentX, y: y), width: contentWidth)
      layout.chips += placed.chips
      y += placed.height
    }
    layout.height = ceil(y)
    layout.bounds = CGRect(x: pad, y: layout.avatar?.frame.minY ?? layout.parts.first?.frame.minY ?? 0, width: width - pad * 2, height: 0)
    layout.bounds.size.height = y - layout.bounds.minY
    return layout
  }

  func reactionPartForMessage(_ message: MessageRow) -> String {
    for block in message.blocks {
      if case let .text(_, _, part) = block { return part ?? "message" }
    }
    return message.blocks.first?.part ?? "message"
  }

  // MARK: Other rows

  func header(style: String, label: String) -> RowLayout {
    let string = NSMutableAttributedString(string: label, attributes: Fonts.attributes(
      Fonts.system(theme.caption.size), theme.muted, lineHeight: theme.caption.lineHeight, alignment: .center
    ))
    // "Today 9:41 AM": the day part is semibold; a day header is all bold.
    let semibold = Fonts.system(theme.caption.size, .semibold)
    if style == "day" {
      string.addAttribute(.font, value: semibold, range: NSRange(location: 0, length: string.length))
    } else if let range = label.range(of: #"\d{1,2}[:.]\d{2}"#, options: .regularExpression), range.lowerBound > label.startIndex {
      let prefix = NSRange(label.startIndex..<range.lowerBound, in: label)
      string.addAttribute(.font, value: semibold, range: prefix)
    }
    let size = measure(string, width: width - 64, lineHeight: theme.caption.lineHeight)
    let (top, bottom): (CGFloat, CGFloat) = style == "day" ? (12, 12) : (16, 6)
    let frame = CGRect(x: (width - size.width) / 2, y: top, width: size.width, height: size.height)
    return .header(TextBox(string: string, frame: frame), height: top + size.height + bottom, rules: false)
  }

  /// A stacked day separator: a label between two fading rules.
  func stackedHeader(label: String) -> RowLayout {
    let string = plain(label, theme.caption.size, theme.muted, lineHeight: theme.caption.lineHeight, alignment: .center)
    let size = measure(string, width: width - 120, lineHeight: theme.caption.lineHeight)
    let frame = CGRect(x: (width - size.width) / 2, y: 28, width: size.width, height: size.height)
    return .header(TextBox(string: string, frame: frame), height: 28 + size.height + 8, rules: true)
  }

  func notice(_ spans: [Span]) -> RowLayout {
    let result = NSMutableAttributedString()
    for span in spans {
      let bold = span.style == .bold || span.style == .mention
      var text = span.text
      if bold && text.count > 40 { text = String(text.prefix(40)) + "…" }
      result.append(plain(text, theme.caption.size, theme.muted, weight: bold ? .semibold : .regular, lineHeight: theme.caption.lineHeight, alignment: .center))
    }
    let size = measure(result, width: width - 96, lineHeight: theme.caption.lineHeight)
    let frame = CGRect(x: (width - size.width) / 2, y: 12, width: size.width, height: size.height)
    return .notice(TextBox(string: result, frame: frame), height: 12 + size.height + 4)
  }

  func typing(layout: MessageRow.Layout, people: [Person], label: String) -> TypingLayout {
    let pad = theme.horizontalPadding
    if layout == .bubbles {
      let height: CGFloat = 14 + Metrics.typingBubble.height + Metrics.tailDrop
      let shown = people.count == 4 ? people : Array(people.prefix(3))
      let size = Metrics.bubbleAvatar
      var faces: [(Person, CGRect)] = []
      for (index, person) in shown.enumerated() {
        faces.append((person, CGRect(x: pad + CGFloat(index) * (size - 6), y: height - size, width: size, height: size)))
      }
      var x = pad + (faces.isEmpty ? 0 : CGFloat(faces.count - 1) * (size - 6) + size)
      var overflow: TextBox?
      if people.count > 4 {
        let string = plain("+\(people.count - 3)", 12, theme.muted, weight: .semibold, lineHeight: 16, alignment: .center)
        let width = max(32, measure(string, width: 60, lineHeight: 16).width + 8)
        overflow = TextBox(string: string, frame: CGRect(x: x - 6, y: height - size - 2, width: width, height: size + 4))
        x += width - 6
      }
      if !people.isEmpty { x += Metrics.avatarGap }
      let bubble = CGRect(x: x, y: 14, width: Metrics.typingBubble.width, height: Metrics.typingBubble.height)
      let dots = (0..<3).map { index in
        CGRect(x: bubble.minX + (bubble.width - 32) / 2 + CGFloat(index) * 12, y: bubble.midY - 4, width: 8, height: 8)
      }
      return TypingLayout(height: height, faces: faces, faceRing: 2, bubble: bubble, label: nil, dots: dots, overflow: overflow)
    }
    let height: CGFloat = 10 + 20 + 2
    let size: CGFloat = 18
    let shown = people.count == 4 ? people : Array(people.prefix(3))
    var faces: [(Person, CGRect)] = []
    for (index, person) in shown.enumerated() {
      faces.append((person, CGRect(x: pad + CGFloat(index) * (size - 4), y: 11, width: size, height: size)))
    }
    var x = pad + (faces.isEmpty ? 0 : CGFloat(faces.count - 1) * (size - 4) + size) + 8
    var overflow: TextBox?
    if people.count > 4 {
      let string = plain("+\(people.count - 3)", 10, theme.muted, weight: .semibold, lineHeight: 20)
      let measured = measure(string, width: 40, lineHeight: 20)
      overflow = TextBox(string: string, frame: CGRect(x: x - 4, y: 10, width: measured.width, height: 20))
      x += measured.width + 4
    }
    let text = box(plain(label, 13, theme.muted, lineHeight: 20, truncate: true), x: x, y: 10, maxWidth: width - x - pad - 20, lineHeight: 20, maxLines: 1)
    let dots = (0..<3).map { index in
      CGRect(x: text.frame.maxX + 6 + CGFloat(index) * 6, y: 10 + 10, width: 4, height: 4)
    }
    return TypingLayout(height: height, faces: faces, faceRing: 1.5, bubble: nil, label: text, dots: dots, overflow: overflow)
  }
}

extension Reaction {
  init(copying reaction: Reaction, count: Int, mine: Bool) {
    self.init(key: reaction.key, emoji: reaction.emoji, imageUrl: reaction.imageUrl, label: reaction.label, count: count, mine: mine)
  }

  init(key: String, emoji: String?, imageUrl: URL?, label: String, count: Int, mine: Bool) {
    self.key = key
    self.emoji = emoji
    self.imageUrl = imageUrl
    self.label = label
    self.count = count
    self.mine = mine
  }
}

extension NSAttributedString.Key {
  /// The index of the span a run of text came from (links and mentions).
  static let spanIndex = NSAttributedString.Key("veraSpanIndex")
}
