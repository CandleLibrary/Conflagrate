

export function getProperty<T, K extends keyof T>(node: T, keys: K[]) {
    for (const key of keys) {
        const obj = node[key];
        if (obj) return key;
    }
    return null;
}

export function getChildContainerLength<T, K extends keyof T>(node: T, children_key: K): number {
    if (node) {

        const obj = <T | T[]><any>node[children_key];

        if (obj !== null && obj !== undefined) {
            if (Array.isArray(obj)) {
                return obj.length;
            } else if (obj instanceof Map || obj instanceof Set) {
                return obj.size;
            } else {
                return 1;
            }
        }
    }

    return 0;
};


export function getChildContainer<T, K extends keyof T>(node: T, children_key: K, mock: T[]): T[] {
    if (node) {
        const obj = <T | T[]>node[children_key];
        if (obj !== null && obj !== undefined) {
            if (Array.isArray(obj)) {
                return (<T[]>obj);
            } else if (obj instanceof Map || obj instanceof Set) {
                return (<T[]>(Array.from(obj.values())));
            } else {
                mock[0] = obj;
                return mock;
            }
        }
    }
    return [];
};

export function getChildAtIndex<T, K extends keyof T>(node: T, children_key: K, index: number = 0): T {
    if (node && index >= 0) {
        const obj = <T | T[]><any>node[children_key];
        if (obj !== null && obj !== undefined) {
            if (Array.isArray(obj)) {
                return (<T>obj[index]);
            } else if (obj instanceof Map || obj instanceof Set) {
                let i = 0;
                for (const target of obj.values())
                    if (i++ == index) return target;
            } else {
                return obj;
            }
        }
    }
    return null;
};
