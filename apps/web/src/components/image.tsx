import type { ImageProps } from "@acme/features/image";
import { Image as BaseImage } from "@acme/features/image";

import { env } from "~/env";

export function Image(props: Omit<ImageProps, "optimizerBaseUrl">) {
  return <BaseImage {...props} optimizerBaseUrl={env.VITE_BASE_URL} />;
}
