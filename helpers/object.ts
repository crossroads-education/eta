export default class HelperObject {
    /**
     * DEPRECATED: Use eta._.cloneDeep()
     * Creates an in-memory copy of an object.
     * @param obj The object to clone
     * @return The cloned object
     * @deprecated
     */
    public static clone<T extends any>(obj: T): T {
        // We need to check strict null
        // tslint:disable-next-line
        if (obj === undefined || obj === null || typeof (obj) !== "object") {
            return obj; // any non-objects are passed by value, not reference
        }
        if (obj instanceof Date) { // special handling to speed things up
            return <any>new Date(obj.getTime());
        }
        const temp: any = new obj.constructor();
        Object.keys(obj).forEach(key => {
            temp[key] = HelperObject.clone(obj[key]);
        });
        return temp;
    }

    /**
     * DEPRECATED: Use eta._.extend()
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
     * DEPRECATED: Use eta._.extend()
     * @deprecated
     */
    public static extend<T extends any>(obj: T, template: any): T {
        Object.keys(template).filter(k => obj[k] === undefined).forEach(k => {
            obj[k] = this.clone(template[k]);
        });
        return obj;
    }
}
