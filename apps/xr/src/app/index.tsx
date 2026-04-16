import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Canvas } from "@react-three/fiber";
import { createXRStore, PointerEvents, XR } from "@react-three/xr";
import { Box } from "lucide-react";
import { z } from "zod";

import { LoginModal } from "@acme/features/auth";
import { Button } from "@acme/ui/button";

import { env } from "~/env";
import { XRComposer } from "~/features/composer/components/xr/xr-composer";
import { XRMainThreadViewer } from "~/features/thread/components/xr/xr-main-thread-viewer";
import { XRThreadList } from "~/features/thread/components/xr/xr-thread-list";
import { XRThreads } from "~/features/thread/components/xr/xr-threads";
import { cn } from "~/lib/utils";

const store = createXRStore();

export const Route = createFileRoute("/")({
  validateSearch: z.object({
    signin: z.boolean().optional(),
    redirect_url: z.string().optional(),
  }),
  component: HomePage,
});

function HomePage() {
  const { auth } = Route.useRouteContext({
    select: (ctx) => ({ auth: ctx.auth }),
  });
  const signin = Route.useSearch({ select: (s) => s.signin ?? false });
  const redirectUrl = Route.useSearch({ select: (s) => s.redirect_url });
  const navigate = useNavigate();

  function closeLoginModal() {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        signin: undefined,
        redirect_url: undefined,
      }),
    });
  }

  return (
    <div className="flex h-screen flex-1 flex-col items-center justify-center gap-4">
      <div className="flex w-full items-center justify-center gap-2">
        <Button onClick={() => store.enterAR()}>
          <Box className="h-4 w-4" />
          Enter XR
        </Button>
      </div>
      <Canvas
        className={cn("!absolute inset-0 top-0", "-z-50 opacity-0")}
        style={{ height: "100dvh", touchAction: "none" }}
        gl={{ localClippingEnabled: true }}
      >
        <PointerEvents />
        <XR store={store}>
          <group position={[0, 1, -0.7]}>
            <XRThreadList />
            <XRComposer />
            <XRMainThreadViewer />
            <XRThreads />
          </group>
        </XR>
      </Canvas>
      <LoginModal
        open={!auth.isSignedIn && signin}
        onClose={closeLoginModal}
        redirectUri={redirectUrl}
        tosURL={`${env.VITE_WEB_APP_URL}/terms-of-service`}
        privacyURL={`${env.VITE_WEB_APP_URL}/privacy-policy`}
      />
    </div>
  );
}
