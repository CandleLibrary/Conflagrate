import { Yielder } from "./yielder.js";

export class bitFilterYielder<T, K extends keyof T> extends Yielder<T, K> {
    bit_filter_key: string;
    bit_mask: number;

    modifyMeta(meta, val_length_stack, node_stack) {
        meta.bit_filter = this.bit_filter_key;
        meta.bit_mask = this.bit_mask;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {

        const node_bitfield = parseInt(node[this.bit_filter_key]);

        if ((this.bit_mask & node_bitfield) !== 0)
            return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);

        return null;
    }

}
/**
 * Yields nodes whose property indexed by `key` returns a non-zero value when 
 * bitwise AND [ & ] with the list of arguments combined through a bitwise OR [ | ]
 * operation.
 * 
 * @param key - A property name on the node that should be tested for a match.
 * @param {number} bit_mask  - A number
 */
export function bit_filter<T, K extends keyof T, D extends keyof T>(key: D, ...bit_mask: number[]): bitFilterYielder<T, K> {

    return Object.assign(new bitFilterYielder<T, K>(), {
        bit_filter_key: key,
        bit_mask: bit_mask.reduce((r, b) => b | r, 0)
    });
}