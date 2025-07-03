import { httpRouter } from "convex/server";
import { polar } from "./polar";

const http = httpRouter();

polar.registerRoutes(http);

export default http;
