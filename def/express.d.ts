declare namespace Express {
    export interface Request {
        baseUrl: string;
        fullUrl: string;
        mvcPath: string;
    }

    export interface Response {
        raw: any;
        view: {
            css?: string[];
            [key: string]: any;
        };
    }
}
