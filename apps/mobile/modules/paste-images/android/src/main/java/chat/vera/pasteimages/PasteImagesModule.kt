package chat.vera.pasteimages

import android.content.Context
import android.graphics.BitmapFactory
import android.media.ExifInterface
import android.net.Uri
import android.view.View
import android.webkit.MimeTypeMap
import androidx.core.view.ContentInfoCompat
import androidx.core.view.OnReceiveContentListener
import androidx.core.view.ViewCompat
import com.facebook.react.uimanager.util.ReactFindViewUtil
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID
import kotlinx.coroutines.launch

/** The `nativeID` that lets a `TextInput` take photos. `src/lib/paste-images.ts` has the same string. */
private const val ACCEPTING_NATIVE_ID = "vera-paste-images"

/**
 * Lets a message field take pasted photos. A `TextInput` with
 * `nativeID="vera-paste-images"` gets an `OnReceiveContentListener` for
 * images, which pasting from the clipboard and keyboards that insert
 * images (Gboard's GIFs and stickers) both go through. The images are
 * copied to files and sent as `onPasteImages`; text in the same paste is
 * inserted as usual.
 */
class PasteImagesModule : Module() {
  private val finder =
    ReactFindViewUtil.OnMultipleViewsFoundListener { view, _ ->
      ViewCompat.setOnReceiveContentListener(view, arrayOf("image/*"), receiver)
    }

  private val receiver = OnReceiveContentListener { view, payload -> receive(view, payload) }

  override fun definition() = ModuleDefinition {
    Name("VeraPasteImages")

    Events("onPasteImages")

    OnCreate { ReactFindViewUtil.addViewsListener(finder, setOf(ACCEPTING_NATIVE_ID)) }

    OnDestroy { ReactFindViewUtil.removeViewsListener(finder) }
  }

  /** Takes the payload's images and returns the rest for the field to insert. */
  private fun receive(view: View, payload: ContentInfoCompat): ContentInfoCompat? {
    val context = view.context.applicationContext
    val split = payload.partition { item -> item.uri?.let { isImage(context, it) } == true }
    val images = split.first ?: return split.second
    val uris = (0 until images.clip.itemCount).mapNotNull { images.clip.getItemAt(it).uri }
    appContext.backgroundCoroutineScope.launch {
      val saved = uris.mapNotNull { save(context, it) }
      if (saved.isNotEmpty()) {
        sendEvent("onPasteImages", mapOf("images" to saved))
      }
    }
    return split.second
  }

  private fun isImage(context: Context, uri: Uri) =
    context.contentResolver.getType(uri)?.startsWith("image/") == true

  /**
   * Copies the image into the cache, since the permission to read it lasts
   * only as long as the clipboard or keyboard keeps it.
   */
  private fun save(context: Context, uri: Uri): Map<String, Any>? =
    try {
      val mimeType = context.contentResolver.getType(uri) ?: "image/jpeg"
      val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType) ?: "jpg"
      val directory = File(context.cacheDir, "PastedImages").apply { mkdirs() }
      val file = File(directory, "${UUID.randomUUID()}.$ext")
      val input = context.contentResolver.openInputStream(uri) ?: return null
      input.use { source -> file.outputStream().use { source.copyTo(it) } }
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(file.path, bounds)
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        file.delete()
        null
      } else {
        val turned = turnedSideways(file)
        mapOf(
          "height" to if (turned) bounds.outWidth else bounds.outHeight,
          "mimeType" to mimeType,
          "name" to "photo.$ext",
          "size" to file.length().toDouble(),
          "uri" to Uri.fromFile(file).toString(),
          "width" to if (turned) bounds.outHeight else bounds.outWidth,
        )
      }
    } catch (error: Exception) {
      null
    }

  /** Whether the photo is stored on its side and shown turned upright. */
  private fun turnedSideways(file: File) =
    try {
      when (
        ExifInterface(file.path)
          .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
      ) {
        ExifInterface.ORIENTATION_ROTATE_90,
        ExifInterface.ORIENTATION_ROTATE_270,
        ExifInterface.ORIENTATION_TRANSPOSE,
        ExifInterface.ORIENTATION_TRANSVERSE -> true
        else -> false
      }
    } catch (error: Exception) {
      false
    }
}
