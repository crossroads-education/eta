import * as path from "path";

export default class Constants {
    public static basePath: string = path.resolve(__dirname, "../..").replace(/\\/g, "/") + "/";
    public static controllerPaths: string[];
    public static modulesPath: string = Constants.basePath + "modules/";
    public static staticPaths: string[];
    public static viewPaths: string[];
    public static http = {
        AccessDenied: 403,
        InternalError: 500,
        MissingParameters: 422,
        NotFound: 404,
        NotModified: 304
    };
}
