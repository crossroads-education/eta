import * as assert from "assert";
import * as mocha from "mocha";
import HelperObject from "../../helpers/object";

describe("HelperObject", function(): void {
    describe("#clone()", function(): void {
        it("should return null when passed null", function(): void {
            assert.strictEqual(null, HelperObject.clone(null));
        });
        it("should return undefined when passed undefined", function(): void {
            assert.strictEqual(undefined, HelperObject.clone(undefined));
        });
        it("should return the same thing when passed a primitive", function(): void {
            const val = 2;
            assert.strictEqual(val, HelperObject.clone(val));
        });
        it("should return a different Date reference when passed a Date", function(): void {
            const date: Date = new Date();
            assert.notStrictEqual(date, HelperObject.clone(date));
        });
        it("should return a different object reference when passed an object", function(): void {
            const obj: any = {"foo": 2, "bar": true};
            assert.notStrictEqual(obj, HelperObject.clone(obj));
        });
    });

    describe("#merge()", function(): void {
        it("should combine properties of `from` and `to`", function(): void {
            const from: any = { foo: true };
            const to: any = { bar: 4 };
            const expected: any = {
                bar: 4,
                foo: true
            };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should overwrite non-array members of `to` with `from`", function(): void {
            const from: any = { foo: true };
            const to: any = { foo: false };
            const expected: any = { foo: true };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should concat array members of `to` to `from`", function(): void {
            const from: any = { foo: [2, 3] };
            const to: any = { foo: [1] };
            const expected: any = { foo: [1, 2, 3] };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should return the same reference as `to`", function(): void {
            const from: any = { foo: 2 };
            const to: any = { bar: 3 };
            const result: any = HelperObject.merge(from, to);
            assert.strictEqual(to, result);
        });
    });
});
