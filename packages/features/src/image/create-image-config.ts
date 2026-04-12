import { convert } from "great-time";

export function createImageConfig({
  uploadthingUrl,
  sizes,
}: {
  uploadthingUrl: string;
  sizes: number[];
}) {
  const formats = ["image/webp"] satisfies ("image/webp" | "image/avif")[];
  return {
    sizes,
    qualities: [75] as const,
    domains: [],
    minimumCacheTTL: convert(24, "hours", "to seconds"),
    formats,
    localPatterns: [{ pathname: "^/.*$", search: "" }],
    remotePatterns: [
      {
        protocol: "https" as const,
        hostname: new URL(uploadthingUrl).hostname,
        pathname: "/f/**",
        search: "",
      },
    ],
  };
}
