import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest.js";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { createUserZodSchema } from "./user.validation.js";
import { UserController } from "./user.controller.js";
const router = Router();
router.post("/", validateRequest(createUserZodSchema), UserController.createUser);
router.get("/me", checkAuth(...Object.values(Role)), UserController.getMe);
export default router;
//# sourceMappingURL=user.route.js.map