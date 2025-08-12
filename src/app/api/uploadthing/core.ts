import { env } from "@/env";
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  uploadRoute: f({
    image: {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    pdf: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
    text: {
      maxFileSize: "4MB",
      maxFileCount: 1,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const user = await auth();

      // If you throw, the user will not be able to upload
      if (!user) throw new UploadThingError("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const userId = metadata.userId;
      if (!userId) {
        throw new UploadThingError("User ID not found");
      }

      // This code RUNS ON YOUR SERVER after upload
      await fetchMutation(api.library.library_mutations.uploadFileMetadata, {
        file: {
          url: file.ufsUrl,
          name: file.name,
          type: file.type,
          size: file.size,
        },
        userId,
        key: env.NEXT_CONVEX_INTERNAL_KEY,
      });

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return { uploadedBy: metadata.userId };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
