import { useMutation } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { tryCatch } from "@/lib/utils";
import { useState } from "react";

export const useBetaAccess = () => {
  const isUserSubscribed = useQuery(api.auth.isUserSubscribed, {});
  const requestAccess = useMutation(api.auth.requestAccess);
  const [accessCode, setAccessCode] = useState("");
  const [accessLoading, setAccessLoading] = useState(false);
  const attemptAccess = async () => {
    setAccessLoading(true);
    const { error } = await tryCatch(requestAccess({ code: accessCode }));
    setAccessLoading(false);
    if (error) {
      toast.error("Invalid access code.");
      return;
    }
    toast.success("Access granted. Welcome aboard!");
  };
  return {
    isUserSubscribed,
    attemptAccess,
    accessCode,
    setAccessCode,
    accessLoading,
    setAccessLoading,
  };
};
