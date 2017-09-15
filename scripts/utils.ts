require("source-map-support").install();
import * as childProcess from "child_process";
import * as util from "util";
export const exec: (cmd: string, options?: {cwd: string}) => Promise<void> = <any>util.promisify(childProcess.exec);

export function getServerDir(): string {
    let dir: string = process.cwd().replace(/\\/g, "/");
    if (dir.endsWith("scripts")) {
        const tokens: string[] = dir.split("/");
        dir = tokens.splice(0, tokens.length - 1).join("/");
    }
    return dir;
}
