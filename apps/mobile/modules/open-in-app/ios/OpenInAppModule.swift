import ExpoModulesCore
import UIKit

/// Opens a link in the installed app that claims it (Reddit, Instagram,
/// X, ...) through its universal links, and reports whether one did, so the
/// caller can show the link in its own browser instead.
public class OpenInAppModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VeraOpenInApp")

    AsyncFunction("openInAppAsync") { (url: URL, promise: Promise) in
      UIApplication.shared.open(url, options: [.universalLinksOnly: true]) { opened in
        promise.resolve(opened)
      }
    }.runOnQueue(.main)
  }
}
