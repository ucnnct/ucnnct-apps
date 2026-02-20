import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const pinoInstance = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});

const interpolate = (msg: string, args: unknown[]): string => {
  let out = msg;
  for (const arg of args) out = out.replace("{}", String(arg));
  return out;
};

const logger = {
  debug: (msg: string, ...args: unknown[]) => pinoInstance.debug(interpolate(msg, args)),
  info:  (msg: string, ...args: unknown[]) => pinoInstance.info(interpolate(msg, args)),
  warn:  (msg: string, ...args: unknown[]) => pinoInstance.warn(interpolate(msg, args)),
  error: (msg: string, ...args: unknown[]) => pinoInstance.error(interpolate(msg, args)),
};

export default logger;
