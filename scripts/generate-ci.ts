import * as childProcess from "child_process";
import * as fs from "fs-extra";
import * as util from "util";
const exec = util.promisify(childProcess.exec);
import * as utils from "./utils";
import HelperFS from "../helpers/fs";

const SERVER_DIR: string = utils.getServerDir();

async function main(): Promise<void> {
    try {
        // get .js files created
        await exec("npm run compile", { cwd: SERVER_DIR });
        // export the .js files
        await exec("npm run generate", { cwd: SERVER_DIR });
        // compile from the generated indexes
        await exec("npm run compile", { cwd: SERVER_DIR });
    } catch (err) {
        console.error(err.stdout);
        process.exit(1);
    }
    if (!await HelperFS.exists(SERVER_DIR + "/db.ts")) {
        await fs.writeFile(SERVER_DIR + "/db.ts", "export const _ = true;");
    }
    if (!await HelperFS.exists(SERVER_DIR + "/db-init.ts")) {
        await fs.writeFile(SERVER_DIR + "/db-init.ts", "export const _ = true;");
    }
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
}
