import * as helpers from "../../../helpers";
import config from "../config";
import IHttpController from "./IHttpController";

/**
 * All methods on IAuthController will have a session populated with "authFrom"
 */
abstract class IAuthController extends IHttpController {
    abstract async login(): Promise<void>;
    abstract async logout(): Promise<void>;
    async register(): Promise<void> { }
}

export default IAuthController;
