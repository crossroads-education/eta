import * as _ from "lodash";
import * as moment from "moment-timezone";
import * as typeorm from "typeorm";

export default class ORM {
    public static TimezoneColumn(options: typeorm.ColumnOptions): any {
        return function(target: any, propertyKey: string, descriptor: PropertyDescriptor): any {
            typeorm.Column(_.defaults<typeorm.ColumnOptions, typeorm.ColumnOptions>({
                transformer: {
                    to: (val: Date): Date => {
                        return val ? moment.tz(val.getTime(), process.env.eta_timezone).tz("UTC").toDate() : val;
                    },
                    from: (val: Date): Date => {
                        return val ? moment.tz(val.getTime(), "UTC").tz(process.env.eta_timezone).toDate() : val;
                    }
                },
                type: "timestamp without time zone"
            }, options))(target, propertyKey, descriptor);
        };
    }
}
