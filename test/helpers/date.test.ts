import { expect } from "chai";
import HelperDate from "../../helpers/date";

describe("helpers/date", () => {
    const start: Date = new Date("2017-02-07");
    const end: Date = new Date("2017-05-10");

    describe("#getDate()", () => {
        const input = new Date();
        const inputTime = input.getTime();
        let output: Date;
        beforeEach(() => {
            output = HelperDate.getDate(input);
        });
        it("should not mutate the parameter", () => {
            const copy: Date = new Date(inputTime);
            expect(copy).to.deep.equal(input);
        });
        it("should not return a Date with any time", () => {
            expect(output.getHours()).to.equal(0);
            expect(output.getMinutes()).to.equal(0);
            expect(output.getSeconds()).to.equal(0);
            expect(output.getMilliseconds()).to.equal(0);
        });
    });

    describe("#getMonthsBetween()", () => {
        const result: (typeof HelperDate.Month)[] = HelperDate.getMonthsBetween(start, end);
        // getMonthsBetween(February, May) should return [February, March, April]
        it("should return the correct number of months", () => {
            expect(result).to.have.lengthOf(3);
        });
        it("should return the correct months", () => {
            expect(result[0].number).to.equal(2);
            expect(result[1].number).to.equal(3);
            expect(result[2].number).to.equal(4);
        });
        it("should return the correct month names", () => {
            expect(result[0].name).to.equal("February");
            expect(result[1].name).to.equal("March");
            expect(result[2].name).to.equal("April");
        });
        // Not testing Month.weeks since we're already testing getWeeksBetween()
    });

    describe("#getWeeksBetween()", () => {
        const result: (typeof HelperDate.Week)[] = HelperDate.getWeeksBetween(start, end);
        it("should return the correct number of weeks", () => {
            expect(result).to.have.lengthOf(13);
        });
        it("should return the correct weeks", () => {
            for (let i = 0; i < result.length; i++) {
                expect(result[i].number).to.equal(i + 6);
            }
        });
        it("should return the correct start dates", () => {
            const temp: Date = new Date("2017-02-05 00:00:00");
            for (const item of result) {
                expect(item.start.toDate()).to.deep.equal(temp);
                temp.setDate(temp.getDate() + 7);
            }
        });
        it("should return the correct end dates", () => {
            const temp: Date = new Date("2017-02-11 00:00:00");
            for (const item of result) {
                expect(item.end.toDate()).to.deep.equal(temp);
                temp.setDate(temp.getDate() + 7);
            }
        });
    });

    describe("#getFromTime()", () => {
        let now: Date, result: Date;
        beforeEach(() => {
            now = new Date();
            now.setSeconds(0);
            now.setMilliseconds(0);
            result = HelperDate.getFromTime(now.getHours() + ":" + now.getMinutes());
        });
        it("should return a full Date object", () => {
            expect(result).to.be.an.instanceof(Date);
        });
        it("should return a Date object for today", () => {
            expect(result.getTime()).to.equal(now.getTime());
        });
    });
});
