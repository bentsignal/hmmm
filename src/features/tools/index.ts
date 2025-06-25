import { dateTime } from "./date-time-tool";
import { webSearch } from "@/features/web-search/tools/web-search-tool";
import { getWeather } from "./weather-tool";

export { dateTime };
export { webSearch };
export { getWeather };

export const tools = { dateTime, webSearch, getWeather };
