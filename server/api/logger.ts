import * as dateFormat from "dateformat";
import * as fs from "fs";
import * as stackTrace from "stack-trace";
import HelperPath from "../../helpers/path";

class Logger {
    public constructor() {
        try {
            fs.accessSync(HelperPath.baseDir + "/logs");
        } catch (ex) {
            fs.mkdirSync(HelperPath.baseDir + "/logs");
        }
    }

    private getCalling(): string {
        let rootCount: number = HelperPath.baseDir.split("/").length;
        let stack: stackTrace.StackFrame = stackTrace.parse(new Error())[3];
        let filename: string = stack.getFileName().replace(/\\/g, "/");
        filename = "/" + filename.split("/").splice(rootCount - 1).join("/");
        return filename + ":" + stack.getLineNumber();
    }

    private write(data: string, ...args: any[]): void {
        let now: Date = new Date();
        let filename: string = HelperPath.baseDir + "/logs/" + dateFormat(now, "yyyy-mm-dd") + ".log";
        let msg: string = `(${now.toLocaleTimeString()}) [${this.getCalling()}] ${data}`;
        if (args.length > 0) {
            console.log(msg, args);
        } else {
            console.log(msg);
        }
        for (let i: number = 0; i < args.length; i++) {
            msg += " " + JSON.stringify(msg);
        }
        fs.appendFile(filename, msg + "\n", (err: NodeJS.ErrnoException) => {
            if (err) {
                console.log("Could not append log to " + filename + ": " + err.message);
            }
        });
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
