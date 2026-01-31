import { Request, Response } from 'express';
export declare const performanceController: {
    getMyRecords: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getTeamRecords: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getRecordsByMonth: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    getAllRecords: (req: Request, res: Response, next: import("express").NextFunction) => void;
    getRecordById: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    submitSummary: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    createEmptyRecord: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    submitScore: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    deleteRecord: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    deleteRecordsByMonth: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    deleteAllRecords: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    generateTasks: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
    getStatsByMonth: (((req: Request, res: Response, next: import("express").NextFunction) => void) | import("express-validator").ValidationChain)[];
};
//# sourceMappingURL=performance.controller.d.ts.map