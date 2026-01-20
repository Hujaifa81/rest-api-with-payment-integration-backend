import * as modules from "./modules";
import { Router } from "express";
const moduleRoutes = [
    ["/auth", modules.authRoutes],
    ["/user", modules.userRoutes],
    ["/product", modules.productRoutes],
    ["/order", modules.orderRoutes],
    ["/payment", modules.paymentRoutes],
    ["/otp", modules.otpRoutes],
];
export default moduleRoutes.reduce((router, [path, route]) => router.use(path, route), Router());
//# sourceMappingURL=router.js.map