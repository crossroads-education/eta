import * as moment from "moment";
import HelperObject from "./object";

export default class HelperDate {
    public static Week: Week;
    public static Month: Month;
    public static getDate(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    public static getMonthsBetween(start: Date, end: Date): Month[] {
        let months: Month[] = [];
        let startMonth: number = moment(start).month() + 1;
        let endMonth: number = moment(end).month() + 1;
        for (let month: number = startMonth; month < endMonth; month++) {
            let start: moment.Moment = moment(month, "M");
            let end: moment.Moment = moment(start).add(1, "month").subtract(1, "day");
            months.push({
                number: month,
                name: start.format("MMMM"),
                weeks: this.getWeeksBetween(start.toDate(), end.toDate())
            });
        }
        return months;
    }

    public static getWeeksBetween(start: Date, end: Date): Week[] {
        let weeks: Week[] = [];
        let startWeek: number = moment(start).week();
        let endWeek: number = moment(end).week();
        for (let week: number = startWeek; week < endWeek; week++) {
            let start: moment.Moment = moment(week, "w");
            let end: moment.Moment = moment(start).add(6, 'day');
            weeks.push({
                number: week,
                start: start,
                end: end
            });
        }
        return weeks;
    };
}

class Week {
    public number: number;
    public start: moment.Moment;
    public end: moment.Moment;
}

class Month {
    public number: number;
    public name: string;
    public weeks?: Week[];
}
