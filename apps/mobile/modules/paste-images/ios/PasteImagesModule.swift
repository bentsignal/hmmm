import ExpoModulesCore
import ObjectiveC
import UIKit
import UniformTypeIdentifiers

/// The `nativeID` that lets a multiline `TextInput` take pasted photos.
/// `src/lib/paste-images.ts` has the same string.
private let acceptingNativeID = "vera-paste-images"

/// Formats sent as they were copied, most wanted first: a GIF keeps its
/// animation, and a photo isn't re-encoded. Anything else becomes a JPEG.
private let keptTypes: [UTType] = [.gif, .jpeg, .heic, .png, .webP, .heif]

/// Lets a message field take pasted photos. A multiline `TextInput` with
/// `nativeID="vera-paste-images"` shows Paste when the pasteboard holds an
/// image, and pasting one saves it to a file and sends `onPasteImages`
/// instead of inserting anything. React Native's text view only pastes
/// text, so its `paste:` and `canPerformAction:withSender:` are wrapped once
/// at launch; every other text view behaves as before.
public class PasteImagesModule: Module {
  fileprivate static weak var current: PasteImagesModule?

  public func definition() -> ModuleDefinition {
    Name("VeraPasteImages")

    Events("onPasteImages")

    OnCreate {
      PasteImagesModule.current = self
      _ = TextViewHooks.installed
    }
  }

  fileprivate func send(_ images: [[String: Any]]) {
    sendEvent("onPasteImages", ["images": images])
  }
}

private enum TextViewHooks {
  /// Runs once, on first use.
  static let installed: Void = {
    guard let textView = NSClassFromString("RCTUITextView") else { return }
    hookPaste(textView)
    hookCanPerformAction(textView)
  }()

  private static func hookPaste(_ cls: AnyClass) {
    let selector = #selector(UIResponder.paste(_:))
    guard let method = class_getInstanceMethod(cls, selector) else { return }
    typealias Paste = @convention(c) (AnyObject, Selector, Any?) -> Void
    let original = unsafeBitCast(method_getImplementation(method), to: Paste.self)
    let replacement: @convention(block) (UIView, Any?) -> Void = { view, sender in
      if accepts(view), pasteImages() {
        refreshKeyboard(view)
        return
      }
      original(view, selector, sender)
    }
    replace(cls, method, selector, imp_implementationWithBlock(replacement))
  }

  private static func hookCanPerformAction(_ cls: AnyClass) {
    let selector = #selector(UIResponder.canPerformAction(_:withSender:))
    guard let method = class_getInstanceMethod(cls, selector) else { return }
    typealias CanPerform = @convention(c) (AnyObject, Selector, Selector, Any?) -> Bool
    let original = unsafeBitCast(method_getImplementation(method), to: CanPerform.self)
    let paste = #selector(UIResponder.paste(_:))
    let replacement: @convention(block) (UIView, Selector, Any?) -> Bool = { view, action, sender in
      if original(view, selector, action, sender) { return true }
      // `hasImages` doesn't read the pasteboard, so it never asks for
      // permission to paste.
      return action == paste && accepts(view) && UIPasteboard.general.hasImages
    }
    replace(cls, method, selector, imp_implementationWithBlock(replacement))
  }

  /// The keyboard drops its "Paste from …" suggestion when the text changes,
  /// and a pasted photo leaves the text as it was, so tell it to look again.
  private static func refreshKeyboard(_ view: UIView) {
    guard let input = view as? UITextInput, let keyboard = input.inputDelegate else { return }
    keyboard.textWillChange(input)
    keyboard.textDidChange(input)
  }

  /// Replaces the class's own method, adding one when it only inherits it,
  /// so other text views keep theirs.
  private static func replace(_ cls: AnyClass, _ method: Method, _ selector: Selector, _ imp: IMP) {
    if !class_addMethod(cls, selector, imp, method_getTypeEncoding(method)) {
      method_setImplementation(method, imp)
    }
  }

  /// Whether the text view belongs to a `TextInput` that takes photos. The
  /// `nativeID` is on its component view, a superview.
  private static func accepts(_ view: UIView) -> Bool {
    let getter = NSSelectorFromString("nativeId")
    var ancestor = view.superview
    for _ in 0..<3 {
      guard let current = ancestor else { return false }
      if current.responds(to: getter),
        current.perform(getter)?.takeUnretainedValue() as? String == acceptingNativeID
      {
        return true
      }
      ancestor = current.superview
    }
    return false
  }

  /// Reads the pasteboard's images, if it has any, and hands them to
  /// JavaScript once they're saved. Returns whether it took the paste.
  private static func pasteImages() -> Bool {
    let pasteboard = UIPasteboard.general
    guard pasteboard.hasImages, let module = PasteImagesModule.current else { return false }
    let images = imageData(from: pasteboard)
    if images.isEmpty { return false }
    DispatchQueue.global(qos: .userInitiated).async {
      let saved = images.compactMap(save)
      if !saved.isEmpty { module.send(saved) }
    }
    return true
  }

  /// Each pasteboard item's image, in the best format it offers.
  private static func imageData(from pasteboard: UIPasteboard) -> [(Data, UTType)] {
    var found: [(Data, UTType)] = []
    for index in 0..<pasteboard.numberOfItems {
      let item = IndexSet(integer: index)
      let types = (pasteboard.types(forItemSet: item)?.first ?? [])
        .compactMap { UTType($0) }
        .filter { $0.conforms(to: .image) }
      if let type = keptTypes.first(where: { types.contains($0) }),
        let data = pasteboard.data(forPasteboardType: type.identifier, inItemSet: item)?.first
      {
        found.append((data, type))
      } else if let type = types.first,
        let data = pasteboard.data(forPasteboardType: type.identifier, inItemSet: item)?.first,
        let jpeg = UIImage(data: data)?.jpegData(compressionQuality: 0.9)
      {
        found.append((jpeg, .jpeg))
      }
    }
    if found.isEmpty {
      // An app that copied a `UIImage` without saying what format it is.
      found = (pasteboard.images ?? []).compactMap { image in
        image.jpegData(compressionQuality: 0.9).map { ($0, UTType.jpeg) }
      }
    }
    return found
  }

  private static func save(_ image: (Data, UTType)) -> [String: Any]? {
    let (data, type) = image
    guard let decoded = UIImage(data: data) else { return nil }
    let ext = type.preferredFilenameExtension ?? "jpg"
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("PastedImages", isDirectory: true)
    let file = directory.appendingPathComponent("\(UUID().uuidString).\(ext)")
    do {
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try data.write(to: file)
    } catch {
      return nil
    }
    return [
      "height": Int((decoded.size.height * decoded.scale).rounded()),
      "mimeType": type.preferredMIMEType ?? "image/jpeg",
      "name": "photo.\(ext)",
      "size": data.count,
      "uri": file.absoluteString,
      "width": Int((decoded.size.width * decoded.scale).rounded()),
    ]
  }
}
