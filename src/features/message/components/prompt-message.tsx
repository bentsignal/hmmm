// eslint-disable-next-line
export default function PromptMessage({ message }: { message: any }) {
  return (
    <div className="flex items-end justify-end">
      <div className="bg-primary text-primary-foreground flex max-w-xs flex-col gap-2 rounded-lg p-3">
        {message.value}
      </div>
    </div>
  );
}
