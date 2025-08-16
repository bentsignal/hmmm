import { env } from "@/env";
import { utapi } from "@/server/uploadthing";
import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  uploadRoute: f({
    "image/jpeg": {
      /**
       * For full list of options and defaults, see the File Route API reference
       * @see https://docs.uploadthing.com/file-routes#route-config
       */
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
    "image/png": {
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
    "image/webp": {
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
    "application/pdf": {
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
  })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ files }) => {
      // This code runs on your server before upload
      const user = await auth();

      // If you throw, the user will not be able to upload
      if (!user?.userId) throw new UploadThingError("Unauthorized");

      // calculate the total size of the files
      const payloadSize = files.reduce((acc, file) => acc + file.size, 0);

      // storage and rate limit check
      const { data, error } = await tryCatch(
        fetchMutation(api.library.library_mutations.verifyUpload, {
          userId: user.userId,
          apiKey: env.NEXT_CONVEX_INTERNAL_KEY,
          payloadSize,
        }),
      );

      // unexpected error
      if (error) {
        console.error(error);
        throw new UploadThingError(
          "An error occurred while verifying upload, please try again later",
        );
      }

      // expected error
      const { allow, reason } = data;
      if (!allow) {
        console.error("Upload not allowed", reason);
        throw new UploadThingError(reason);
      }

      return { userId: user.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // upload metadata to convex
      const { error } = await tryCatch(
        fetchMutation(api.library.library_mutations.uploadFileMetadata, {
          file: {
            key: file.key,
            name: file.name,
            type: file.type,
            size: file.size,
          },
          userId: metadata.userId,
          apiKey: env.NEXT_CONVEX_INTERNAL_KEY,
        }),
      );

      // if there is an error uploading metadata to convex, delete the file from storage
      if (error) {
        console.error("Error uploading metadata to convex", error);
        const { error: deleteError } = await tryCatch(
          utapi.deleteFiles(file.key),
        );
        if (deleteError) {
          console.error(
            "Error deleting file from storage following metadata upload error",
            deleteError,
          );
        }
        return {
          error:
            "An error occurred while uploading file, please try again later",
        };
      }

      return { error: null };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
