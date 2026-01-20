import { Router } from "express";
import { checkAuth } from "../../middlewares";
import { Role } from "../../../../generated/prisma/enums";
import { ProductController } from "./product.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createProductZodSchema, updateProductZodSchema } from "./product.validation";

const router = Router();

router.post(
  "/",
  checkAuth(...Object.values(Role)),
  validateRequest(createProductZodSchema),
  ProductController.createProduct
);
router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);
router.patch(
  "/:id",
  checkAuth(...Object.values(Role)),
  validateRequest(updateProductZodSchema),
  ProductController.updateProduct
);
router.delete("/:id", checkAuth(...Object.values(Role)), ProductController.deleteProduct);

export default router;
