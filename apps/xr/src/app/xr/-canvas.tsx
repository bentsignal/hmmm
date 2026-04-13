import type { XRStore } from "@react-three/xr";
import { Canvas } from "@react-three/fiber";
import { PointerEvents, XR } from "@react-three/xr";

import { XRComposer as Composer } from "~/features/composer/components/xr/xr-composer";
import { XRMainThreadViewer as MainThreadViewer } from "~/features/thread/components/xr/xr-main-thread-viewer";
import { XRThreadList as ThreadList } from "~/features/thread/components/xr/xr-thread-list";
import { XRThreads as Threads } from "~/features/thread/components/xr/xr-threads";
import { cn } from "~/lib/utils";

export function XRCanvas({ store }: { store: XRStore }) {
  return (
    <Canvas
      className={cn("!absolute inset-0 top-0", "-z-50 opacity-0")}
      style={{ height: "100dvh", touchAction: "none" }}
      gl={{ localClippingEnabled: true }}
    >
      <PointerEvents />
      <XR store={store}>
        <group position={[0, 1, -0.7]}>
          <ThreadList />
          <Composer />
          <MainThreadViewer />
          <Threads />
        </group>
      </XR>
    </Canvas>
  );
}
