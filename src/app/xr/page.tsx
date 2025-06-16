"use client";

import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import XRApp from "@/features/xr/components/xr-app";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Box } from "lucide-react";

const store = createXRStore();

export default function XRPage() {
  const router = useRouter();
  return (
    <>
      <div className="flex h-screen flex-1 flex-col items-center justify-center gap-4">
        <div className="mx-2 my-2 flex flex-col gap-2 text-center">
          <span className="text-muted-foreground text-lg font-semibold">
            Stay on this page while using the XR app.
          </span>
          <span className="text-muted-foreground text-lg font-semibold">
            To view threads, open a new tab.
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
      </div>
      <Canvas className="!absolute inset-0 top-0 -z-50 opacity-0">
        <XR store={store}>
          <XRApp />
        </XR>
      </Canvas>
    </>
  );
}
