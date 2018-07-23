import * as path from "path";
import * as stackTrace from "stack-trace";
import * as util from "util";
import * as winston from "winston";
const WinstonDailyRotateFile: winston.DailyRotateFileTransportInstance = require("winston-daily-rotate-file");

export default class StackLogger extends winston.Logger {
    stackDirs: {[key: string]: string} = {};
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

    private getStackString = (err: Error, level: number) => {
        const stack = stackTrace.parse(err)[level];
        let filename = stack.getFileName().replace(/\\/g, "/");
        const key = this.stackSortedKeys.find(k => filename.startsWith(this.stackDirs[k] + "/"));
        if (key !== undefined) filename = filename.substring(this.stackDirs[key].length + 1);
        return `[${key !== undefined ? `${key} | ` : ""}${filename}:${stack.getLineNumber()}]`;
    };

    log: winston.LogMethod = (level: string, msg: string, ...meta: any[]) =>
        super.log(level, util.format(`${this.getStackString(new Error(), 2)} ${msg}`, ...meta));

    error = (msg: string | Error, ...meta: any[]) => {
        if (typeof(msg) === "string") return this.log("error", msg, ...meta);
        const level = (meta.length > 0 && typeof(meta[0]) === "number") ? meta[0] : 0;
        const logResult = super.log("error", this.getStackString(msg, level) + " " + msg.message);
        console.error(msg);
        return logResult;
    };

    obj = (...objects: any[]) => this.info(objects.map(() => "%o").join(" "), ...objects);
}
