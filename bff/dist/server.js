"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./logging/logger");
const app = (0, app_1.createApp)();
app.listen(env_1.env.port, () => {
    logger_1.logger.info(`Servidor tdm-angular-novo rodando em http://localhost:${env_1.env.port}`);
});
//# sourceMappingURL=server.js.map