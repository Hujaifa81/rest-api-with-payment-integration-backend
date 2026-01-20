import { NextFunction, Request, Response, Router } from "express";
import { checkAuth } from "../../middlewares";
import { AuthController } from "./auth.controller";
import { Role } from "../../../../generated/prisma/enums";
import ENV from "../../../config/env";
import passport from "passport";
import {
  loginZodSchema,
  changePasswordZodSchema,
  setPasswordZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
} from "./auth.validation";
import validateRequest from "../../middlewares/validateRequest";

const router = Router();

router.post("/login", validateRequest(loginZodSchema), AuthController.credentialsLogin);
router.post("/refresh-token", AuthController.getNewAccessToken);
router.post("/logout", AuthController.logout);
router.post(
  "/change-password",
  checkAuth(...Object.values(Role)),
  validateRequest(changePasswordZodSchema),
  AuthController.changePassword
);
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordZodSchema),
  AuthController.forgotPassword
);
router.post(
  "/reset-password",
  checkAuth(...Object.values(Role)),
  validateRequest(resetPasswordZodSchema),
  AuthController.resetPassword
);

router.get("/google", async (req: Request, res: Response, next: NextFunction) => {
  const redirect = req.query.redirect || "/";
  passport.authenticate("google", { scope: ["profile", "email"], state: redirect as string })(
    req,
    res,
    next
  );
});
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${ENV.FRONTEND_URL}/login?error=There is some issues with your account. Please contact with out support team!`,
  }),
  AuthController.googleCallbackController
);

//if user is sign up via google but wants to set password to login via credentials
router.post(
  "/set-password",
  checkAuth(...Object.values(Role)),
  validateRequest(setPasswordZodSchema),
  AuthController.setPassword
);

export default router;
