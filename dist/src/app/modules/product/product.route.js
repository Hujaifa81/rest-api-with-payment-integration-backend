import { Router } from "express";
import { checkAuth } from "../../middlewares/checkAuth.js";
import { Role } from "../../../../generated/prisma/enums.js";
import { ProductController } from "./product.controller.js";
import validateRequest from "../../middlewares/validateRequest.js";
import { createProductZodSchema, updateProductZodSchema } from "./product.validation.js";
const router = Router();
router.post("/", checkAuth(...Object.values(Role)), validateRequest(createProductZodSchema), ProductController.createProduct);
router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);
router.patch("/:id", checkAuth(...Object.values(Role)), validateRequest(updateProductZodSchema), ProductController.updateProduct);
router.delete("/:id", checkAuth(...Object.values(Role)), ProductController.deleteProduct);
export default router;
//# sourceMappingURL=product.route.js.map