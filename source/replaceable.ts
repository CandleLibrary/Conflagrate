import { Yielder } from "./yielder.js";
import { getChildContainer, getChildContainerLength } from "./child_container_functions.js";

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
type replaceFunctionType<T> = (node: T, child: T, child_index: number, children: T[]) => T;

export interface replaceYielder<T, K extends keyof T> extends Yielder<T, K> {
    replace_function?: replaceFunctionType<T>;
}


/**
 * Adds a replace method to the node, allowing the node to be replaced with another node.
 * 
 * @param {replaceFunctionType} replace_function - A function used to handle the replacement
 * of ancestor nodes when a child node is replaced. Defaults to performing a shallow copy for 
 * each ancestor of the replaced node.
 */
export function make_replaceable<T, K extends keyof T>(replace_function?: replaceFunctionType<T>) {

    const obj: replaceYielder<T, K> = Object.assign(new Yielder<T, K>(), {});

    obj.replace_function = replace_function ? replace_function : (node: T, child: T, child_index: number, children: T[]) => Object.assign({}, node);

    obj.yield = replaceYield;

    return obj;
}

function replaceYield<T, K extends keyof T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {

    const replaceable = Object.assign({
        index: (val_length_stack[stack_pointer - 1] & 0xFFFF) - 1,
        replace: (node: T) => replace<T, K>(this, node, stack_pointer, node_stack, val_length_stack)
    }, node);

    return this.yieldNext(replaceable, stack_pointer, node_stack, val_length_stack);
}

function replace<T, K extends keyof T>(
    replaceYielder: replaceYielder<T, K>,
    replacement_node: T,
    stack_pointer: number,
    node_stack: T[],
    val_length_stack: number[]
) {

    const key = replaceYielder.key;

    let sp = stack_pointer;

    //need to trace up the current stack and replace each node with a duplicate
    let node = replacement_node;

    while (sp >= 0) {

        const
            len = val_length_stack[sp],
            limit = len & 0xFFFF0000 >>> 16,
            index = len & 0xFFFF,
            new_child_children_length = getChildContainerLength(node, key);

        if (new_child_children_length < limit)
            val_length_stack[sp] |= (new_child_children_length << 16);

        if (node == null)
            val_length_stack[sp]--;

        node_stack[sp] = node;

        if (--sp > -1) {

            const
                parent = node_stack[sp],
                children: T[] = (<T[]><unknown>parent[replaceYielder.key]).slice();

            children[(val_length_stack[sp] & 0xFFFF) - 1] = node;

            node = replaceYielder.replace_function(parent, node, (val_length_stack[sp] & 0xFFFF) - 1, children);

            (<T[]><unknown>node[replaceYielder.key]) = children;
        }
    }
}


