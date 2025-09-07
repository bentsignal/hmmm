import { ToolSet } from "ai";
import { dateTime } from "./date_time";
import { analyzeFiles } from "./files";
import { editImage, generateImage, initImage } from "./image";
import { currentEvents, positionHolder } from "./search";
import { weather } from "./weather";

export const tools = {
  dateTime,
  currentEvents,
  weather,
  positionHolder,
  analyzeFiles,
  generateImage,
  initImage,
  editImage,
} satisfies ToolSet;
