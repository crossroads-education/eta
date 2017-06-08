import * as assert from "assert";
import * as mocha from "mocha";
import HelperObject from "../../helpers/object";

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
