import "../../helpers/require";
import { install as sourceMapInstall } from "source-map-support";
sourceMapInstall();
import { expect } from "chai";
import HelperCrypto from "@eta/helpers/crypto";
import * as randomstring from "randomstring";

describe("helpers/crypto", () => {
    const password = "testing";
    const salt = randomstring.generate({ length: 32 });
    const key = randomstring.generate({ length: 32 });

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
