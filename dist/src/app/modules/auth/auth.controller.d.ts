import { Request, Response, NextFunction } from "express";
export declare const AuthController: {
    credentialsLogin: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    googleCallbackController: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getNewAccessToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    changePassword: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    logout: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=auth.controller.d.ts.map