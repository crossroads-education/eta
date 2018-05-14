import HelperArray from "../../helpers/array";
import { expect } from "chai";

describe("HelperArray", () => {
    describe("#mapObject()", () => {
        const expected = { foo: 2, bar: 3 };
        it("should return an object given a 2D array of key-values", () => {
            expect(HelperArray.mapObject([
                ["foo", 2], ["bar", 3]
            ])).to.deep.equal(expected);
        });
        it("should return an object given an array of key-values", () => {
            expect(HelperArray.mapObject([{
                key: "foo",
                value: 2
            }, {
                key: "bar",
                value: 3
            }])).to.deep.equal(expected);
        });
    });

    describe("#getRandomItem()", () => {
        it("should return an item from the array", () => {
            const arr = [5, 6, 7, 8];
            expect(arr).to.include(HelperArray.getRandomItem(arr));
        });
    });
});
