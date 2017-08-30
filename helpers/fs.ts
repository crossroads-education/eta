import * as fs from "fs-extra";
import * as recursiveReaddir from "recursive-readdir";

export default class HelperFS {
    /**
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

    /**
     * Maps the recursive-readdir module to a Promise interface.
     */
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
