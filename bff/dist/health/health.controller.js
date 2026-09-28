"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthStatus = getHealthStatus;
const health_service_1 = require("./health.service");
/**
 * GET /health/status — health check enterprise, consolidando Gateway,
 * TDM e Autenticação em uma única resposta.
 */
async function getHealthStatus(_req, res, next) {
    try {
        const result = await health_service_1.healthService.checkHealth();
        res.json(result);
    }
    catch (error) {
        next(error);
    }
}
//# sourceMappingURL=health.controller.js.map