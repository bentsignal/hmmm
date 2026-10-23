package chat.vera.messagelist

/**
 * A lower bound, in dp, for the rows still above the reader. A visible
 * media row is not a useful estimate for the short text rows above it.
 * Ignoring wrapped lines, tapbacks and footers deliberately asks early.
 */
fun olderRowsWithin(rows: List<Row>, last: Int, ahead: Float, theme: Theme, fontScale: Float = 1f): Boolean {
  var remaining = 0f
  for (index in last + 1 until rows.size) {
    val row = rows[index] as? MessageRow ?: continue
    remaining += if (row.stacked) {
      if (row.startsGroup) 44f else 6f
    } else if (row.startsGroup) theme.runGap else theme.rowGap
    for (block in row.blocks) {
      remaining += fontScale * when (block) {
        is TextBlock -> if (block.jumbo) theme.jumbo.lineHeight else theme.body.lineHeight
        is DeletedBlock, is UnknownBlock -> theme.body.lineHeight
        // Other block sizes depend on the viewport; zero keeps the bound conservative.
        else -> 0f
      }
    }
    if (remaining >= ahead) return false
  }
  return true
}
