import * as envalid from "envalid";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(process.cwd(), ".env") });
const env = envalid.cleanEnv(process.env, {
    NODE_ENV: envalid.str({ default: "development" }),
    PORT: envalid.num({ default: 5000 }),
    DATABASE_URL: envalid.str(),
    WHITE_LIST_ORIGIN: envalid.str({ default: "*" }),
    JWT_ACCESS_SECRET: envalid.str(),
    JWT_ACCESS_EXPIRES: envalid.str(),
    JWT_REFRESH_SECRET: envalid.str(),
    JWT_REFRESH_EXPIRES: envalid.str(),
    BCRYPT_SALT_ROUNDS: envalid.num({ default: 10 }),
    FRONTEND_URL: envalid.str(),
    GOOGLE_CLIENT_ID: envalid.str(),
    GOOGLE_CLIENT_SECRET: envalid.str(),
    GOOGLE_CALLBACK_URL: envalid.str(),
    STRIPE_SECRET_KEY: envalid.str(),
    STRIPE_CURRENCY: envalid.str({ default: "usd" }),
    STRIPE_WEBHOOK_SECRET: envalid.str(),
    EXPRESS_SESSION_SECRET: envalid.str(),
    SMTP_HOST: envalid.str(),
    SMTP_PORT: envalid.num(),
    SMTP_PASS: envalid.str(),
    SMTP_FROM: envalid.str(),
    REDIS_URL: envalid.str(),
    SMTP_USER: envalid.str(),
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
    BCRYPT_SALT_ROUND: env.BCRYPT_SALT_ROUNDS,
    FRONTEND_URL: env.FRONTEND_URL,
};
export default ENV;
//# sourceMappingURL=env.js.map