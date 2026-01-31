import { Request, Response } from 'express';
export declare const assessmentCycleController: {
    getAllCycles: (_req: Request, res: Response) => Promise<void>;
    getCycleById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getActiveCycle: (_req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createCycle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateCycle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteCycle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    activateCycle: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    generateMonthlyCycles: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    getCalendar: (req: Request, res: Response) => Promise<void>;
    getHolidays: (req: Request, res: Response) => Promise<void>;
    createHoliday: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteHoliday: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    importHolidays: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=assessmentCycle.controller.d.ts.map