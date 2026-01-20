import { Router } from "express";
import { checkAuth } from "../../middlewares";
import { Role } from "../../../../generated/prisma/enums";
import { OrderController } from "./order.controller";
import validateRequest from "../../middlewares/validateRequest";
import { createOrderZodSchema } from "./order.validation";
const router = Router();
// create order (immediate payment via outbox worker)
router.post("/", checkAuth(...Object.values(Role)), validateRequest(createOrderZodSchema), OrderController.createOrder);
// create order with pay-later (no Stripe outbox event)
router.post("/pay-later", checkAuth(...Object.values(Role)), validateRequest(createOrderZodSchema), OrderController.createOrderWithPayLater);
// initiate payment for an existing order (outbox-first / creates outbox event by default)
router.post("/:orderId/pay", checkAuth(...Object.values(Role)), OrderController.initiatePayment);
router.get("/", checkAuth(...Object.values(Role)), OrderController.listOrders);
export default router;
//# sourceMappingURL=order.route.js.map