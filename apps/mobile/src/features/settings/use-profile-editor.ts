import { useRef, useState } from "react";

import { useAccount } from "~/features/messaging/account";
import { useMyProfile } from "~/features/messaging/directory";
import { usePhotoChange } from "./use-photo-change";

const SAVE_DELAY_MS = 800;

/** The signed-in profile, saving name edits after typing pauses. */
export function useProfileEditor() {
  const { username } = useAccount();
  const { profile, update } = useMyProfile();
  const [draftName, setDraftName] = useState<string>();
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const savedName = profile?.displayName ?? username;
  const avatarUrl = profile?.avatarUrl ?? null;
  const photo = usePhotoChange({
    avatarUrl,
    save: (url) => update({ avatarUrl: url, displayName: savedName }),
  });

  function changeName(value: string) {
    setDraftName(value);
    clearTimeout(saveTimer.current);
    const name = value.trim();
    if (name.length === 0 || name === savedName) return;
    saveTimer.current = setTimeout(() => {
      void update({ avatarUrl, displayName: name });
    }, SAVE_DELAY_MS);
  }

  return {
    avatarUrl: photo.avatarUrl,
    /** True while a new photo uploads, which dims it under a spinner. */
    uploading: photo.uploading,
    /** False until the PDS answers; the name field remounts when it does. */
    isLoaded: profile !== undefined,
    changeName,
    changePhoto: photo.change,
    displayName: draftName?.trim() ? draftName.trim() : savedName,
    removePhoto: () => {
      photo.forget();
      return update({ avatarUrl: null, displayName: savedName });
    },
    savedName,
  };
}
