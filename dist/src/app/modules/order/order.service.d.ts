import { IJWTPayload } from "../../../interface/declare/index.js";
import { PaymentStatus } from "../../../../generated/prisma/enums.js";
import { CreateOrderData } from "./order.interface.js";
export declare const OrderService: {
    createOrder: (orderData: CreateOrderData, token: IJWTPayload) => Promise<{
        paymentUrl: any;
        orderId: string;
        paymentId: string;
        queued?: never;
    } | {
        paymentUrl: null;
        orderId: string;
        paymentId: string;
        queued: boolean;
    }>;
    createOrderWithPayLater: (orderData: CreateOrderData, token: IJWTPayload) => Promise<{
        orderId: string;
        paymentId: string;
        payLater: boolean;
    }>;
    initiatePayment: (orderId: string, paymentId: string, opts?: {
        customerEmail?: string;
        viaOutbox?: boolean;
    }) => Promise<{
        sessionId: string | null;
        paymentId: string | null;
        paymentUrl?: never;
        paymentIntent?: never;
    } | {
        paymentUrl: any;
        sessionId: any;
        paymentIntent: any;
        paymentId?: never;
    }>;
    listOrders: (token: IJWTPayload) => Promise<({
        items: {
            id: string;
            priceCents: number;
            quantity: number;
            orderId: string;
            productId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        amountCents: number;
        status: PaymentStatus;
        stockRestored: boolean;
    })[]>;
};
//# sourceMappingURL=order.service.d.ts.map