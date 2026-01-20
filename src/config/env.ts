import { cleanEnv, str, num } from "envalid";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const env = cleanEnv(process.env, {
  NODE_ENV: str({ default: "development" }),
  PORT: num({ default: 5000 }),
  DATABASE_URL: str(),
  WHITE_LIST_ORIGIN: str({ default: "*" }),
  JWT_ACCESS_SECRET: str(),
  JWT_ACCESS_EXPIRES: str(),
  JWT_REFRESH_SECRET: str(),
  JWT_REFRESH_EXPIRES: str(),
  BCRYPT_SALT_ROUNDS: num({ default: 10 }),
  FRONTEND_URL: str(),
  GOOGLE_CLIENT_ID: str(),
  GOOGLE_CLIENT_SECRET: str(),
  GOOGLE_CALLBACK_URL: str(),
  STRIPE_SECRET_KEY: str(),
  STRIPE_CURRENCY: str({ default: "usd" }),
  STRIPE_WEBHOOK_SECRET: str(),
  START_OUTBOX_WORKER: str(),
  EXPRESS_SESSION_SECRET: str(),
  SMTP_HOST: str(),
  SMTP_PORT: num(),
  SMTP_PASS: str(),
  SMTP_FROM: str(),
  REDIS_URL: str(),
  SMTP_USER: str(),
});

const ENV = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  DATABASE_URL: env.DATABASE_URL,
  WHITE_LIST_ORIGIN: env.WHITE_LIST_ORIGIN,
  EXPRESS_SESSION_SECRET: env.EXPRESS_SESSION_SECRET,
  JWT: {
    JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES: env.JWT_ACCESS_EXPIRES,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES: env.JWT_REFRESH_EXPIRES,
  },
  GOOGLE: {
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: env.GOOGLE_CALLBACK_URL,
  },
  STRIPE: {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_CURRENCY: env.STRIPE_CURRENCY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
  },
  EMAIL_SENDER: {
    SMTP_HOST: env.SMTP_HOST,
    SMTP_PORT: env.SMTP_PORT,
    SMTP_PASS: env.SMTP_PASS,
    SMTP_FROM: env.SMTP_FROM,
    SMTP_USER: env.SMTP_USER,
  },
  REDIS: {
    REDIS_URL: env.REDIS_URL,
  },
  START_OUTBOX_WORKER: env.START_OUTBOX_WORKER,
  BCRYPT_SALT_ROUND: env.BCRYPT_SALT_ROUNDS,
  FRONTEND_URL: env.FRONTEND_URL,
};

export default ENV;
