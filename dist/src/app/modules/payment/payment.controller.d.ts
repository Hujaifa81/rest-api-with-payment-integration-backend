import { Request, Response } from "express";
export declare const PaymentController: {
    stripeWebhookHandler: (req: Request, res: Response, next: import("express").NextFunction) => Promise<void>;
    getPaymentStatus: (req: Request, res: Response, next: import("express").NextFunction) => Promise<void>;
};
//# sourceMappingURL=payment.controller.d.ts.map