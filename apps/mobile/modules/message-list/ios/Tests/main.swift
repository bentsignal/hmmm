import UIKit

// Native tests for the message list: heights from data, older pages
// keeping the reader's place, and batch updates matching the data's diff.
// Run with Tests/run.sh (it builds this with Models, Theme, Measure,
// ListLayout, and ListDiff for Mac Catalyst and runs it on the Mac).

var failures = 0
var checks = 0

func check(_ condition: @autoclosure () -> Bool, _ what: String, line: Int = #line) {
  checks += 1
  if !condition() {
    failures += 1
    print("FAIL line \(line): \(what)")
  }
}

func equal<T: Equatable>(_ actual: T, _ expected: T, _ what: String, line: Int = #line) {
  check(actual == expected, "\(what): \(actual) != \(expected)", line: line)
}

// MARK: Rows from JSON, as JavaScript sends them

func person(_ id: String) -> JSON {
  ["id": id, "name": id.capitalized, "avatarUrl": NSNull(), "initials": String(id.prefix(1))]
}

func message(
  _ id: String, text: String = "Hello", layout: String = "bubbles", own: Bool = false,
  showAuthor: Bool = false, starts: Bool = true, ends: Bool = true, arrived: Bool = false,
  blocks: [JSON]? = nil, reactions: [JSON] = []
) -> JSON {
  [
    "id": id, "kind": "message", "layout": layout, "author": person(own ? "me" : "maya"), "isOwn": own,
    "showAuthor": showAuthor, "startsGroup": starts, "endsGroup": ends, "sentAt": 0, "timeLabel": "9:41 AM",
    "blocks": blocks ?? [["type": "text", "part": "message", "spans": [["text": text]]]],
    "reactions": reactions, "footer": [JSON](), "arrived": arrived, "accessibilityLabel": text,
  ]
}

func photo(_ width: Double, _ height: Double) -> JSON {
  ["type": "media", "items": [["id": "p", "kind": "image", "url": "https://example.com/p.jpg", "width": width, "height": height, "part": "attachment:p", "reactions": [JSON]()]]]
}

let theme = Theme()
let width: CGFloat = 390
let measurer = Measurer(theme: theme, width: width)

func height(_ json: JSON) -> CGFloat {
  measurer.layout(Row(json)).height
}

// MARK: Heights from data (the React Native list's numbers)

// A one-line bubble is 38 tall; a run's first row has 14 above it, the
// rest 4; the last of a run has its 7-point tail below.
equal(height(message("a")), 14 + 38 + 7, "one line, starts and ends a run")
equal(height(message("a", starts: false)), 4 + 38 + 7, "one line, inside a run")
equal(height(message("a", starts: false, ends: false)), 4 + 38, "one line, no tail")
// The sender's name over a group's first message: 16 and a gap of 6.
equal(height(message("a", showAuthor: true)), 14 + 22 + 38 + 7, "with the sender's name")
// Each wrapped line adds 22.
let long = String(repeating: "word ", count: 40)
let longHeight = height(message("a", text: long, ends: false)) - 14 - 16
check(longHeight > 22 && longHeight.truncatingRemainder(dividingBy: 22) == 0, "wrapped lines are 22 each (\(longHeight))")
// Tapbacks open 25 above the bubble.
let thumbs: JSON = ["key": "👍", "content": ["emoji": "👍"], "count": 1, "mine": false]
equal(height(message("a", reactions: [thumbs])), 14 + 25 + 38 + 7, "with a tapback")
// A photo is 240 wide, its height from its size, at most 300; no tail.
equal(height(message("a", blocks: [photo(1200, 900)])), 14 + 180, "a landscape photo")
equal(height(message("a", blocks: [photo(900, 2000)])), 14 + 300, "a tall photo, capped")
// Stacked: 20 above a run, the 20-point name line and 4, then the text.
equal(height(message("a", layout: "stacked", showAuthor: true)), 20 + 24 + 22, "a stacked run's first message")
equal(height(message("a", layout: "stacked", starts: false)), 6 + 22, "a stacked message inside a run")
// The typing indicator, and a time header.
equal(measurer.layout(Row(["id": "t", "kind": "typing", "layout": "bubbles", "people": [person("maya")], "label": ""])).height, 59, "typing, bubbles")
equal(measurer.layout(Row(["id": "t", "kind": "typing", "layout": "stacked", "people": [person("maya")], "label": "Maya is typing"])).height, 32, "typing, stacked")
equal(measurer.layout(Row(["id": "h", "kind": "header", "style": "time", "label": "Today 9:41 AM"])).height, 38, "a time header")
if case let .header(box, height, rules) = measurer.layout(Row(["id": "r", "kind": "header", "style": "replies", "label": "No replies yet"])) {
  equal(box.frame.origin, CGPoint(x: 16, y: 20), "replies divider starts at the RN label's inset")
  equal(height, 20 + theme.footnote.lineHeight + 4, "replies divider uses footnote height and RN padding")
  equal(rules, .replies, "replies divider has only a trailing hairline")
} else { check(false, "replies divider is a header") }
if case let .header(_, _, rules) = measurer.layout(Row(["id": "h", "kind": "header", "style": "future", "label": "Future header"])) {
  equal(rules, .day, "an unknown header style falls back to day")
}

// A bubble never passes three quarters of the row.
if case let .message(layout) = measurer.layout(Row(message("a", text: long))) {
  check(layout.parts[0].frame.width <= floor((width - 32) * 0.75), "a bubble stays within its max width")
  check(layout.parts[0].frame.maxX <= width, "a bubble stays on screen")
}
// Your own bubbles sit on the right.
if case let .message(layout) = measurer.layout(Row(message("a", own: true))) {
  equal(layout.parts[0].frame.maxX, width - 16, "your bubble's right edge")
}

// MARK: Decoding never crashes, and draws what it can't as fallback text

let strange: [JSON] = [
  ["id": "x", "kind": "poll", "fallbackText": "A poll"],
  ["id": "y"],
  ["id": "z", "kind": "message", "blocks": [["type": "chart"]], "fallbackText": "A chart"],
  ["id": "w", "kind": "message", "reactions": [["key": "x", "count": Double.infinity]], "blocks": [JSON]()],
  ["kind": "header"],
]
for json in strange { _ = height(json) }
if case let .fallback(text) = Row(strange[0]).content { equal(text, "A poll", "an unknown kind draws its fallback text") } else { check(false, "an unknown kind is a fallback") }
if case let .message(row) = Row(strange[2]).content, case let .text(spans, _, _) = row.blocks.first {
  equal(spans.first?.text, "A chart", "a message with an unknown block draws its fallback text")
} else { check(false, "a message with an unknown block is drawn as text") }
equal(Behavior(["firehoseFrom": Double.infinity]).firehoseFrom, 1_000_000, "an infinite firehose threshold means never")
equal(Behavior(["moveMs": Double.infinity]).moveMs, 5000, "an animation can't last forever")
_ = Row(message("v", blocks: [["type": "media", "items": [["id": "v", "kind": "video", "url": "u", "width": 1, "height": 1, "part": "p", "durationSeconds": Double.infinity, "reactions": [JSON]()]]]]))
_ = LiftRequest(["rowId": "a", "index": Double.infinity, "shift": Double.nan, "scale": 1, "origin": "start"])

// MARK: Older pages keep the reader's place

let layout = ListLayout()
func ids(_ range: Range<Int>) -> [String] { range.map { "m\($0)" } }
let heights = (0..<60).map { CGFloat(40 + ($0 * 37) % 200) }
layout.update(ids: ids(0..<60), heights: heights)
let before = layout.frame(of: "m30")!
// An older page goes past the top (the end): nothing on screen moves.
layout.update(ids: ids(0..<110), heights: heights + (0..<50).map { CGFloat(50 + $0) })
equal(layout.frame(of: "m30")!.minY, before.minY, "a row keeps its place when an older page loads")
equal(layout.oldFrame(of: "m30")!.minY, before.minY, "and its old frame is where it was")
// Arrivals at the bottom (the start) move it by exactly their height, which
// is what the list scrolls by to keep it still when you're scrolled up.
let arrivalHeights: [CGFloat] = [59, 49]
layout.update(ids: ["new2", "new1"] + ids(0..<110), heights: arrivalHeights + heights + (0..<50).map { CGFloat(50 + $0) })
equal(layout.frame(of: "m30")!.minY - before.minY, arrivalHeights.reduce(0, +), "arrivals move rows by their height")
// Frames are contiguous: each row starts where the one below it ends.
var contiguous = true
for index in 1..<layout.ids.count where layout.frame(at: index).minY != layout.frame(at: index - 1).maxY { contiguous = false }
check(contiguous, "rows stack with no gaps or overlaps")

// MARK: Batch updates match the data's diff

func rows(_ ids: [String], arrived: Set<String> = [], typing: Bool = false) -> [Row] {
  (typing ? [Row(["id": "typing", "kind": "typing", "layout": "bubbles", "people": [person("maya")], "label": ""])] : [])
    + ids.map { Row(message($0, arrived: arrived.contains($0))) }
}

var generator = SystemRandomNumberGenerator()
var mismatches = 0
for round in 0..<500 {
  var old = ids(0..<Int.random(in: 0..<40, using: &generator))
  if round % 7 == 0 { old.shuffle(using: &generator) }
  var new = old
  // Some removed, some older added past the end, some arrivals at the start.
  new.removeAll { _ in Int.random(in: 0..<10, using: &generator) == 0 }
  new += (0..<Int.random(in: 0..<5, using: &generator)).map { "older\(round)-\($0)" }
  let arrivals = (0..<Int.random(in: 0..<4, using: &generator)).map { "new\(round)-\($0)" }
  new = arrivals + new
  let oldRows = rows(old)
  let newRows = rows(new, arrived: Set(arrivals))
  let diff = ListDiff(old: oldRows, oldHeights: oldRows.map { _ in 40 }, new: newRows, newHeights: newRows.map { _ in 40 })
  if diff.applied(to: old, new: new) != new { mismatches += 1 }
  if diff.arrived.map({ new[$0] }) != arrivals { mismatches += 1 }
}
equal(mismatches, 0, "500 random updates: deletes and inserts give the new list, arrivals found")

// Arrivals above the typing indicator still count as arrivals.
let withTyping = ListDiff(
  old: rows(["a", "b"], typing: true), oldHeights: [59, 40, 40],
  new: rows(["c", "a", "b"], arrived: ["c"], typing: true), newHeights: [59, 40, 40, 40]
)
equal(withTyping.arrived, [1], "an arrival while someone types")
// A row that changes kind under the same ID reloads; a changed one updates.
let kindChange = ListDiff(
  old: [Row(message("a")), Row(message("b"))], oldHeights: [40, 40],
  new: [Row(["id": "a", "kind": "notice", "spans": [["text": "Gone"]]]), Row(message("b", text: "Edited"))], newHeights: [40, 40]
)
equal(kindChange.reloaded, [0], "a kind change reloads")
equal(kindChange.changed, ["b"], "a content change updates in place")
check(ListDiff(old: rows(["a"]), oldHeights: [40], new: rows(["a"]), newHeights: [40]).isEmpty, "nothing changed, nothing to do")

print("\(checks - failures) of \(checks) checks passed")
exit(failures == 0 ? 0 : 1)
