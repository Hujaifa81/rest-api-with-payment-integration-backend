import { Prisma } from "../../../../generated/prisma/client.js";
export declare const ProductService: {
    createProduct: (productData: Prisma.ProductCreateInput) => Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    getAllProducts: () => Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }[]>;
    getProductById: (productId: string) => Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    updateProduct: (productId: string, updateData: Prisma.ProductUpdateInput) => Promise<{
        id: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        priceCents: number;
        quantity: number;
    }>;
    deleteProduct: (productId: string) => Promise<void>;
};
//# sourceMappingURL=product.service.d.ts.map