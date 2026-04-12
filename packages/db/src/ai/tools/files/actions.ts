"use node";

import { generateText } from "ai";
import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { getFileUrl } from "../../../app/file_helpers";
import { tryCatch } from "../../../lib/utils";
import { calculateModelCost } from "../../../user/usage";
import { languageModels } from "../../models/language";

const getFileType = (fileType: string) => {
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("text/") || fileType.startsWith("application/pdf"))
    return "document";
  return "file";
};

export const analysis = internalAction({
  args: v.object({
    keys: v.array(v.string()),
    prompt: v.string(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<string> => {
    const { keys, prompt, userId } = args;
    const files = await tryCatch(
      ctx.runQuery(internal.app.library.getFilesByKeys, {
        keys: keys,
        userId: userId ?? "no-user",
      }),
    );

    if (files.error) {
      throw new Error("Failed to retrieve files");
    }

    if (files.data.length === 0) {
      throw new Error("No files found");
    }

    const messages = [
      {
        role: "user" as const,
        content: [
          {
            type: "text" as const,
            text: prompt,
          },
          ...files.data.map((file) => {
            const url = getFileUrl(file.key);
            return getFileType(file.mimeType) === "image"
              ? { type: "image" as const, image: url }
              : {
                  type: "file" as const,
                  data: url,
                  mediaType: file.mimeType,
                };
          }),
        ],
      },
    ];

    const analysis = await tryCatch(
      generateText({
        model: languageModels["gemini-2.5-flash"].model,
        messages: messages,
      }),
    );

    if (analysis.error) {
      throw new Error("Failed to analyze files");
    }

    // log usage
    if (userId) {
      const cost = calculateModelCost(
        languageModels["gemini-2.5-flash"],
        analysis.data.usage,
        analysis.data.providerMetadata,
      );
      await ctx.runMutation(internal.user.usage.log, {
        userId: userId,
        type: "tool_call",
        cost: cost,
      });
    }

    return analysis.data.text;
  },
});
