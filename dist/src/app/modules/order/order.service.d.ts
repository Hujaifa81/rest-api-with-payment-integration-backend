import { IJWTPayload } from "../../../interface/declare";
import { PaymentStatus } from "../../../../generated/prisma/enums";
import { CreateOrderData } from "./order.interface";
export declare const OrderService: {
    createOrder: (orderData: CreateOrderData, token: IJWTPayload) => Promise<{
        paymentUrl: string | null;
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
        paymentIntent: string | null;
        paymentUrl?: never;
        paymentId?: never;
        orderId?: never;
        queued?: never;
    } | {
        paymentUrl: string | null;
        paymentId: string | null;
        orderId: string | null;
        sessionId?: never;
        paymentIntent?: never;
        queued?: never;
    } | {
        queued: boolean;
        sessionId?: never;
        paymentIntent?: never;
        paymentUrl?: never;
        paymentId?: never;
        orderId?: never;
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