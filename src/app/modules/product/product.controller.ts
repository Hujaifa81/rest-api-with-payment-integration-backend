/* eslint-disable @typescript-eslint/no-unused-vars */
import { Prisma } from "../../../../generated/prisma/client";
import { catchAsync, sendResponse } from "../../../shared";
import { ProductService } from "./product.service";
import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status-codes";

const createProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const productData: Prisma.ProductCreateInput = req.body;
  const product = await ProductService.createProduct(productData);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Product created successfully",
    data: product,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const products = await ProductService.getAllProducts();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Products retrieved successfully",
    data: products,
  });
});

const getProductById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.id;
  const product = await ProductService.getProductById(productId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product retrieved successfully",
    data: product,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.id;
  const updateData: Prisma.ProductUpdateInput = req.body;
  const updatedProduct = await ProductService.updateProduct(productId as string, updateData);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product updated successfully",
    data: updatedProduct,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.id;
  await ProductService.deleteProduct(productId as string);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product deleted successfully",
    data: null,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
