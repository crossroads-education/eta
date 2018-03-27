import * as recursiveReaddir from "recursive-readdir";
import * as util from "util";

export default class HelperFS {
    public static recursiveReaddir: (path: string) => Promise<string[]> = <any>util.promisify(recursiveReaddir);

    public static async recursiveReaddirs(paths: string[]): Promise<string[]> {
        const files: string[][] = await Promise.all(paths.map(p => this.recursiveReaddir(p)));
        if (files.length === 0) return [];
        return files.reduce((p, v) => p.concat(v)).sort().map(f => f.replace(/\\/g, "/"));
    }
}
