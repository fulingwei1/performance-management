import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'password',
      '*.password',
      '*.*.password',
      'oldPassword',
      '*.oldPassword',
      '*.*.oldPassword',
      'newPassword',
      '*.newPassword',
      '*.*.newPassword',
      'idCardLast6',
      '*.idCardLast6',
      '*.*.idCardLast6',
      'token',
      '*.token',
      '*.*.token',
      'authorization',
      '*.authorization',
      '*.*.authorization',
      'req.headers.authorization',
      'headers.authorization',
      'secret',
      '*.secret',
      '*.*.secret',
    ],
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

export default logger;
