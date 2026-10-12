package chat.vera.openinapp

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Opens a link in the installed app that handles it (Reddit, Instagram, X,
 * ...), never in a browser, and reports whether one did, so the caller can
 * show the link in its own browser instead. Before Android 11 there's no
 * way to ask for "not a browser", so it reports false there.
 */
class OpenInAppModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("VeraOpenInApp")

    AsyncFunction("openInAppAsync") { url: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        return@AsyncFunction false
      }
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addCategory(Intent.CATEGORY_BROWSABLE)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REQUIRE_NON_BROWSER)
      }
      // Vera's own links (an invite, say) stay in Vera.
      val handler = activity.packageManager.resolveActivity(intent, 0)?.activityInfo?.packageName
      if (handler == activity.packageName) {
        return@AsyncFunction false
      }
      try {
        activity.startActivity(intent)
        true
      } catch (error: ActivityNotFoundException) {
        false
      }
    }
  }
}
