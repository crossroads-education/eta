import * as supertest from "supertest";

export default class Tests {
    public static server: {
        server: Express.Application;
    } = undefined;

    public static async init(): Promise<void> {
        if (this.server !== undefined) return;
        this.server = (await require("../../server").default()).server;
    }

    public static request(): supertest.SuperTest<supertest.Test> {
        if (this.server === undefined) return undefined;
        return supertest(this.server.server);
    }

}
