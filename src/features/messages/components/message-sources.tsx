import { memo } from "react";
import equal from "fast-deep-equal";
import { ExternalLink } from "lucide-react";
import { Source } from "../types/message-types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const PureMessageSources = ({ sources }: { sources: Source[] }) => {
  if (sources.length === 0) return null;

  const images = sources
    .map((source) => source.image)
    .filter(
      (image): image is string => typeof image === "string" && image.length > 0,
    )
    .slice(0, 5);

  const favicons = sources
    .map((source) => source.favicon)
    .filter(
      (favicon): favicon is string =>
        typeof favicon === "string" && favicon.length > 0,
    )
    .slice(0, 5);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <div className="mb-2 flex w-full flex-col gap-4 select-none hover:cursor-pointer">
          <PreviewImages images={images} />
          <SourcesSummary favicons={favicons} sourceCount={sources.length} />
        </div>
      </SheetTrigger>
      <SheetContent className="z-150 w-2xl max-w-screen overflow-y-auto md:max-w-xl">
        <ExpandedSources sources={sources} />
      </SheetContent>
    </Sheet>
  );
};

export const MessageSources = memo(PureMessageSources, (prev, next) => {
  return equal(prev, next);
});

const PreviewImages = ({ images }: { images: string[] }) => {
  return (
    <div className="relative flex h-48 w-full flex-col gap-2">
      {images.map((source, index) => (
        <div key={source}>
          <img
            src={source ?? ""}
            alt={source ?? ""}
            className="absolute top-0 rounded-lg object-cover"
            style={{
              filter: `blur(${index + 0.5}px)`,
              opacity: 1 - index * 0.1,
              left: `calc(0px + ${index > 0 ? 100 * Math.log(index * 10) - 100 : 0}px)`,
              top: `calc(0px + ${(index * 10) / 2}px)`,
              zIndex: 10 - index,
              width: `calc(256px - ${index * 20}px)`,
              height: `calc(192px - ${index * 10}px)`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

const SourcesSummary = ({
  favicons,
  sourceCount,
}: {
  favicons: string[];
  sourceCount: number;
}) => {
  return (
    <div className="bg-card flex w-fit items-center gap-3 rounded-full px-4 py-2">
      <div className="flex gap-2">
        {favicons.map((favicon) => (
          <div key={favicon}>
            <img
              src={favicon ?? ""}
              alt={favicon ?? ""}
              className="h-4 w-4 rounded-lg"
            />
          </div>
        ))}
      </div>
      <span className="text-muted-foreground text-sm font-bold">
        {sourceCount} source{sourceCount > 1 ? "s" : ""}
      </span>
    </div>
  );
};

const ExpandedSources = ({ sources }: { sources: Source[] }) => {
  return (
    <div className="flex flex-col gap-4 py-12">
      {sources.map((source, index) => {
        const hostname = (() => {
          try {
            return new URL(source.url).hostname.replace(/^www\./, "");
          } catch {
            return source.url;
          }
        })();
        return (
          <a
            key={`${source.url}-${index}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full flex-col gap-4 rounded-xl px-4 transition-colors"
          >
            {source.image ? (
              <div className="shrink-0">
                <img
                  src={source.image}
                  alt={source.title ?? hostname}
                  className="w-full rounded-lg object-cover"
                />
              </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-1 flex items-start gap-2">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  {source.favicon ? (
                    <img
                      src={source.favicon}
                      alt={hostname}
                      className="h-4 w-4 rounded"
                    />
                  ) : null}
                  <span className="truncate">{hostname}</span>
                </div>
              </div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-base leading-tight font-semibold">
                  {source.title ?? hostname}
                </h3>
                <ExternalLink className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
