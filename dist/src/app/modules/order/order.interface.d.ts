export interface OrderItemData {
    productId: string;
    quantity: number;
}
export interface OrderData {
    items: OrderItemData[];
    userId?: string;
}
export type CreateOrderData = OrderData;
//# sourceMappingURL=order.interface.d.ts.map