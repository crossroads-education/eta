import HelperArray from "./array";

export default class HelperObject {
    /**
     * DEPRECATED
     * Only kept for unique `reverseArrays` behavior
     * @deprecated
     */
    public static merge<T>(from: T, to: T, reverseArrays = false): T {
        for (const i in from) {
            if (from[i] instanceof Array && to[i] instanceof Array) {
                to[i] = reverseArrays ? (<any>from[i]).concat(to[i]) : (<any>to[i]).concat(from[i]);
            } else {
                to[i] = from[i];
            }
        }
        return to;
    }

    /**
     * Converts an enum (mapping of string <-> number) to a mapping string -> number.
     */
    public static enumToPure(obj: any): {[key: string]: number} {
        return HelperArray.mapObject(Object.keys(obj).filter(k => isNaN(<any>k)).map(k =>
            [k, obj[k]]
        ));
    }
}
