import { catchAsync, sendResponse } from "../../../shared";
import { ProductService } from "./product.service";
import httpStatus from "http-status-codes";
const createProduct = catchAsync(async (req, res, next) => {
    const productData = req.body;
    const product = await ProductService.createProduct(productData);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.CREATED,
        message: "Product created successfully",
        data: product,
    });
});
const getAllProducts = catchAsync(async (req, res, next) => {
    const products = await ProductService.getAllProducts();
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Products retrieved successfully",
        data: products,
    });
});
const getProductById = catchAsync(async (req, res, next) => {
    const productId = req.params.id;
    const product = await ProductService.getProductById(productId);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Product retrieved successfully",
        data: product,
    });
});
const updateProduct = catchAsync(async (req, res, next) => {
    const productId = req.params.id;
    const updateData = req.body;
    const updatedProduct = await ProductService.updateProduct(productId, updateData);
    sendResponse(res, {
        success: true,
        statusCode: httpStatus.OK,
        message: "Product updated successfully",
        data: updatedProduct,
    });
});
const deleteProduct = catchAsync(async (req, res, next) => {
    const productId = req.params.id;
    await ProductService.deleteProduct(productId);
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
//# sourceMappingURL=product.controller.js.map