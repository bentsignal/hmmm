import { UIMessage } from "@convex-dev/agent/react";
import PromptMessage from "./prompt-message";
import ResponseMessage from "./response-message";

export default function Message({
  message,
  isActive,
}: {
  message: UIMessage;
  isActive: boolean;
}) {
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
