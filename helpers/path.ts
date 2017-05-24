import * as fs from "fs";

export default class HelperPath {
    private static baseDir_: string = process.cwd().replace(/\\/g, "/") + "/";
    public static get baseDir(): string {
        return HelperPath.baseDir_;
    }
}
