import { Request, Response, NextFunction } from 'express';
import { JWTPayload, EmployeeRole } from '../types';
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}
declare const SECRET: string;
export { SECRET };
export declare const generateToken: (payload: Omit<JWTPayload, "iat" | "exp">) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (...roles: EmployeeRole[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map