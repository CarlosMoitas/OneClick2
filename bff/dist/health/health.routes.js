"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = void 0;
const express_1 = require("express");
const health_controller_1 = require("./health.controller");
exports.healthRouter = (0, express_1.Router)();
/**
 * GET /health/status — health check enterprise (Gateway + TDM + Auth).
 * Rota pública (não exige JWT do Portal) — o objetivo é permitir que a
 * Navbar consulte o status antes mesmo do usuário estar logado.
 */
exports.healthRouter.get('/status', health_controller_1.getHealthStatus);
//# sourceMappingURL=health.routes.js.map