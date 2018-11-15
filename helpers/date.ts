const moment = require("moment");

export default class HelperDate {
    public static Week: Week;
    public static Month: Month;

    /**
     * Truncates the time component of a Date.
     * @param date The Date to truncate
     * @return The date component of `date`
     */
    public static getDate(date: Date): Date {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    /**
     * Creates a Date object from a time string.
     * @param time The time to parse (formatted as hour:minute)
     * @return The created Date object
     */
    public static getFromTime(time: string): Date {
        return moment(time, ["H:m"]).toDate();
    }

    /**
     * Gets all months between `start` and `end`, inclusively.
     * @param start The start of the range
     * @param end The end of the range
     * @return The months between `start` and `end`
     */
    public static getMonthsBetween(start: Date, end: Date): Month[] {
        const months: Month[] = [];
        const startMonth: number = moment(start).month() + 1;
        const endMonth: number = moment(end).month() + 1;
        for (let month: number = startMonth; month < endMonth; month++) {
            const start = moment(month, "M");
            const end = moment(start).add(1, "month").subtract(1, "day");
            months.push({
                number: month,
                name: start.format("MMMM"),
                weeks: this.getWeeksBetween(start.toDate(), end.toDate())
            });
        }
        return months;
    }

    /**
     * Gets all weeks between `start` and `end`, inclusively.
     * @param start The start of the range
     * @param end The end of the range
     * @return The weeks between `start` and `end`
     */
    public static getWeeksBetween(startDate: Date, endDate: Date): Week[] {
        const weeks: Week[] = [];
        const startWeek: number = moment(startDate).week();
        const endWeek: number = moment(endDate).week();
        for (let week: number = startWeek; week < endWeek; week++) {
            const start = moment(week + "-" + startDate.getFullYear(), "w-YYYY");
            const end = moment(start).add(6, "day");
            weeks.push({
                number: week,
                start,
                end
            });
        }
        return weeks;
    }
}

class Week {
    public number: number;
    public start: any;
    public end: any;
}

class Month {
    public number: number;
    public name: string;
    public weeks?: Week[];
}
