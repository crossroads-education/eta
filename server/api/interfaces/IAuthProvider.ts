import * as helpers from "../../../helpers";
import config from "../config";
import * as passport from "passport";
import IRequestHandler from "./IRequestHandler";

abstract class IAuthProvider extends IRequestHandler {
    public abstract getPassportStrategy(): passport.Strategy;
    public abstract async onPassportLogin(user: any): Promise<void>;
    public getOverrideRoutes(): string[] { return []; }
}

export default IAuthProvider;
