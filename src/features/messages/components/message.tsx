import { UIMessage } from "ai";
import { MemoizedPrompt } from "./prompt-message";
import { MemoizedResponse } from "./response-message";

export default function Message({
  message,
  streaming,
}: {
  message: UIMessage;
  streaming: boolean;
}) {
  return (
    <div className="w-full max-w-full">
      {message.role === "user" ? (
        <MemoizedPrompt message={message} />
      ) : message.role === "assistant" && message.parts.length > 0 ? (
        <MemoizedResponse message={message} streaming={streaming} />
      ) : null}
    </div>
  );
}
