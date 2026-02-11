"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../config/logger"));
// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
    logger_1.default.error({ err }, 'Unhandled error');
    // 默认错误响应
    const statusCode = err.statusCode || 500;
    const message = err.message || '服务器内部错误';
    // PostgreSQL错误处理
    if (err.code === '23505') {
        res.status(409).json({
            success: false,
            error: '数据已存在'
        });
        return;
    }
    if (err.code === '23503') {
        res.status(400).json({
            success: false,
            error: '引用的数据不存在'
        });
        return;
    }
    if (err.code === '23502') {
        res.status(400).json({
            success: false,
            error: '必填字段不能为空'
        });
        return;
    }
    res.status(statusCode).json({
        success: false,
        error: message
    });
};
exports.errorHandler = errorHandler;
// 404处理
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: '接口不存在'
    });
};
exports.notFoundHandler = notFoundHandler;
// 异步错误包装器
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map