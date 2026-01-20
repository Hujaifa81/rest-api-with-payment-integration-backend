import ENV from "../../config/env";
import { formatDuration } from "../utils";
export const rootResponse = (req, res) => {
    res.send({
        message: "Rest API server is running..",
        environment: ENV.NODE_ENV,
        uptime: formatDuration(process.uptime()),
        timeStamp: new Date().toISOString(),
    });
};
//# sourceMappingURL=rootResponse.js.map