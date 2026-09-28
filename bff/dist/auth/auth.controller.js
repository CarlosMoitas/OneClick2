"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
exports.authController = {
    async login(req, res, next) {
        try {
            const body = req.body;
            const result = await auth_service_1.authService.login(body);
            res.json(result);
        }
        catch (error) {
            next(error);
        }
    },
    logout(_req, res) {
        // Sessão é stateless (JWT) — o "logout" é responsabilidade do cliente
        // (descartar o token). Mantemos o endpoint para simetria de contrato
        // e para permitir, no futuro, invalidação server-side (blacklist/SSO).
        res.status(204).send();
    },
    me(req, res) {
        const authHeader = req.header('authorization') ?? '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();
        const payload = auth_service_1.authService.verifyToken(token);
        res.json({
            id: payload.sub,
            username: payload.username,
            name: payload.name,
            roles: payload.roles,
        });
    },
};
//# sourceMappingURL=auth.controller.js.map