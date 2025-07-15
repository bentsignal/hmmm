import { useState } from "react";
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
      color={disabled ? "gray" : "white"}
      onFocusChange={(focus) => {
        if (focus && value === "") {
          setIsFocused(true);
          setPrompt("");
        } else if (!focus && value === "") {
          setIsFocused(false);
          setPrompt(placeholder);
        }
      }}
      disabled={disabled}
    />
  );
}
