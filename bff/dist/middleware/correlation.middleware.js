"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORRELATION_ID_HEADER = void 0;
exports.correlationMiddleware = correlationMiddleware;
const crypto_1 = require("crypto");
exports.CORRELATION_ID_HEADER = 'x-correlation-id';
/**
 * Garante que toda requisição tenha um Correlation ID, reaproveitando o
 * header enviado pelo Angular (`X-Correlation-Id`) quando presente, ou
 * gerando um novo caso contrário. O mesmo ID é devolvido na resposta e
 * usado em todos os logs desta requisição, permitindo rastreamento
 * ponta a ponta: Angular → este servidor → Broadcom TDM.
 */
function correlationMiddleware(req, res, next) {
    const incoming = req.header(exports.CORRELATION_ID_HEADER);
    const correlationId = incoming && incoming.trim() ? incoming.trim() : (0, crypto_1.randomUUID)();
    req.correlationId = correlationId;
    res.setHeader('X-Correlation-Id', correlationId);
    next();
}
//# sourceMappingURL=correlation.middleware.js.map