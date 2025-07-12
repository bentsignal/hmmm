"use client";

import { useState } from "react";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import CustomAlert from "@/components/alert";
import { Button } from "@/components/ui/button";

export default function DeleteAccount() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: useConvexMutation(api.user.user_mutations.requestDeleteUser),
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
