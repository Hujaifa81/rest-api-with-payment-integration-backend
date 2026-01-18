import { Prisma, Product } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";

const createProduct = async (productData: Prisma.ProductCreateInput) => {

    const isProductExist = await prisma.product.findUnique({
        where: { name: productData.name },
    });

    if (isProductExist) {
        throw new ApiError(httpStatus.CONFLICT, "Product with this name already exists");
    }

    const product = await prisma.product.create({
        data: productData,
    });

    return product as Product;
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
            }
        },
    });
    return products as Product[];
};

const getProductById = async (productId: string) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
            orderItems: {
                select: {
                    id: true,
                    orderId: true,
                    quantity: true,
                },
            }
        },
    });
    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    }
    return product as Product;
}

const updateProduct = async (productId: string, updateData: Prisma.ProductUpdateInput) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
    });
    if (!product) {
        throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
    }
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: updateData,
    });
    return updatedProduct as Product;
};

const deleteProduct = async (productId: string) => {
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