export default class HelperObject {
    public static clone(obj: any): any {
        if (obj == null || typeof (obj) !== "object") {
            return obj; // any non-objects are passed by value, not reference
        }
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        let temp: any = new obj.constructor();
        for (let key in obj) {
            temp[key] = HelperObject.clone(obj[key]);
        }
        return temp;
    }
}
