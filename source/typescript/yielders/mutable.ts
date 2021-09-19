import { getChildContainerLength } from "../traversers/child_container_functions.js";
import { MetaRoot } from "../types/meta_root";
import { ReplaceableYielder, ReplaceFunction, ReplaceTreeFunction } from "./replaceable.js";

export type MutateFunction<T, K extends keyof T, B> = (node: T, meta?: MetaRoot<T, K> & B) => T;

export class MutableYielder<T, K extends keyof T> extends ReplaceableYielder<T, K> {

    protected modifyMeta(meta, val_length_stack, node_stack) {
        meta.mutate = this.replace.bind(this);
        this.node_stack = node_stack;
        this.val_length_stack = val_length_stack;
    }
    mutate(replacement_node: T, PROCESS_NEW_NODE: boolean = false) { this.replace(replacement_node, PROCESS_NEW_NODE); }


    protected replaceNodes(
        node_stack: T[],
        sp: number,
        val_length_stack: number[],
        replacement: T | T[],
        key: K,
        PROCESS_NEW_NODE: boolean = false
    ) {

        let
            parent = node_stack[sp - 1];

        const
            REPLACEMENT_IS_ARRAY = Array.isArray(replacement),
            REPLACEMENT_IS_NULL = null === replacement,
            len = val_length_stack[sp - 1],
            limit = len & 0xFFFF0000 >>> 16,
            index = (len & 0xFFFF) - 1,
            new_child_children_length = getChildContainerLength(REPLACEMENT_IS_ARRAY ? replacement[0] : replacement, key),
            children: T[] = <T[]><unknown>parent[key];

        parent = this.replace_tree_function(parent, replacement, index, children, () => false);

        if (new_child_children_length < limit)
            val_length_stack[sp] |= (new_child_children_length << 16) | (val_length_stack[sp] & 0xFFFF);


        if (replacement == null) {

            val_length_stack[sp - 1] -= (1 << 16);

            children.splice(index, 1);

            node_stack[sp] = children[index - 1];
        } else {
            if (REPLACEMENT_IS_ARRAY) {
                //@ts-ignore
                val_length_stack[sp - 1] += ((replacement.length - 1) << 16);
                //@ts-ignore
                children.splice(index, 1, ...replacement);
                node_stack[sp] = replacement[0];
            } else {
                //@ts-ignore 
                children[index] = replacement;
                //@ts-ignore 
                node_stack[sp] = replacement;
            }
        }

        if (REPLACEMENT_IS_NULL || PROCESS_NEW_NODE)
            val_length_stack[sp - 1] -= 1;

        this.stack_pointer--;
    }
}

export class MutateYielder<T, K extends keyof T, B> extends MutableYielder<T, K> {
    /**
     * Called on every node that may be mutated. If a new node or null is 
     * returned, then then node is permanently replaced/removed
     */
    protected mutate_function?: ReplaceFunction<T, K, B>;
    protected modifyMeta(meta, val_length_stack, node_stack) {
        this.node_stack = node_stack;
        this.val_length_stack = val_length_stack;
    }
    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {
        const new_node = this.mutate_function(node);

        this.stack_pointer = stack_pointer;

        if (new_node == null || new_node && new_node !== node) {


            this.replace(new_node, false);
            if (new_node == null) {
                return null;
            };

        }

        this.stack_pointer = stack_pointer;
        return this.yieldNext(new_node, stack_pointer, node_stack, val_length_stack, meta);
    }
}


/**
 * Adds a mutate method to the node, allowing the node to be replaced with another node.
 * 
 * @param {MutateTreeFunction} mutate_tree_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function make_mutable<T, K extends keyof T>(mutate_tree_function?: ReplaceTreeFunction<T>): MutableYielder<T, K> {
    return Object.assign(<MutableYielder<T, K>>new MutableYielder<T, K>(),
        { replace_tree_function: mutate_tree_function || <ReplaceTreeFunction<T>>((node: T, child: T, child_index: number, children: T[]) => node) }
    );
}

/**
 * Allows mutation of nodes through a mutate function 
 * @param {ReplaceFunction} mutate_tree_function - Function that may return a new node. If a new node or null is returned,
 * then the tree will be mutated with the new node, or the node will be removed if null is returned
 * 
 * @param {ReplaceTreeFunction} mutate_tree_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function mutate<T, K extends keyof T, B>(
    mutate_function: ReplaceFunction<T, K, B>,
    mutate_tree_function?: ReplaceTreeFunction<T>
): MutateYielder<T, K, B> {
    return Object.assign(<MutateYielder<T, K, B>>new MutateYielder<T, K, B>(), {
        mutate_function,
        replace_tree_function: mutate_tree_function || <ReplaceTreeFunction<T>>((node: T, child: T, child_index: number, children: T[]) => node)
    });
}


