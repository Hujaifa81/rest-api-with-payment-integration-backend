import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import Decimal from "decimal.js";
import { prisma } from "../../../lib/prisma";
const createProduct = async (productData) => {
    const isProductExist = await prisma.product.findUnique({
        where: { name: productData.name },
    });
    if (isProductExist) {
        throw new ApiError(httpStatus.CONFLICT, "Product with this name already exists");
    }
    const data = { ...productData };
    if (data.priceCents !== undefined) {
        if (!Number.isInteger(data.priceCents) || data.priceCents < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "priceCents must be a non-negative integer");
        }
    }
    else if (data.price !== undefined) {
        try {
            const dec = new Decimal(data.price);
            if (dec.isNegative())
                throw new ApiError(httpStatus.BAD_REQUEST, "Price must be >= 0");
            data.priceCents = dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
            delete data.price;
        }
        catch (err) {
            console.log(err);
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid price");
        }
    }
    const product = await prisma.product.create({
        data,
    });
    return product;
};
const getAllProducts = async () => {
    const products = await prisma.product.findMany({
        include: {
            orderItems: {
                select: {
                    id: true,
                    orderId: true,
                    quantity: true,
                },
            },
        },
    });
    return products;
};
const getProductById = async (productId) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            orderItems: {
                select: {
                    id: true,
                    orderId: true,
                    quantity: true,
                },
            },
        },
    });
    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    }
    return product;
};
const updateProduct = async (productId, updateData) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });
    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    }
    const data = { ...updateData };
    if (data.priceCents !== undefined) {
        if (!Number.isInteger(data.priceCents) || data.priceCents < 0) {
            throw new ApiError(httpStatus.BAD_REQUEST, "priceCents must be a non-negative integer");
        }
    }
    else if (data.price !== undefined) {
        try {
            const dec = new Decimal(data.price);
            if (dec.isNegative())
                throw new ApiError(httpStatus.BAD_REQUEST, "Price must be >= 0");
            data.priceCents = dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
            delete data.price;
        }
        catch (err) {
            console.log(err);
            throw new ApiError(httpStatus.BAD_REQUEST, "Invalid price");
        }
    }
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data,
    });
    return updatedProduct;
};
const deleteProduct = async (productId) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });
    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    }
    await prisma.product.delete({
        where: { id: productId },
    });
};
export const ProductService = {
    createProduct,
    getAllProducts,
    getProductById,
    updateProduct,
    deleteProduct,
};
//# sourceMappingURL=product.service.js.map