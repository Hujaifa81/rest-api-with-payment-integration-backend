import { ZodObject, ZodRawShape } from "zod";
declare const validateRequest: (zs: ZodObject<ZodRawShape>) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
export default validateRequest;
//# sourceMappingURL=validateRequest.d.ts.map