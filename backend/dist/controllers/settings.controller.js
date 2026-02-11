"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = void 0;
const assessment_scope_store_1 = require("../config/assessment-scope-store");
const promotion_approval_store_1 = require("../config/promotion-approval-store");
exports.settingsController = {
    getAssessmentScope: (_req, res) => {
        try {
            const scope = (0, assessment_scope_store_1.getAssessmentScope)();
            res.json({ success: true, data: scope });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    updateAssessmentScope: (req, res) => {
        try {
            const body = req.body;
            const rootDepts = Array.isArray(body.rootDepts) ? body.rootDepts : [];
            const subDeptsByRoot = body.subDeptsByRoot && typeof body.subDeptsByRoot === 'object'
                ? body.subDeptsByRoot
                : {};
            const updated = (0, assessment_scope_store_1.setAssessmentScope)({ rootDepts, subDeptsByRoot });
            res.json({ success: true, data: updated, message: '考核范围已更新' });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    getPromotionApprovalChain: async (_req, res) => {
        try {
            const chain = await (0, promotion_approval_store_1.getPromotionApprovalChain)();
            res.json({ success: true, data: { chain } });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    updatePromotionApprovalChain: async (req, res) => {
        try {
            const chain = Array.isArray(req.body?.chain) ? req.body.chain : [];
            const updated = await (0, promotion_approval_store_1.setPromotionApprovalChain)(chain);
            res.json({ success: true, data: { chain: updated }, message: '审批链已更新' });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    }
};
//# sourceMappingURL=settings.controller.js.map