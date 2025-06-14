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
import { Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "./ui/input";
import { useState } from "react";

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
          <AlertDialogDescription>
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
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              className={destructive ? "text-white" : ""}
              onClick={onConfirm}
              disabled={disabled}
            >
              Confirm
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
