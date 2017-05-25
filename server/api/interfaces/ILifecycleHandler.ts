import WebServer from "../../WebServer";

abstract class ILifecycleHandler {
    public server: WebServer;
    public async onAppStart?(): Promise<void> { }
    public async beforeServerStart?(): Promise<void> { }
    public async onServerStart?(): Promise<void> { }
    public async onDatabaseConnect?(): Promise<void> { }
    public async onServerStop?(): Promise<void> { }
}

export default ILifecycleHandler;
