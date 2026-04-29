// Stub model for performance contract - placeholder for future implementation
export interface PerformanceContract {
  id: string;
  employee_id: string;
  cycle_id: string;
  content: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export const PerformanceContractModel = {
  async findAllByEmployee(_employeeId: string): Promise<PerformanceContract[]> {
    return [];
  },
  async create(_data: Partial<PerformanceContract>): Promise<PerformanceContract> {
    throw new Error('Not implemented');
  },
  async update(_id: string, _data: Partial<PerformanceContract>): Promise<PerformanceContract | null> {
    throw new Error('Not implemented');
  },
  async findById(_id: string): Promise<PerformanceContract | null> {
    return null;
  },
};
