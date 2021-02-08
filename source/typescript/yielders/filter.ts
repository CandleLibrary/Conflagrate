import { Yielder } from "./yielder.js";

export class FilterYielder<T, K extends keyof T> extends Yielder<T, K> {
    filter_key: string;
    types: Set<any>;

    modifyMeta(meta, val_length_stack, node_stack) {
        meta.filter_key = this.filter_key;
        meta.type = this.types;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {
        const type = node[this.filter_key];

        if (this.types.has(type))
            return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);

        return null;
    }

}

type Types<T, K extends keyof T> = T[K];

type FilteredNode<T, G extends T, K extends keyof T, R> = G

/**
 * Filters nodes and yields only those whose property `key` matches one of the values in `types`
 * 
 * @param key - A property name on the node that should be tested for a match.
 * @param types  - A list of possible values that we want property `key` to be.
 */
export function filter<T, K extends keyof T, D extends keyof T>(key: D, ...types: Types<T, K>[]): FilterYielder<T, K> {

    const obj = Object.assign(new FilterYielder<T, K>(), {
        filter_key: key,
        types: new Set(types)
    });

    return obj;
};

