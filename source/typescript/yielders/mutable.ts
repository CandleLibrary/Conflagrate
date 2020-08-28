import { Yielder } from "./yielder.js";
import { getChildContainerLength } from "../traversers/child_container_functions.js";

/**
 * Called when a child of a node is replaced. Allows the 
 * the node to be duplicated / transformed to keep the 
 * AST unique. 
 * 
 * #### Example:
 * 
 * ```javascript
 *  (node: T, child: T, child_index: number, children: T[]) => Object.assign({}, node);
 * ```
 * 
 * 
 */
export type MutableFunction<T> = (node: T, child: T, child_index: number, children: T[]) => T;

export class MutableYielder<T, K extends keyof T> extends Yielder<T, K> {

    protected node: T;
    protected stack_pointer: number;
    protected node_stack: T[];
    protected val_length_stack: number[];
    /**
     * The mutate function;
     */
    protected mutate_function?: MutableFunction<T>;

    protected modifyMeta(meta, val_length_stack, node_stack) {
        meta.mutate = this.mutate.bind(this);
        this.node_stack = node_stack;
        this.val_length_stack = val_length_stack;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {
        this.node = node;
        this.stack_pointer = stack_pointer;
        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }
    /**
     * Mutate the node tree by replacing the current node
     * with a new one.
     * @param replacement_node 
     */
    mutate(replacement_node: T) {

        const
            key: K = this.key,
            node_stack: T[] = this.node_stack,
            val_length_stack: number[] = this.val_length_stack;

        let sp = this.stack_pointer;

        //need to trace up the current stack and mutate each node with a duplicate
        let node = replacement_node;

        if (sp > 0) {
            let
                parent = node_stack[sp - 1];

            const
                len = val_length_stack[sp - 1],
                limit = len & 0xFFFF0000 >>> 16,
                index = (len & 0xFFFF) - 1,
                new_child_children_length = getChildContainerLength(node, key),
                children: T[] = <T[]><unknown>parent[key];

            parent = this.mutate_function(parent, node, index, children);

            if (new_child_children_length < limit)
                val_length_stack[sp] |= (new_child_children_length << 16);

            if (node == null) {
                val_length_stack[sp - 1] -= ((1 << 16) + 1);
                children.splice(index, 1);
                node_stack[sp] = children[index - 1];
            } else {
                children[index] = node;
                node_stack[sp] = node;
            }

            this.stack_pointer--;
        } else {
            node_stack[0] = node;
        }
    }
}


/**
 * Adds a mutate method to the node, allowing the node to be replaced with another node.
 * 
 * @param {MutableFunction} mutate_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function make_mutable<T, K extends keyof T>(mutate_function?: MutableFunction<T>): MutableYielder<T, K> {
    return Object.assign(<MutableYielder<T, K>>new MutableYielder<T, K>(),
        { mutate_function: mutate_function ? mutate_function : (node: T, child: T, child_index: number, children: T[]) => node }
    );
}


