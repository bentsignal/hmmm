import { Loader } from "@/components/ui/loader";

export default function DefaultLoading() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Loader variant="dots" size="sm" />
    </div>
  );
}
