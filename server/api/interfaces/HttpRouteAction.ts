export default interface HttpRouteAction {
    flags: {[key: string]: string | number | boolean | RegExp};
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    useView: boolean;
    isAuthRequired: boolean;
    permissionsRequired: string[];
}
