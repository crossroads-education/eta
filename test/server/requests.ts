// NOTE Running these tests requires the crossroads-education/eta-web-test module to be installed.

process.env.ETA_TESTING = "true";
process.env.ETA_AUTH_PROVIDER = "cre-web-test";

import tests from "../../server/api/tests";

before(function(done) {
    this.timeout(20000); // plenty of time to initialize the server
    tests.init().then(() => {
        done();
    }).catch(err => console.error(err));
});

describe("Requests", () => {
    it("should handle a 404 request properly", done => {
        tests.request()
            .get("/test/foobar")
            .expect(404, done);
    });
    it("should handle a 500 request properly", done => {
        tests.request()
            .get("/test/error")
            .expect(500, done);
    });
});
