package chat.vera.messagelist

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * The native message list (src/features/native-list/native.ts loads it):
 * the module `MessageList`, its view, and `support`, what this binary
 * draws, which JavaScript checks before sending anything.
 */
class MessageListModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MessageList")

    Constant("support") {
      mapOf(
        "contractVersion" to CONTRACT_VERSION,
        "rowKinds" to ROW_KINDS,
        "blockTypes" to BLOCK_TYPES,
      )
    }

    View(MessageListView::class) {
      Events("onEvent")

      Prop("rows") { view: MessageListView, rows: ReadableArray? -> view.setRows(rows) }
      Prop("theme") { view: MessageListView, theme: ReadableMap? -> view.setTheme(theme) }
      Prop("behavior") { view: MessageListView, behavior: ReadableMap? -> view.setBehavior(behavior) }
      Prop("insets") { view: MessageListView, insets: ReadableMap? -> view.setInsets(insets) }
      Prop("keyboard") { view: MessageListView, keyboard: Boolean? -> view.setKeyboard(keyboard == true) }
      Prop("liftedRowId") { view: MessageListView, id: String? -> view.setLiftedRowId(id) }
      Prop("initialRowId") { view: MessageListView, id: String? -> view.setInitialRowId(id) }
      // Rows this binary can't read are drawn as their fallback text, whatever the version.
      Prop("contractVersion") { _: MessageListView, _: Int? -> }

      OnViewDidUpdateProps { view: MessageListView -> view.commit() }

      AsyncFunction("scrollToLatest") { view: MessageListView, animated: Boolean? ->
        view.scrollToLatest(animated != false)
      }.runOnQueue(Queues.MAIN)

      AsyncFunction("scrollToRow") { view: MessageListView, rowId: String, animated: Boolean? ->
        view.scrollToRow(rowId, animated != false)
      }.runOnQueue(Queues.MAIN)
    }
  }
}
