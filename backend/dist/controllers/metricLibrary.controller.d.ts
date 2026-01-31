import { Request, Response } from 'express';
export declare const metricLibraryController: {
    getAllMetrics: (req: Request, res: Response) => Promise<void>;
    getMetricById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createMetric: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    updateMetric: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    deleteMetric: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    importMetrics: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    exportMetrics: (_req: Request, res: Response) => Promise<void>;
    getAllTemplates: (_req: Request, res: Response) => Promise<void>;
    getTemplateByPosition: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    createTemplate: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
    initializeDefaultMetrics: (_req: Request, res: Response) => Promise<void>;
};
//# sourceMappingURL=metricLibrary.controller.d.ts.map