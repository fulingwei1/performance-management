/**
 * 生成模拟绩效数据脚本
 * 为所有员工生成过去5个月(2025-08到2025-12)的模拟绩效记录
 * 数据带有 isDemo: true 标记，方便后续删除
 */
import { PerformanceRecord } from '../types';
export declare function generateAllDemoData(): PerformanceRecord[];
export declare function insertDemoData(): Promise<number>;
export declare function clearDemoData(): Promise<number>;
export declare function hasDemoData(): Promise<boolean>;
//# sourceMappingURL=generateDemoData.d.ts.map