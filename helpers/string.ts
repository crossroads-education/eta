export default class HelperString {
    public static toCamelCase(str: string): string {
        if (str.length < 2) {
            return !!str ? str.toLowerCase() : str;
        }
        return str[0].toLowerCase() + str.substring(1);
    }
}
