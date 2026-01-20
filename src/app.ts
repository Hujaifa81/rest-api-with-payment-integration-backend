/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOptions, rootResponse } from "./shared";
import notFound from "./app/middlewares/notFound";
import { globalErrorHandler } from "./app/middlewares";
import router from "./app/router";
import { raw } from "express";
import { PaymentController } from "./app/modules/payment/payment.controller";
import passport from "passport";
import "./config/passport";
import expressSession from "express-session";
import ENV from "./config/env";

const app = express();

// web-hook api
app.use(
  "/webhook",
  raw({ type: "application/json" }),
  (req, res, next) => {
    (req as any).rawBody = req.body;
    next();
  },
  PaymentController.stripeWebhookHandler
);

// general api
app.set("json spaces", 2);
app.get("/", rootResponse);
app.use(cors({ ...corsOptions }));
app.use(express.json());
app.use(
  expressSession({
    secret: ENV.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);
// Ensure passport strategies are registered before initializing passport
app.use(passport.initialize());
app.use(passport.session());
app.set("trust proxy", 1);
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1", router);
app.use(notFound);
app.use(globalErrorHandler);

export default app;
