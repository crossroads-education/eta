import HelperArray from "./array";

export default class HelperObject {
    /**
     * Converts an enum (mapping of string <-> number) to a mapping string -> number.
     */
    public static enumToPure(obj: any): {[key: string]: number} {
        return HelperArray.mapObject(Object.keys(obj).filter(k => isNaN(<any>k)).map(k =>
            [k, obj[k]]
        ));
    }

    public static getFunctionParameterNames(func: Function): string[] {
        const names = func.toString().match(/\(([^\)]{0,})\)/)[1].split(",").map(i => i.trim());
        if (names.length === 1 && names[0] === "") return [];
        return names;
    }

    /** 
     * Turns {a: 1, b: {x: 2, y: 3}} into [['a'], ['b'], ['b','x'], ['b','y']].
     * To exclude ['b'], pass includeObjects=false.
     */
    public static recursiveKeys(obj: any, includeObjects = true): string[][] {
        return Object.keys(obj).map(k => {
            let keys: string[][] = [[k]];
            if (typeof(obj[k]) === "object") {
                const newKeys = this.recursiveKeys(obj[k], includeObjects).map(_k => [k].concat(_k));
                keys = includeObjects ? keys.concat(newKeys) : newKeys;
            }
            return keys;
        }).reduce((p, v) => p.concat(v), []);
    }

    /**
     * Top-level object can be anything (including a function), but recursively looks only into
     * objects (including arrays).
     */
    public static forEachPath(obj: any, fn: (path: string[], parent: any, key: string) => void, prefix: string[] = []): void {
        Object.keys(obj).forEach(k => {
            const path: string[] = prefix.concat([k]);
            fn(path, obj, k);
            if (typeof(obj[k]) === "object") this.forEachPath(obj[k], fn, path);
        });
    }
}
