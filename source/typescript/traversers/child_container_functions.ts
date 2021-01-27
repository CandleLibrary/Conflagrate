

export function getChildContainerLength<T, K extends keyof T>(node: T, children_key: K): number {
    if (node) {
        const obj = node[children_key];

        if (Array.isArray(obj)) {
            return obj.length;
        } else if (obj instanceof Map || obj instanceof Set) {
            return obj.size;
        }
    }

    return 0;
};


export function getChildContainer<T, K extends keyof T>(node: T, children_key: K): T[] {
    if (node) {
        const obj = node[children_key];
        if (Array.isArray(obj)) {
            return (<T[]>obj);
        } else if (obj instanceof Map || obj instanceof Set) {
            return (<T[]>(Array.from(obj.values())));
        }
    }
    return [];
};
