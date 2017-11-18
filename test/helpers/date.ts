import * as assert from "assert";
import * as mocha from "mocha";
import HelperDate from "../../helpers/date";

describe("HelperDate", function() {
    const start: Date = new Date("2017-02-07");
    const end: Date = new Date("2017-05-10");
    describe("#getDate()", function(): void {
        it("should not mutate the parameter", function(): void {
            const param: Date = new Date();
            const copy: Date = new Date(param.getTime());
            const result: Date = HelperDate.getDate(param);
            assert.deepEqual(copy, param);
        });
        it("should not return a Date with any time", function(): void {
            const result: Date = HelperDate.getDate(new Date());
            assert.equal(0, result.getHours());
            assert.equal(0, result.getMinutes());
            assert.equal(0, result.getSeconds());
            assert.equal(0, result.getMilliseconds());
        });
    });
    describe("#getMonthsBetween()", function(): void {
        const result: (typeof HelperDate.Month)[] = HelperDate.getMonthsBetween(start, end);
        // getMonthsBetween(February, May) should return [February, March, April]
        it("should not mutate `start`", function(): void {
            assert.deepEqual(new Date(start.getTime()), start);
        });
        it("should not mutate `end`", function(): void {
            assert.deepEqual(new Date(end.getTime()), end);
        });
        it("should return the correct number of months", function(): void {
            assert.equal(3, result.length);
        });
        it("should return the correct months", function(): void {
            assert.equal(2, result[0].number);
            assert.equal(3, result[1].number);
            assert.equal(4, result[2].number);
        });
        it("should return the correct month names", function(): void {
            assert.equal("February", result[0].name);
            assert.equal("March", result[1].name);
            assert.equal("April", result[2].name);
        });
        // Not testing Month.weeks since we're already testing getWeeksBetween()
    });

    describe("#getWeeksBetween()", function(): void {
        const result: (typeof HelperDate.Week)[] = HelperDate.getWeeksBetween(start, end);
        it("should not mutate `start`", function(): void {
            assert.deepEqual(new Date(start.getTime()), start);
        });
        it("should not mutate `end`", function(): void {
            assert.deepEqual(new Date(end.getTime()), end);
        });
        it("should return the correct number of weeks", function(): void {
            assert.equal(13, result.length);
        });
        it("should return the correct weeks", function(): void {
            for (let i = 0; i < result.length; i++) {
                assert.equal(i + 6, result[i].number);
            }
        });
        it("should return the correct start dates", function(): void {
            const temp: Date = new Date("2017-02-05 00:00:00");
            for (let i = 0; i < result.length; i++) {
                assert.deepEqual(temp, result[i].start.toDate());
                temp.setDate(temp.getDate() + 7);
            }
        });
        it("should return the correct end dates", function(): void {
            const temp: Date = new Date("2017-02-11 00:00:00");
            for (let i = 0; i < result.length; i++) {
                assert.deepEqual(temp, result[i].end.toDate());
                temp.setDate(temp.getDate() + 7);
            }
        });
    });

    describe("#getFromTime()", function(): void {
        let now: Date, result: Date;
        beforeEach(function(): void {
            now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);
            result = HelperDate.getFromTime(now.getHours() + ":" + now.getMinutes());
        });
        it("should return a full Date object", function(): void {
            assert.ok(result instanceof Date);
        });
        it("should return a Date object for today", function(): void {
            assert.equal(now.getTime(), result.getTime());
        });
    });
});
