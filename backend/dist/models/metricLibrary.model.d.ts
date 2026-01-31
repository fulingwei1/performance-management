import { PerformanceMetric, MetricTemplate } from '../types';
export declare class MetricLibraryModel {
    static findAllMetrics(): Promise<PerformanceMetric[]>;
    static findMetricById(id: string): Promise<PerformanceMetric | null>;
    static findMetricsByCategory(category: string): Promise<PerformanceMetric[]>;
    static createMetric(metric: Omit<PerformanceMetric, 'createdAt' | 'updatedAt'>): Promise<PerformanceMetric>;
    static updateMetric(id: string, updates: Partial<PerformanceMetric>): Promise<PerformanceMetric | null>;
    static deleteMetric(id: string): Promise<boolean>;
    static findAllTemplates(): Promise<MetricTemplate[]>;
    static findTemplateByPosition(positionId: string): Promise<MetricTemplate | null>;
    static createTemplate(template: Omit<MetricTemplate, 'createdAt' | 'updatedAt'>): Promise<MetricTemplate>;
    private static formatMetric;
    private static formatTemplate;
    static initializeDefaultMetrics(): Promise<void>;
}
//# sourceMappingURL=metricLibrary.model.d.ts.map