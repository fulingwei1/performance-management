import { Request, Response } from 'express';
import {
  getAssessmentScope,
  setAssessmentScope,
  type AssessmentScopeConfig
} from '../config/assessment-scope-store';
import {
  getPromotionApprovalChain,
  setPromotionApprovalChain
} from '../config/promotion-approval-store';

export const settingsController = {
  getAssessmentScope: (_req: Request, res: Response) => {
    try {
      const scope = getAssessmentScope();
      res.json({ success: true, data: scope });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateAssessmentScope: (req: Request, res: Response) => {
    try {
      const body = req.body as AssessmentScopeConfig;
      const rootDepts = Array.isArray(body.rootDepts) ? body.rootDepts : [];
      const subDeptsByRoot =
        body.subDeptsByRoot && typeof body.subDeptsByRoot === 'object'
          ? body.subDeptsByRoot
          : {};
      const updated = setAssessmentScope({ rootDepts, subDeptsByRoot });
      res.json({ success: true, data: updated, message: '考核范围已更新' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getPromotionApprovalChain: async (_req: Request, res: Response) => {
    try {
      const chain = await getPromotionApprovalChain();
      res.json({ success: true, data: { chain } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updatePromotionApprovalChain: async (req: Request, res: Response) => {
    try {
      const chain = Array.isArray(req.body?.chain) ? req.body.chain : [];
      const updated = await setPromotionApprovalChain(chain);
      res.json({ success: true, data: { chain: updated }, message: '审批链已更新' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
};
