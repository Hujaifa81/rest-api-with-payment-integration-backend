import { Request, Response } from "express";
import ENV from "../../config/env";
import { formatDuration } from "../utils";

export const rootResponse = (req: Request, res: Response) => {
  res.send({
    message: "Rest API server is running..",
    environment: ENV.NODE_ENV,
    uptime: formatDuration(process.uptime()),
    timeStamp: new Date().toISOString(),
  });
};
