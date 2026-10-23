package chat.vera.messagelist

import android.content.Context
import androidx.recyclerview.widget.LinearLayoutManager

internal fun carouselLayoutManager(context: Context) =
  LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false).apply {
    // Screen.startTransitionRecursive marks even our cards as transitioning.
    // During screen detach they can still have a parent after removeViewAt;
    // eager recycling here then throws "attached views may not be recycled".
    // Keep the normal detach behavior and retain the carousel's position.
    recycleChildrenOnDetach = false
    initialPrefetchItemCount = 3
  }
