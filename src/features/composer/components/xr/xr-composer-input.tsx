import { Input } from "@react-three/uikit";
import useComposerInput from "@/features/composer/hooks/use-composer-input";

export default function XRComposerInput() {
  const { value, setPrompt, disabled, placeholder } = useComposerInput();
  return (
    <Input
      value={value || placeholder}
      onValueChange={(value) => {
        setPrompt(value);
      }}
      width={"100%"}
      height={"100%"}
      multiline
      color={disabled ? "gray" : "white"}
      onFocusChange={(focus) => {
        if (focus && value === "") {
          setPrompt("");
        } else if (!focus && value === "") {
          setPrompt(placeholder);
        }
      }}
      disabled={disabled}
    />
  );
}
