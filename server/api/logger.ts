import * as fs from "fs";
import * as moment from "moment";
import * as stackTrace from "stack-trace";
import config from "./config";
import constants from "./constants";

class Logger {
    public constructor() {
        try {
            fs.accessSync(constants.basePath + "/logs");
        } catch (ex) {
            fs.mkdirSync(constants.basePath + "/logs");
        }
    }

    public getCalling(level =  3): string {
        const rootCount: number = constants.basePath.split("/").length;
        const stack: stackTrace.StackFrame = stackTrace.parse(new Error())[level];
        let filename: string = stack.getFileName().replace(/\\/g, "/");
        filename = "/" + filename.split("/").splice(rootCount - 1).join("/");
        return filename + ":" + stack.getLineNumber();
    }

    private write(data: string, ...args: any[]): void {
        const now: Date = new Date();
        const filename: string = constants.basePath + "/logs/" + moment(now).format("YYYY-MM-DD") + ".log";
        let msg = `(${now.toLocaleTimeString()}) [${this.getCalling()}] ${data}`;
        if (config.logger.outputToConsole === undefined || config.logger.outputToConsole === true) {
            if (args.length > 0) {
                args = args[0] instanceof Array ? args[0] : args;
                args.splice(0, 0, msg);
                console.log.apply(console, args);
                args.splice(0, 1);
            } else {
                console.log(msg);
            }
        }
        for (let i = 0; i < args.length; i++) {
            let value: any = args[i];
            if (value instanceof Error) {
                value = value.toString();
            } else {
                value = JSON.stringify(value);
            }
            msg += " " + value;
        }
        fs.appendFile(filename, msg + "\n", (err: NodeJS.ErrnoException) => {
            if (err) {
                console.log("Could not append log to " + filename + ": " + err.message);
            }
        });
    }

    public obj(...args: any[]): void {
        this.write("[OBJ]", args);
    }

    public json(obj: any): void {
        this.write(`[JSON] ${JSON.stringify(obj)}`);
    }

    public error(err: Error | string): void {
        this.write(`[ERROR] `, err);
    }

    public warn(msg: string): void {
        this.write(`[WARN] ${msg}`);
    }

    public info(msg: string): void {
        this.write(`[INFO] ${msg}`);
    }

    public trace(msg: string): void {
        this.write(`[TRACE] ${msg}`);
    }

    public log(level: string, msg: any): void {
        this.write(`[${level}] ${msg}`);
    }
}

const logger: Logger = new Logger();
export default logger;
