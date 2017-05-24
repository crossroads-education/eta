import * as orm from "typeorm";
import "reflect-metadata";
import * as helpers from "../../helpers";
import config from "./config";

let conn: orm.Connection;
export default conn;

export async function connect(): Promise<orm.Connection> {
    let modelDirs: string[] = helpers.object.clone(config.content.modelDirs);
    for (let i: number = 0; i < modelDirs.length; i++) {
        modelDirs[i] = helpers.path.baseDir + "content/" + modelDirs[i] + "/**/*.js";
    }
    return await orm.createConnection({
        driver: config.db,
        entities: modelDirs,
        autoSchemaSync: true
    });
}
