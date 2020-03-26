import { Yielder } from "../yielders/yielder.js";

/**
 * A function that is used in the replace yielder. Receives
 * the node to be replaced, a reference to the parent node, and
 * the index of the node's location within the parent node's 
 * descendent container.
 */
export type ReplaceFunction<T> = (node: T, parent: T, index: number) => any;

export class ReplaceYielder<T, K extends keyof T> extends Yielder<T, K> {
    replace_function: ReplaceFunction<T>;
    filter_types: Set<any>;

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {

        meta.replace_function = this.replace_function;

        const
            parent = node_stack[stack_pointer - 1] || null,
            index = (val_length_stack[stack_pointer - 1] & 0xFFFF) - 1,
            new_node = this.replace_function(node, parent, index);

        if (new_node) {

            node_stack[stack_pointer] = new_node;

            if (!new_node[this.key]) {
                val_length_stack[stack_pointer] = 0;
            }

        } else {

            val_length_stack[stack_pointer]--;

            return null;
        }

        return this.yieldNext(new_node, stack_pointer, node_stack, val_length_stack, meta);
    }

}

/**
 * Applies a replace method to every node, providing a way to transform the entire tree.
 */
export function replace<T, K extends keyof T>(replace_function: ReplaceFunction<T>): ReplaceYielder<T, K> {
    return Object.assign(new ReplaceYielder<T, K>(), { replace_function });
}


