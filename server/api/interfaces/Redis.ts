export default interface Redis {
    <T>(method: string, ...args: any[]): T;
}
