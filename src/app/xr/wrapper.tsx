"use client";

import { Canvas } from "@react-three/fiber";
import { createXRStore, PointerEvents, XR } from "@react-three/xr";
import { Box } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import XRComposer from "@/features/composer/components/xr/xr-composer";
import { ThreadList } from "@/features/thread/components/xr";
import useThreadStore from "@/features/thread/store/thread-store";

const store = createXRStore();

export default function XRPage() {
  const router = useRouter();
  const hideCanvas = true;
  const activeThread = useThreadStore((state) => state.activeThread);
  return (
    <>
      <div className="mx-2 my-2 flex flex-col gap-2 text-center">
        <span className="text-muted-foreground text-lg font-semibold">
          Stay on this page while using the XR app.
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
      <Canvas
        className={cn(
          "!absolute inset-0 top-0",
          hideCanvas ? "-z-50 opacity-0" : "",
        )}
        style={{ height: "100dvh", touchAction: "none" }}
        gl={{ localClippingEnabled: true }}
      >
        <PointerEvents />
        <XR store={store}>
          <ThreadList activeThread={activeThread} />
          <XRComposer />
        </XR>
      </Canvas>
    </>
  );
}
