import { UTApi } from "uploadthing/server";

if (!process.env.UPLOADTHING_TOKEN) {
  throw new Error("UPLOADTHING_TOKEN not set");
}

export const utapi = new UTApi({
  token: process.env.UPLOADTHING_TOKEN,
});
