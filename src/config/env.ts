import * as envalid from "envalid";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const env = envalid.cleanEnv(process.env, {
  NODE_ENV: envalid.str({ default: "development" }),
  PORT: envalid.num({ default: 5000 }),
  DATABASE_URL: envalid.str(),
  WHITE_LIST_ORIGIN: envalid.str(),
  JWT_ACCESS_SECRET: envalid.str(),
  JWT_ACCESS_EXPIRES: envalid.str(),
  JWT_REFRESH_SECRET: envalid.str(),
  JWT_REFRESH_EXPIRES: envalid.str(),
  BCRYPT_SALT_ROUNDS: envalid.num({ default: 10 }),
  FRONTEND_URL: envalid.str(),
  STRIPE_SECRET_KEY: envalid.str(),
  STRIPE_CURRENCY: envalid.str({ default: "usd" }),
  STRIPE_WEBHOOK_SECRET: envalid.str(),
  EXPRESS_SESSION_SECRET: envalid.str(),
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
  STRIPE: {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    STRIPE_CURRENCY: env.STRIPE_CURRENCY,
    STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET,
  },
 
  BCRYPT_SALT_ROUND: env.BCRYPT_SALT_ROUNDS,
  FRONTEND_URL: env.FRONTEND_URL,
};

export default ENV;
