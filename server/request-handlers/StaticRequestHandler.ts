import * as eta from "../../eta";
import * as fs from "fs-extra";
import * as mime from "mime";
import RequestHandler from "../RequestHandler";

export default class StaticRequestHandler extends RequestHandler {
    public staticPath: string;
    private mimeType: string;
    private stats: fs.Stats;

    public async handle(): Promise<void> {
        if (!await fs.pathExists(this.staticPath)) { // since static file list is cached
            eta.logger.trace("A static file was deleted after the server started. " + this.staticPath);
            this.renderError(eta.constants.http.NotFound);
            return;
        }
        this.mimeType = mime.lookup(this.req.mvcPath, "text/plain");
        this.stats = await fs.stat(this.staticPath);
        if (this.mimeType === "video/mp4" && this.req.headers.range) {
            return this.handleVideo();
        }
        if (this.config.get("dev.enable")) { // don't cache anything in dev mode
            this.res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            this.res.setHeader("Pragma", "no-cache");
            this.res.setHeader("Expires", "0");
        } else if (this.mimeType !== "application/javascript" && this.mimeType !== "text/css") { // don't cache JS and CSS
            const hash: string = eta.crypto.getUnique(new Buffer(this.staticPath + "-" + this.stats.mtime.getTime()));
            this.res.setHeader("Cache-Control", "max-age=" + 60 * 60 * 24 * 30); // 30 days
            this.res.setHeader("ETag", hash);
            if (this.req.header("If-None-Match") === hash) {
                this.res.sendStatus(eta.constants.http.NotModified);
                return;
            }
        }
        this.res.setHeader("Content-Type", this.mimeType);
        this.res.setHeader("Content-Length", this.stats.size.toString());
        fs.createReadStream(this.staticPath).pipe(this.res);
    }

    private handleVideo(): void {
        const range: string = <string>this.req.headers.range;
        const parts = range.replace(/bytes=/, "").split("-");
        const start: number = Number(parts[0]);
        const end: number = parts[1] ? Number(parts[1]) : this.stats.size - 1;
        const chunkSize: number = (end - start) + 1;
        this.res.writeHead(206, {
            "Accept-Range": "bytes",
            "Content-Length": chunkSize,
            "Content-Range": `bytes ${start}-${end}/${this.stats.size}`,
            "Content-Type": this.mimeType
        });
        fs.createReadStream(this.staticPath, { start, end }).pipe(this.res);
    }
}
