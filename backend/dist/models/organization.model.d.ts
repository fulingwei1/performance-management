import { Department, Position } from '../types';
export declare class OrganizationModel {
    static getDepartmentTree(): Promise<Department[]>;
    static findAllDepartments(): Promise<Department[]>;
    static findDepartmentById(id: string): Promise<Department | null>;
    static createDepartment(dept: Omit<Department, 'createdAt' | 'updatedAt'>): Promise<Department>;
    static updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null>;
    static deleteDepartment(id: string): Promise<boolean>;
    static findAllPositions(): Promise<Position[]>;
    static findPositionsByDepartment(departmentId: string): Promise<Position[]>;
    static createPosition(pos: Omit<Position, 'createdAt' | 'updatedAt'>): Promise<Position>;
    static updatePosition(id: string, updates: Partial<Position>): Promise<Position | null>;
    static findPositionById(id: string): Promise<Position | null>;
    static deletePosition(id: string): Promise<boolean>;
    private static buildTree;
    private static formatDepartment;
    private static formatPosition;
}
//# sourceMappingURL=organization.model.d.ts.map