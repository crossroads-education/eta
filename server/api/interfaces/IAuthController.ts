import * as helpers from "../../../helpers";
import config from "../config";
import IHttpController from "./IHttpController";

/**
 * All methods on IAuthController will have a session populated with "authFrom"
 */
abstract class IAuthController extends IHttpController {
    public abstract async login(): Promise<void>;
    public abstract async logout(): Promise<void>;
    public async register(): Promise<void > { }
}

export default IAuthController;
