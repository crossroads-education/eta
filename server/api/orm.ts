import * as _ from "lodash";
import HelperDate from "../../helpers/date";
import * as typeorm from "typeorm";

export default class ORM {
    private static etaOffset: number;
    public static TimezoneColumn(options: typeorm.ColumnOptions = {}): any {
        return typeorm.Column(_.defaults<typeorm.ColumnOptions, typeorm.ColumnOptions>({
            transformer: {
                to: (val: Date): Date => {
                    return val;
                },
                from: (val: Date): Date => {
                    return HelperDate.toConfigTimezone(val);
                }
            },
            type: "timestamp without time zone"
        }, options));
    }
}
