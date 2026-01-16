import * as modules from "./modules";
import { Router } from "express";

const moduleRoutes: [string, Router][] = [
  // ['/user', modules.userRoutes],
  ["/auth", modules.authRoutes],
];

export default moduleRoutes.reduce((router, [path, route]) => router.use(path, route), Router());
