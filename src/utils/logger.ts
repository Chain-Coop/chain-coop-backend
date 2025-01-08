import pino from "pino";

const logger = pino({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  base: {
    pid: false,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    req: (req) => `${req.method} ${req.url}`,
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default logger;
