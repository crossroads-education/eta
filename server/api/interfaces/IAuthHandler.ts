import * as helpers from "../../../helpers";
import config from "../config";
import IAuthCallback from "./IAuthCallback";
import IRequestHandler from "./IRequestHandler";

abstract class IAuthHandler extends IRequestHandler {
    private static _provider: typeof IAuthHandler;
    abstract login(callback: IAuthCallback): void;
    abstract logout(callback: IAuthCallback): void;
    abstract register(callback: IAuthCallback): void;

    public static get provider(): typeof IAuthHandler {
        if (!this._provider) {
            this._provider = require(helpers.path.baseDir + "content/" + config.content.auth).default;
        }
        return this._provider;
    }
}

export default IAuthHandler;
