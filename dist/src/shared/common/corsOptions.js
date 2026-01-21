import ENV from "../../config/env.js";
const whitelist = [...ENV.WHITE_LIST_ORIGIN.split(",")];
export const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || whitelist.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};
//# sourceMappingURL=corsOptions.js.map