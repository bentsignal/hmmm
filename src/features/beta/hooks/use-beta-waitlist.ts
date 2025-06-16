import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";

export const useBetaWaitlist = () => {
  const isOnWaitlist = useQuery(api.waitlist.isOnWaitlist, {});
  const joinWaitlist = useMutation(api.waitlist.joinWaitlist);

  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const attemptJoinWaitlist = async () => {
    setWaitlistLoading(true);
    const { error } = await tryCatch(joinWaitlist({}));
    setWaitlistLoading(false);
    if (error) {
      toast.error("Error joining waitlist. Please try again later.");
      return;
    }
    toast.success(
      "Thanks for joining the waitlist! You'll receive an email when access is opened to the public",
    );
  };

  return {
    isOnWaitlist,
    attemptJoinWaitlist,
    waitlistLoading,
    setWaitlistLoading,
  };
};
