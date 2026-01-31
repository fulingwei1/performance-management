import { Request, Response } from 'express';
export declare const organizationController: {
    getDepartmentTree: (_req: Request, res: Response) => Promise<void>;
    getAllDepartments: (_req: Request, res: Response) => Promise<void>;
    getDepartmentById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createDepartment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateDepartment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteDepartment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getAllPositions: (_req: Request, res: Response) => Promise<void>;
    getPositionsByDepartment: (req: Request, res: Response) => Promise<void>;
    createPosition: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updatePosition: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deletePosition: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getOrgTree: (_req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=organization.controller.d.ts.map