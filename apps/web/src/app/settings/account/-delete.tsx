import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { toast } from "sonner";

import { api } from "@acme/db/api";
import { Button } from "@acme/ui/button";

import CustomAlert from "~/components/alert";
import InfoCard from "~/components/info-card";

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: useConvexMutation(api.user.account.requestDelete),
    onSuccess: () => {
      navigate({ to: "/goodbye" });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete account");
    },
  });

  return (
    <InfoCard title="Danger Zone">
      <Button
        className="w-fit"
        variant="destructive"
        onClick={() => setIsOpen(true)}
      >
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
    </InfoCard>
  );
}
