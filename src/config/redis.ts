/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "redis";
import ENV from "./env";

export const redisClient = createClient({
  url: ENV.REDIS.REDIS_URL,
});

redisClient.on("error", (err: any) => console.log("Redis Client Error", err));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
    console.log("Redis Connected");
  }
};
