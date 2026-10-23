package chat.vera.messagelist

import android.view.View
import android.view.ViewGroup
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView

class RowHolder(view: View) : RecyclerView.ViewHolder(view) {
  var row: Row? = null
  val actionIds = ArrayList<Int>()
}

/**
 * The rows, newest first (position 0 at the bottom), each kind and shape
 * of message its own view type so cells recycle into cells of the same
 * shape. IDs are stable for as long as the list lives.
 */
class RowsAdapter(private val env: CellEnv) : RecyclerView.Adapter<RowHolder>() {
  var rows: List<Row> = emptyList()
    private set

  /** Hidden while it's lifted into the menu. */
  var liftedRowId: String? = null

  /** Fires an accessibility action's press, or a hold. */
  var onAccessibilityTarget: ((Target) -> Unit)? = null
  var onAccessibilityHold: ((RowHolder) -> Unit)? = null

  private val types = HashMap<Any, Int>()
  private val typeKeys = ArrayList<Any>()
  private val ids = HashMap<String, Long>()
  private var nextId = 1L

  init {
    setHasStableIds(true)
  }

  fun apply(next: List<Row>, diff: DiffUtil.DiffResult?) {
    rows = next
    if (diff == null) {
      @Suppress("NotifyDataSetChanged")
      notifyDataSetChanged()
    } else {
      diff.dispatchUpdatesTo(this)
    }
  }

  override fun getItemCount() = rows.size

  override fun getItemId(position: Int): Long = ids.getOrPut(rows[position].id) { nextId++ }

  override fun getItemViewType(position: Int): Int {
    val key: Any = when (val row = rows[position]) {
      is MessageRow -> signatureOf(row)
      is HeaderRow -> "header"
      is NoticeRow -> "notice"
      is TypingRow -> "typing"
      is FallbackRow -> "fallback"
    }
    return types.getOrPut(key) {
      typeKeys.add(key)
      typeKeys.size
    }
  }

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RowHolder {
    val context = parent.context
    val view = when (val key = typeKeys[viewType - 1]) {
      is Signature -> MessageCell(context, env, key)
      "header" -> HeaderCell(context, env)
      "typing" -> TypingCell(context, env)
      else -> NoticeCell(context, env)
    }
    view.layoutParams = RecyclerView.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
    return RowHolder(view)
  }

  override fun onBindViewHolder(holder: RowHolder, position: Int) = bind(holder, position, animate = false)

  override fun onBindViewHolder(holder: RowHolder, position: Int, payloads: MutableList<Any>) =
    bind(holder, position, animate = payloads.isNotEmpty())

  private fun bind(holder: RowHolder, position: Int, animate: Boolean) {
    val row = rows[position]
    holder.row = row
    val view = holder.itemView
    when (row) {
      is MessageRow -> {
        val cell = view as MessageCell
        if (animate) cell.bindAnimated(row) else cell.bind(row, animate = false)
      }
      is HeaderRow -> (view as HeaderCell).bind(row)
      is NoticeRow -> (view as NoticeCell).bind(noticeText(row.spans), stacked = false)
      is TypingRow -> (view as TypingCell).bind(row)
      is FallbackRow -> (view as NoticeCell).bind(row.text, stacked = false, italic = true)
    }
    view.alpha = if (row.id == liftedRowId) 0f else 1f
    bindAccessibility(holder)
  }

  private fun bindAccessibility(holder: RowHolder) {
    val view = holder.itemView
    for (id in holder.actionIds) ViewCompat.removeAccessibilityAction(view, id)
    holder.actionIds.clear()
    val cell = view as? MessageCell ?: return
    for ((label, target) in cell.accessibilityTargets()) {
      val id = ViewCompat.addAccessibilityAction(view, label) { _, _ ->
        onAccessibilityTarget?.invoke(target)
        true
      }
      if (id != View.NO_ID) holder.actionIds.add(id)
    }
    ViewCompat.replaceAccessibilityAction(
      view,
      AccessibilityNodeInfoCompat.AccessibilityActionCompat.ACTION_LONG_CLICK,
      "Show actions",
    ) { _, _ ->
      onAccessibilityHold?.invoke(holder)
      true
    }
  }

  override fun onViewRecycled(holder: RowHolder) {
    holder.itemView.animate().cancel()
    holder.itemView.translationY = 0f
    holder.itemView.clipBounds = null
  }
}

/** Compares two lists of rows by ID, and their contents by value. */
class RowsDiff(private val old: List<Row>, private val new: List<Row>) : DiffUtil.Callback() {
  override fun getOldListSize() = old.size

  override fun getNewListSize() = new.size

  override fun areItemsTheSame(oldItemPosition: Int, newItemPosition: Int) =
    old[oldItemPosition].id == new[newItemPosition].id &&
      old[oldItemPosition]::class == new[newItemPosition]::class

  override fun areContentsTheSame(oldItemPosition: Int, newItemPosition: Int) =
    old[oldItemPosition] == new[newItemPosition]

  /** A message that changed in place: rebound with its reactions popping in and out. */
  override fun getChangePayload(oldItemPosition: Int, newItemPosition: Int): Any? {
    val before = old[oldItemPosition]
    val after = new[newItemPosition]
    if (before is MessageRow && after is MessageRow && signatureOf(before) == signatureOf(after)) return CHANGED
    return null
  }

  companion object {
    val CHANGED = Any()
  }
}
