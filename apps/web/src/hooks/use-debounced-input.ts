import { useEffect, useState } from "react";

export default function useDebouncedInput(time = 500) {
  const [value, setValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, time);
    return () => clearTimeout(timeout);
  }, [value, time]);

  return { value, setValue, debouncedValue };
}
