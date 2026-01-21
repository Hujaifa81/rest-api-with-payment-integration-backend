import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { AuthController } from "./auth.controller.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { loginZodSchema, changePasswordZodSchema, } from "./auth.validation.js";
import validateRequest from "../../middlewares/validateRequest.js";
const router = Router();
router.post("/login", validateRequest(loginZodSchema), AuthController.credentialsLogin);
router.post("/refresh-token", AuthController.getNewAccessToken);
router.post("/logout", AuthController.logout);
router.post("/change-password", checkAuth(...Object.values(Role)), validateRequest(changePasswordZodSchema), AuthController.changePassword);
export default router;
//# sourceMappingURL=auth.route.js.map