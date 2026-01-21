import { catchAsync } from "../../shared/index.js";
const validateRequest = (zs) => catchAsync(async (req, _, next) => {
    req.body = await zs.parseAsync(req.body.data ? JSON.parse(req.body.data) : req.body);
    next();
});
export default validateRequest;
//# sourceMappingURL=validateRequest.js.map