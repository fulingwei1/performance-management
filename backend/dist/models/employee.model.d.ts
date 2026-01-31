import { Employee, EmployeeRole } from '../types';
export declare class EmployeeModel {
    static findById(id: string): Promise<(Employee & {
        password?: string;
    }) | null>;
    static findByName(name: string): Promise<(Employee & {
        password?: string;
    }) | null>;
    static findAll(): Promise<Employee[]>;
    static findByRole(role: EmployeeRole): Promise<Employee[]>;
    static findByManagerId(managerId: string): Promise<Employee[]>;
    static findByDepartment(department: string): Promise<Employee[]>;
    static create(employee: Omit<Employee, 'createdAt' | 'updatedAt'> & {
        password: string;
    }): Promise<Employee>;
    static update(id: string, updates: Partial<Employee>): Promise<Employee | null>;
    static delete(id: string): Promise<boolean>;
    static verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
    static updatePassword(id: string, newPassword: string): Promise<boolean>;
    static batchInsert(employees: Array<Omit<Employee, 'createdAt' | 'updatedAt'> & {
        password: string;
    }>): Promise<void>;
}
//# sourceMappingURL=employee.model.d.ts.map