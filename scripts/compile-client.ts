import * as childProcess from "child_process";
import * as fs from "fs-extra";
import * as util from "util";
import * as utils from "./utils";
const exec = util.promisify(childProcess.exec);
import HelperArray from "../helpers/array";
import HelperFS from "../helpers/fs";

const SERVER_DIR: string = utils.getServerDir();
const COMPILER_PATH = SERVER_DIR + "node_modules/typescript/bin/tsc";

export async function compileModule(moduleName: string): Promise<void> {
    const moduleDir = SERVER_DIR + "/modules/" + moduleName;
    const moduleConfig: any = JSON.parse(await fs.readFile(moduleDir + "/eta.json", "utf-8"));
    await HelperArray.forEachAsync(moduleConfig.staticDirs, async (staticDir: string) => {
        const jsDir: string = moduleDir + "/" + staticDir + "/js";
        if (!await HelperFS.exists(jsDir + "/tsconfig.json")) {
            return;
        }
        await exec("node " + COMPILER_PATH, { cwd: jsDir });
    }, false);
}

async function main(): Promise<void> {
    const moduleNames: string[] = await fs.readdir(SERVER_DIR + "/modules");
    await HelperArray.forEachAsync(moduleNames, moduleName => compileModule(moduleName));
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => {
        console.error("An error occurred: ", err);
    });
}
