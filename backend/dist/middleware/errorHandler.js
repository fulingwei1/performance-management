"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    // 默认错误响应
    const statusCode = err.statusCode || 500;
    const message = err.message || '服务器内部错误';
    // MySQL错误处理
    if (err.code === 'ER_DUP_ENTRY') {
        res.status(409).json({
            success: false,
            error: '数据已存在'
        });
        return;
    }
    if (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2') {
        res.status(400).json({
            success: false,
            error: '引用的数据不存在'
        });
        return;
    }
    if (err.code === 'ER_BAD_NULL_ERROR') {
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