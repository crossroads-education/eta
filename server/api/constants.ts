import * as fs from "fs";
import * as helpers from "../../helpers";

export default class Constants {
    public static controllerPath: string = helpers.path.baseDir + "content/controllers/";
    public static staticPath: string = helpers.path.baseDir + "content/static/";
    public static staticDirs: string[] = fs.readdirSync(Constants.staticPath);
    public static viewPath: string = helpers.path.baseDir + "content/views/";
    public static http: HttpCodes = {
        AccessDenied: 403,
        InternalError: 500,
        InvalidParameters: 400,
        NotFound: 404
    };
}

interface HttpCodes {
    AccessDenied: number;
    InternalError: number;
    InvalidParameters: number;
    NotFound: number;
}
