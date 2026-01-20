/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServer, Server } from "http";
import ENV from "./config/env.js";
import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { connectRedis } from "./config/redis.js";

async function connectToDB() {
  try {
    await prisma.$connect();
    console.log("DB connected");
  } catch (err) {
    console.log("DB connection Err:", err);
  }
}

class ServerCreator {
  protected server: Server;

  constructor() {
    this.server = createServer(app);

    this.server.on("error", (err) => {
      console.error("Server error:", err);
      this.cleanupAndExit(1);
    });
  }

  init = async () => {
    return new Promise<void>((resolve) => {
      this.server.listen(ENV.PORT, async () => {
        await connectToDB();
        try {
          await connectRedis();
        } catch (e: any) {
          console.warn("Redis connect failed on startup:", e?.message || e);
        }
        console.log(`Server listening at: http://localhost:${ENV.PORT}`);
        resolve();
      });
    });
  };

  shutdown = async () => {
    try {
      if (this.server.listening) {
        await new Promise<void>((resolve, reject) => {
          this.server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log("Server has been closed");
      }
    } catch (error) {
      console.error("Error during shutdown:", error);
      this.cleanupAndExit(1);
    } finally {
      process.exit(0);
    }
  };

  private cleanupAndExit = async (code: number) => {
    try {
      if (this.server.listening) {
        await new Promise<void>((resolve) => this.server.close(() => resolve()));
      }
    } finally {
      process.exit(code);
    }
  };
}

export default ServerCreator;
