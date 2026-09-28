"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const correlation_middleware_1 = require("./middleware/correlation.middleware");
const error_middleware_1 = require("./middleware/error.middleware");
const auth_routes_1 = require("./auth/auth.routes");
const tdm_routes_1 = require("./tdm/tdm.routes");
const health_routes_1 = require("./health/health.routes");
/**
 * Monta a aplicação Express deste servidor.
 *
 * Rotas expostas (consumidas pelo Angular via `/gw`, ver proxy.conf.json):
 *   GET  /health
 *   GET  /health/status                       (health check enterprise: Gateway + TDM + Auth)
 *   POST /auth/login
 *   POST /auth/logout
 *   GET  /auth/me
 *   POST /api/requests/submit-and-download   (protegida por JWT do Portal)
 *   GET  /api/jobs/:jobId/status              (protegida por JWT do Portal)
 *   POST /api/jobs/:jobId/download-artifact   (protegida por JWT do Portal)
 */
function createApp() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(correlation_middleware_1.correlationMiddleware);
    app.get('/health', (_req, res) => {
        res.json({ status: 'Servidor tdm-angular-novo ativo' });
    });
    app.use('/health', health_routes_1.healthRouter);
    app.use('/auth', auth_routes_1.authRouter);
    app.use('/api', tdm_routes_1.tdmRouter);
    app.use(error_middleware_1.errorMiddleware);
    return app;
}
//# sourceMappingURL=app.js.map