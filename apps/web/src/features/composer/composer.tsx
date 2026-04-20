import { ComposerSpeech } from "~/features/speech/components/composer-speech";
import { ComposerAddAttachments } from "./components/composer-add-attachments";
import { ComposerAttachmentsPreview } from "./components/composer-attachments-preview";
import { ComposerInput } from "./components/composer-input";
import { ComposerSend } from "./components/composer-send";
import { ComposerShell } from "./primitives/composer-shell";

export function Composer() {
  return (
    <ComposerShell
      attachments={<ComposerAttachmentsPreview />}
      input={<ComposerInput />}
      actions={
        <>
          <div className="flex flex-1 items-center justify-start gap-2">
            <ComposerAddAttachments />
            <ComposerSpeech />
          </div>
          <ComposerSend />
        </>
      }
    />
  );
}
