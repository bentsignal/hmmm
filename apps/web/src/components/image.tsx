import type { ImgHTMLAttributes, SyntheticEvent } from "react";
import { useRef, useState } from "react";

import { cn } from "@acme/ui/utils";

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  width: number;
  height: number;
  alt: string;
  disableReveal?: boolean;
  errorFallbackText?: string;
}

type ImageLoadState = "loading" | "ready" | "error";

const loadedImageSignatures = new Set<string>();

const getImageSignature = ({
  src,
  srcSet,
  sizes,
}: {
  src?: string;
  srcSet?: string;
  sizes?: string;
}) => {
  return [src ?? "", srcSet ?? "", sizes ?? ""].join("|");
};

const imageElementIsReady = (image: HTMLImageElement) => {
  return image.complete && image.naturalWidth > 0;
};

function useImageLoadState(imageSignature: string, shouldReveal: boolean) {
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [loadState, setLoadState] = useState<{
    signature: string;
    state: ImageLoadState;
  }>(() => ({
    signature: imageSignature,
    state:
      !shouldReveal || loadedImageSignatures.has(imageSignature)
        ? "ready"
        : "loading",
  }));

  const currentState =
    loadState.signature === imageSignature
      ? loadState.state
      : !shouldReveal || loadedImageSignatures.has(imageSignature)
        ? "ready"
        : "loading";

  const markReady = () => {
    loadedImageSignatures.add(imageSignature);
    setLoadState({ signature: imageSignature, state: "ready" });
  };

  const setImageRef = (imageElement: HTMLImageElement | null) => {
    imageRef.current = imageElement;

    if (!imageElement || !shouldReveal || currentState !== "loading") return;
    if (!imageElementIsReady(imageElement)) return;

    if (loadedImageSignatures.has(imageSignature)) {
      setLoadState({ signature: imageSignature, state: "ready" });
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => markReady());
    });
  };

  const handleLoad =
    (onLoad?: (e: SyntheticEvent<HTMLImageElement>) => void) =>
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (shouldReveal) markReady();
      onLoad?.(event);
    };

  const handleError =
    (onError?: (e: SyntheticEvent<HTMLImageElement>) => void) =>
    (event: SyntheticEvent<HTMLImageElement>) => {
      if (shouldReveal) {
        setLoadState({ signature: imageSignature, state: "error" });
      }
      onError?.(event);
    };

  return { currentState, setImageRef, handleLoad, handleError };
}

export function Image({
  src,
  width,
  height,
  sizes,
  loading = "lazy",
  disableReveal = false,
  errorFallbackText = "Failed to load image",
  className,
  onLoad,
  onError,
  style,
  ...props
}: ImageProps) {
  const shouldReveal = !disableReveal;
  const imageSignature = getImageSignature({ src, sizes });

  const { currentState, setImageRef, handleLoad, handleError } =
    useImageLoadState(imageSignature, shouldReveal);

  const hideImage = shouldReveal && currentState !== "ready";

  if (shouldReveal && currentState === "error") {
    return (
      <div
        className={cn(
          "bg-muted/60 text-muted-foreground flex items-center justify-center text-center text-sm",
          className,
        )}
      >
        {errorFallbackText}
      </div>
    );
  }

  return (
    // eslint-disable-next-line no-restricted-syntax -- This is the shared Image component implementation that wraps <img>
    <img
      ref={setImageRef}
      loading={loading}
      src={src}
      width={width}
      height={height}
      sizes={sizes}
      {...props}
      onLoad={handleLoad(onLoad)}
      onError={handleError(onError)}
      className={cn(
        "motion-reduce:transition-none",
        shouldReveal && "transition-opacity duration-300 ease-out",
        className,
      )}
      style={{
        ...style,
        opacity: hideImage ? 0 : style?.opacity,
      }}
    />
  );
}
