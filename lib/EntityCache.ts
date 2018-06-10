import * as orm from "typeorm";
import * as eta from "@eta/eta";

export default class EntityCache<T> {
    public repository: orm.Repository<T> = undefined;

    /**
     * Interval between cache dumps (in milliseconds)
     */
    public interval = 50;

    /**
     * Number of objects to dump each <interval> milliseconds.
     */
    public count = 100;

    public archive: T[] = [];
    public cache: T[] = [];
    public shouldUpdateOnDuplicate = false;
    public duplicateConstraints: string;
    public tableName: string;
    private timer: NodeJS.Timer;
    private connection: orm.Connection;
    private get columns() { return this.repository.metadata.columns; }

    public constructor(options: Partial<EntityCache<T>>) {
        Object.assign(this, options);
        if (this.repository === undefined) return;
        this.connection = this.repository.manager.connection;
        this.tableName = this.repository.metadata.tableName;
        if (this.duplicateConstraints === undefined) {
            let indices: string[][] = this.repository.metadata.indices.filter(im => im.isUnique).map(im => im.columns.map(c => c.databaseName));
            if (this.shouldUpdateOnDuplicate) {
                indices = indices.slice(0, 1);
            }
            this.duplicateConstraints = eta._.uniq(indices.reduce((p, v) => p.concat(v), [])).map(c => `"${c}"`).join(", ");
        }
    }

    public add(items: T[]): void {
        this.cache = this.cache.concat(items);
        this.archive = this.archive.concat(items);
    }

    public dump(): void {
        if (this.cache.length === 0) {
            // don't bother if cache is empty
        } else if (this.cache.length === 1 && this.repository !== undefined) {
            // just dump the single object normally, not worth generating SQL
            this.repository.save(<any[]>this.cache).catch(console.error);
            this.cache = [];
        } else {
            // cache is big enough to justify generating SQL
            this.dumpMany().catch(console.error);
        }
    }

    public dumpMany(): Promise<void> {
        return this.insertMany(this.cache.splice(0, this.count));
    }

    public async dumpAll(): Promise<void> {
        while (this.cache.length > 0) {
            await this.dumpMany();
        }
    }

    public getAllRaw(): Promise<{[key: string]: any}[]> {
        const tableName = this.connection.driver.escape(this.tableName);
        const columns: string = eta._.uniq(this.columns.map(c => {
            const dbName: string = this.connection.driver.escape(c.databaseName);
            const name: string = this.connection.driver.escape(c.relationMetadata ? c.databaseName : c.propertyName);
            return `${dbName} AS ${name}`;
        })).join(", ");
        return this.connection.query(`SELECT ${columns} FROM ${tableName}`);
    }

    public startTimer(): void {
        this.timer = setInterval(() => this.dump(), this.interval);
    }

    public stopTimer(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    private async insertMany(items: T[]): Promise<void> {
        items = items.filter(i => i !== undefined);
        if (items.length === 0) return;
        const tableName = this.connection.driver.escape(this.tableName);
        let sql = `INSERT INTO ${tableName} `;
        const columns = eta._.uniq(this.columns.filter(c => !c.isGenerated));
        sql += "(" + columns.map(c => this.connection.driver.escape(c.databaseName)).join(",") + ") VALUES ";
        const sqlTokens: string[] = [];
        const params: any[] = [];
        let count = 0;
        const manyToManyRows: {[key: string]: {[key: string]: number}[][]} = {};
        for (const item of <any[]>items) {
            const objectTokens: string[] = [];
            for (const column of columns) {
                objectTokens.push("$" + ++count);
                if (column.relationMetadata) {
                    const relationPath = column.relationMetadata.buildPropertyPath();
                    if (!column.relationMetadata.isManyToMany) {
                        params.push((item[relationPath] || {})[column.relationMetadata.inverseEntityMetadata.primaryColumns[0].propertyName]);
                    }
                } else {
                    params.push(item[column.propertyName]); // normal column
                }
            }
            for (const relation of this.repository.metadata.manyToManyRelations) {
                if (!manyToManyRows[relation.propertyName]) manyToManyRows[relation.propertyName] = [];
                const rows: any[] = [];
                for (const relationItem of (<any[]>item[relation.propertyName] || [])) {
                    const row: any = {};
                    for (const column of relation.inverseJoinColumns) {
                        row[column.propertyName] = relationItem[column.propertyName.substring(column.relationMetadata.inverseEntityMetadata.tableName.length + 1)];
                    }
                    rows.push(row);
                }
                manyToManyRows[relation.propertyName].push(rows);
            }
            sqlTokens.push("(" + objectTokens.join(",") + ")");
        }
        sql += sqlTokens.join(",");
        const generatedColumns = this.columns.filter(c => c.isGenerated).map(c => `"${c.databaseName}"`);
        if (this.shouldUpdateOnDuplicate) {
            sql += ` ON CONFLICT (${this.duplicateConstraints}) DO UPDATE SET ${columns.map(c => `"${c.databaseName}" = EXCLUDED."${c.databaseName}"`).join(",")}`;
        } else {
            sql += ` ON CONFLICT DO NOTHING`;
        }
        sql += generatedColumns.length > 0 ? ` RETURNING ${generatedColumns.join(", ")}` : "";
        const resultRows: any[] = await this.connection.query(sql, params);
        await Promise.all(this.repository.metadata.manyToManyRelations.map(relation => {
            for (let i = 0; i < manyToManyRows[relation.propertyName].length; i++) {
                const rows = manyToManyRows[relation.propertyName][i] || [];
                for (const row of rows) {
                    row[this.tableName + "_id"] = <number>resultRows[i].id;
                }
            }
            return EntityCache.dumpManyToMany(this.repository.manager.connection, relation.joinTableName, (manyToManyRows[relation.propertyName] || []).reduce((p, v) => p.concat(v), []));
        }));
    }

    public static dumpMany<T>(repository: orm.Repository<T>, items: T[], shouldUpdateOnDuplicate = true): Promise<void> {
        const cache: EntityCache<T> = new EntityCache({
            repository, shouldUpdateOnDuplicate
        });
        cache.add(items);
        return cache.dumpAll();
    }

    public static async dumpManyToMany(connection: orm.Connection, tableName: string, entities: {[key: string]: any}[]): Promise<void> {
        if (entities.length === 0) return;
        tableName = connection.driver.escape(tableName);
        const columnNames: string[] = Object.keys(entities[0]);
        const params: any[] = [];
        let count = 0;
        const sql = `
            INSERT INTO ${tableName} (${columnNames.map(c => connection.driver.escape(c)).join(", ")})
            VALUES ${entities.map(entity => `(${columnNames.map(c => {
                params.push(entity[c]);
                return "$" + ++count;
            }).join(", ")})` )}
            ON CONFLICT DO NOTHING`;
        await connection.query(sql, params);
    }
}
