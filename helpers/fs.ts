import * as fs from "fs-extra";
import * as recursiveReaddir from "recursive-readdir";
import * as util from "util";

export default class HelperFS {
    /**
     * DEPRECATED: use `fs-extra`.pathExists()
     * Provides functionality of deprecated fs.exists()
     * See https://github.com/nodejs/node/issues/1592
     */
    public static async exists(filename: string): Promise<boolean> {
        try {
            await fs.access(filename);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * DEPRECATED: use `fs-extra`.pathExistsSync()
     * Provides functionality of deprecated fs.existsSync()
     * See https://github.com/nodejs/node/issues/1592
     */
    public static existsSync(filename: string): boolean {
        try {
            fs.accessSync(filename);
            return true;
        } catch (ex) {
            return false;
        }
    }

    public static recursiveReaddir: (path: string) => Promise<string[]> = <any>util.promisify(recursiveReaddir);

    public static async recursiveReaddirs(paths: string[]): Promise<string[]> {
        const files: string[][] = await Promise.all(paths.map(p => this.recursiveReaddir(p)));
        if (files.length === 0) return [];
        return files.reduce((p, v) => p.concat(v)).sort().map(f => f.replace(/\\/g, "/"));
    }
}
