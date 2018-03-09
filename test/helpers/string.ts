import { expect } from "chai";
import HelperString from "../../helpers/string";

describe("helpers/string", () => {
    describe("#toCamelCase", () => {
        it("should lowercase single leading character", () => {
            expect(HelperString.toCamelCase("Foo")).to.equal("foo");
        });
        it("should not lowercase multiple leading characters", () => {
            expect(HelperString.toCamelCase("IFoo")).to.equal("iFoo");
        });
        it("should not lowercase non-leading characters", () => {
            expect(HelperString.toCamelCase("IFooBar")).to.equal("iFooBar");
        });
    });
});
