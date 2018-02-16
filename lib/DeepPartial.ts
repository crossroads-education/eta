// TypeORM doesn't export this type, but fortunately it's simple
type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>;
};

export default DeepPartial;
