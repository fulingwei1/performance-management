import { Request, Response } from 'express';
export declare const employeeController: {
    getAllEmployees: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getEmployeeById: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    getSubordinates: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getEmployeesByRole: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    getAllManagers: (req: Request, res: Response, next: import("express").NextFunction) => void;
    createEmployee: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    updateEmployee: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    deleteEmployee: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
};
//# sourceMappingURL=employee.controller.d.ts.map