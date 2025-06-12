// eslint-disable-next-line
export default function PromptMessage({ message }: { message: any }) {
  return (
    <div className="flex items-end justify-end">
      <div
        className="bg-secondary text-secondary-foreground 
        flex max-w-xs flex-col gap-2 rounded-xl px-5 py-4"
      >
        {message.value}
      </div>
    </div>
  );
}
