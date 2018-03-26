import HttpActionParam from "./HttpActionParam";

export default interface HttpAction {
    name: string;
    url: string;
    groupParams: boolean;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    params: {[key: string]: HttpActionParam};
    [key: string]: any;
}
