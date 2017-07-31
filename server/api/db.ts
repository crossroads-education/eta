import * as orm from "typeorm";
import "reflect-metadata";
import * as eta from "../../eta";
import logger from "./logger";
import * as db from "../../db";
Object.keys(db);

let conn: orm.Connection; // tslint:disable-line
export default conn;

export async function connect(): Promise<orm.Connection> {
    const modelDirs: string[] = eta.object.clone(Object.keys(eta.config.modules)
        .map(k => eta.config.modules[k])
        .sort((a, b) => b.name ? b.name.includes("-db-") ? -1 : 0 : 0)
        .map(m => m.modelDirs)
        .reduce((prev, next) => prev.concat(next)))
        .map(d => d + "**/!(enums)/*.js");
    // eta.object.clone(modelDirs).forEach(d => modelDirs.push(d.replace("/**/!(enums)/", "/")));
    console.log(modelDirs);
    const connection: orm.Connection = await orm.createConnection({
        type: <any>eta.config.db.type,
        driver: eta.config.db,
        entities: modelDirs,
        autoSchemaSync: true,
        logging: {
            logger: (l: string, m: any) => { logger.log(l, "[" + logger.getCalling(4) + "] " + m); },
            logOnlyFailedQueries: !eta.config.logger.logDatabaseQueries,
            logQueries: eta.config.logger.logDatabaseQueries
        }
    });
    return connection;
}
