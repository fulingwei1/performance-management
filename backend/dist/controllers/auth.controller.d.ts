import { Request, Response } from 'express';
export declare const authController: {
    login: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    getCurrentUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
    changePassword: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
};
//# sourceMappingURL=auth.controller.d.ts.map