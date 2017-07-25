import * as readline from "readline";
import * as eta from "../../eta";

export default class ConsoleLifecycle extends eta.ILifecycleHandler {
    private console: readline.ReadLine;

    public async onServerStart(): Promise<void> {
        this.console = readline.createInterface({
            input: process.stdin
        });
        this.console.on("SIGINT", () => {
            process.kill(process.pid, "SIGINT");
        });
        this.console.setPrompt("> ");
        this.console.prompt();
        this.console.on("line", (l: string) => { return this.onLine(l); });
    }

    private onLine(line: string): void {
        this.handle(line).then(() => {
            this.console.prompt();
        }).catch(err => {
            eta.logger.error(err);
        });
    }

    private async handle(line: string): Promise<void> {
        if (line === "reload") {
            await this.server.pageManager.reload();
            eta.logger.trace("Finished reloading all controllers.");
        } else if (line.length > 0) {
            eta.logger.trace("Unrecognized command: " + line);
        }
    }

    public async onServerStop(): Promise<void> {
        if (this.console) {
            this.console.close();
        }
    }
}
