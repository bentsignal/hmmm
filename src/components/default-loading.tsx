import { Loader } from "lucide-react";

export default function DefaultLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Loader className="h-6 w-6 animate-spin" />
    </div>
  );
}
