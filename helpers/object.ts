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
}
