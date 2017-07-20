export default class HelperObject {
    public static clone(obj: any): any {
        if (obj === undefined || typeof (obj) !== "object") {
            return obj; // any non-objects are passed by value, not reference
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        const temp: any = new obj.constructor();
        Object.keys(obj).forEach(key => {
            temp[key] = HelperObject.clone(obj[key]);
        });
        return temp;
    }

    public static merge(from: any, to: any): any {
        for (const i in from) {
            if (from[i] instanceof Array && to[i] instanceof Array) {
                to[i] = to[i].concat(from[i]);
            } else {
                to[i] = from[i];
            }
        }
        return to;
    }
}
