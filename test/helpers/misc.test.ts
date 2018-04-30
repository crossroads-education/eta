import { expect } from "chai";
import HelperMisc from "../../helpers/misc";

describe("helpers/misc", () => {
    describe("#delay()", () => {
        it("should take the proper amount of time to resolve", done => {
            const start = Date.now();
            HelperMisc.delay(100).then(() => {
                const end = Date.now();
                expect(end - start).to.be.gte(100);
                done();
            }).catch(done);
        });
    });
});
