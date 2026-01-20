import { NextFunction, Request, Response } from "express";
export declare const OrderController: {
    createOrder: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    createOrderWithPayLater: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    initiatePayment: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    listOrders: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=order.controller.d.ts.map