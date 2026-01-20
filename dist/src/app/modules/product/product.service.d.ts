import { Prisma } from "../../../../generated/prisma/client";
export declare const ProductService: {
    createProduct: (productData: Prisma.ProductCreateInput) => Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    getAllProducts: () => Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }[]>;
    getProductById: (productId: string) => Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    updateProduct: (productId: string, updateData: Prisma.ProductUpdateInput) => Promise<{
        name: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    deleteProduct: (productId: string) => Promise<void>;
};
//# sourceMappingURL=product.service.d.ts.map