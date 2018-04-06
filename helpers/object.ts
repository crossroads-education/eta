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
}
