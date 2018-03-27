import * as orm from "typeorm";
import * as _ from "lodash";

export default class DatabaseNamingStrategy extends orm.DefaultNamingStrategy implements orm.NamingStrategyInterface {
    public tableName(targetName: string, userName?: string): string {
        return _.snakeCase(userName || targetName);
    }

    public columnName(propertyName: string, userName: string, prefixes: string[]): string {
        return _.snakeCase(prefixes.concat([userName || propertyName]).join("_"));
    }

    public relationName(propertyName: string): string {
        return _.snakeCase(propertyName);
    }

    public joinColumnName(relationName: string, referencedColumnName: string): string {
        return _.snakeCase(relationName + "_" + referencedColumnName);
    }

    // @ts-ignore: secondTableName is unused
    public joinTableName(firstTableName: string, secondTableName: string, firstPropertyName: string): string {
        return _.snakeCase(firstTableName + "_" + firstPropertyName);
    }

    public joinTableColumnName(tableName: string, propertyName: string, columnName: string): string {
        return _.snakeCase(tableName + "_" + (columnName || propertyName));
    }
}
