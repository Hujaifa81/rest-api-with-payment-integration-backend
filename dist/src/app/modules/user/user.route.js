import { Router } from "express";
import validateRequest from "../../middlewares/validateRequest";
import { createUserZodSchema } from "./user.validation";
import { UserController } from "./user.controller";
import { checkAuth } from "../../middlewares";
import { Role } from "../../../../generated/prisma/enums";
const router = Router();
router.post("/", validateRequest(createUserZodSchema), UserController.createUser);
router.get("/me", checkAuth(...Object.values(Role)), UserController.getMe);
export default router;
//# sourceMappingURL=user.route.js.map