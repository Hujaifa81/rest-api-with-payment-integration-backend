export interface OrderItemData {
  productId: string;
  quantity: number;
}

export interface OrderData {
  items: OrderItemData[];
  userId?: string;
}

export type CreateOrderData = OrderData;
