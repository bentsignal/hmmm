"use node";

import { generateText, UserModelMessage } from "ai";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import { internalAction } from "@/convex/_generated/server";
import { languageModels } from "@/convex/ai/models";
import { getFileUrl } from "@/convex/app/library";
import { calculateModelCost } from "@/convex/user/usage";
import { tryCatch } from "@/lib/utils";
import { getFileType } from "@/features/library/lib";

export const analysis = internalAction({
  args: v.object({
    keys: v.array(v.string()),
    prompt: v.string(),
    userId: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
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

    const messages: UserModelMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          ...files.data.map((file) => {
            const fileType =
              getFileType(file.mimeType) === "image" ? "image" : "file";
            const url = getFileUrl(file.key);
            return fileType === "image"
              ? {
                  type: "image" as const,
                  image: url,
                }
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
