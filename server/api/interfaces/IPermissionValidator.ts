import IRequestHandler from "./IRequestHandler";

abstract class IPermissionValidator extends IRequestHandler {
    /**
     * Returns true if this request is authorized for the given permissions.
     */
    public abstract isRequestAuthorized(permissions: any[]): Promise<boolean>;
}

export default IPermissionValidator;
