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
            return undefined;
        }
        if (!sid) {
            return undefined;
        }
        sid = sid.split(".")[0].substring(2);
        const queryRunner: orm.QueryRunner = await eta.db.driver.createQueryRunner();
        const rows: any[] = await queryRunner.query("SELECT expire, sess FROM session WHERE sid = $1::text", [sid]);
        if (!rows || rows.length === 0) {
            return undefined;
        }
        if (rows[0].expire.getTime() < new Date().getTime()) {
            return undefined;
        }
        return rows[0].sess;
    }

    public static async save(session: Express.SessionData): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            session.save((err: Error) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}
