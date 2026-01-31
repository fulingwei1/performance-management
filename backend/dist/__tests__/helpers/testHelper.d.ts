export declare const TestHelper: {
    app: import("express-serve-static-core").Express;
    loginAs(username: string, password: string, role: string): Promise<any>;
    getAuthToken(role?: "manager" | "employee" | "hr"): Promise<any>;
    createTestEmployee(data: any): Promise<import("superagent/lib/node/response")>;
    createTestSummary(data: any): Promise<import("superagent/lib/node/response")>;
    submitTestScore(data: any): Promise<import("superagent/lib/node/response")>;
    hashPassword(password: string): Promise<string>;
    generateRandomString(length?: number): string;
    cleanupDatabase(): Promise<void>;
};
//# sourceMappingURL=testHelper.d.ts.map