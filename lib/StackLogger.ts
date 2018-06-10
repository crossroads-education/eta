import * as path from "path";
import * as stackTrace from "stack-trace";
import * as util from "util";
import * as winston from "winston";
const WinstonDailyRotateFile: winston.DailyRotateFileTransportInstance = require("winston-daily-rotate-file");

const STACK_LEVEL = 2;

export default class StackLogger extends winston.Logger {
    stackDirs: {[key: string]: string} = {};
    /** any changes to this variable only have effect on the next log() call */
    stackLevel = STACK_LEVEL;
    private stackSortedKeys: string[] = [];

    public constructor(logDir: string, options?: winston.LoggerOptions) {
        super({
            level: "verbose",
            transports: [
                new winston.transports.Console({
                    formatter(options: {
                        timestamp: Date | false;
                        level: string;
                        message: string;
                        meta: {[key: string]: any};
                    }): string {
                        const level = winston.config.colorize(<any>options.level, options.level);
                        const message = Object.keys(options.meta).length ? util.format(options.message, options.meta) : options.message;
                        return `(${(options.timestamp || new Date()).toLocaleTimeString()}) [${level}] ${message}`;
                    }
                }),
                new WinstonDailyRotateFile({
                    name: "file",
                    datePattern: "YYYY-MM-DD",
                    maxFiles: "14d",
                    filename: path.join(logDir, "/%DATE%.log").replace(/\\/g, "/")
                })
            ],
            ...options
        });
        this.stackDirs.eta = path.dirname(__dirname).replace(/\\/g, "/");
        this.generateStackKeys();
    }

    generateStackKeys() {
        this.stackSortedKeys = Object.keys(this.stackDirs).sort((a, b) =>
            this.stackDirs[b].length - this.stackDirs[a].length);
    }

    log: winston.LogMethod = (level: string, msg: string | Error, ...meta: any[]) => {
        const isErrorProvided = typeof(msg) !== "string";
        const err: Error = !isErrorProvided ? new Error() : msg as Error;
        if (isErrorProvided) {
            this.stackLevel = 0;
            msg = err.message;
        }
        const stack = stackTrace.parse(err)[this.stackLevel];
        let filename = stack.getFileName().replace(/\\/g, "/");
        const stackKey = this.stackSortedKeys.find(k => filename.startsWith(this.stackDirs[k] + "/"));
        if (stackKey) {
            filename = filename.substring(this.stackDirs[stackKey].length + 1);
        }
        msg = `[${stackKey} | ${filename}:${stack.getLineNumber()}] ${msg}`;
        this.stackLevel = STACK_LEVEL; // reset to default
        return super.log(level, util.format(msg, ...meta));
    };

    error = (msg: string | Error, ...meta: any[]) => {
        const result = this.log("error", msg as string, ...meta);
        if (typeof(msg) !== "string") console.error(msg);
        return result;
    };

    obj: winston.LeveledLogMethod = (...objects: any[]) => {
        this.stackLevel += 1;
        return this.info(objects.map(() => "%o").join(" "), ...objects);
    }
}
