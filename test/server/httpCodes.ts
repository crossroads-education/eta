// NOTE Running these tests requires the crossroads-education/eta-web-test module to be installed.
process.env.ETA_testing = "true";
process.env.ETA_auth_provider = "cre-web-test";
process.env.ETA_db_isReadOnly = "true";

/*
import tests from "../../server/api/tests";

before(function(done) {
    this.timeout(10000);
    tests.init().then(() => {
        done();
    }).catch(err => console.error(err));
});

describe("HTTP Codes", () => {
    it("should handle a 200 request propermoly", done => {
        tests.request()
            .get("/test/success")
            .expect(200, done);
    });
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

*/
