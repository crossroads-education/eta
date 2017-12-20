import * as assert from "assert";
import * as mocha from "mocha";
import HelperString from "../../helpers/string";

describe("HelperString", function(): void {
    describe("#toCamelCase", function(): void {
        it("should lowercase single leading character", function(): void {
            const result: string = HelperString.toCamelCase("Foo");
            assert.equal(result, "foo");
        });
        it("should not lowercase multiple leading characters", function(): void {
            const result: string = HelperString.toCamelCase("IFoo");
            assert.equal(result, "iFoo");
        });
        it("should not lowercase non-leading characters", function(): void {
            const result: string = HelperString.toCamelCase("IFooBar");
            assert.equal(result, "iFooBar");
        });
    });
    describe("#toLowerCamelCase", function(): void {
        it("should lowercase single leading character", function(): void {
            const result: string = HelperString.toLowerCamelCase("Foo");
            assert.equal(result, "foo");
        });
        it("should lowercase multiple leading characters", function(): void {
            const result: string = HelperString.toLowerCamelCase("IFoo");
            assert.equal(result, "ifoo");
        });
        it("should not lowercase non-leading characters", function(): void {
            const result: string = HelperString.toLowerCamelCase("IFooBar");
            assert.equal(result, "ifooBar");
        });
    });
});
