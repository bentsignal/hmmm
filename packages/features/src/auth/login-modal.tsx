import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@acme/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@acme/ui/drawer";
import { useIsMobile } from "@acme/ui/hooks/use-mobile";

import { SignInButton } from "./sign-in-button";

const TITLE = "Welcome to hmmm!";
const DESCRIPTION = "Please choose your preferred sign in method";
const LINK_CLASS =
  "underline-offset-4 hover:underline focus-visible:underline";

const GLASS_CONTAINER =
  "bg-card supports-[backdrop-filter]:bg-card/50 backdrop-blur-lg border";

function Terms({
  tosURL,
  privacyURL,
}: {
  tosURL: string;
  privacyURL: string;
}) {
  return (
    <span className="text-muted-foreground text-center text-sm">
      By continuing, you agree to our{" "}
      <a href={tosURL} className={LINK_CLASS}>
        Terms of Service
      </a>
      , and acknowledge that you have read our{" "}
      <a href={privacyURL} className={LINK_CLASS}>
        Privacy Policy
      </a>
      .
    </span>
  );
}

export function LoginModal({
  open,
  onClose,
  redirectUri,
  tosURL,
  privacyURL,
}: {
  open: boolean;
  onClose: () => void;
  redirectUri?: string;
  tosURL: string;
  privacyURL: string;
}) {
  const isMobile = useIsMobile();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) return;
    onClose();
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className={`mx-2 -mb-1 ${GLASS_CONTAINER} rounded-xl`}>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-center text-xl">{TITLE}</DrawerTitle>
            <DrawerDescription>{DESCRIPTION}</DrawerDescription>
          </DrawerHeader>
          <div className="mx-4 mt-2 mb-3 flex flex-col gap-4">
            <SignInButton redirectUri={redirectUri} />
          </div>
          <DrawerFooter className="pt-2">
            <Terms tosURL={tosURL} privacyURL={privacyURL} />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${GLASS_CONTAINER} sm:max-w-[425px]`}>
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>{DESCRIPTION}</DialogDescription>
          <div className="mx-4 mt-3 mb-2 flex flex-col gap-4">
            <SignInButton redirectUri={redirectUri} />
          </div>
          <Terms tosURL={tosURL} privacyURL={privacyURL} />
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
