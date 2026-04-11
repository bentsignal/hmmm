import ComposerSpeech from "~/features/speech/components/composer-speech";
import { cn } from "~/lib/utils";
import { ComposerAddAttachments } from "./components/composer-add-attachments";
import { ComposerAttachmentsPreview } from "./components/composer-attachments-preview";
import ComposerInput from "./components/composer-input";
import ComposerSend from "./components/composer-send";

export default function Composer({
  showInstantLoad,
  handleError,
  authed,
}: {
  showInstantLoad?: () => void;
  handleError?: () => void;
  authed: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <div
        className={cn(
          `bg-card supports-[backdrop-filter]:bg-card/50 max-w-4xl rounded-xl border shadow-lg backdrop-blur`,
        )}
      >
        <ComposerAttachmentsPreview />
        <div className="flex flex-col items-end gap-3 p-4 sm:flex-row">
          <ComposerInput
            showInstantLoad={showInstantLoad}
            handleError={handleError}
          />
          <div className="flex w-full flex-1 items-center justify-between gap-2">
            {authed && (
              <div className="flex flex-1 items-center justify-start gap-2">
                <ComposerAddAttachments />
                <ComposerSpeech />
              </div>
            )}
            <ComposerSend
              showInstantLoad={showInstantLoad}
              handleError={handleError}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
