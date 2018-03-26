export default function(route: string): ClassDecorator {
    return Reflect.metadata("route", route);
}
