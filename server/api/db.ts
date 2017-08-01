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
        .map(m => m.modelDirs)
        .reduce((prev, next) => prev.concat(next)))
        .map(d => d + "*.js");
    // eta.object.clone(modelDirs).forEach(d => modelDirs.push(d.replace("/**/!(enums)/", "/")));
    console.log(modelDirs);
    const connection: orm.Connection = await orm.createConnection(eta.object.merge({
        entities: modelDirs,
        autoSchemaSync: true,
        logging: {
            logger: (l: string, m: any) => { logger.log(l, "[" + logger.getCalling(4) + "] " + m); },
            logOnlyFailedQueries: !eta.config.logger.logDatabaseQueries,
            logQueries: eta.config.logger.logDatabaseQueries
        }
    }, eta.config.db));
    return connection;
}
