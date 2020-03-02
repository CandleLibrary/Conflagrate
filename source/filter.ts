import { Yielder } from "./yielder.js";

export class filterYielder<T, K extends keyof T> extends Yielder<T, K> {
    filter_key: string;
    types: Set<string>;

}
/**
 * Filters nodes and yields only those whose property {key} matches one of the values {types}
 * 
 * @param key - A property name on the node that should be tested for a match.
 * @param types  - A list of possible values that we want property {key} to be.
 */
export function filter<T, K extends keyof T, D extends keyof T>(key: D, ...types: string[]): Yielder<T, K> {

    const obj = Object.assign(new filterYielder<T, K>(), {
        filter_key: key,
        types: new Set(types)
    });

    obj.yield = filterYield;

    return obj;
}

function filterYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {

    const type = node[this.filter_key] + "";

    if (this.types.has(type))
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack);

    return null;
}