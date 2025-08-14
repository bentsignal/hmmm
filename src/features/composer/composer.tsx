"use client";

import { ComposerAddAttachments } from "./components/composer-add-attachments";
import { ComposerAttachmentsPreview } from "./components/composer-attachments-preview";
import ComposerInput from "./components/composer-input";
import ComposerSend from "./components/composer-send";
import { cn } from "@/lib/utils";
import ComposerSpeech from "@/features/speech/components/composer-speech";

export default function Composer({
  showInstantLoad,
}: {
  showInstantLoad?: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <div
        className={cn(
          `bg-card supports-[backdrop-filter]:bg-card/60 max-w-4xl 
          rounded-xl border shadow-lg backdrop-blur`,
        )}
      >
        <ComposerAttachmentsPreview />
        <div className="flex flex-col items-end gap-3 p-4 sm:flex-row">
          <ComposerInput showInstantLoad={showInstantLoad} />
          <div className="flex w-full flex-1 items-center justify-between gap-2">
            <div className="flex flex-1 items-center justify-start gap-2">
              <ComposerAddAttachments />
              <ComposerSpeech />
            </div>
            <ComposerSend showInstantLoad={showInstantLoad} />
          </div>
        </div>
      </div>
    </div>
  );
}
