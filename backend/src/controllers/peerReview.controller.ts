import { Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PeerReviewModel } from '../models/peerReview.model';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { asyncHandler } from '../middleware/errorHandler';

export const peerReviewController = {
  // 获取我的360度评价（作为被评价人）
  getMyPeerReviews: [
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const reviews = await PeerReviewModel.findByReviewee(req.user.userId, month as string);
      
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
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const tasks = await PeerReviewModel.findByReviewer(req.user.userId, month as string);
      
      // 评价人可以看到自己给谁评价
      res.json({
        success: true,
        data: tasks
      });
    })
  ],

  // 提交360度评价
  submitPeerReview: [
    body('id').notEmpty().withMessage('评价ID不能为空'),
    body('collaboration').isFloat({ min: 0.5, max: 1.5 }).withMessage('协作分数范围0.5-1.5'),
    body('professionalism').isFloat({ min: 0.5, max: 1.5 }).withMessage('专业分数范围0.5-1.5'),
    body('communication').isFloat({ min: 0.5, max: 1.5 }).withMessage('沟通分数范围0.5-1.5'),
    body('comment').notEmpty().withMessage('评语不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const existing = await PeerReviewModel.findById(id);
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
      const updated = await PeerReviewModel.update(id, {
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
    body('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
    body('department').notEmpty().withMessage('部门不能为空'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const allocations = await PeerReviewModel.allocatePeerReviews(department, month);
      
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
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const employee = await EmployeeModel.findById(req.user.userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }
      
      // 获取部门所有360度评价
      const reviews = await PeerReviewModel.findByDepartment(employee.department, month as string);
      
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
      }, {} as Record<string, any>);
      
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
    query('month').matches(/^\d{4}-\d{2}$/).withMessage('月份格式错误'),
    query('revieweeId').optional(),
    
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
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
      const employee = await EmployeeModel.findById(req.user.userId);
      if (!employee) {
        return res.status(404).json({
          success: false,
          error: '员工不存在'
        });
      }
      
      let reviews;
      
      if (revieweeId) {
        // 获取特定员工的360度评价
        reviews = await PeerReviewModel.findByReviewee(revieweeId as string, month as string);
      } else {
        // 获取部门所有360度评价
        reviews = await PeerReviewModel.findByDepartment(employee.department, month as string);
      }
      
      res.json({
        success: true,
        data: reviews
      });
    })
  ]
};
