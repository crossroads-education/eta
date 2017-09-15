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
    private timer: number;

    public constructor(options: Partial<EntityCache<T>>) {
        Object.assign(this, options);
        this.start();
    }

    public add(objects: T[]): void {
        this.cache = this.cache.concat(objects);
        this.archive = this.archive.concat(objects);
    }

    public dump(): void {
        if (this.cache.length === 0) {
            // don't bother if cache is empty
        } else if (this.cache.length === 1) {
            // just dump the single object normally, not worth generating SQL
            this.repository.save(this.cache);
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

    public async getAllRaw(): Promise<any[]> {
        const tableName = eta.db().driver.escape(this.repository.metadata.tableName);
        const columns: string = [...new Set(this.repository.metadata.columns
            .map(c => {
                const dbName: string = eta.db().driver.escape(c.databaseName);
                const name: string = eta.db().driver.escape(c.relationMetadata === undefined ? c.propertyName : c.databaseName);
                return `${dbName} AS ${name}`;
            })
        )].join(", ");
        return await eta.db().query(`SELECT ${columns} FROM ${tableName}`);
    }

    public start(): void {
        this.timer = setInterval(this.dump.bind(this), this.interval);
    }

    public stop(): void {
        clearInterval(this.timer);
    }

    private async insertMany(objects: T[]): Promise<void> {
        const tableName = eta.db().driver.escape(this.repository.metadata.tableName);
        let sql = "INSERT INTO " + tableName + " ";
        const columns: string[] = eta.array.uniquePrimitive(this.repository.metadata.columns
            .filter(c => !c.isGenerated)
            .map(c => c.databaseName));
        sql += "(" + columns.map(c => eta.db().driver.escape(c)).join(",") + ") VALUES ";
        const sqlTokens: string[] = [];
        const params: any[] = [];
        let count = 0;
        objects = objects.map(o => {
            try {
                return o.toCacheObject();
            } catch (err) {
                eta.logger.error(err);
                return undefined;
            }
        }).filter(o => o !== undefined);
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
        await eta.db().query(sql, params);
    }
}
