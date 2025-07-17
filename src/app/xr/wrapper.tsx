"use client";

import { createXRStore } from "@react-three/xr";
import { Box } from "lucide-react";
import { useRouter } from "next/navigation";
import XRCanvas from "./canvas";
import { Button } from "@/components/ui/button";

const store = createXRStore();

export default function XRWrapper() {
  const router = useRouter();
  return (
    <>
      <div className="mx-2 my-2 flex flex-col gap-2 text-center">
        <span className="text-muted-foreground text-lg font-semibold">
          Stay on this page while using the XR app
        </span>
      </div>
      <div className="flex w-full items-center justify-center gap-2">
        <Button
          className="h-full"
          variant="outline"
          onClick={() => router.push("/")}
        >
          Back to home
        </Button>
        <Button className="" onClick={() => store.enterAR()}>
          <Box className="h-4 w-4" />
          Enter XR
        </Button>
      </div>
      <XRCanvas store={store} />
    </>
  );
}
