import { expect } from "chai";
import HelperObject from "../../helpers/object";

describe("helpers/object", () => {
    describe("#enumToPure()", () => {
        enum Foo { A, B }
        it("should convert an enum to pure", () => {
            const pure = HelperObject.enumToPure(Foo);
            expect(pure).to.have.property("A")
                .which.equals(Foo.A);
            expect(pure).to.have.property("B")
                .which.equals(Foo.B);
            expect(pure).to.not.have.property(Foo.A.toString());
            expect(pure).to.not.have.property(Foo.B.toString());
        });
    });

    describe("#getFunctionParameterNames()", () => {
        function foo(a: number, b: string) { console.log(a, b); }
        it("should get function parameters correctly", () => {
            expect(HelperObject.getFunctionParameterNames(foo)).to.deep.equal(["a", "b"]);
        });
    });

    describe("#recursiveKeys()", () => {
        const data = {
            foo: true,
            bar: {
                a: true,
                b: [{
                    c: true
                }, true]
            }
        };
        const keys = HelperObject.recursiveKeys(data);
        it("should return first-level keys", () => {
            expect(keys).to.deep.include(["foo"]);
        });
        it("should return keys with object values", () => {
            expect(keys).to.deep.include(["bar"]);
        });
        it("should return second-level keys", () => {
            expect(keys).to.deep.include(["bar", "a"]);
        });
        it("should return array indices as keys", () => {
            expect(keys).to.deep.include(["bar", "b", "0"]);
        });
        const keysLeavesOnly = HelperObject.recursiveKeys(data, false);
        it("should exclude objects if asked to", () => {
          expect(keysLeavesOnly).to.deep.equal([["foo"], ["bar", "a"], ["bar", "b", "0", "c"], ["bar", "b", "1"]]);
        });
    });
});
