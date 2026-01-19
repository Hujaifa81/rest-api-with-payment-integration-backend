/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, Product } from "../../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { ApiError } from "../../errors";
import httpStatus from "http-status-codes";
import Decimal from "decimal.js";

const createProduct = async (productData: Prisma.ProductCreateInput) => {
  const isProductExist = await prisma.product.findUnique({
    where: { name: productData.name },
  });

  if (isProductExist) {
    throw new ApiError(httpStatus.CONFLICT, "Product with this name already exists");
  }

  // convert API-friendly `price` (float) to `priceCents` integer for DB
  const data: any = { ...productData };
  if ((data as any).priceCents !== undefined) {
    if (!Number.isInteger((data as any).priceCents) || (data as any).priceCents < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "priceCents must be a non-negative integer");
    }
  } else if ((data as any).price !== undefined) {
    try {
      const dec = new Decimal((data as any).price as any);
      if (dec.isNegative()) throw new ApiError(httpStatus.BAD_REQUEST, "Price must be >= 0");
      data.priceCents = dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
      delete data.price;
    } catch (err) {
      console.log(err);
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid price");
    }
  }

  const product = await prisma.product.create({
    data,
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
      },
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
      },
    },
  });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }
  return product as Product;
};

const updateProduct = async (productId: string, updateData: Prisma.ProductUpdateInput) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found");
  }
  const data: any = { ...updateData };
  if ((data as any).priceCents !== undefined) {
    if (!Number.isInteger((data as any).priceCents) || (data as any).priceCents < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, "priceCents must be a non-negative integer");
    }
  } else if ((data as any).price !== undefined) {
    try {
      const dec = new Decimal((data as any).price as any);
      if (dec.isNegative()) throw new ApiError(httpStatus.BAD_REQUEST, "Price must be >= 0");
      data.priceCents = dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
      delete data.price;
    } catch (err) {
      console.log(err);
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid price");
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data,
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
