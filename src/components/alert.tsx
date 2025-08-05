import { useState } from "react";
import { Trash } from "lucide-react";
import CustomButton from "./custom-button";
import { Input } from "./ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function CustomAlert({
  open,
  setOpen,
  onCancel,
  onConfirm,
  title,
  message,
  typeToConfirm,
  typeToConfirmMessage,
  destructive,
  loading,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  typeToConfirm?: boolean;
  typeToConfirmMessage?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  const [typeToConfirmValue, setTypeToConfirmValue] = useState("");
  const disabled = typeToConfirm && typeToConfirmValue !== typeToConfirmMessage;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild className="sr-only">
        <Button variant="outline" size="icon">
          <Trash />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Are you sure?"}</AlertDialogTitle>
          <AlertDialogDescription className="py-2">
            {message ?? "This action cannot be undone."}
          </AlertDialogDescription>
          {typeToConfirm && typeToConfirmMessage && (
            <AlertDialogDescription>
              Type the following to confirm:{" "}
              <span className="font-bold">{typeToConfirmMessage}</span>
              <Input
                type="text"
                className="mt-2"
                value={typeToConfirmValue}
                onChange={(e) => setTypeToConfirmValue(e.target.value)}
              />
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="hover:cursor-pointer"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <CustomButton
              variant={destructive ? "destructive" : "default"}
              className={destructive ? "bg-destructive text-white" : ""}
              onClick={onConfirm}
              disabled={disabled}
              loading={loading ?? false}
              label="Confirm"
            />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
