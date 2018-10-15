import * as _ from "lodash";
import * as supertest from "supertest";

export default class TestRunner {
    private agent: supertest.SuperTest<supertest.Test>;
    private pathPrefix: string;
    private apiToken: string;

    public constructor(baseUrl = "http://localhost:3000", pathPrefix = "", apiToken = "") {
        this.agent = supertest.agent(baseUrl);
        this.pathPrefix = pathPrefix;
        this.apiToken = apiToken;
    }

    // Pass a userId in the options to authorize as this user.
    public request(url: string, options?: Partial<RequestOptions>): supertest.Test {
        if (!url.startsWith("/")) url = this.pathPrefix + url;
        options = _.defaults<Partial<RequestOptions>, Partial<RequestOptions>>(options, {
            method: "get",
            userId: undefined,
            params: {}
        });
        let req: supertest.Test = this.agent[options.method].bind(this.agent)(url);
        req.set("x-requested-with", "XMLHttpRequest"); // tells eta to not forward to a login page
        if (options.userId !== undefined) {
            req.set("Authorization", `Basic ${options.userId}:${this.apiToken}`);
        }
        if (options.method === "get") req = req.query(options.params);
        // this seems to be a problem => it turns numbers into strings
        else req = req.send(options.params);
        return req;
    }
}

interface RequestOptions {
    method: "get" | "post" | "patch" | "put" | "delete";
    userId: number;
    params: {[key: string]: any};
}
