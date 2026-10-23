import ExpoModulesCore
import UIKit

// The native message list (src/features/native-list/contract.ts). JavaScript
// sends rows; this draws, scrolls, and animates them.
//
// - Rows are decoded and measured on a background queue, cached by row and
//   width, then applied on the main thread as one batch update, diffed by
//   row ID.
// - The collection view is flipped: row 0 (the newest) is at the bottom,
//   and older pages are appended past the top, so loading them never moves
//   what's on screen.
// - Arrivals at the bottom animate in one UIKit transaction (the rows above
//   make room, the new one rises and fades in). Scrolled up, or in a
//   firehose, rows go in without animation and the reader's place is kept.

final class MessageListView: ExpoView, UICollectionViewDataSource, UICollectionViewDelegate,
  UICollectionViewDataSourcePrefetching, UIGestureRecognizerDelegate {
  let onEvent = EventDispatcher()

  private let listLayout = ListLayout()
  private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: listLayout)
  private let state = ListState()

  // What's on screen.
  private var rows: [Row] = []
  private var layouts: [RowLayout] = []

  // Props, as JavaScript last sent them.
  private var rawRows: [JSON] = []
  private var rowsChanged = false
  private var themeJSON: JSON?
  private var themeChanged = false
  private var insets = UIEdgeInsets.zero
  private var followsKeyboard = true
  private var initialRowId: String?
  private var keyboardHeight: CGFloat = 0

  // Measuring, off the main thread.
  private let measurer = MeasureQueue()
  private var measuring = false
  private var measureAgain = false
  private var measuredWidth: CGFloat = 0

  // Events.
  private var placed = false
  private var olderRequestedFor: String?
  private var newerRequestedFor: String?
  private var nearLatest: Bool?
  private var lastVisible: [String] = []
  private var visibleScheduled = false
  private var prefetched: Set<String> = []

  // The firehose: arrival times in the window.
  private var arrivals: [CFTimeInterval] = []
  private var firehose = false

  // Dragging left to reveal times.
  private lazy var revealPan = UIPanGestureRecognizer(target: self, action: #selector(revealDragged(_:)))
  private let keyboardTracker = UIView()

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    collectionView.backgroundColor = .clear
    collectionView.transform = CGAffineTransform(scaleX: 1, y: -1)
    collectionView.contentInsetAdjustmentBehavior = .never
    collectionView.keyboardDismissMode = .interactive
    collectionView.alwaysBounceVertical = true
    collectionView.showsHorizontalScrollIndicator = false
    collectionView.dataSource = self
    collectionView.delegate = self
    collectionView.prefetchDataSource = self
    collectionView.isPrefetchingEnabled = true
    collectionView.scrollsToTop = false
    collectionView.register(MessageCell.self, forCellWithReuseIdentifier: "message")
    collectionView.register(TextRowCell.self, forCellWithReuseIdentifier: "text")
    collectionView.register(TypingCell.self, forCellWithReuseIdentifier: "typing")
    addSubview(collectionView)

    let tap = UITapGestureRecognizer(target: self, action: #selector(tapped(_:)))
    let doubleTap = UITapGestureRecognizer(target: self, action: #selector(held(_:)))
    doubleTap.numberOfTapsRequired = 2
    tap.require(toFail: doubleTap)
    let hold = UILongPressGestureRecognizer(target: self, action: #selector(held(_:)))
    hold.minimumPressDuration = 0.32
    for gesture in [tap, doubleTap, hold] {
      gesture.cancelsTouchesInView = false
      collectionView.addGestureRecognizer(gesture)
    }
    revealPan.delegate = self
    collectionView.addGestureRecognizer(revealPan)

    // Follows the keyboard frame by frame, interactive dismissal included.
    keyboardTracker.isHidden = true
    keyboardTracker.isUserInteractionEnabled = false
    keyboardTracker.translatesAutoresizingMaskIntoConstraints = false
    addSubview(keyboardTracker)
    if #available(iOS 17.0, *) { keyboardLayoutGuide.usesBottomSafeArea = false }
    NSLayoutConstraint.activate([
      keyboardTracker.leadingAnchor.constraint(equalTo: leadingAnchor),
      keyboardTracker.widthAnchor.constraint(equalToConstant: 1),
      keyboardTracker.heightAnchor.constraint(equalToConstant: 1),
      keyboardTracker.topAnchor.constraint(equalTo: keyboardLayoutGuide.topAnchor),
    ])
  }

  // MARK: Props

  func setRows(_ rows: [JSON]) {
    rawRows = rows
    rowsChanged = true
  }

  func setTheme(_ theme: JSON?) {
    themeJSON = theme
    themeChanged = true
  }

  func setBehavior(_ behavior: JSON?) {
    state.behavior = behavior.map(Behavior.init) ?? Behavior()
  }

  func setInsets(_ json: JSON?) {
    let json = json ?? [:]
    let next = UIEdgeInsets(top: json.cg("top", 0), left: 0, bottom: json.cg("bottom", 0), right: 0)
    guard next != insets else { return }
    insets = next
    applyInsets(keepDistance: true)
  }

  func setKeyboard(_ follows: Bool) {
    followsKeyboard = follows
    setNeedsLayout()
  }

  func setLiftedRowId(_ id: String?) {
    guard id != state.liftedRowId else { return }
    state.liftedRowId = id
    for cell in collectionView.visibleCells {
      guard let cell = cell as? RowCell else { continue }
      cell.contentView.alpha = cell.rowId != nil && cell.rowId == id ? 0 : 1
    }
  }

  func setInitialRowId(_ id: String?) {
    initialRowId = id
  }

  /// After a batch of props: measure and apply what changed.
  func propsDidUpdate() {
    if themeChanged {
      themeChanged = false
      var theme = themeJSON.map(Theme.init) ?? Theme()
      theme.version = state.theme.version + 1
      state.theme = theme
      backgroundColor = .clear
      rowsChanged = true
    }
    if rowsChanged {
      rowsChanged = false
      measure()
    }
  }

  // MARK: Layout

  override func layoutSubviews() {
    super.layoutSubviews()
    if collectionView.bounds.size != bounds.size {
      // bounds/center: the collection view is flipped.
      collectionView.bounds = CGRect(origin: collectionView.bounds.origin, size: bounds.size)
      collectionView.center = CGPoint(x: bounds.midX, y: bounds.midY)
    }
    if bounds.width > 0, bounds.width != measuredWidth {
      measure()
    }
    var keyboard = followsKeyboard ? max(0, bounds.height - keyboardTracker.frame.minY) : 0
    if #unavailable(iOS 17.0) {
      // Before iOS 17 the guide stops at the safe area when the keyboard is down.
      keyboard = max(0, keyboard - safeAreaInsets.bottom)
    }
    if abs(keyboard - keyboardHeight) > 0.5 {
      keyboardHeight = keyboard
      applyInsets(keepDistance: !collectionView.isTracking)
    }
  }

  /// The flipped list's insets: its top is the screen's bottom.
  private func applyInsets(keepDistance: Bool) {
    let bottom = insets.bottom + keyboardHeight
    let current = collectionView.contentInset
    guard current.top != bottom || current.bottom != insets.top else { return }
    let distance = collectionView.contentOffset.y + current.top
    collectionView.contentInset = UIEdgeInsets(top: bottom, left: 0, bottom: insets.top, right: 0)
    collectionView.verticalScrollIndicatorInsets = UIEdgeInsets(top: bottom, left: 0, bottom: insets.top, right: 0)
    if keepDistance || !placed {
      // Keep the same distance from the newest message, so the list rides
      // up and down with the keyboard.
      collectionView.contentOffset.y = (placed ? max(0, distance) : 0) - bottom
    }
  }

  /// How far the newest message is scrolled from its place at the bottom.
  private var distanceFromLatest: CGFloat {
    collectionView.contentOffset.y + collectionView.adjustedContentInset.top
  }

  private var latestOffset: CGFloat { -collectionView.adjustedContentInset.top }

  private var maxOffset: CGFloat {
    max(latestOffset, collectionView.contentSize.height + collectionView.adjustedContentInset.bottom - collectionView.bounds.height)
  }

  // MARK: Measuring and applying rows

  private func measure() {
    let width = bounds.width
    guard width > 0 else { return }
    if measuring {
      measureAgain = true
      return
    }
    measuring = true
    measureAgain = false
    let input = MeasureQueue.Input(rows: rawRows, theme: state.theme, width: width)
    if !placed {
      // The first rows: measured right away, so the list never shows empty.
      let result = measurer.measureNow(input)
      finish(result)
      return
    }
    measurer.measure(input) { [weak self] result in
      self?.finish(result)
    }
  }

  private func finish(_ result: MeasureQueue.Output) {
    measuring = false
    measuredWidth = result.width
    apply(result.rows, result.layouts)
    if measureAgain || result.width != bounds.width {
      measure()
    }
  }

  private func apply(_ newRows: [Row], _ newLayouts: [RowLayout]) {
    let theme = state.theme
    guard placed, !rows.isEmpty else {
      rows = newRows
      layouts = newLayouts
      listLayout.update(ids: newRows.map(\.id), heights: newLayouts.map(\.height))
      collectionView.reloadData()
      if !newRows.isEmpty { place() }
      return
    }

    let oldRows = rows
    let oldIds = oldRows.map(\.id)
    let newIds = newRows.map(\.id)
    let oldIndex = listLayout.indexById()
    var newIndex: [String: Int] = [:]
    newIndex.reserveCapacity(newIds.count)
    for (index, id) in newIds.enumerated() { newIndex[id] = index }

    let removed = oldIds.enumerated().filter { newIndex[$0.element] == nil }.map(\.offset)
    let inserted = newIds.enumerated().filter { oldIndex[$0.element] == nil }.map(\.offset)
    // Rows whose order changed (rare): survivors out of sequence.
    let survivorsOld = oldIds.filter { newIndex[$0] != nil }
    let survivorsNew = newIds.filter { oldIndex[$0] != nil }
    let reordered = survivorsOld != survivorsNew
    var changed: Set<String> = []
    for (index, row) in newRows.enumerated() {
      guard let old = oldIndex[row.id], old < oldRows.count else { continue }
      if oldRows[old] != row || layouts[old].height != newLayouts[index].height {
        changed.insert(row.id)
      }
    }
    if inserted.isEmpty && removed.isEmpty && changed.isEmpty && !reordered {
      rows = newRows
      layouts = newLayouts
      return
    }

    // What's new at the bottom: below every row that was already there.
    let firstSurvivor = survivorsNew.first.flatMap { newIndex[$0] } ?? newRows.count
    let atBottom = inserted.filter { $0 < firstSurvivor }
    let arrived = atBottom.filter { newRows[$0].message?.arrived == true }
    noteArrivals(arrived.count)

    let visible = Set(collectionView.indexPathsForVisibleItems.compactMap { $0.item < oldIds.count ? oldIds[$0.item] : nil })
    let pinned = distanceFromLatest <= 2 || !collectionView.isDragging && distanceFromLatest <= min(24, state.behavior.nearLatestPoints)
    let typingChanged = atBottom.contains { newRows[$0].isTyping } || removed.contains { oldRows[$0].isTyping }
    let visibleChange = !changed.isDisjoint(with: visible) || removed.contains { visible.contains(oldIds[$0]) }
    let animated = window != nil && !firehose && !reordered
      && (pinned ? (!atBottom.isEmpty || typingChanged || visibleChange) : visibleChange && atBottom.isEmpty)

    // Keep the reader's place when scrolled up: the lowest row on screen
    // stays where it is.
    var anchor: (id: String, offset: CGFloat)?
    if !pinned {
      let sorted = collectionView.indexPathsForVisibleItems.map(\.item).sorted()
      if let first = sorted.first(where: { newIndex[oldIds[$0]] != nil && !changed.contains(oldIds[$0]) }) ?? sorted.first(where: { newIndex[oldIds[$0]] != nil }) {
        anchor = (oldIds[first], listLayout.frame(at: first).minY - collectionView.contentOffset.y)
      }
    }

    // A message from someone typing grows out of their indicator.
    var grows: (id: String, from: CGRect)?
    if animated, let typingIndex = removed.first(where: { oldRows[$0].isTyping }),
       case let .typing(_, people, _) = oldRows[typingIndex].content,
       let message = arrived.first(where: { index in people.contains { $0.id == newRows[index].message?.author.id } }),
       case let .typing(typingLayout) = layouts[typingIndex], let bubble = typingLayout.bubble {
      grows = (newIds[message], bubble)
    }

    if animated {
      listLayout.rising = Set(arrived.map { newIds[$0] }.filter { $0 != grows?.id })
      listLayout.inPlace = grows.map { [$0.id] } ?? []
      listLayout.sinking = grows == nil ? Set(removed.filter { oldRows[$0].isTyping }.map { oldIds[$0] }) : []
    }

    let work = {
      if reordered {
        self.rows = newRows
        self.layouts = newLayouts
        self.listLayout.update(ids: newIds, heights: newLayouts.map(\.height))
        self.collectionView.reloadData()
        self.collectionView.layoutIfNeeded()
      } else {
        self.collectionView.performBatchUpdates {
          self.rows = newRows
          self.layouts = newLayouts
          self.listLayout.update(ids: newIds, heights: newLayouts.map(\.height))
          self.collectionView.deleteItems(at: removed.map { IndexPath(item: $0, section: 0) })
          self.collectionView.insertItems(at: inserted.map { IndexPath(item: $0, section: 0) })
        }
      }
      // Rows that changed update in place, inside the same animation.
      for cell in self.collectionView.visibleCells {
        guard let cell = cell as? RowCell, let id = cell.rowId, changed.contains(id), let index = newIndex[id] else { continue }
        cell.configure(newRows[index], newLayouts[index], state: self.state, animated: animated)
        self.setAccessibility(cell)
      }
      if pinned {
        self.setOffset(self.latestOffset)
      } else if let anchor, let frame = self.listLayout.frame(of: anchor.id) {
        self.setOffset(frame.minY - anchor.offset)
      }
    }

    if animated {
      let animator = UIViewPropertyAnimator(
        duration: state.behavior.moveMs / 1000,
        controlPoint1: CGPoint(x: 0.25, y: 0.1),
        controlPoint2: CGPoint(x: 0.25, y: 1),
        animations: work
      )
      animator.startAnimation()
      for id in arrived.map({ newIds[$0] }) where id != grows?.id {
        cell(for: id)?.fadeIn(duration: state.behavior.fadeMs / 1000)
      }
      if let grows, let cell = cell(for: grows.id) as? MessageCell {
        cell.grow(from: grows.from, duration: 0.32)
      }
      for index in atBottom where newRows[index].isTyping {
        (cell(for: newIds[index]) as? TypingCell)?.appear()
      }
    } else {
      UIView.performWithoutAnimation(work)
    }
    // Changed rows off screen may have cells prepared ahead: update those
    // too, so they never show stale.
    if !reordered {
      let shown = Set(collectionView.visibleCells.compactMap { ($0 as? RowCell)?.rowId })
      let offscreen = changed.subtracting(shown).compactMap { newIndex[$0] }.map { IndexPath(item: $0, section: 0) }
      if !offscreen.isEmpty {
        UIView.performWithoutAnimation { collectionView.reconfigureItems(at: offscreen) }
      }
    }
    _ = theme
    afterChange()
  }

  /// Moves the list without stopping a fling, and only if it moved.
  private func setOffset(_ y: CGFloat) {
    guard abs(collectionView.contentOffset.y - y) > 0.01 else { return }
    collectionView.contentOffset.y = y
  }

  private func cell(for id: String) -> RowCell? {
    guard let index = listLayout.indexById()[id] else { return nil }
    return collectionView.cellForItem(at: IndexPath(item: index, section: 0)) as? RowCell
  }

  /// Past `firehoseFrom` arrivals in the window, rows show at once until
  /// it's down to `firehoseUntil`.
  private func noteArrivals(_ count: Int) {
    let behavior = state.behavior
    let now = CACurrentMediaTime()
    arrivals.append(contentsOf: Array(repeating: now, count: count))
    arrivals.removeAll { now - $0 > behavior.firehoseWindowMs / 1000 }
    if !firehose, arrivals.count > behavior.firehoseFrom {
      firehose = true
    } else if firehose, arrivals.count <= behavior.firehoseUntil {
      firehose = false
    }
  }

  /// The first rows: open on `initialRowId` (centered) or the newest.
  private func place() {
    collectionView.layoutIfNeeded()
    applyInsets(keepDistance: false)
    if let initialRowId, let frame = listLayout.frame(of: initialRowId) {
      collectionView.contentOffset.y = centeredOffset(frame)
    } else {
      collectionView.contentOffset.y = latestOffset
    }
    collectionView.layoutIfNeeded()
    placed = true
    DispatchQueue.main.async { [weak self] in
      self?.send(["type": "ready"])
      self?.afterChange()
    }
  }

  private func centeredOffset(_ frame: CGRect) -> CGFloat {
    let inset = collectionView.adjustedContentInset
    let visible = collectionView.bounds.height - inset.top - inset.bottom
    let offset = frame.midY - visible / 2 - inset.top
    return min(max(offset, latestOffset), maxOffset)
  }

  // MARK: Methods

  func scrollToLatest(animated: Bool) {
    collectionView.setContentOffset(CGPoint(x: 0, y: latestOffset), animated: animated)
  }

  func scrollToRow(_ id: String, animated: Bool) {
    guard let frame = listLayout.frame(of: id) else { return }
    collectionView.setContentOffset(CGPoint(x: 0, y: centeredOffset(frame)), animated: animated)
  }

  // MARK: Data source

  func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
    rows.count
  }

  func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
    let row = rows[indexPath.item]
    let identifier: String
    switch row.content {
    case .message: identifier = "message"
    case .typing: identifier = "typing"
    default: identifier = "text"
    }
    let cell = collectionView.dequeueReusableCell(withReuseIdentifier: identifier, for: indexPath)
    if let cell = cell as? RowCell {
      cell.contentView.layer.removeAnimation(forKey: "fadeIn")
      cell.configure(row, layouts[indexPath.item], state: state, animated: false)
      setAccessibility(cell)
    }
    return cell
  }

  private func setAccessibility(_ cell: RowCell) {
    if let cell = cell as? MessageCell, let rowId = cell.rowId {
      cell.onActivate = { [weak self] in self?.send(["type": "press", "rowId": rowId, "target": "message"]) }
      cell.accessibilityCustomActions = cell.accessibilityActions { [weak self] event in self?.send(event) }
    }
  }

  func collectionView(_ collectionView: UICollectionView, willDisplay cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
    guard let cell = cell as? RowCell else { return }
    cell.setReveal(state.reveal)
    let lifted = cell.rowId != nil && cell.rowId == state.liftedRowId
    if lifted || cell.contentView.alpha == 0 && cell.contentView.layer.animationKeys() == nil {
      cell.contentView.alpha = lifted ? 0 : 1
    }
  }

  func collectionView(_ collectionView: UICollectionView, prefetchItemsAt indexPaths: [IndexPath]) {
    prefetch(indexPaths.map(\.item))
  }

  /// Downloads and decodes the images of rows about to show.
  private func prefetch(_ indexes: [Int]) {
    var requests: [(URL, CGSize)] = []
    for index in indexes where index < rows.count {
      let id = rows[index].id
      guard !prefetched.contains(id), case let .message(layout) = layouts[index] else { continue }
      prefetched.insert(id)
      if let (person, frame) = layout.avatar, let url = person.avatarUrl { requests.append((url, frame.size)) }
      for part in layout.parts {
        switch part.content {
        case let .media(item, _):
          if let url = item.displayUrl { requests.append((url, part.frame.size)) }
        case let .carousel(carousel):
          for (item, card) in zip(carousel.items, carousel.cards) {
            if let url = item.displayUrl { requests.append((url, card.size)) }
          }
        case let .deck(deck):
          for (item, size) in zip(deck.items, deck.sizes).prefix(2) {
            if let url = item.displayUrl { requests.append((url, size)) }
          }
        case let .linkCard(card):
          if let url = card.card.imageUrl, let frame = card.image { requests.append((url, frame.size)) }
        default:
          break
        }
      }
    }
    if !requests.isEmpty { Images.prefetch(requests) }
  }

  // MARK: Scrolling

  func scrollViewDidScroll(_ scrollView: UIScrollView) {
    guard placed else { return }
    afterChange()
  }

  func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
    scheduleVisible()
  }

  private func afterChange() {
    guard placed, !rows.isEmpty else { return }
    let height = collectionView.bounds.height
    let ahead = state.behavior.loadAheadScreens * height
    // Older: the top of the list is the end of the flipped content.
    let toOldest = maxOffset - collectionView.contentOffset.y
    if toOldest < ahead, let oldest = rows.last?.id, olderRequestedFor != oldest {
      olderRequestedFor = oldest
      send(["type": "reachedOlder"])
    }
    let toLatest = distanceFromLatest
    if toLatest < ahead, collectionView.isDragging || collectionView.isDecelerating,
       let newest = rows.first?.id, newerRequestedFor != newest {
      newerRequestedFor = newest
      send(["type": "reachedNewer"])
    }
    let near = toLatest <= state.behavior.nearLatestPoints
    if near != nearLatest {
      nearLatest = near
      send(["type": "nearLatest", "near": near])
    }
    // Images for the next stretch, in both directions.
    let visible = collectionView.indexPathsForVisibleItems.map(\.item)
    if let low = visible.min(), let high = visible.max() {
      prefetch(Array(max(0, low - 8)..<low) + Array((high + 1)..<min(rows.count, high + 30)))
    }
    scheduleVisible()
  }

  /// `visible`: the rows on screen, newest first, at most every 100 ms.
  private func scheduleVisible() {
    guard !visibleScheduled else { return }
    visibleScheduled = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
      guard let self else { return }
      self.visibleScheduled = false
      let inset = self.collectionView.adjustedContentInset
      let top = self.collectionView.contentOffset.y + inset.top
      let bottom = self.collectionView.contentOffset.y + self.collectionView.bounds.height - inset.bottom
      let ids = self.collectionView.indexPathsForVisibleItems.map(\.item).sorted().compactMap { index -> String? in
        guard index < self.rows.count else { return nil }
        let frame = self.listLayout.frame(at: index)
        return frame.maxY > top && frame.minY < bottom ? self.rows[index].id : nil
      }
      if ids != self.lastVisible {
        self.lastVisible = ids
        self.send(["type": "visible", "rowIds": ids])
      }
    }
  }

  // MARK: Gestures

  private func hit(_ gesture: UIGestureRecognizer, hold: Bool) -> (Hit, RowCell)? {
    let point = gesture.location(in: collectionView)
    guard let indexPath = collectionView.indexPathForItem(at: point),
          let cell = collectionView.cellForItem(at: indexPath) as? RowCell else { return nil }
    let local = gesture.location(in: cell.contentView)
    guard let hit = cell.hit(at: local, hold: hold) else { return nil }
    return (hit, cell)
  }

  @objc private func tapped(_ gesture: UITapGestureRecognizer) {
    guard let (hit, _) = hit(gesture, hold: false) else { return }
    send(hit.event)
  }

  @objc private func held(_ gesture: UIGestureRecognizer) {
    if let press = gesture as? UILongPressGestureRecognizer, press.state != .began { return }
    if gesture is UITapGestureRecognizer, gesture.state != .ended { return }
    guard let (hit, cell) = hit(gesture, hold: true) else { return }
    var event = hit.event
    let frame = cell.contentView.convert(hit.frame, to: nil)
    event["frame"] = ["x": frame.minX, "y": frame.minY, "width": frame.width, "height": frame.height]
    send(event)
  }

  override func gestureRecognizerShouldBegin(_ gesture: UIGestureRecognizer) -> Bool {
    guard gesture === revealPan else { return true }
    // Only a leftward drag, and not on a carousel or a deck of cards.
    let velocity = revealPan.velocity(in: collectionView)
    guard velocity.x < 0, abs(velocity.x) > abs(velocity.y) * 1.2 else { return false }
    var view = collectionView.hitTest(revealPan.location(in: collectionView), with: nil)
    while let current = view, current !== collectionView {
      if current is CarouselView || current is DeckView { return false }
      view = current.superview
    }
    return rows.contains { $0.message?.layout == .bubbles }
  }

  func gestureRecognizer(_ gesture: UIGestureRecognizer, shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
    // Revealing times doesn't stop the list scrolling under the finger.
    gesture === revealPan && other === collectionView.panGestureRecognizer
  }

  @objc private func revealDragged(_ pan: UIPanGestureRecognizer) {
    switch pan.state {
    case .changed:
      setReveal(min(Metrics.revealWidth, max(0, -pan.translation(in: collectionView).x)))
    case .ended, .cancelled, .failed:
      UIView.animate(withDuration: 0.45, delay: 0, usingSpringWithDamping: 0.85, initialSpringVelocity: 0, options: [.allowUserInteraction, .beginFromCurrentState]) {
        self.setReveal(0)
      }
    default:
      break
    }
  }

  private func setReveal(_ reveal: CGFloat) {
    state.reveal = reveal
    for cell in collectionView.visibleCells {
      (cell as? RowCell)?.setReveal(reveal)
    }
  }

  // MARK: Events

  private func send(_ event: [String: Any]) {
    onEvent(event)
  }
}

/// Decodes and measures rows on a serial background queue, reusing each
/// row's layout while its data, the width, and the theme stay the same.
final class MeasureQueue {
  struct Input {
    let rows: [JSON]
    let theme: Theme
    let width: CGFloat
  }

  struct Output {
    let rows: [Row]
    let layouts: [RowLayout]
    let width: CGFloat
  }

  private struct Entry {
    let row: Row
    let layout: RowLayout
  }

  private let queue = DispatchQueue(label: "chat.vera.message-list.measure", qos: .userInteractive)
  // Only touched on `queue`.
  private var cache: [String: Entry] = [:]
  private var cacheWidth: CGFloat = 0
  private var cacheTheme = -1

  func measure(_ input: Input, done: @escaping (Output) -> Void) {
    queue.async {
      let output = self.run(input)
      DispatchQueue.main.async { done(output) }
    }
  }

  func measureNow(_ input: Input) -> Output {
    queue.sync { run(input) }
  }

  private func run(_ input: Input) -> Output {
    if input.width != cacheWidth || input.theme.version != cacheTheme {
      cache.removeAll()
      cacheWidth = input.width
      cacheTheme = input.theme.version
    }
    let measurer = Measurer(theme: input.theme, width: input.width)
    var rows: [Row] = []
    var layouts: [RowLayout] = []
    var seen: Set<String> = []
    var next: [String: Entry] = [:]
    rows.reserveCapacity(input.rows.count)
    layouts.reserveCapacity(input.rows.count)
    for json in input.rows {
      let row = Row(json)
      // IDs are unique; a repeat would break the diff, so it's dropped.
      guard seen.insert(row.id).inserted else { continue }
      let layout: RowLayout
      if let entry = cache[row.id], entry.row == row {
        layout = entry.layout
      } else {
        layout = measurer.layout(row)
      }
      rows.append(row)
      layouts.append(layout)
      next[row.id] = Entry(row: row, layout: layout)
    }
    cache = next
    return Output(rows: rows, layouts: layouts, width: input.width)
  }
}
