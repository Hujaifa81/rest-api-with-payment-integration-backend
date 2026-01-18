import { IJWTPayload } from "../../../interface/declare";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import { PaymentStatus } from "../../../../generated/prisma/enums";
import { CreateOrderData } from "./order.interface";


const createOrder = async (orderData:CreateOrderData, token: IJWTPayload) => {
    const user = await prisma.user.findUnique({ where: { id: token.userId } });
    if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    }

    if (!orderData.items || orderData.items.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, "Order must contain at least one item");
    }

    try {
        const createdOrder = await prisma.$transaction(async (tnx) => {
            // aggregate quantities by productId to handle duplicate product lines
            const aggregated: Record<string, number> = {};
            for (const it of orderData.items) {
                aggregated[it.productId] = (aggregated[it.productId] || 0) + it.quantity;
            }

            const uniqueProductIds = Object.keys(aggregated);

            // load current product data for pricing
            const products = await tnx.product.findMany({
                where: { id: { in: uniqueProductIds } },
                select: { id: true, price: true, quantity: true, name: true },
            });

            // ensure all products exist (simple loop, no Set)
            for (const pid of uniqueProductIds) {
                const found = products.find((p) => p.id === pid);
                if (!found) {
                    throw new ApiError(httpStatus.NOT_FOUND, `Product not found: ${pid}`);
                }
            }

            // compute total and validate positive prices
            let total = 0;
            for (const pid of uniqueProductIds) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const prod = products.find((p) => p.id === pid)!;
                if (prod.price < 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid price for product ${prod.id}`);
                }
                const qty = aggregated[pid] || 0;
                total += prod.price * qty;
            }

            // atomically decrement stock using conditional updateMany
            for (const pid of uniqueProductIds) {
                const qty = aggregated[pid] ?? 0; // ensure a number
                if (qty <= 0) continue; // nothing to decrement
                const res = await tnx.product.updateMany({
                    where: { id: pid, quantity: { gte: qty } },
                    data: { quantity: { decrement: qty } },
                });
                if (res.count === 0) {
                    throw new ApiError(httpStatus.BAD_REQUEST, `Insufficient stock for product ${pid}`);
                }
            }

            // create order with items recording the snapshot price
            const itemsPayload = orderData.items.map((it) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const prod = products.find((p) => p.id === it.productId)!;
                return {
                    productId: it.productId,
                    quantity: it.quantity,
                    price: prod.price,
                };
            });

            const order = await tnx.order.create({
                data: {
                    userId: user.id,
                    amount: total,
                    status: PaymentStatus.UNPAID,
                    items: { create: itemsPayload },
                },
                include: { items: true },
            });

            return order;
        });

        return createdOrder;
    } catch (error: any) {
        // Prisma common errors mapping
        if (error?.code === "P2025") {
            throw new ApiError(httpStatus.NOT_FOUND, "Related record not found");
        }
        if (error?.code === "P2002") {
            throw new ApiError(httpStatus.CONFLICT, "Unique constraint violation");
        }
        throw error;
    }
};

export const OrderService = {
    createOrder,
};
