import { ZodObject, ZodRawShape } from "zod";
import { catchAsync } from "../../shared";

const validateRequest = (zs: ZodObject<ZodRawShape>) =>
  catchAsync(async (req, _, next) => {
    req.body = await zs.parseAsync(req.body.data ? JSON.parse(req.body.data) : req.body);
    next();
  });

export default validateRequest;
