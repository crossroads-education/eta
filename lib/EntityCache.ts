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

    private cache: T[] = [];
    private timer: number;

    public constructor(options: Partial<EntityCache<T>>) {
        Object.assign(this, options);
        this.start();
    }

    public add(objects: T[]): void {
        this.cache = this.cache.concat(objects);
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
            const objects = this.cache.splice(0, this.count);
            this.insertMany(objects).then(() => { })
            .catch(err => {
                eta.logger.error(err);
            });
        }
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
        let sqlTokens: string[] = [];
        const columns: string[] = [];
        this.repository.metadata.columns
            .filter(c => !c.isGenerated)
            .forEach(c => {
                sqlTokens.push(eta.db().driver.escape(c.databaseName));
                columns.push(c.databaseName);
            });
        sql += "(" + sqlTokens.sort().join(",") + ") VALUES ";
        columns.sort();
        sqlTokens = [];
        const params: any[] = [];
        let count = 0;
        try {
            objects = objects.map(o => o.toCacheObject());
        } catch (err) {
            eta.logger.error(err);
            return; // no need to continue, there are invalid objects
        }
        objects.forEach((obj: any) => {
            const objectTokens: string[] = [];
            columns.forEach(c => {
                objectTokens.push("$" + ++count);
                params.push(obj[c]);
            });
            sqlTokens.push("(" + objectTokens.join(",") + ")");
        });
        sql += sqlTokens.join(",") + " ON CONFLICT DO NOTHING";
        await eta.db().query(sql, params);
    }
}
