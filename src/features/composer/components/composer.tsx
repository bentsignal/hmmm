"use client";

import { cn } from "@/lib/utils";
import ComposerSpeech from "@/features/speech/components/composer-speech";
import ComposerInput from "./composer-input";
import ComposerSend from "./composer-send";

export default function Composer() {
  return (
    <div className="mx-auto w-full max-w-2xl p-4">
      <div
        className={cn(
          `bg-card supports-[backdrop-filter]:bg-card/60 max-w-4xl 
          rounded-xl border shadow-lg backdrop-blur`,
        )}
      >
        <div className="flex flex-col items-end gap-3 p-4 sm:flex-row">
          <ComposerInput />
          <div className="flex w-full flex-1 items-center justify-between gap-2">
            <div className="flex flex-1 items-center justify-start gap-2">
              <ComposerSpeech />
            </div>
            <ComposerSend />
          </div>
        </div>
      </div>
    </div>
  );
}
