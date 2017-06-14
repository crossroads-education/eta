import * as orm from "typeorm";
import "reflect-metadata";
import * as helpers from "../../helpers";
import config from "./config";
import logger from "./logger";

let conn: orm.Connection;
export default conn;

export async function connect(): Promise<orm.Connection> {
    let modelDirs: string[] = helpers.object.clone(config.content.modelDirs);
    for (let i: number = 0; i < modelDirs.length; i++) {
        modelDirs[i] = helpers.path.baseDir + "content/" + modelDirs[i] + "/**/*.js";
    }
    return await orm.createConnection({
        type: <any>config.db.type,
        driver: config.db,
        entities: modelDirs,
        autoSchemaSync: true,
        logging: {
            logger: (l: string, m: any) => { logger.log(l, m); },
            logOnlyFailedQueries: !config.logger.logDatabaseQueries,
            logQueries: config.logger.logDatabaseQueries
        }
    });
}
