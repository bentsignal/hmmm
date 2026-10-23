package chat.vera.messagelist

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PaginationTest {
  private val theme = Theme.DEFAULT
  private fun text(id: Int) = MessageRow(id.toString(), false, Person("p", "P", null, "P"), false, false,
    false, false, 0.0, "", listOf(TextBlock(listOf(Span("short", null, null, null)), false, "message")),
    emptyList(), emptyList(), null, false, false, "short")

  @Test fun shortRowsAboveTallMediaRequestBeforeTheEdge() {
    // Previously 10 remaining text rows × a visible photo's 300dp was
    // estimated as 3000dp, outside a three-screen 1800dp lead.
    val rows = (0..10).map(::text)
    assertTrue(olderRowsWithin(rows, 0, 1800f, theme))
  }

  @Test fun enoughKnownTextStaysOutsideTheLead() {
    assertFalse(olderRowsWithin((0..200).map(::text), 0, 1800f, theme))
  }

  @Test fun aNewPageReevaluatesTheLead() {
    assertTrue(olderRowsWithin((0..10).map(::text), 10, 1800f, theme))
    assertFalse(olderRowsWithin((0..210).map(::text), 10, 1800f, theme))
  }

  @Test fun fontSizeChangesTheKnownTextDistance() {
    val rows = (0..10).map(::text)
    assertTrue(olderRowsWithin(rows, 0, theme.body.lineHeight * 15, theme))
    assertFalse(olderRowsWithin(rows, 0, theme.body.lineHeight * 15, theme, 2f))
  }
}
