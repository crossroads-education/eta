import * as fs from "fs";
import * as helpers from "../../helpers";

export default class Constants {
    public static basePath: string = process.cwd().replace(/\\/g, "/") + "/";
    public static contentPath: string = Constants.basePath + "content/";
    public static controllerPath: string = Constants.contentPath + "controllers/";
    public static staticPath: string = Constants.contentPath + "static/";
    public static staticDirs: string[] = fs.readdirSync(Constants.staticPath);
    public static viewPath: string = Constants.contentPath + "views/";
    public static http = {
        AccessDenied: 403,
        InternalError: 500,
        InvalidParameters: 400,
        NotFound: 404
    };
}
