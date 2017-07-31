export abstract class INetworkObject {
    public abstract toCleanObject(): any;
    public abstract toCacheObject(): any;

    public static toCleanObject(obj?: INetworkObject): any {
        return obj ? obj.toCleanObject() : undefined;
    }

    public static toCleanObjects(objs: INetworkObject[]): any[] {
        return objs.map(o => o.toCleanObject());
    }

    public toJSON(): any {
        try {
            return this.toCleanObject();
        } catch (err) {
            console.log("INetworkObject.toJSON()", err);
            return undefined;
        }
    }
}

export default INetworkObject;
