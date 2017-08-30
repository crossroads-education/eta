export default class HelperArray {
    /**
     * Removes elements from `arr` which return true when passed to `selector`.
     * @param arr Array to remove elements from
     * @param selector Returns true when the passed element should be removed
     * @return Number of elements removed
     */
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

    /**
     * Removes elements from `arr` whose indexes are contained in `indexes`.
     * @param arr Array to remove elements from
     * @param indexes Array of indexes to remove from `arr`
     */
    public static removeIndexes(arr: any[], indexes: number[]): void {
        // sort in descending order
        indexes = indexes.sort((a, b) => a === b ? 0 : (a > b ? -1 : 1));
        indexes.forEach(i => {
            arr.splice(i, 1);
        });
    }

    /**
     * Calls (and awaits) `worker` for each element in `arr`.
     * @deprecated You should consider using `for ... of` within an async method instead of this method.
     * @param arr Array to iterate over
     * @param worker Function to call on each element in `arr`
     * @param inOrder If true, wait for each element to be finished before moving on to the next.
     */
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

    /**
     * Returns unique values in `arr` whose keys are defined by the result of `uniqueIdGenerator`.
     * @param arr Array to find unique values in
     * @param uniqueIdGenerator Function to generate a unique key for elements in `arr`
     * @return Unique elements of `arr`
     */
    public static unique<T>(arr: T[], uniqueIdGenerator: (element: T) => string): T[] {
        const uniqueValues: {[key: string]: T} = {};
        arr.forEach(e => {
            const id: string = uniqueIdGenerator(e);
            uniqueValues[id] = e;
        });
        return Object.keys(uniqueValues).map(k => uniqueValues[k]);
    }

    /**
     * TODO: Write documentation
     */
    public static groupBy<T, K, V>(arr: T[], keySelector: (element: T) => K, valueSelector: (element: T) => V): Map<K, V[]> {
        return arr.reduce((map, element) => {
            const key: K = keySelector(element);
            const value: V = valueSelector(element);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(value);
            return map;
        }, new Map<K, V[]>());
    }
}
