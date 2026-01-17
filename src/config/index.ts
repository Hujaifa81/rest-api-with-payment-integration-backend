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
});

const ENV = {
  NODE_ENV: env.NODE_ENV,
  PORT: env.PORT,
  DATABASE_URL: env.DATABASE_URL,
  WHITE_LIST_ORIGIN: env.WHITE_LIST_ORIGIN,
  JWT: {
    JWT_ACCESS_SECRET: env.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES: env.JWT_ACCESS_EXPIRES,
    JWT_REFRESH_SECRET: env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES: env.JWT_REFRESH_EXPIRES,
  },
  BCRYPT_SALT_ROUND: env.BCRYPT_SALT_ROUNDS,
};

export default ENV;
