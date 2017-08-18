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

    public static async forEachAsync<T>(arr: T[], worker: (element: T) => Promise<void>, inOrder = false): Promise<void> {
        if (inOrder) {
            for (let i = 0; i < arr.length; i++) {
                await worker(arr[i]);
            }
        } else {
            const promises: Promise<void>[] = [];
            arr.forEach(e => {
                promises.push(worker(e));
            });
            await Promise.all(promises);
        }
    }

    public static unique<T>(arr: T[], uniqueIdGenerator: (element: T) => string): T[] {
        const uniqueValues: {[key: string]: T} = {};
        arr.forEach(e => {
            const id: string = uniqueIdGenerator(e);
            uniqueValues[id] = e;
        });
        return Object.keys(uniqueValues).map(k => uniqueValues[k]);
    }
}
