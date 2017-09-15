import * as fs from "fs-extra";
import * as utils from "./utils";
import HelperFS from "../helpers/fs";

const SERVER_DIR: string = utils.getServerDir();

async function main(): Promise<void> {
    try {
        // get .js files created
        await utils.exec("npm run compile", { cwd: SERVER_DIR });
    } catch (err) {
        // we know errors will occur, ignore them
    }
    try {
        // export the .js files
        await utils.exec("npm run generate", { cwd: SERVER_DIR });
        // write some required exports
        if (!await HelperFS.exists(SERVER_DIR + "/db.ts")) {
            await fs.writeFile(SERVER_DIR + "/db.ts", "export const _ = true;");
        }
        // compile from the generated indexes
        await utils.exec("npm run compile", { cwd: SERVER_DIR });
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
