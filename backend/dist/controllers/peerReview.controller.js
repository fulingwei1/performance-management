"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.peerReviewController = void 0;
const express_validator_1 = require("express-validator");
const peerReview_model_1 = require("../models/peerReview.model");
const employee_model_1 = require("../models/employee.model");
const errorHandler_1 = require("../middleware/errorHandler");
exports.peerReviewController = {
    // 获取我的360度评价（作为被评价人）
    getMyPeerReviews: [
        (0, express_validator_1.query)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month } = req.query;
            const reviews = await peerReview_model_1.PeerReviewModel.findByReviewee(req.user.userId, month);
            // 被评价人只能看到分数，看不到是谁评价的
            const anonymizedReviews = reviews.map(r => ({
                id: r.id,
                month: r.month,
                collaboration: r.collaboration,
                professionalism: r.professionalism,
                communication: r.communication,
                comment: r.comment,
                averageScore: ((r.collaboration + r.professionalism + r.communication) / 3).toFixed(2),
                submittedAt: r.createdAt
            }));
            res.json({
                success: true,
                data: anonymizedReviews
            });
        })
    ],
    // 获取我的360度评价任务（作为评价人）
    getMyPeerReviewTasks: [
        (0, express_validator_1.query)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month } = req.query;
            const tasks = await peerReview_model_1.PeerReviewModel.findByReviewer(req.user.userId, month);
            // 评价人可以看到自己给谁评价
            res.json({
                success: true,
                data: tasks
            });
        })
    ],
    // 提交360度评价
    submitPeerReview: [
        (0, express_validator_1.body)('id').notEmpty().withMessage('评价ID不能为空'),
        (0, express_validator_1.body)('collaboration').isFloat({ min: 0.5, max: 1.5 }).withMessage('协作分数范围0.5-1.5'),
        (0, express_validator_1.body)('professionalism').isFloat({ min: 0.5, max: 1.5 }).withMessage('专业分数范围0.5-1.5'),
        (0, express_validator_1.body)('communication').isFloat({ min: 0.5, max: 1.5 }).withMessage('沟通分数范围0.5-1.5'),
        (0, express_validator_1.body)('comment').notEmpty().withMessage('评语不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { id, collaboration, professionalism, communication, comment } = req.body;
            // 验证评价人权限
            const existing = await peerReview_model_1.PeerReviewModel.findById(id);
            if (!existing) {
                return res.status(404).json({
                    success: false,
                    error: '评价记录不存在'
                });
            }
            if (existing.reviewerId !== req.user.userId) {
                return res.status(403).json({
                    success: false,
                    error: '无权修改此评价'
                });
            }
            // 更新评价
            const updated = await peerReview_model_1.PeerReviewModel.update(id, {
                collaboration,
                professionalism,
                communication,
                comment
            });
            res.json({
                success: true,
                data: updated,
                message: '360度评价提交成功'
            });
        })
    ],
    // 分配360度评价任务（经理操作）
    allocatePeerReviews: [
        (0, express_validator_1.body)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, express_validator_1.body)('department').notEmpty().withMessage('部门不能为空'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month, department } = req.body;
            // 随机分配评价任务
            const allocations = await peerReview_model_1.PeerReviewModel.allocatePeerReviews(department, month);
            res.json({
                success: true,
                data: {
                    allocated: allocations.length,
                    allocations,
                    department,
                    month
                },
                message: `已为部门${department}分配${allocations.length}个360度评价任务`
            });
        })
    ],
    // 获取部门360度评价统计（经理）
    getDepartmentPeerReviewStats: [
        (0, express_validator_1.query)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month } = req.query;
            // 获取用户的部门
            const employee = await employee_model_1.EmployeeModel.findById(req.user.userId);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: '员工不存在'
                });
            }
            // 获取部门所有360度评价
            const reviews = await peerReview_model_1.PeerReviewModel.findByDepartment(employee.department, month);
            // 统计每个员工收到的评价
            const stats = reviews.reduce((acc, review) => {
                if (!acc[review.revieweeId]) {
                    acc[review.revieweeId] = {
                        revieweeId: review.revieweeId,
                        revieweeName: review.revieweeName,
                        reviews: [],
                        completedReviews: 0,
                        averageScore: 0
                    };
                }
                acc[review.revieweeId].reviews.push(review);
                if (review.collaboration > 1 && review.professionalism > 1 && review.communication > 1) {
                    acc[review.revieweeId].completedReviews++;
                    const avg = (review.collaboration + review.professionalism + review.communication) / 3;
                    acc[review.revieweeId].averageScore += avg;
                }
                return acc;
            }, {});
            // 计算最终平均分
            const employeeStats = Object.values(stats).map(stat => {
                const finalAvg = stat.completedReviews > 0
                    ? stat.averageScore / stat.completedReviews
                    : 0;
                return {
                    ...stat,
                    averageScore: parseFloat(finalAvg.toFixed(2)),
                    totalReviews: stat.reviews.length,
                    completedReviews: stat.completedReviews,
                    completionRate: stat.reviews.length > 0
                        ? (stat.completedReviews / stat.reviews.length) * 100
                        : 0
                };
            });
            res.json({
                success: true,
                data: employeeStats
            });
        })
    ],
    // 获取部门的360度评价记录（经理）
    getDepartmentPeerReviews: [
        (0, express_validator_1.query)('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
        (0, express_validator_1.query)('revieweeId').optional(),
        (0, errorHandler_1.asyncHandler)(async (req, res) => {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: errors.array()[0].msg
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: '未认证'
                });
            }
            const { month, revieweeId } = req.query;
            // 获取用户的部门
            const employee = await employee_model_1.EmployeeModel.findById(req.user.userId);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    error: '员工不存在'
                });
            }
            let reviews;
            if (revieweeId) {
                // 获取特定员工的360度评价
                reviews = await peerReview_model_1.PeerReviewModel.findByReviewee(revieweeId, month);
            }
            else {
                // 获取部门所有360度评价
                reviews = await peerReview_model_1.PeerReviewModel.findByDepartment(employee.department, month);
            }
            res.json({
                success: true,
                data: reviews
            });
        })
    ]
};
//# sourceMappingURL=peerReview.controller.js.map