import * as _ from "lodash";
import * as moment from "moment-timezone";
import * as typeorm from "typeorm";

export default class ORM {
    private static etaOffset: number;
    public static TimezoneColumn(options: typeorm.ColumnOptions): any {
        return typeorm.Column(_.defaults<typeorm.ColumnOptions, typeorm.ColumnOptions>({
            transformer: {
                to: (val: Date): Date => {
                    return val;
                },
                from: (val: Date): Date => {
                    if (!val) return val;
                    if (!this.etaOffset) this.etaOffset = moment.tz(process.env.eta_timezone).utcOffset();
                    const localOffset = val.getTimezoneOffset();
                    val.setUTCMinutes(val.getUTCMinutes() + this.etaOffset + localOffset);
                    return val;
                }
            },
            type: "timestamp without time zone"
        }, options));
    }
}
