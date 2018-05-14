import Application from "@eta/server/Application";

export default abstract class LifecycleHandler {
    protected app: Application;
    public constructor(app: Application) {
        this.app = app;
    }

    public abstract register(): void;
}
