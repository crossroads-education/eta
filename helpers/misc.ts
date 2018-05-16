import HelperFS from "./fs";

export default class MiscHelper {
    public static delay(ms: number): Promise<void> {
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                resolve();
            }, ms);
        });
    }

    public static async loadModules(dirs: string[], requireFunc: (path: string) => any = require): Promise<{
        modules: any[];
        errors: Error[];
    }> {
        const errors: Error[] = [];
        const modules: any[] = (await HelperFS.recursiveReaddirs(dirs)).map(filename => {
            if (!filename.endsWith(".js")) return;
            try {
                return requireFunc(filename.slice(0, -3));
            } catch (err) {
                errors.push(err);
                return undefined;
            }
        }).filter(m => !!m);
        return { modules, errors };
    }
}
