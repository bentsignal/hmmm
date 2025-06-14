import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { models } from "./model-types";

const openRouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const modelMap = new Map<string, ReturnType<typeof openRouter.chat>>(
  models.map((model) => [model.id, openRouter.chat(model.id)]),
);

export default modelMap;
