import { Request, Response, NextFunction } from "express";
export declare const ProductController: {
    createProduct: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getAllProducts: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getProductById: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    updateProduct: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    deleteProduct: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=product.controller.d.ts.map