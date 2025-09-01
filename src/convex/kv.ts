import { Redis } from "@upstash/redis";
import { env } from "./convex.env";

const kv = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

export default kv;
