import * as modules from "./modules";
import { Router } from "express";

const moduleRoutes: [string, Router][] = [
  ["/auth", modules.authRoutes],
  ["/user", modules.userRoutes],
  ["/product", modules.productRoutes],
  ["/order", modules.orderRoutes],
  ["/payment", modules.paymentRoutes],
  ["/otp", modules.otpRoutes],
];

export default moduleRoutes.reduce((router, [path, route]) => router.use(path, route), Router());
