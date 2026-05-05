import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeModel } from '../models/employee.model';
import { SatisfactionSurveyHalf, SatisfactionSurveyService } from '../services/satisfactionSurvey.service';

function parseHalf(value: unknown): SatisfactionSurveyHalf | undefined {
  const half = Number(value);
  return half === 1 || half === 2 ? half : undefined;
}

function parseYear(value: unknown): number | undefined {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : undefined;
}

function paramString(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] : value || '';
}

export const satisfactionSurveyController = {
  list: asyncHandler(async (_req: Request, res: Response) => {
    const surveys = await SatisfactionSurveyService.listSurveys();
    res.json({ success: true, data: surveys });
  }),

  getCurrent: asyncHandler(async (req: Request, res: Response) => {
    const survey = await SatisfactionSurveyService.findCurrentSurvey(new Date());
    const myResponse = survey && req.user?.userId
      ? await SatisfactionSurveyService.getMyResponse(survey.id, req.user.userId)
      : null;

    res.json({
      success: true,
      data: survey ? { survey, myResponse } : null,
    });
  }),

  ensureCurrent: asyncHandler(async (req: Request, res: Response) => {
    const requestedYear = parseYear(req.body?.year ?? req.query?.year);
    const requestedHalf = parseHalf(req.body?.half ?? req.query?.half);
    const createdBy = req.user?.userId || 'system';

    const survey = requestedYear && requestedHalf
      ? await SatisfactionSurveyService.ensureSurveyForPeriod({ year: requestedYear, half: requestedHalf, createdBy })
      : await SatisfactionSurveyService.ensureSurveyForDate(new Date(), createdBy);

    res.json({
      success: true,
      message: `${survey.period} 满意度调查已就绪`,
      data: survey,
    });
  }),

  submitResponse: asyncHandler(async (req: Request, res: Response) => {
    const surveyId = paramString(req.params.id);
    const employeeId = req.user?.userId;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: '员工信息不存在' });
    }

    const response = await SatisfactionSurveyService.submitResponse({
      surveyId,
      employee,
      scores: req.body?.scores || {},
      comment: req.body?.comment,
      anonymous: req.body?.anonymous !== false,
    });

    res.json({
      success: true,
      message: '满意度调查已提交',
      data: response,
    });
  }),

  getStats: asyncHandler(async (req: Request, res: Response) => {
    const stats = await SatisfactionSurveyService.getSurveyStats(paramString(req.params.id));
    res.json({ success: true, data: stats });
  }),

  open: asyncHandler(async (req: Request, res: Response) => {
    const survey = await SatisfactionSurveyService.setSurveyStatus(paramString(req.params.id), 'open');
    if (!survey) {
      return res.status(404).json({ success: false, message: '满意度调查不存在' });
    }
    res.json({ success: true, message: `${survey.period} 已开放填写`, data: survey });
  }),

  close: asyncHandler(async (req: Request, res: Response) => {
    const survey = await SatisfactionSurveyService.setSurveyStatus(paramString(req.params.id), 'closed');
    if (!survey) {
      return res.status(404).json({ success: false, message: '满意度调查不存在' });
    }
    res.json({ success: true, message: `${survey.period} 已关闭`, data: survey });
  }),
};
