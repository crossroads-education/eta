export default class HelperArray {
    public static remove<T>(arr: T[], selector: (element: T) => boolean): number {
        const indexes: number[] = [];
        arr.forEach((e, i) => {
            if (selector(e)) {
                indexes.push(i);
            }
        });
        this.removeIndexes(arr, indexes);
        return indexes.length;
    }

    public static removeIndexes(arr: any[], indexes: number[]): void {
        // sort in descending order
        indexes = indexes.sort((a, b) => a === b ? 0 : (a > b ? -1 : 1));
        indexes.forEach(i => {
            arr.splice(i, 1);
        });
    }

    public static async forEachAsync<T>(arr: T[], worker: (element: T) => Promise<void>): Promise<void> {
        const promises: Promise<void>[] = [];
        arr.forEach(e => {
            promises.push(worker(e));
        });
        await Promise.all(promises);
    }
}
