import * as supertest from "supertest";
import main from "../../server";

export default class Tests {
    public static server: {
        app: Express.Application;
    } = undefined;

    public static async init(): Promise<void> {
        if (this.server !== undefined) return;
        this.server = await main();
    }

    public static request(): supertest.SuperTest<supertest.Test> {
        if (this.server === undefined) return undefined;
        return supertest(this.server.app);
    }

}
