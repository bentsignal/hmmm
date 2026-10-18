import { useState } from "react";
import { Alert } from "react-native";

import { useAttachmentUploader } from "~/features/messaging/attachments";

/**
 * Changes a profile photo. The new photo shows from the device right
 * away, dimmed while it uploads (`uploading`), and stays the one shown
 * until the profile moves on from it, so it doesn't blink as the uploaded
 * copy loads.
 */
export function usePhotoChange({
  avatarUrl,
  save,
}: {
  /** The photo the profile has now. */
  avatarUrl: string | null;
  /** Saves the uploaded photo's URL to the profile. */
  save: (url: string) => Promise<unknown>;
}) {
  const uploadAttachments = useAttachmentUploader();
  const [newPhoto, setNewPhoto] = useState<{
    local: string;
    uploaded?: string;
  }>();
  const uploading = newPhoto !== undefined && newPhoto.uploaded === undefined;
  const shown =
    newPhoto !== undefined && (uploading || newPhoto.uploaded === avatarUrl)
      ? newPhoto.local
      : avatarUrl;

  async function upload(source: "camera" | "library") {
    const picking = { picked: false };
    const [photo] = await uploadAttachments(source, {
      imagesOnly: true,
      onPicked: ([file]) => {
        if (!file) return;
        picking.picked = true;
        setNewPhoto({ local: file.uri });
      },
    }).catch(() => []);
    if (photo?.kind === "image") {
      const saved = await save(photo.url).then(
        () => true,
        () => false,
      );
      if (saved) {
        setNewPhoto(
          (current) => current && { ...current, uploaded: photo.url },
        );
        return;
      }
    }
    setNewPhoto(undefined);
    if (picking.picked) {
      Alert.alert("Couldn't Update Photo", "Try again in a moment.");
    }
  }

  return {
    avatarUrl: shown,
    change: upload,
    forget: () => setNewPhoto(undefined),
    uploading,
  };
}
