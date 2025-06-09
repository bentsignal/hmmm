"use client";

import CustomButton from "@/components/custom-button";
import { toast } from "sonner";

export default function PromptInput() {
  return (
    <CustomButton
      loading={false}
      onClick={() => toast.success("Hello")}
      label="Click me"
    />
  );
}
