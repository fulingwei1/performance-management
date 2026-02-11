import { create } from 'zustand';
import {
  strategicObjectiveApi, objectiveApi, krApi, kpiApi,
  contractApi, monthlyReportApi, interviewApi
} from '@/services/okrApi';

// Types
export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  year: number;
  priority: number;
  status: 'active' | 'completed' | 'cancelled';
  progress: number;
  createdAt: string;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  level: 'company' | 'department' | 'personal';
  parentId?: string;
  strategicObjectiveId?: string;
  ownerId?: string;
  ownerName?: string;
  department?: string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  progress: number;
  startDate?: string;
  endDate?: string;
  children?: Objective[];
  keyResults?: KeyResult[];
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  progress: number;
}

export interface KPI {
  id: string;
  name: string;
  targetValue: number;
  actualValue: number;
  unit: string;
  weight: number;
  employeeId: string;
  krId?: string;
  period: string;
  score: number;
  status: 'pending' | 'submitted' | 'reviewed';
}

export interface PerformanceContract {
  id: string;
  employeeId: string;
  employeeName: string;
  period: string;
  kpiIds: string[];
  objectives: string[];
  status: 'draft' | 'pending_sign' | 'signed' | 'approved';
  signedAt?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  employeeId: string;
  employeeName?: string;
  month: string;
  summary: string;
  achievements: string[];
  challenges: string;
  nextPlan: string;
  krProgress?: { krId: string; progress: number }[];
  status: 'draft' | 'submitted' | 'reviewed';
  reviewComment?: string;
  reviewRating?: number;
  createdAt: string;
}

export interface Interview {
  id: string;
  employeeId: string;
  employeeName?: string;
  scheduledAt: string;
  type: 'monthly' | 'quarterly' | 'annual';
  topics?: string[];
  summary?: string;
  actionItems?: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
  completedAt?: string;
}

interface OKRState {
  strategicObjectives: StrategicObjective[];
  objectiveTree: Objective[];
  myObjectives: Objective[];
  myKPIs: KPI[];
  myContract: PerformanceContract | null;
  allContracts: PerformanceContract[];
  monthlyReports: MonthlyReport[];
  teamReports: MonthlyReport[];
  interviews: Interview[];
  teamInterviews: Interview[];
  loading: boolean;
  error: string | null;

  // Strategic Objectives
  fetchStrategicObjectives: () => Promise<void>;
  createStrategicObjective: (data: { title: string; description: string; year: number; priority: number }) => Promise<void>;
  updateStrategicObjective: (id: string, data: Partial<StrategicObjective>) => Promise<void>;
  deleteStrategicObjective: (id: string) => Promise<void>;

  // Objectives
  fetchObjectiveTree: () => Promise<void>;
  fetchMyObjectives: () => Promise<void>;
  createObjective: (data: Parameters<typeof objectiveApi.create>[0]) => Promise<void>;
  updateObjective: (id: string, data: Partial<Objective>) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;

  // KRs
  createKR: (objectiveId: string, data: Parameters<typeof krApi.create>[1]) => Promise<void>;
  updateKR: (id: string, data: Partial<KeyResult>) => Promise<void>;
  deleteKR: (id: string) => Promise<void>;

  // KPIs
  fetchMyKPIs: () => Promise<void>;
  updateKPIActual: (id: string, actualValue: number) => Promise<void>;

  // Contracts
  fetchMyContract: () => Promise<void>;
  fetchAllContracts: () => Promise<void>;
  signContract: (id: string) => Promise<void>;

  // Monthly Reports
  fetchMyReports: () => Promise<void>;
  fetchTeamReports: () => Promise<void>;
  createReport: (data: Parameters<typeof monthlyReportApi.create>[0]) => Promise<void>;
  reviewReport: (id: string, data: { comment: string; rating: number }) => Promise<void>;

  // Interviews
  fetchMyInterviews: () => Promise<void>;
  fetchTeamInterviews: () => Promise<void>;
  createInterview: (data: Parameters<typeof interviewApi.create>[0]) => Promise<void>;
  updateInterview: (id: string, data: Partial<Interview>) => Promise<void>;
}

export const useOKRStore = create<OKRState>((set, get) => ({
  strategicObjectives: [],
  objectiveTree: [],
  myObjectives: [],
  myKPIs: [],
  myContract: null,
  allContracts: [],
  monthlyReports: [],
  teamReports: [],
  interviews: [],
  teamInterviews: [],
  loading: false,
  error: null,

  // Strategic Objectives
  fetchStrategicObjectives: async () => {
    set({ loading: true, error: null });
    try {
      const res = await strategicObjectiveApi.getAll();
      set({ strategicObjectives: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  createStrategicObjective: async (data) => {
    await strategicObjectiveApi.create(data);
    get().fetchStrategicObjectives();
  },
  updateStrategicObjective: async (id, data) => {
    await strategicObjectiveApi.update(id, data);
    get().fetchStrategicObjectives();
  },
  deleteStrategicObjective: async (id) => {
    await strategicObjectiveApi.delete(id);
    get().fetchStrategicObjectives();
  },

  // Objectives
  fetchObjectiveTree: async () => {
    set({ loading: true, error: null });
    try {
      const res = await objectiveApi.getTree();
      set({ objectiveTree: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  fetchMyObjectives: async () => {
    set({ loading: true, error: null });
    try {
      const res = await objectiveApi.getMy();
      set({ myObjectives: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  createObjective: async (data) => {
    await objectiveApi.create(data);
    get().fetchObjectiveTree();
    get().fetchMyObjectives();
  },
  updateObjective: async (id, data) => {
    await objectiveApi.update(id, data);
    get().fetchObjectiveTree();
    get().fetchMyObjectives();
  },
  deleteObjective: async (id) => {
    await objectiveApi.delete(id);
    get().fetchObjectiveTree();
  },

  // KRs
  createKR: async (objectiveId, data) => {
    await krApi.create(objectiveId, data);
    get().fetchMyObjectives();
  },
  updateKR: async (id, data) => {
    await krApi.update(id, data);
    get().fetchMyObjectives();
  },
  deleteKR: async (id) => {
    await krApi.delete(id);
    get().fetchMyObjectives();
  },

  // KPIs
  fetchMyKPIs: async () => {
    set({ loading: true, error: null });
    try {
      const res = await kpiApi.getMy();
      set({ myKPIs: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  updateKPIActual: async (id, actualValue) => {
    await kpiApi.updateActual(id, actualValue);
    get().fetchMyKPIs();
  },

  // Contracts
  fetchMyContract: async () => {
    set({ loading: true, error: null });
    try {
      const res = await contractApi.getMy();
      set({ myContract: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  fetchAllContracts: async () => {
    set({ loading: true, error: null });
    try {
      const res = await contractApi.getAll();
      set({ allContracts: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  signContract: async (id) => {
    await contractApi.sign(id);
    get().fetchMyContract();
  },

  // Monthly Reports
  fetchMyReports: async () => {
    set({ loading: true, error: null });
    try {
      const res = await monthlyReportApi.getMy();
      set({ monthlyReports: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  fetchTeamReports: async () => {
    set({ loading: true, error: null });
    try {
      const res = await monthlyReportApi.getTeam();
      set({ teamReports: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  createReport: async (data) => {
    await monthlyReportApi.create(data);
    get().fetchMyReports();
  },
  reviewReport: async (id, data) => {
    await monthlyReportApi.review(id, data);
    get().fetchTeamReports();
  },

  // Interviews
  fetchMyInterviews: async () => {
    set({ loading: true, error: null });
    try {
      const res = await interviewApi.getMy();
      set({ interviews: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  fetchTeamInterviews: async () => {
    set({ loading: true, error: null });
    try {
      const res = await interviewApi.getTeam();
      set({ teamInterviews: res.data || res, loading: false });
    } catch (e: any) { set({ error: e.message, loading: false }); }
  },
  createInterview: async (data) => {
    await interviewApi.create(data);
    get().fetchTeamInterviews();
  },
  updateInterview: async (id, data) => {
    await interviewApi.update(id, data);
    get().fetchTeamInterviews();
    get().fetchMyInterviews();
  },
}));
