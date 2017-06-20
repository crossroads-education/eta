import * as cookie from "cookie";
import * as http from "http";
import * as orm from "typeorm";
import * as eta from "../eta";

export default class HelperSession {
    public static async getFromRequest(req: http.IncomingMessage): Promise<{[key: string]: any}> {
        let sid: string;
        try {
            sid = cookie.parse(<any>req.headers.cookie)["connect.sid"];
        } catch (err) {
            return null;
        }
        if (!sid) {
            return null;
        }
        sid = sid.split(".")[0].substring(2);
        let queryRunner: orm.QueryRunner = await eta.db.driver.createQueryRunner();
        let rows: any[] = await queryRunner.query("SELECT expire, sess FROM session WHERE sid = $1::text", [sid]);
        if (!rows || rows.length == 0) {
            return null;
        }
        if (rows[0].expire.getTime() < new Date().getTime()) {
            return null;
        }
        return rows[0].sess;
    }
}
