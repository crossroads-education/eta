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
            let val: number = 2;
            assert.strictEqual(val, HelperObject.clone(val));
        });
        it("should return a different Date reference when passed a Date", function(): void {
            let date: Date = new Date();
            assert.notStrictEqual(date, HelperObject.clone(date));
        });
        it("should return a different object reference when passed an object", function(): void {
            let obj: any = {"foo": 2, "bar": true};
            assert.notStrictEqual(obj, HelperObject.clone(obj));
        });
    });

    describe("#merge()", function(): void {
        it("should combine properties of `from` and `to`", function(): void {
            let from: any = { foo: true };
            let to: any = { bar: 4 };
            let expected: any = {
                bar: 4,
                foo: true
            };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should overwrite non-array members of `to` with `from`", function(): void {
            let from: any = { foo: true };
            let to: any = { foo: false };
            let expected: any = { foo: true };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should concat array members of `to` to `from`", function(): void {
            let from: any = { foo: [2, 3] };
            let to: any = { foo: [1] };
            let expected: any = { foo: [1, 2, 3] };
            assert.deepEqual(expected, HelperObject.merge(from, to));
        });
        it("should return the same reference as `to`", function(): void {
            let from: any = { foo: 2 };
            let to: any = { bar: 3 };
            let result: any = HelperObject.merge(from, to);
            assert.strictEqual(to, result);
        });
    });
});
