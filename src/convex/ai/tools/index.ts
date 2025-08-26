import { ToolSet } from "ai";
import { codeGeneration } from "./code_generation";
import { dateTime } from "./date_time";
import { analyzeFiles } from "./file";
import { editImage, generateImage, initImage } from "./image";
import { currentEvents, positionHolder } from "./search";
import { weather } from "./weather";

export const tools = {
  dateTime,
  currentEvents,
  weather,
  positionHolder,
  analyzeFiles,
  codeGeneration,
  generateImage,
  initImage,
  editImage,
} satisfies ToolSet;
