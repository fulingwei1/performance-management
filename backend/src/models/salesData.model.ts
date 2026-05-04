import { query } from '../config/database';

export interface SalesRecord {
  id: string;
  date: string;
  productCode: string;
  productName: string;
  customerCode: string;
  customerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  costOfGoods: number;
  grossProfit: number;
  grossMargin: number; // 毛利率
  salesPersonId: string;
  salesPersonName: string;
  department: string;
  category: string;
  region: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SalesDataFilters {
  startDate?: string;
  endDate?: string;
  productCode?: string;
  customerCode?: string;
  salesPersonId?: string;
  department?: string;
  category?: string;
  region?: string;
}

export class SalesDataModel {
  // 创建销售记录
  static async create(data: Omit<SalesRecord, 'id' | 'grossProfit' | 'grossMargin' | 'createdAt' | 'updatedAt'>): Promise<SalesRecord> {
    const grossProfit = data.totalPrice - data.costOfGoods;
    const grossMargin = data.totalPrice > 0 ? (grossProfit / data.totalPrice) * 100 : 0;
    
    const sql = `
      INSERT INTO sales_data (
        date, product_code, product_name, customer_code, customer_name,
        quantity, unit_price, total_price, cost_of_goods, gross_profit,
        gross_margin, sales_person_id, sales_person_name, department,
        category, region
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, date, product_code, product_name, customer_code, customer_name,
               quantity, unit_price, total_price, cost_of_goods, gross_profit,
               gross_margin, sales_person_id, sales_person_name, department,
               category, region, created_at, updated_at
    `;
    
    const result = await query(sql, [
      data.date,
      data.productCode,
      data.productName,
      data.customerCode,
      data.customerName,
      data.quantity,
      data.unitPrice,
      data.totalPrice,
      data.costOfGoods,
      grossProfit,
      grossMargin,
      data.salesPersonId,
      data.salesPersonName,
      data.department,
      data.category,
      data.region
    ]);
    
    return this.formatRecord(result[0]);
  }

  // 获取所有销售记录
  static async findAll(): Promise<SalesRecord[]> {
    const sql = `
      SELECT id, date, product_code, product_name, customer_code, customer_name,
             quantity, unit_price, total_price, cost_of_goods, gross_profit,
             gross_margin, sales_person_id, sales_person_name, department,
             category, region, created_at, updated_at
      FROM sales_data
      ORDER BY date DESC
    `;
    
    const results = await query(sql);
    return results.map(this.formatRecord);
  }

  // 根据ID获取销售记录
  static async findById(id: string): Promise<SalesRecord | null> {
    const sql = `
      SELECT id, date, product_code, product_name, customer_code, customer_name,
             quantity, unit_price, total_price, cost_of_goods, gross_profit,
             gross_margin, sales_person_id, sales_person_name, department,
             category, region, created_at, updated_at
      FROM sales_data
      WHERE id = ?
    `;
    
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  // 根据筛选条件获取销售数据
  static async findByFilters(filters: SalesDataFilters): Promise<SalesRecord[]> {
    let sql = `
      SELECT id, date, product_code, product_name, customer_code, customer_name,
             quantity, unit_price, total_price, cost_of_goods, gross_profit,
             gross_margin, sales_person_id, sales_person_name, department,
             category, region, created_at, updated_at
      FROM sales_data
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate);
    }
    
    if (filters.productCode) {
      sql += ' AND product_code = ?';
      params.push(filters.productCode);
    }
    
    if (filters.customerCode) {
      sql += ' AND customer_code = ?';
      params.push(filters.customerCode);
    }
    
    if (filters.salesPersonId) {
      sql += ' AND sales_person_id = ?';
      params.push(filters.salesPersonId);
    }
    
    if (filters.department) {
      sql += ' AND department = ?';
      params.push(filters.department);
    }
    
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    
    if (filters.region) {
      sql += ' AND region = ?';
      params.push(filters.region);
    }
    
    sql += ' ORDER BY date DESC';
    
    const results = await query(sql, params);
    return results.map(this.formatRecord);
  }

  // 获取汇总统计数据
  static async getSummary(filters: SalesDataFilters): Promise<{
    totalRevenue: number;
    totalCost: number;
    totalGrossProfit: number;
    averageGrossMargin: number;
    totalRecords: number;
    period: string;
  }> {
    let sql = `
      SELECT 
        SUM(total_price) as total_revenue,
        SUM(cost_of_goods) as total_cost,
        SUM(gross_profit) as total_gross_profit,
        AVG(gross_margin) as average_gross_margin,
        COUNT(*) as total_records
      FROM sales_data
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate);
    }
    
    const results = await query(sql, params);
    const summary = results[0];
    
    return {
      totalRevenue: parseFloat(summary.total_revenue) || 0,
      totalCost: parseFloat(summary.total_cost) || 0,
      totalGrossProfit: parseFloat(summary.total_gross_profit) || 0,
      averageGrossMargin: parseFloat(summary.average_gross_margin) || 0,
      totalRecords: parseInt(summary.total_records) || 0,
      period: `${filters.startDate || '开始'} - ${filters.endDate || '结束'}`
    };
  }

  // 获取按时间序列的毛利率数据
  static async getTimeSeriesData(interval: 'daily' | 'weekly' | 'monthly', filters?: SalesDataFilters): Promise<{
    date: string;
    revenue: number;
    cost: number;
    grossProfit: number;
    grossMargin: number;
  }[]> {
    let dateFormat: string;
    
    switch (interval) {
      case 'daily':
        dateFormat = '%Y-%m-%d';
        break;
      case 'weekly':
        dateFormat = '%Y-%u';
        break;
      case 'monthly':
        dateFormat = '%Y-%m';
        break;
    }
    
    let sql = `
      SELECT 
        TO_CHAR(date, '${dateFormat}') as date_key,
        SUM(total_price) as revenue,
        SUM(cost_of_goods) as cost,
        SUM(gross_profit) as gross_profit,
        AVG(gross_margin) as gross_margin
      FROM sales_data
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters?.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate);
    }
    
    sql += `
      GROUP BY TO_CHAR(date, '${dateFormat}')
      ORDER BY date_key
    `;
    
    const results = await query(sql, params);
    
    return results.map(row => ({
      date: row.date_key,
      revenue: parseFloat(row.revenue) || 0,
      cost: parseFloat(row.cost) || 0,
      grossProfit: parseFloat(row.gross_profit) || 0,
      grossMargin: parseFloat(row.gross_margin) || 0
    }));
  }

  // 获取产品分类毛利率分析
  static async getProductCategoryAnalysis(filters?: SalesDataFilters): Promise<{
    category: string;
    totalRevenue: number;
    totalCost: number;
    totalGrossProfit: number;
    averageGrossMargin: number;
    recordCount: number;
  }[]> {
    let sql = `
      SELECT 
        category,
        SUM(total_price) as total_revenue,
        SUM(cost_of_goods) as total_cost,
        SUM(gross_profit) as total_gross_profit,
        AVG(gross_margin) as average_gross_margin,
        COUNT(*) as record_count
      FROM sales_data
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (filters?.startDate) {
      sql += ' AND date >= ?';
      params.push(filters.startDate);
    }
    
    if (filters?.endDate) {
      sql += ' AND date <= ?';
      params.push(filters.endDate);
    }
    
    sql += `
      GROUP BY category
      ORDER BY total_revenue DESC
    `;
    
    const results = await query(sql, params);
    
    return results.map(row => ({
      category: row.category,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalGrossProfit: parseFloat(row.total_gross_profit) || 0,
      averageGrossMargin: parseFloat(row.average_gross_margin) || 0,
      recordCount: parseInt(row.record_count) || 0
    }));
  }

  // 格式化记录
  private static formatRecord(row: any): SalesRecord {
    return {
      id: row.id,
      date: row.date,
      productCode: row.product_code,
      productName: row.product_name,
      customerCode: row.customer_code,
      customerName: row.customer_name,
      quantity: parseInt(row.quantity),
      unitPrice: parseFloat(row.unit_price),
      totalPrice: parseFloat(row.total_price),
      costOfGoods: parseFloat(row.cost_of_goods),
      grossProfit: parseFloat(row.gross_profit),
      grossMargin: parseFloat(row.gross_margin),
      salesPersonId: row.sales_person_id,
      salesPersonName: row.sales_person_name,
      department: row.department,
      category: row.category,
      region: row.region,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}