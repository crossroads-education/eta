export default class HelperNumber {
    /**
     * Returns a random integer between min and max.
     * If exclusive is true, the result will never be max.
     * Borrowed (with modifications) from https://mzl.la/2qChqI1
     */
    public static getRandomInt(min: number, max: number, exclusive = false): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + (exclusive ? 0 : 1))) + min;
    }
}
