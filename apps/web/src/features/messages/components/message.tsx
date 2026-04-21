// eslint-disable-next-line no-restricted-imports -- manual memo needed: deep-equal check prevents message re-renders during streaming
import { memo } from "react";
import equal from "fast-deep-equal";

import type { MyUIMessage } from "@acme/features/messages";
import { responseHasNoContent } from "@acme/features/messages";
import { Loader } from "@acme/ui/loader";

import { PromptMessage } from "./prompt-message";
import { ResponseMessage } from "./response-message";

function PureMessage({
  message,
  isActive,
  isLast,
}: {
  message: MyUIMessage;
  isActive: boolean;
  isLast: boolean;
}) {
  if (message.role === "assistant" && responseHasNoContent(message)) {
    if (isLast) {
      return (
        <div className="flex items-start justify-start">
          <Loader variant="typing" size="md" />
        </div>
      );
    }
    return null;
  }

  return (
    <div className="w-full max-w-full">
      {message.role === "user" ? (
        <PromptMessage message={message} />
      ) : message.role === "assistant" && message.parts.length > 0 ? (
        <ResponseMessage message={message} isActive={isActive} />
      ) : null}
    </div>
  );
}

export const Message = memo(PureMessage, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.isLast === next.isLast &&
    equal(prev.message, next.message)
  );
});
