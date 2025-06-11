import ReactMarkdown from "react-markdown";

// eslint-disable-next-line
export default function ResponseMessage({ message }: { message: any }) {
  return (
    <div className="flex flex-col items-start gap-2">
      <ReactMarkdown>{message.value}</ReactMarkdown>
    </div>
  );
}
