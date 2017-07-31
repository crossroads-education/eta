import * as fs from "fs";
import * as helpers from "../../helpers";

export default class Constants {
    public static basePath: string = process.cwd().replace(/\\/g, "/") + "/";
    public static controllerPaths: string[];
    public static modulesPath: string = Constants.basePath + "modules/";
    public static staticPaths: string[];
    public static viewPaths: string[];
    public static http = {
        AccessDenied: 403,
        InternalError: 500,
        InvalidParameters: 400,
        NotFound: 404
    };
}
