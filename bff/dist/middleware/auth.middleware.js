"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const auth_service_1 = require("../auth/auth.service");
const error_middleware_1 = require("./error.middleware");
/**
 * Protege rotas exigindo um JWT de sessão do Portal válido
 * (`Authorization: Bearer <token>`), emitido por `AuthService.login`.
 *
 * Este middleware NUNCA lida com credenciais/tokens do Broadcom TDM —
 * essa é uma responsabilidade exclusiva de `server/src/tdm`.
 */
function authMiddleware(req, _res, next) {
    const header = req.header('authorization') ?? '';
    const token = header.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
        throw new error_middleware_1.AppError(401, 'Token de sessão ausente.');
    }
    req.user = auth_service_1.authService.verifyToken(token);
    next();
}
//# sourceMappingURL=auth.middleware.js.map