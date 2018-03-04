import { expect } from "chai";
import HelperObject from "../../helpers/object";

describe("helpers/object", function(): void {
    describe("#merge()", function(): void {
        it("should combine properties of `from` and `to`", function(): void {
            const from: any = { foo: true };
            const to: any = { bar: 4 };
            const expected: any = {
                bar: 4,
                foo: true
            };
            expect(HelperObject.merge(from, to)).to.deep.equal(expected);
        });
        it("should overwrite non-array members of `to` with `from`", function(): void {
            const from: any = { foo: true };
            const to: any = { foo: false };
            const expected: any = { foo: true };
            expect(HelperObject.merge(from, to)).to.deep.equal(expected);
        });
        it("should concat array members of `to` to `from`", function(): void {
            const from: any = { foo: [2, 3] };
            const to: any = { foo: [1] };
            const expected: any = { foo: [1, 2, 3] };
            expect(HelperObject.merge(from, to)).to.deep.equal(expected);
        });
        it("should return the same reference as `to`", function(): void {
        it("should concatenate array members of `from` to `to` given `reverseArrays` parameter", () => {
            const from: any = { foo: [2, 3] };
            const to: any = { foo: [1] };
            const expected: any = { foo: [2, 3, 1] };
            expect(HelperObject.merge(from, to, true)).to.deep.equal(expected);
        });
            const from: any = { foo: 2 };
            const to: any = { bar: 3 };
            const result: any = HelperObject.merge(from, to);
            expect(to).to.equal(result);
        });
    });
});
