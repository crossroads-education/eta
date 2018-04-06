declare namespace Express {
    export interface Request {
        baseUrl: string;
        fullUrl: string;
        mvcPath: string;
        mvcFullPath: string;
    }

    export interface Response {
        view: {
            css?: string[];
            [key: string]: any;
        };
    }

    export interface SessionData {
        userid: number;
        authFrom: string;
        lastPage: string;
    }
}
