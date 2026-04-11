import type { ImgWidth } from "./sizes";
import { imageWidths, largestImageWidth } from "./sizes";

const imageQuality = 75;
const maxResponsiveSrcSetCandidates = 4;

const getVercelImageEndpoint = (optimizerBaseUrl?: string) => {
  if (!optimizerBaseUrl) {
    return "/_vercel/image";
  }

  try {
    return new URL("/_vercel/image", optimizerBaseUrl).toString();
  } catch {
    return `${optimizerBaseUrl.replace(/\/+$/, "")}/_vercel/image`;
  }
};

const getVercelOptimizedUrl = (
  url: string,
  width: ImgWidth,
  optimizerBaseUrl?: string,
) => {
  const searchParams = new URLSearchParams();
  searchParams.append("url", url);
  searchParams.append("w", width.toString());
  searchParams.append("q", imageQuality.toString());
  return `${getVercelImageEndpoint(optimizerBaseUrl)}?${searchParams.toString()}`;
};

const normalizeImageSourceUrl = (src: string) => {
  if (src.startsWith("/")) {
    return src.split("?")[0]?.split("#")[0] ?? src;
  }

  try {
    const url = new URL(src);
    url.hash = "";
    url.search = "";

    return url.toString();
  } catch {
    return src.split("#")[0] ?? src;
  }
};

const pickResponsiveWidths = (candidateWidths: readonly ImgWidth[]) => {
  if (candidateWidths.length === 0) {
    return [largestImageWidth];
  }

  if (candidateWidths.length <= maxResponsiveSrcSetCandidates) {
    const first = candidateWidths[0];
    if (first === undefined) return [largestImageWidth];
    return [first, ...candidateWidths.slice(1)];
  }

  const lastIndex = candidateWidths.length - 1;
  const selectedWidths = new Set<ImgWidth>();

  for (let index = 0; index < maxResponsiveSrcSetCandidates; index += 1) {
    const ratio = index / (maxResponsiveSrcSetCandidates - 1);
    const candidateIndex = Math.round(lastIndex * ratio);
    const candidateWidth = candidateWidths[candidateIndex];

    if (candidateWidth !== undefined) {
      selectedWidths.add(candidateWidth);
    }
  }

  const result = [...selectedWidths];
  const first = result[0];
  if (first === undefined) return [largestImageWidth];
  return [first, ...result.slice(1)];
};

export const useVercelOptimizedImageProps = ({
  src,
  width,
  height,
  sizes,
  optimizerBaseUrl,
}: {
  src: string;
  width: number;
  height: number;
  sizes?: string;
  optimizerBaseUrl?: string;
}) => {
  const normalizedSrc = normalizeImageSourceUrl(src);

  if (process.env.NODE_ENV === "development") {
    return { src, width, height, sizes };
  }

  if (sizes) {
    const maxResponsiveWidth = Math.min(width * 2, largestImageWidth);
    const responsiveWidths = imageWidths.filter(
      (candidateWidth) => candidateWidth <= maxResponsiveWidth,
    );
    const widths = pickResponsiveWidths(responsiveWidths);
    const largestRequestedWidth = widths.at(-1) ?? largestImageWidth;

    return {
      src: getVercelOptimizedUrl(
        normalizedSrc,
        largestRequestedWidth,
        optimizerBaseUrl,
      ),
      srcSet: widths
        .map((candidateWidth) => {
          return `${getVercelOptimizedUrl(normalizedSrc, candidateWidth, optimizerBaseUrl)} ${candidateWidth}w`;
        })
        .join(", "),
      sizes,
      width,
      height,
    };
  }

  const uniqueWidths = [
    ...new Set(
      [width, width * 2, width * 3].map(
        (w) => imageWidths.find((p) => p >= w) ?? largestImageWidth,
      ),
    ),
  ];
  const firstWidth = uniqueWidths[0] ?? largestImageWidth;
  const widths = [firstWidth, ...uniqueWidths.slice(1)] as const;
  return {
    srcSet: widths
      .map(
        (w, i) =>
          `${getVercelOptimizedUrl(normalizedSrc, w, optimizerBaseUrl)} ${i + 1}x`,
      )
      .join(", "),
    src: getVercelOptimizedUrl(normalizedSrc, widths[0], optimizerBaseUrl),
    width: widths[0],
    height: Math.round((widths[0] * height) / width),
  };
};
