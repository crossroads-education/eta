import HttpActionParam from "./HttpActionParam";

export default interface HttpAction {
    name: string;
    url: string;
    groupParams: boolean;
    middleWare: Function | Function[];
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params: {[key: string]: HttpActionParam};
    isAuthRequired: boolean;
    permissionsRequired: string[];
    [key: string]: any;
}
