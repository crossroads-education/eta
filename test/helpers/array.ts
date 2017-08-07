import * as assert from "assert";
import * as mocha from "mocha";
import HelperArray from "../../helpers/array";

describe("HelperArray", function(): void {
    function getNumberArray(): number[] { return [5, 2, 3, 8, 6, 1, 3, 8]; }
    describe("#remove", function(): void {
        it("should remove one item correctly", function(): void {
            const arr: number[] = getNumberArray();
            HelperArray.remove(arr, n => n === 2);
            assert.equal(arr[1], 3);
            assert.equal(arr.length, 7);
        });
        it("should remove multiple items correctly", function(): void {
            const arr: number[] = getNumberArray();
            HelperArray.remove(arr, n => n === 3);
            assert.equal(arr[2], 8);
            assert.equal(arr[5], 8);
            assert.equal(arr.length, 6);
        });
        it("should return the number of items removed correctly", function(): void {
            const arr: number[] = getNumberArray();
            const count: number = HelperArray.remove(arr, n => n === 6);
            assert.equal(count, 1);
        });
    });

    describe("#unique", function(): void {
        it("should remove all duplicates", function(): void {
            const arr: number[] = getNumberArray();
            const values: number[] = HelperArray.unique(arr, n => n.toString());
            assert.equal(values.length, 6);
        });
    });
});
