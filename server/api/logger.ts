import * as dateFormat from "dateformat";
import * as fs from "fs";
import * as stackTrace from "stack-trace";
import constants from "./constants";

class Logger {
    public constructor() {
        try {
            fs.accessSync(constants.basePath + "/logs");
        } catch (ex) {
            fs.mkdirSync(constants.basePath + "/logs");
        }
    }

    public getCalling(level: number =  3): string {
        let rootCount: number = constants.basePath.split("/").length;
        let stack: stackTrace.StackFrame = stackTrace.parse(new Error())[level];
        let filename: string = stack.getFileName().replace(/\\/g, "/");
        filename = "/" + filename.split("/").splice(rootCount - 1).join("/");
        return filename + ":" + stack.getLineNumber();
    }

    private write(data: string, ...args: any[]): void {
        let now: Date = new Date();
        let filename: string = constants.basePath + "/logs/" + dateFormat(now, "yyyy-mm-dd") + ".log";
        let msg: string = `(${now.toLocaleTimeString()}) [${this.getCalling()}] ${data}`;
        if (args.length > 0) {
            args = args[0] instanceof Array ? args[0] : args;
            args.splice(0, 0, msg);
            console.log.apply(console, args);
            args.splice(0, 1);
        } else {
            console.log(msg);
        }
        for (let i: number = 0; i < args.length; i++) {
            msg += " " + JSON.stringify(args[i]);
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

let logger: Logger = new Logger();
export default logger;
