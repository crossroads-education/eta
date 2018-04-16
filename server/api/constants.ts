export default class Constants {
    static readonly basePath: string = process.cwd().replace(/\\/g, "/") + "/";
    static readonly modulesPath: string = Constants.basePath + "modules/";
    static readonly http = {
        AccessDenied: 403,
        InternalError: 500,
        MissingParameters: 422,
        NotFound: 404,
        NotModified: 304
    };
}
