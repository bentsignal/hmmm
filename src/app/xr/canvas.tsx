"use client";

import { Canvas } from "@react-three/fiber";
import { PointerEvents, XR, XRStore } from "@react-three/xr";
import { cn } from "@/lib/utils";
import { Composer } from "@/features/composer/components/xr";
import { MessagesWrapper } from "@/features/message/components/xr";
import { ThreadList } from "@/features/thread/components/xr";

export default function XRCanvas({ store }: { store: XRStore }) {
  const hideCanvas = true;
  return (
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
        <group position={[0, 1, -0.7]}>
          <ThreadList />
          <Composer />
          <MessagesWrapper />
        </group>
      </XR>
    </Canvas>
  );
}
