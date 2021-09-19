import { MetaRoot } from "../types/meta_root";
import { Yielder } from "./yielder.js";

export type FilterFunction<T, K, R extends T, B> = (node: T, meta: B & MetaRoot<T, K>) => node is R;

export class FilterFunctionYielder<T, K extends keyof T, R extends T, B> extends Yielder<T, K> {
    filter_function: FilterFunction<T, K, R, B>;
    filter_key: string;

    modifyMeta(meta, val_length_stack, node_stack) {
        meta.filter_key = this.filter_key;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {

        if (this.filter_function(node, meta))
            return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);

        return null;
    }

}
/**
 * Use a predicate function to filter nodes. The function receives both the candidate
 * node and the meta object
 * 
 * @param key - A property name on the node that should be tested for a match.
 * @param types  - A list of possible values that we want property `key` to be.
 */
export function filterWithFunction<T, K extends keyof T, R extends T, B>(fn: FilterFunction<T, K, R, B>): FilterFunctionYielder<T, K, R, B> {
    return Object.assign(new FilterFunctionYielder<T, K, R, B>(), { filter_function: fn });
}

