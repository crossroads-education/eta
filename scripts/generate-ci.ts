import * as childProcess from "child_process";
import * as util from "util";
const exec = util.promisify(childProcess.exec);
import * as utils from "./utils";

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
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
}
