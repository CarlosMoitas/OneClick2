"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
function tag(correlationId) {
    return correlationId ? ` [cid:${correlationId}]` : '';
}
function write(level, message, correlationId, meta) {
    const prefix = `[${level.toUpperCase()}]${tag(correlationId)}`;
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    if (meta !== undefined) {
        fn(prefix, message, meta);
    }
    else {
        fn(prefix, message);
    }
}
exports.logger = {
    debug: (message, correlationId, meta) => write('debug', message, correlationId, meta),
    info: (message, correlationId, meta) => write('info', message, correlationId, meta),
    warn: (message, correlationId, meta) => write('warn', message, correlationId, meta),
    error: (message, correlationId, meta) => write('error', message, correlationId, meta),
};
//# sourceMappingURL=logger.js.map