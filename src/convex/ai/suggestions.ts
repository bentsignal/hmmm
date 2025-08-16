import { generateObject, generateText } from "ai";
import { z } from "zod";
import { v } from "convex/values";
import { internal } from "@/convex/_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "@/convex/_generated/server";
import { counter } from "../counter";
import { limiter } from "../limiter";
import { languageModels } from "./models";
import { formatSuggestions, suggestionsGenerationPrompt } from "./prompts";

export const generateSuggestions = internalAction({
  args: {},
  handler: async (ctx) => {
    // generate text containing prompts
    const { text: rawPrompts } = await generateText({
      model: languageModels["sonar"].model,
      prompt: suggestionsGenerationPrompt,
    });
    // parse text into array of prompts
    const { object: prompts } = await generateObject({
      model: languageModels["gemini-2.0-flash"].model,
      prompt: rawPrompts,
      system: formatSuggestions,
      schema: z.object({
        prompts: z.array(z.string()).max(10),
      }),
    });
    // save new suggestions to table
    await ctx.runMutation(internal.ai.suggestions.saveNewSuggestions, {
      prompts: prompts.prompts,
    });
  },
});

export const saveNewSuggestions = internalMutation({
  args: {
    prompts: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    for (const prompt of args.prompts) {
      await ctx.db.insert("suggestions", { prompt });
    }
  },
});

export const incrementSuggestion = mutation({
  args: {
    id: v.id("suggestions"),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Unauthorized");
    }
    // no need to let user know if limit is hit. just don't want to increment
    // the counter if its being spammed malicously
    const { ok } = await limiter.limit(ctx, "suggestion", {
      key: userId.subject,
    });
    if (!ok) {
      return;
    }
    await counter.add(ctx, args.id, 1);
  },
});

export const getSuggestions = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("suggestions").order("desc").take(10);
  },
});

export const getTodaysSuggestions = internalQuery({
  args: {
    numResults: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // get all suggestions generated today
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const suggestions = await ctx.db
      .query("suggestions")
      .withIndex("by_creation_time", (q) => q.gte("_creationTime", startOfDay))
      .order("desc")
      .collect();
    // count how many times each suggestion has been clicked
    const counts = await Promise.all(
      suggestions.map(async (suggestion) => {
        const count = await counter.count(ctx, suggestion._id);
        return {
          id: suggestion._id,
          prompt: suggestion.prompt,
          count,
        };
      }),
    );
    // sort by count and return the top clicked results
    return counts
      .sort((a, b) => b.count - a.count)
      .slice(0, args.numResults ?? counts.length);
  },
});
