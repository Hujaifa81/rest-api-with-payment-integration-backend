import * as modules from "./modules";
import { Router } from "express";

const moduleRoutes: [string, Router][] = [
  ["/auth", modules.authRoutes],
  ["/user", modules.userRoutes],
  ["/product", modules.productRoutes],
];

export default moduleRoutes.reduce((router, [path, route]) => router.use(path, route), Router());
