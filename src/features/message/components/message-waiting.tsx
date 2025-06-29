import { Loader2 } from "lucide-react";

export default function MessageWaiting({
  isThreadIdle,
}: {
  isThreadIdle: boolean;
}) {
  if (isThreadIdle) return null;
  return (
    <div className="flex items-center justify-start">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  );
}
