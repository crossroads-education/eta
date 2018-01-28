import * as fs from "fs-extra";
import * as moment from "moment";
import * as stackTrace from "stack-trace";
import constants from "./constants";
import Configuration from "../../lib/Configuration";

class Logger {
    public config: Configuration;
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

    private write(data: string, isData: boolean, ...args: any[]): void {
        const now: Date = new Date();
        const filename: string = constants.basePath + "/logs/" + moment(now).format("YYYY-MM-DD") + ".log";
        const source = this.getCalling();
        const level = data.split(" ")[0].slice(1, -1).toLowerCase();
        let msg = `(${now.toLocaleTimeString()}) [${source}] ${data}`;
        if (!this.config.exists("logger.outputToConsole") || this.config.get("logger.outputToConsole")) {
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
        if (isData) return;
        const jsonFilename = filename.replace(/\.log/g, ".json");
        (async () => {
            let jsonData: {
                level: string;
                timestamp: string;
                source: string;
                message: string;
            }[] = [];
            try {
                jsonData = await fs.readJSON(jsonFilename);
            } catch (err) { }
            let message = data.split(" ").slice(1).join(" ");
            if (message.length === 0) {
                message = args[0].toString() + "\n" + (<Error>args[0]).stack;
            }
            jsonData.push({
                level, source, message,
                timestamp: now.toISOString()
            });
            await fs.writeFile(jsonFilename, JSON.stringify(jsonData, undefined, this.config.get("dev.enable") ? 2 : 0));
        })().catch(err => console.error(err));
    }

    public obj(...args: any[]): void {
        this.write("[OBJ]", true, args);
    }

    public json(obj: any): void {
        this.write(`[JSON] ${JSON.stringify(obj)}`, true);
    }

    public error(err: Error | string): void {
        this.write(`[ERROR]`, false, err);
    }

    public warn(msg: string): void {
        this.write(`[WARN] ${msg}`, false);
    }

    public info(msg: string): void {
        this.write(`[INFO] ${msg}`, false);
    }

    public trace(msg: string): void {
        this.write(`[TRACE] ${msg}`, false);
    }

    public log(level: string, msg: any): void {
        this.write(`[${level}] ${msg}`, false);
    }
}

const logger: Logger = new Logger();
export default logger;
