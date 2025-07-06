// import { useMutation } from "convex/react";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { toast } from "sonner";
// import { tryCatch } from "@/lib/utils";
import { useState } from "react";

export const useBetaAccess = () => {
  // const isUserSubscribed = useQuery(api.auth.isUserSubscribed, {});
  // const requestAccess = useMutation(api.auth.requestAccess);

  const [accessLoading, setAccessLoading] = useState(false);

  const attemptAccess = async (accessCode: string) => {
    console.log("accessCode", accessCode);
    return true;
    // setAccessLoading(true);
    // const { error } = await tryCatch(requestAccess({ code: accessCode }));
    // setAccessLoading(false);
    // if (error) {
    //   toast.error("Invalid access code.");
    //   return;
    // }
    // toast.success("Access granted. Welcome aboard!");
  };

  return {
    isUserSubscribed: true,
    attemptAccess,
    accessLoading,
    setAccessLoading,
  };
};
