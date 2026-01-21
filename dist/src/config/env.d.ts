declare const ENV: {
    NODE_ENV: string;
    PORT: number;
    DATABASE_URL: string;
    WHITE_LIST_ORIGIN: string;
    EXPRESS_SESSION_SECRET: string;
    JWT: {
        JWT_ACCESS_SECRET: string;
        JWT_ACCESS_EXPIRES: string;
        JWT_REFRESH_SECRET: string;
        JWT_REFRESH_EXPIRES: string;
    };
    GOOGLE: {
        GOOGLE_CLIENT_ID: string;
        GOOGLE_CLIENT_SECRET: string;
        GOOGLE_CALLBACK_URL: string;
    };
    STRIPE: {
        STRIPE_SECRET_KEY: string;
        STRIPE_CURRENCY: string;
        STRIPE_WEBHOOK_SECRET: string;
    };
    EMAIL_SENDER: {
        SMTP_HOST: string;
        SMTP_PORT: number;
        SMTP_PASS: string;
        SMTP_FROM: string;
        SMTP_USER: string;
    };
    REDIS: {
        REDIS_URL: string;
    };
    BCRYPT_SALT_ROUND: number;
    FRONTEND_URL: string;
};
export default ENV;
//# sourceMappingURL=env.d.ts.map