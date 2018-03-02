import * as _ from "lodash";
import { expect } from "chai";
import * as supertest from "supertest";

export default class TestRunner {
    private agent: supertest.SuperTest<supertest.Test>;

    public constructor(url = "http://localhost:3000") {
        this.agent = supertest.agent(url);
    }

    public describeEndpoint(url: string, tests: {[key: string]: (res: supertest.Response) => Promise<void>}, options?: Partial<DescribeOptions>): void {
        options = _.defaults<Partial<DescribeOptions>, DescribeOptions>(options, {
            transformRequest: req => req,
            method: "get",
            apiToken: process.env.API_TOKEN,
            params: {}
        });
        describe(options.method.toUpperCase() + " " + url, () => {
            let res: supertest.Response;
            beforeEach(done => {
                let req = options.transformRequest(this.agent[options.method].bind(this.agent)(url)
                    .set("Authorization", "Bearer " + options.apiToken));
                if (Object.keys(options.params).length > 0) {
                    if (options.method === "get") {
                        req = req.query(options.params);
                    } else {
                        req = req.send(options.params).type("form");
                    }
                }
                req.then(_res => {
                    res = _res;
                    done();
                }).catch(done);
            });
            it("should respond with JSON", () => {
                expect(res.header).to.have.property("content-type").which.matches(/^application\/json/);
                expect(res.status).to.equal(200);
            });
            it("should have successful result", () => {
                expect(res.body).to.have.property("result");
                expect(res.body.result).to.equal(0);
            });
            Object.keys(tests).forEach(k => {
                it(k, done => {
                    tests[k](res).then(done).catch(done);
                });
            });
        });
    }
}

interface DescribeOptions {
    transformRequest: (req: supertest.Test) => supertest.Test;
    method: "get" | "post" | "patch" | "put" | "delete";
    apiToken: string;
    params: {[key: string]: any};
}
