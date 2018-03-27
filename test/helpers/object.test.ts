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
});
