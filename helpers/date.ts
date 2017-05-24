import HelperObject from "./object";

export default class HelperDate {
    public static getDate(date: Date): Date {
        let temp: Date = HelperObject.clone(date);
        temp.setHours(0);
        temp.setMinutes(0);
        temp.setSeconds(0);
        temp.setMilliseconds(0);
        return temp;
    }
}
