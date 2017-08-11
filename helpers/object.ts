export default class HelperObject {
    public static clone<T extends any>(obj: T): T {
        if (obj === undefined || typeof (obj) !== "object") {
            return obj; // any non-objects are passed by value, not reference
        }
        if (obj instanceof Date) {
            return <any>new Date(obj.getTime());
        }
        const temp: any = new obj.constructor();
        Object.keys(obj).forEach(key => {
            temp[key] = HelperObject.clone(obj[key]);
        });
        return temp;
    }

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
