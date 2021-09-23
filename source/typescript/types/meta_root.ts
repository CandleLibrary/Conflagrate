
export interface MetaRoot<T, K> {
    key: K;
    index: number;
    parent: T;
    prev: T;
    next: T;
    depth: number;
}
