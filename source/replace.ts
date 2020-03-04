import { Yielder } from "./yielder.js";
/**
 * A function that is used in the replace yielder. Receives
 * the node to be replaced, a reference to the parent node, and
 * the index of the nodes location within the parent node's subnode
 * container {K}
 */
export type ReplaceFunction<T, K extends keyof T> = (node: T, parent: T, index: number) => any;

/**
 * Applies a replace method to every node, providing a way to transform the entire tree.
 */
export function replace<T, K extends keyof T>(replace_function: ReplaceFunction<T, K>): Yielder<T, K> {

    const obj: Yielder<T, K> = Object.assign(new Yielder<T, K>(), { replace_function });

    obj.yield = replacerYield;

    return obj;
}

function replacerYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T & { skip: () => void; } | null {
    console.log("!!!!!!!!!!!!!!");
    const
        parent = node_stack[stack_pointer - 1] || null,
        index = val_length_stack[stack_pointer - 1] & 0xFFFF,
        new_node = this.replace_function(node, parent, index);

    if (new_node) {

        node_stack[stack_pointer] = new_node;

        if (!node[this.key])
            val_length_stack[stack_pointer] = 0;

    } else {

        val_length_stack[stack_pointer] = 0;

        return null;
    }

    return this.yieldNext(new_node, stack_pointer, node_stack, val_length_stack);
}


