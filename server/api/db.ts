import * as orm from "typeorm";
import "reflect-metadata";
import * as eta from "../../eta";
import logger from "./logger";
import * as db from "../../db";
Object.keys(db); // Initializes models

function getConnection(): orm.Connection {
    return orm.getConnection();
}
export default getConnection;

export async function connect(): Promise<orm.Connection> {
    const modelDirs: string[] = eta.object.clone(Object.keys(eta.config.modules)
        .map(k => eta.config.modules[k])
        .map(m => m.dirs.models)
        .reduce((prev, next) => prev.concat(next)))
        .map(d => d + "*.js");
    let logOptions: string[] = [];
    if (eta.config.logger.logDatabaseQueries) {
        logOptions = ["error", "query"];
    }
    return await orm.createConnection(eta.object.merge({
        entities: modelDirs,
        autoSchemaSync: true,
        logging: logOptions
    }, eta.config.db));
}
