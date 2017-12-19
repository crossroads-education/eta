export default class MiscHelper {
    public static delay(ms: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                resolve();
            }, ms);
        });
    }
}
