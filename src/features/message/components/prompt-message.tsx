export default function PromptMessage({ message }: { message: string }) {
  return (
    <div className="fade-in">
      <div
        className="bg-secondary text-secondary-foreground 
        flex max-w-xs flex-col gap-2 rounded-xl px-5 py-4"
      >
        {message}
      </div>
    </div>
  );
}
