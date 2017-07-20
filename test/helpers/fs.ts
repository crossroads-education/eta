import * as assert from "assert";
import * as mocha from "mocha";
import HelperFS from "../../helpers/fs";

describe("HelperFS", function(): void {
    describe("#exists", function(): void {
        it("should show this file as existing", function(done: MochaDone): void {
            HelperFS.exists(process.cwd() + "/test/helpers/fs.js", function(exists: boolean) {
                assert.ok(exists);
                done();
            });
        });
        it("should show a gibberish file as not existing", function(done: MochaDone): void {
            HelperFS.exists(process.cwd() + "/tegfeiofgj.gd", function(exists: boolean) {
                assert.ok(!exists);
                done();
            });
        });
    });

    describe("#existsSync", function(): void {
        it("should show this file as existing", function(): void {
            const result: boolean = HelperFS.existsSync(process.cwd() + "/test/helpers/fs.js");
            assert.ok(result);
        });
        it("should show a gibberish file as not existing", function(): void {
            const result: boolean = HelperFS.existsSync(process.cwd() + "/tegfeiofgj.gd");
            assert.ok(!result);
        });
    });
});
