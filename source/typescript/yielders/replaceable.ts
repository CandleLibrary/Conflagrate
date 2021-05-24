import { Yielder } from "./yielder.js";
import { getChildContainerLength } from "../traversers/child_container_functions.js";
import { MetaRoot } from "../traversers/traverse.js";

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
export type ReplaceTreeFunction<T> = (node: T, child: T, child_index: number, children: T[], alertNewParent: () => void) => T;

/**
 * A function that is used in the replace yielder. Receives
 * the node that may be replace and the meta object.
 */
export type ReplaceFunction<T, K extends keyof T, B> = (node: T, meta?: MetaRoot<T, K> & B) => T;
export class ReplaceableYielder<T, K extends keyof T> extends Yielder<T, K> {

    protected node: T;
    protected stack_pointer: number;
    protected node_stack: T[];
    protected val_length_stack: number[];
    /**
     * The replace function;
     */
    protected replace_tree_function?: ReplaceTreeFunction<T>;

    protected modifyMeta(meta, val_length_stack, node_stack) {
        meta.replace = this.replace.bind(this);
        this.node_stack = node_stack;
        this.val_length_stack = val_length_stack;
    }

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {

        this.node = node;

        this.stack_pointer = stack_pointer;

        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }

    replace(
        replacement_node: T,
    ) {

        const
            key: K = this.key,
            node_stack: T[] = this.node_stack,
            val_length_stack: number[] = this.val_length_stack;

        let sp = this.stack_pointer;

        //need to trace up the current stack and replace each node with a duplicate
        if (sp > 1) {
            this.replaceNodes(node_stack, sp, val_length_stack, replacement_node, key);
        } else {
            node_stack[1] = replacement_node;
        }
    }

    protected replaceNodes(node_stack: T[], sp: number, val_length_stack: number[], node: T, key: K) {
        let
            parent = node_stack[sp - 1];

        const
            len = val_length_stack[sp - 1],
            limit = len & 0xFFFF0000 >>> 16,
            index = (len & 0xFFFF) - 1,
            new_child_children_length = getChildContainerLength(node, key),
            children: T[] = (<T[]><unknown>parent[key]).slice();

        let REPLACE_PARENT = false;

        parent = this.replace_tree_function(parent, node, index, children, () => REPLACE_PARENT = true);

        if (parent && !REPLACE_PARENT) {

            //If the parent is replaced then the stack pointer should be
            //reset to the parent's children nodes

            if (new_child_children_length < limit)
                val_length_stack[sp] = (new_child_children_length << 16) | (val_length_stack[sp] & 0xFFFF);

            if (node == null) {
                
                val_length_stack[sp - 1] -= ((1 << 16) + 1);

                children.splice(index, 1);

                node_stack[sp] = children[index - 1];
            } else {
                children[index] = node;
                node_stack[sp] = node;
            }

            (<T[]><unknown>parent[key]) = children;
        }

        this.stack_pointer--;

        this.replace(parent);
    }
}
export class ReplaceYielder<T, K extends keyof T, B> extends ReplaceableYielder<T, K> {
    /**
     * Called on every node that may be mutated. If a new node or null is 
     * returned, then then node is permanently replaced/removed
     */
    protected replace_function?: ReplaceFunction<T, K, B>;
    protected modifyMeta(meta, val_length_stack, node_stack) {
        this.node_stack = node_stack;
        this.val_length_stack = val_length_stack;
    }
    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {

        const new_node = this.replace_function(node);

        this.stack_pointer = stack_pointer;

        if (new_node == null || new_node && new_node !== node) {

            this.replace(new_node);

            if (new_node == null) return null;
        }

        this.stack_pointer = stack_pointer;

        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }
}

/**
 * Adds a replace method to the node, allowing the node to be replaced with another node.
 * 
 * @param {ReplaceTreeFunction} replace_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function make_replaceable<T, K extends keyof T>(replace_tree_function?: ReplaceTreeFunction<T>): ReplaceableYielder<T, K> {
    return Object.assign(<ReplaceableYielder<T, K>>new ReplaceableYielder<T, K>(),
        { replace_tree_function: replace_tree_function ? replace_tree_function : (node: T, child: T, child_index: number, children: T[]) => node ? Object.assign({}, node) : null }
    );
}
/**
 * Allows a non-destructive replacement of nodes through a replace function 
 * @param {ReplaceFunction} replace_tree_function - Function that may return a new node. If a new node or null is returned,
 * then the tree will be mutated with the new node, or the node will be removed if null is returned
 * 
 * @param {ReplaceTreeFunction} replace_tree_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function replace<T, K extends keyof T, B>(
    replace_function: ReplaceFunction<T, K, B>,
    replace_tree_function?: ReplaceTreeFunction<T>
): ReplaceYielder<T, K, B> {
    return Object.assign(<ReplaceYielder<T, K, B>>new ReplaceYielder<T, K, B>(),
        {
            replace_function: replace_function,
            replace_tree_function: replace_tree_function ? replace_tree_function : (node: T, child: T, child_index: number, children: T[]) => node
        }
    );
}

