"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { Input } from "../../../components/ui/input";
import CustomButton from "../../../components/custom-button";
import { useBetaAccess } from "../hooks/use-beta-access";
import { useBetaWaitlist } from "../hooks/use-beta-waitlist";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BetaPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  const { isUserSubscribed, attemptAccess, accessLoading } = useBetaAccess();

  const { isOnWaitlist, attemptJoinWaitlist, waitlistLoading } =
    useBetaWaitlist();

  useEffect(() => {
    if (isUserSubscribed === false) {
      setIsOpen(true);
    } else if (isUserSubscribed === true) {
      setIsOpen(false);
    }
  }, [isUserSubscribed]);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="w-80 py-6">
        <AlertDialogHeader className="sr-only">
          <AlertDialogTitle>Access Popup</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogDescription asChild>
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="flex items-center gap-2">
              <span className="text-primary text-center text-lg font-semibold">
                Welcome to QBE
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-semibold">
                    Like &quot;cube&quot;, lol
                  </span>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-muted-foreground text-md text-center font-semibold">
              Have an access code?
            </span>
            <Input
              placeholder="Enter your code"
              value={accessCode}
              className="my-4 w-52"
              onChange={(e) => setAccessCode(e.target.value)}
              disabled={accessLoading || isUserSubscribed === true}
            />
            <div className="flex flex-col gap-2">
              <CustomButton
                className="w-52"
                onClick={() => attemptAccess(accessCode)}
                label="Check Code"
                loading={accessLoading || isUserSubscribed === undefined}
                disabled={accessLoading || isUserSubscribed === true}
              />
              <CustomButton
                variant="secondary"
                className="w-52"
                disabled={isOnWaitlist || waitlistLoading}
                onClick={attemptJoinWaitlist}
                label={isOnWaitlist ? "Joined waitlist ✅" : "Join Waitlist"}
                loading={waitlistLoading || isOnWaitlist === undefined}
              />
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogContent>
    </AlertDialog>
  );
}
