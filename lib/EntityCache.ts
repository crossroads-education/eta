import * as orm from "typeorm";
import * as eta from "../eta";

export default class EntityCache<T extends { toCacheObject: () => any }> {

    public repository: orm.Repository<T> = undefined;

    /**
     * Interval between cache dumps (in milliseconds)
     */
    public interval = 250;

    /**
     * Number of objects to dump each <interval> milliseconds.
     */
    public count = 50;

    public archive: T[] = [];
    public cache: T[] = [];
    public shouldUpdateOnDuplicate = false;
    public duplicateConstraints = "";
    public columns: EntityColumn[];
    public tableName: string;
    private timer: NodeJS.Timer;
    private connection: orm.Connection;

    public constructor(options: Partial<EntityCache<T>>) {
        Object.assign(this, options);
        if (this.repository !== undefined) {
            this.connection = this.repository.manager.connection;
            this.columns = this.repository.metadata.columns.map(c => {
                return {
                    isGenerated: c.isGenerated,
                    isRelation: c.relationMetadata !== undefined,
                    databaseName: c.databaseName,
                    propertyName: c.propertyName
                };
            });
            this.tableName = this.repository.metadata.tableName;
            if (this.duplicateConstraints === undefined) {
                const indices: string[][] = this.repository.metadata.indices.filter(im => im.isUnique).map(im => im.columns.map(c => c.databaseName));
                if (indices.length !== 1) {
                    throw new Error(`Cannot guess index to use for ${this.tableName}: ${indices.length} are defined.`);
                }
                this.duplicateConstraints = indices[0].map(c => `"${c}"`).join(", ");
            }
        }
        this.start();
    }

    private get rawColumns() { return this.repository.metadata.columns; }

    public add(objects: T[]): void {
        this.cache = this.cache.concat(objects);
        this.archive = this.archive.concat(objects);
    }

    public dump(): void {
        if (this.cache.length === 0) {
            // don't bother if cache is empty
        } else if (this.cache.length === 1 && this.repository !== undefined) {
            // just dump the single object normally, not worth generating SQL
            this.repository.save(<any[]>this.cache);
            this.cache = [];
        } else {
            // cache is big enough to justify generating SQL
            this.dumpMany().then(() => { })
            .catch(err => {
                eta.logger.error(err);
            });
        }
    }

    public dumpMany(): Promise<void> {
        const objects = this.cache.splice(0, this.count);
        return this.insertMany(objects);
    }

    public async dumpAll(): Promise<void> {
        while (this.cache.length > 0) {
            await this.dumpMany();
        }
    }

    public async getAllRaw(mapRelations = false): Promise<{[key: string]: any}[]> {
        const tableName = this.connection.driver.escape(this.tableName);
        const columns: string = eta._.uniq(this.columns.map(c => {
            const dbName: string = this.connection.driver.escape(c.databaseName);
            const name: string = this.connection.driver.escape(c.isRelation ? c.databaseName : c.propertyName);
            return `${dbName} AS ${name}`;
        })).join(", ");
        const rows: any[] = await this.connection.query(`SELECT ${columns} FROM ${tableName}`);
        if (mapRelations) {
            for (let i = 0; i < rows.length; i++) {
                Object.keys(rows[i]).forEach(k => {
                    if (k.endsWith("Id")) {
                        const mappedKey: string = k.slice(0, -2);
                        if (!rows[i][mappedKey]) rows[i][mappedKey] = { id: rows[i][k] };
                    }
                });
            }
        }
        return rows;
    }

    public start(): void {
        this.timer = setInterval(() => this.dump(), this.interval);
    }

    public stop(): void {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    private async insertMany(objects: T[]): Promise<void> {
        const tableName = this.connection.driver.escape(this.tableName);
        let sql = `INSERT INTO ${tableName} `;
        const columns: string[] = eta._.uniq(this.columns
            .filter(c => !c.isGenerated)
            .map(c => c.databaseName));
        sql += "(" + columns.map(c => this.connection.driver.escape(c)).join(",") + ") VALUES ";
        const sqlTokens: string[] = [];
        const params: any[] = [];
        let count = 0;
        objects = objects.map(o => o.toCacheObject()).filter(o => o !== undefined);
        if (objects.length === 0) {
            return;
        }
        objects.forEach((obj: any) => {
            const objectTokens: string[] = [];
            columns.forEach(c => {
                objectTokens.push("$" + ++count);
                params.push(obj[c]);
            });
            sqlTokens.push("(" + objectTokens.join(",") + ")");
        });
        sql += sqlTokens.join(",");
        if (this.shouldUpdateOnDuplicate) {
            sql += " ON CONFLICT (" + this.duplicateConstraints + ") DO UPDATE SET " + columns.map(c => `"${c}" = EXCLUDED."${c}"`).join(",");
        } else {
            sql += " ON CONFLICT DO NOTHING";
        }
        await this.connection.query(sql, params);
    }

    public static async dumpRaw<T extends { toCacheObject: () => any }>(repository: orm.Repository<T>, duplicateConstraints: string, objects: T[], getAllRaw = false, rawMapper: (entity: any) => DeepPartial<T> = e => e): Promise<T[]> {
        const cache: EntityCache<T> = new EntityCache({
            repository, duplicateConstraints,
            interval: 50,
            count: 250,
            shouldUpdateOnDuplicate: true
        });
        cache.stop();
        cache.add(objects);
        await cache.dumpAll();
        return getAllRaw ? (await cache.getAllRaw(true)).map((e: Partial<T>) => repository.create(rawMapper(e))) : [];
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

interface EntityColumn {
    isGenerated: boolean;
    isRelation: boolean;
    propertyName: string;
    databaseName: string;
}

// TypeORM doesn't export this type, but fortunately it's simple
type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};
