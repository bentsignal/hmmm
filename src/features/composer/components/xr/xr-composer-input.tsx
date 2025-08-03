import { useState } from "react";
import { hexColors } from "@/styles";
import { Input } from "@react-three/uikit";
import useComposerInput from "@/features/composer/hooks/use-composer-input";

export default function XRComposerInput() {
  const { value, setPrompt, disabled, placeholder } = useComposerInput();
  const [isFocused, setIsFocused] = useState(false);
  return (
    <Input
      value={isFocused ? value : value || placeholder}
      onValueChange={(value) => {
        setPrompt(value);
      }}
      width={"100%"}
      height={"100%"}
      multiline
      color={disabled ? hexColors.borderInput : hexColors.foreground}
      onFocusChange={(focus) => {
        setIsFocused(focus);
        if (focus && (value === "" || value === placeholder)) {
          setPrompt("");
        } else if (!focus && value === "") {
          setPrompt(placeholder);
        }
      }}
      disabled={disabled}
    />
  );
}
