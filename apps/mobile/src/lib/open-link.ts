import * as WebBrowser from "expo-web-browser";

/**
 * Open a link in the in-app browser. On iOS it's a page sheet, so a swipe
 * down closes it like the app's other sheets (the default covers the whole
 * screen and only closes from its Done button). Android opens a Custom Tab,
 * which the back gesture closes.
 */
export function openLink(url: string) {
  void WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  });
}
