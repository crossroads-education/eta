import * as fs from "fs";
import * as recursiveReaddir from "recursive-readdir";

export default class HelperFS {
    /**
     * Provides functionality of deprecated fs.exists()
     * See https://github.com/nodejs/node/issues/1592
     */
    public static exists(filename: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            fs.access(filename, (err: NodeJS.ErrnoException) => {
                resolve(!err);
            });
        });
    }

    /**
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

    public static recursiveReaddir(path: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            recursiveReaddir(path, (err: Error, files: string[]) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(files);
                }
            });
        });
    }
}
