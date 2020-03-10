import { Yielder } from "./yielder.js";

export class filterYielder<T, K extends keyof T> extends Yielder<T, K> {
    filter_key: string;
    bit_mask: number;

}
/**
 * Yields nodes whose property `K` returns a non-zero value when bitwise & with the list of arguments reduced to a bitwise mask.
 * 
 * @param key - A property name on the node that should be tested for a match.
 * @param {number} bit_mask  - A number
 */
export function bit_filter<T, K extends keyof T, D extends keyof T>(key: D, ...bit_mask: number[]): Yielder<T, K> {

    const obj = Object.assign(new filterYielder<T, K>(), {
        filter_key: key,
        bit_mask: bit_mask.reduce((r, b) => b | r, 0)
    });

    obj.yield = bitFilterYield;

    return obj;
}

function bitFilterYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {

    const node_bitfield = parseInt(node[this.filter_key]);

    if ((this.bit_mask & node_bitfield) !== 0)
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack);

    return null;
}