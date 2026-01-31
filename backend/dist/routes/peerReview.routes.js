"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const peerReview_controller_1 = require("../controllers/peerReview.controller");
const auth_1 = require("../middleware/auth");
const peerReview_model_1 = require("../models/peerReview.model");
const router = (0, express_1.Router)();
// 获取我的360度评价（作为被评价人）
router.get('/my-reviews', auth_1.authenticate, peerReview_controller_1.peerReviewController.getMyPeerReviews);
// 获取我的360度评价任务（作为评价人）
router.get('/my-tasks', auth_1.authenticate, peerReview_controller_1.peerReviewController.getMyPeerReviewTasks);
// 提交360度评价
router.post('/submit', auth_1.authenticate, peerReview_controller_1.peerReviewController.submitPeerReview);
// 分配360度评价任务（HR或经理操作）
router.post('/allocate', auth_1.authenticate, async (req, res, next) => {
    try {
        console.log('[DEBUG] 分配360度评价任务 - 用户信息:', req.user);
        console.log('[DEBUG] 请求体:', req.body);
        const user = req.user;
        if (!user) {
            console.log('[DEBUG] 用户未认证');
            return res.status(401).json({ success: false, error: '未认证' });
        }
        console.log('[DEBUG] 用户角色:', user.role);
        if (user.role !== 'hr' && user.role !== 'manager') {
            console.log('[DEBUG] 权限检查失败，角色不是hr或manager');
            return res.status(403).json({ success: false, error: '无权操作' });
        }
        console.log('[DEBUG] 权限检查通过，开始分配...');
        // 直接调用Model方法
        const { month, department } = req.body;
        const allocations = await peerReview_model_1.PeerReviewModel.allocatePeerReviews(department, month);
        console.log('[DEBUG] 分配结果:', allocations);
        return res.json({
            success: true,
            data: allocations,
            message: `已为部门${department}分配${allocations.length}个360度评价任务`
        });
    }
    catch (error) {
        console.error('[ERROR] 分配360度评价任务失败:', error);
        return res.status(500).json({ success: false, error: error.message || '分配失败' });
    }
});
// 获取部门360度评价统计（经理）
router.get('/department-stats', auth_1.authenticate, peerReview_controller_1.peerReviewController.getDepartmentPeerReviewStats);
// 获取部门的360度评价记录（经理）
router.get('/department-reviews', auth_1.authenticate, peerReview_controller_1.peerReviewController.getDepartmentPeerReviews);
exports.default = router;
//# sourceMappingURL=peerReview.routes.js.map