import { requireOptionalNativeModule } from "expo";
import * as WebBrowser from "expo-web-browser";

interface OpenInAppModule {
  openInAppAsync: (url: string) => Promise<boolean>;
}

// `modules/open-in-app`, loaded optionally: builds made before it was added
// keep opening every link in the in-app browser.
const openInApp = requireOptionalNativeModule<OpenInAppModule>("VeraOpenInApp");

function openInBrowser(url: string) {
  void WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}

/**
 * Open a link in the app that handles it when one is installed (Reddit,
 * Instagram, X, a news app: whatever claims the link), and otherwise in
 * the in-app browser. On iOS that's a page sheet, so a swipe down closes it
 * like the app's other sheets (the default covers the whole screen and
 * only closes from its Done button). Android opens a Custom Tab, which the
 * back gesture closes.
 */
export function openLink(url: string) {
  if (openInApp === null) {
    openInBrowser(url);
    return;
  }
  void openInApp
    .openInAppAsync(url)
    .catch(() => false)
    .then((opened) => {
      if (!opened) openInBrowser(url);
    });
}
