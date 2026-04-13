import type { ImageProps } from "~/features/image/image";
import { env } from "~/env";
import { Image as BaseImage } from "~/features/image/image";

export function Image(props: Omit<ImageProps, "optimizerBaseUrl">) {
  return <BaseImage {...props} optimizerBaseUrl={env.VITE_BASE_URL} />;
}
