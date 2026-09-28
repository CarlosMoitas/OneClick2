"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorMiddleware = errorMiddleware;
const logger_1 = require("../logging/logger");
/**
 * Erro de negócio normalizado, lançado pelos services/controllers.
 * O `errorMiddleware` converte qualquer erro lançado na aplicação para
 * o mesmo formato de resposta, incluindo o Correlation ID da requisição.
 */
class AppError extends Error {
    status;
    code;
    details;
    constructor(status, message, code, details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}
exports.AppError = AppError;
function errorMiddleware(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) {
    const correlationId = req.correlationId;
    if (err instanceof AppError) {
        logger_1.logger.warn(err.message, correlationId, { code: err.code, details: err.details });
        res.status(err.status).json({
            message: err.message,
            code: err.code,
            correlationId,
            details: err.details,
        });
        return;
    }
    const message = err instanceof Error ? err.message : 'Erro interno inesperado.';
    logger_1.logger.error(message, correlationId, err);
    res.status(500).json({
        message: 'Erro interno inesperado.',
        correlationId,
    });
}
//# sourceMappingURL=error.middleware.js.map