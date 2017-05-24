export default class HelperString {
    public static toCamelCase(str: string): string {
        return str[0].toLowerCase() + str.substring(1);
    }
}
