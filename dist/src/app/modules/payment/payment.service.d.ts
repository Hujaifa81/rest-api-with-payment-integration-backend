export declare const PaymentService: {
    handleWebhookEvent(event: any): Promise<void>;
    cancelPaymentIntent(paymentIntentId: string): Promise<boolean>;
    checkPaymentIntentStatus(paymentIntentId: string): Promise<import("stripe").Stripe.PaymentIntent.Status | null>;
    getPaymentStatus(paymentId: string): Promise<{
        paymentId: string;
        status: import("../../../../generated/prisma/enums.js").PaymentStatus;
        sessionId: string | null;
        paymentUrl: string | null;
    }>;
};
export default PaymentService;
//# sourceMappingURL=payment.service.d.ts.map