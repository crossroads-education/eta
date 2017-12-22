export default class HttpRoute {
    public actions: {[key: string]: {
        flags: {[key: string]: string | number | boolean | RegExp};
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        useView: boolean;
        isAuthRequired: boolean;
        permissionsRequired: string[];
    }};
    public raw: string;
    public regex: RegExp;
    public paramMap: string[];

    public constructor(init: Partial<HttpRoute>) {
        Object.assign(this, init);
    }

    /**
     * Returns matched route parameters, or undefined if this route doesn't match.
     */
    public match(route: string): {[key: string]: string} {
        if (this.regex === undefined) return this.raw === route ? {} : undefined;
        const isMatch = this.regex.test(route);
        if (!isMatch) return undefined;
        const params: {[key: string]: string} = {};
        route.match(this.regex).slice(1).forEach((param, i) => {
            params[this.paramMap[i]] = param;
        });
        return params;
    }
}
