"use client";

import { Button } from "@/components/ui/button";
import CustomAlert from "@/components/alert";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function DeleteAccount() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: useConvexMutation(api.users.requestDeleteUser),
    onSuccess: () => {
      router.push("/goodbye");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete account");
    },
  });

  return (
    <div>
      <Button variant="destructive" onClick={() => setIsOpen(true)}>
        Delete Account
      </Button>
      <CustomAlert
        open={isOpen}
        setOpen={setIsOpen}
        onCancel={() => setIsOpen(false)}
        onConfirm={() => {
          deleteAccount({});
        }}
        loading={isPending}
        title="Delete Account"
        message="Are you sure you want to delete your account?"
        typeToConfirm
        typeToConfirmMessage="delete my account"
        destructive
      />
    </div>
  );
}
