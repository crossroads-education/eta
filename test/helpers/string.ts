import { expect } from "chai";
import HelperString from "../../helpers/string";

describe("helpers/string", function(): void {
    describe("#toCamelCase", function(): void {
        it("should lowercase single leading character", function(): void {
            expect(HelperString.toCamelCase("Foo")).to.equal("foo");
        });
        it("should not lowercase multiple leading characters", function(): void {
            expect(HelperString.toCamelCase("IFoo")).to.equal("iFoo");
        });
        it("should not lowercase non-leading characters", function(): void {
            expect(HelperString.toCamelCase("IFooBar")).to.equal("iFooBar");
        });
    });
});
