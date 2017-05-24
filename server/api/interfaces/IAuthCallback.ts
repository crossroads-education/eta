import AuthResult from "../enums/AuthResult";

interface Callback {
    (error: Error, result?: AuthResult): void;
}

export default Callback;
