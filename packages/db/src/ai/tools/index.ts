import { dateTime } from "./date_time";
import { analyzeFiles } from "./files";
import { editImage, generateImage, initImage } from "./image";
import { currentEvents } from "./search/current_events";
import { positionHolder } from "./search/postition_holder";
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
};
