import * as assert from "assert";
import * as mocha from "mocha";
import HelperArray from "../../helpers/array";

describe("HelperArray", function(): void {
    let numbers: number[];
    beforeEach(function(): void {
        numbers = [5, 2, 3, 8, 6, 1, 3, 8];
    });

    describe("#remove", function(): void {
        it("should remove one item correctly", function(): void {
            HelperArray.remove(numbers, n => n === 2);
            assert.equal(numbers[1], 3);
            assert.equal(numbers.length, 7);
        });
        it("should remove multiple items correctly", function(): void {
            HelperArray.remove(numbers, n => n === 3);
            assert.equal(numbers[2], 8);
            assert.equal(numbers[5], 8);
            assert.equal(numbers.length, 6);
        });
        it("should return the number of items removed correctly", function(): void {
            const count: number = HelperArray.remove(numbers, n => n === 6);
            assert.equal(count, 1);
        });
    });

    describe("#removeIndexes", function(): void {
        it("should remove one item correctly", function(): void {
            HelperArray.removeIndexes(numbers, [2]);
            assert.equal(numbers[2], 8);
            assert.equal(numbers.length, 7);
        });
        it("should remove multiple items correctly", function(): void {
            HelperArray.removeIndexes(numbers, [2, 6]);
            assert.equal(numbers[2], 8);
            assert.equal(numbers[5], 8);
            assert.equal(numbers.length, 6);
        });
        it("should do nothing with invalid indexes", function(): void {
            HelperArray.removeIndexes(numbers, [100]);
            assert.equal(numbers.length, 8);
        });
    });

    describe("#unique", function(): void {
        it("should remove all duplicates", function(): void {
            const values: number[] = HelperArray.unique(numbers, n => n.toString());
            assert.equal(values.length, 6);
        });
    });

    describe("#uniquePrimitive", function(): void {
        it("should remove all duplicates", function(): void {
            const values: number[] = HelperArray.uniquePrimitive(numbers);
            assert.equal(values.length, 6);
        });
    });

    describe("#insert", function(): void {
        it("should insert multiple values into the correct position", function(): void {
            HelperArray.insert(numbers, 2, [9, 8, 7]);
            assert.equal(numbers[2], 9);
            assert.equal(numbers[3], 8);
            assert.equal(numbers[4], 7);
        });
    });

    describe("#groupBy", function(): void {
        let values: Map<number, number[]>;
        beforeEach(function(): void {
            values = HelperArray.groupBy(numbers, n => n % 2, n => n);
        });
        it("should group values by key", function(): void {
            assert.equal(values.get(0).length, 4);
            assert.equal(values.get(1).length, 4);
        });
        it("should have the correct number of keys", function(): void {
            assert.equal(values.size, 2);
        });
    });
});
