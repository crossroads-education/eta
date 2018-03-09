import "../../helpers/require";
import { install as sourceMapInstall } from "source-map-support";
sourceMapInstall();
import { expect } from "chai";
import HelperCrypto from "@eta/helpers/crypto";

describe("helpers/crypto", () => {
    const password = "testing";
    const salt = HelperCrypto.generateSalt(32);
    const key = HelperCrypto.generateSalt(32);

    describe("#hashPassword", () => {
        let output: string;
        beforeEach(() => {
            output = HelperCrypto.hashPassword(password, salt);
        });
        it("should return a string with 64 characters", () => {
            expect(output).to.have.lengthOf(64);
        });
        it("should return a consistent value", () => {
            expect(output).to.equal(HelperCrypto.hashPassword(password, salt));
        });
    });

    describe("#generateSalt", () => {
        let output: string;
        beforeEach(() => {
            output = HelperCrypto.generateSalt();
        });
        it("should return a string with 20 characters", () => {
            expect(output).to.have.lengthOf(20);
        });
        it("should return an inconsistent value", () => {
            expect(output).to.not.equal(HelperCrypto.generateSalt());
        });
    });

    describe("#getUnique", () => {
        let output: string;
        beforeEach(() => {
            output = HelperCrypto.getUnique(Buffer.from(password));
        });
        it("should return a string with 32 characters", () => {
            expect(output).to.have.lengthOf(32);
        });
        it("should return a consistent value given the same input", () => {
            expect(output).to.equal(HelperCrypto.getUnique(Buffer.from(password)));
        });
        it("should return an inconsistent value given a different input", () => {
            expect(output).to.not.equal(HelperCrypto.getUnique(Buffer.from(salt)));
        });
    });

    describe("#encrypt", () => {
        const output: string = HelperCrypto.encrypt(password, key);
        it("should return a string with 2x + 33 characters of the original", () => {
            expect(output).to.have.lengthOf(2 * password.length + 33);
        });
        it("should return an inconsistent value given the same inputs", () => {
            expect(output).to.not.equal(HelperCrypto.encrypt(password, key));
        });
        it("should return an inconsistent value given a different key", () => {
            expect(output).to.not.equal(HelperCrypto.encrypt(password, salt));
        });
        it("should return an inconsistent value given different data", () => {
            expect(output).to.not.equal(HelperCrypto.encrypt(salt, key));
        });
    });

    describe("#decrypt", () => {
        const encrypted: string = HelperCrypto.encrypt(password, key);
        const decrypted: string = HelperCrypto.decrypt(encrypted, key);
        it("should return the original string given the correct key", () => {
            expect(decrypted).to.equal(password);
        });
        it("should return a different string given an incorrect key", () => {
            expect(HelperCrypto.decrypt(encrypted, salt)).to.not.equal(password);
        });
    });
});
