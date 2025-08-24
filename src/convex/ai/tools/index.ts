import { ToolSet } from "ai";
import { codeGeneration } from "./code_generation_tool";
import { dateTime } from "./date_time_tool";
import { fileAnalysis } from "./file_analysis_tool";
import { imageGeneration, imageGenerationInit } from "./image_generation_tool";
import { currentEvents, positionHolder } from "./search";
import { weather } from "./weather_tool";

export const tools = {
  dateTime,
  currentEvents,
  weather,
  positionHolder,
  fileAnalysis,
  codeGeneration,
  imageGeneration,
  imageGenerationInit,
} satisfies ToolSet;
