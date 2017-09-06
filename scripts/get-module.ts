import * as fs from "fs-extra";
import * as utils from "./utils";
import HelperFS from "../helpers/fs";

const SERVER_DIR: string = utils.getServerDir();

class ModuleInstaller {
    private url: string;
    private name: string;
    private path: string;
    private config: {
        dirs: {
            controllers: string[];
            models: string[];
            staticFiles: string[];
            views: string[];
            lifecycleHandlers: string[];
            requestTransformers: string[];
        };
        css: {[key: string]: string};
        name: string;
        redirects: {[key: string]: string};
        rootDir: string;
        dependencies: string[];
        hooks: {[key: string]: {cwd: string, exec: string}[]};
    };

    public constructor(url: string) {
        this.url = url;
        this.name = this.url.split("/").slice(-1)[0].replace(/\.git/g, "");
        this.path = SERVER_DIR + "/modules/" + this.name;
    }

    public async install(isDependency = true): Promise<boolean> {
        try {
            await utils.exec(`git clone ${this.url} ${this.path}`, { cwd: SERVER_DIR });
        } catch (err) {
            if (!isDependency) {
                console.error("Couldn't clone the repository. Please check that the Git URL exists and that your SSH key is valid.");
            }
            return false;
        }
        this.config = JSON.parse(await fs.readFile(this.path + "/eta.json", "utf-8"));
        if (this.config.dependencies) {
            for (const url of this.config.dependencies) {
                // dependency installation
                if (url.split("/").length !== 2) {
                    console.error("Please format dependency URLs as: username/repository (only Github repositories)");
                    console.error("Couldn't get dependency: " + url);
                    continue;
                }
                console.log("Installing dependency... (" + url + ")");
                const installer: ModuleInstaller = new ModuleInstaller("git@github.com:" + url);
                try {
                    if (await installer.install()) {
                        console.log("Successfully installed dependency: " + url);
                    } else {
                        console.log("Skipping dependency " + url + ": Already installed.");
                    }
                } catch (err) {
                    console.error("Couldn't install dependency: " + url, err);
                }
            }
        }
        await this.fireHook("preinstall");
        if (this.config.name !== this.name) {
            this.name = this.config.name;
            await fs.move(this.path, SERVER_DIR + "/modules/" + this.name);
            this.path = SERVER_DIR + "/modules/" + this.name;
        }
        console.log("\tInstalling NPM modules...");
        await utils.exec("npm i --only=dev", { cwd: this.path });
        await utils.exec("npm i --only=prod", { cwd: this.path });
        console.log("\tSetting up client-side JS...");
        for (const staticPath of this.config.dirs.staticFiles) {
            const jsPath = `${this.path}/${staticPath}/js`;
            if (!(await HelperFS.exists(jsPath))) {
                continue;
            }
            if (await HelperFS.exists(jsPath + "/typings.json")) {
                await utils.exec("node " + SERVER_DIR + "node_modules/typings/dist/bin.js i", { cwd: jsPath });
            }
        }
        console.log("\tCompiling server-side JS...");
        await utils.exec("npm run generate-ci", { cwd: SERVER_DIR });
        console.log("\tCompiling client-side JS...");
        await utils.exec("npm run compile-client", { cwd: SERVER_DIR });
        return true;
    }

    private async fireHook(name: string): Promise<void> {
        if (!this.config.hooks || !this.config.hooks[name]) {
            return;
        }
        for (const hook of this.config.hooks[name]) {
            const options: any = {};
            if (hook.cwd) {
                options.cwd = this.path + "/" + hook.cwd;
            }
            await utils.exec(hook.exec, options);
        }
    }
}

async function main(): Promise<void> {
    let url: string = process.argv[2];
    if (!url) {
        console.log("Usage: npm run get-module -- <git-url>");
    }
    if (!url.startsWith("git@") && !url.startsWith("https://")) {
        url = "git@github.com:" + url;
    }
    const installer: ModuleInstaller = new ModuleInstaller(url);
    await installer.install(false);
}

if (!module.parent) {
    main().then(() => { })
    .catch(err => {
        console.error(err);
    });
}
