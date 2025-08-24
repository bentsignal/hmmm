import { ToolSet } from "ai";
import { codeGeneration } from "./code_generation";
import { dateTime } from "./date_time";
import { fileAnalysis } from "./file";
import { generateImage, initImage } from "./image";
import { currentEvents, positionHolder } from "./search";
import { weather } from "./weather";

export const tools = {
  dateTime,
  currentEvents,
  weather,
  positionHolder,
  fileAnalysis,
  codeGeneration,
  generateImage,
  initImage,
} satisfies ToolSet;
