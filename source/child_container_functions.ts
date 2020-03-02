

export function getChildContainerLength<T, K extends keyof T>(node: T, children_key: K): number {
    if (node && node[children_key] && Array.isArray(node[children_key])) {
        return (<T[]><unknown>node[children_key]).length;
    }
    return 0;
};


export function getChildContainer<T, K extends keyof T>(node: T, children_key: K): T[] {
    if (node && node[children_key] && Array.isArray(node[children_key])) {
        return (<T[]><unknown>node[children_key]);
    }
    return [];
};
