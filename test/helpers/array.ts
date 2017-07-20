import * as assert from "assert";
import * as mocha from "mocha";
import HelperArray from "../../helpers/array";

describe("HelperArray", function(): void {
    describe("#remove", function(): void {
        function getArray(): number[] { return [5, 2, 3, 8, 6, 1, 3, 8]; }
        it("should remove one item correctly", function(): void {
            const arr: number[] = getArray();
            HelperArray.remove(arr, n => n === 2);
            assert.equal(arr[1], 3);
            assert.equal(arr.length, 7);
        });
        it("should remove multiple items correctly", function(): void {
            const arr: number[] = getArray();
            HelperArray.remove(arr, n => n === 3);
            assert.equal(arr[2], 8);
            assert.equal(arr[5], 8);
            assert.equal(arr.length, 6);
        });
        it("should return the number of items removed correctly", function(): void {
            const arr: number[] = getArray();
            const count: number = HelperArray.remove(arr, n => n === 6);
            assert.equal(count, 1);
        });
    });
});
