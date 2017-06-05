import * as moment from "moment";
import HelperObject from "./object";

export default class HelperDate {
    public static getDate(date: Date): Date {
        return new Date(moment(date).format("YYYY-MM-DD"));
    }

    public static getMonthsBetween(start: Date, end: Date): number[] {
        let months: number[] = [];
        for (let i: number = start.getMonth(); i <= end.getMonth(); i++) {
            months.push(i);
        }
        return months;
    }

    public static getWeeksBetween(start: Date, end: Date): {
            number: number,
            start: Date } [] {
        let weeks: { number: number, start: Date }[] = [];
        let interval: number = 1000 * 60 * 60 * 24 * 7; // 1 week
        for (let i: number = start.getTime(); i <= end.getTime(); i += interval) {
            let start: Date = new Date(i);
            weeks.push({
                number: moment(start).week(),
                start: start
            });
        }
        return weeks;
    };
}
