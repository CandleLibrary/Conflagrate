import { Yielder } from "./yielder.js";

/**
 * Adds access to the node's immediate ancestor through the `parent` property
 */
export function add_parent<T, K extends keyof T>(): Yielder<T, K> {

    const obj: Yielder<T, K> = Object.assign(new Yielder<T, K>(), {
        yield: addParentYield
    });

    return obj;
}

function addParentYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T & { skip: () => void; } | null {

    meta.parent = stack_pointer > 0 ? node_stack[stack_pointer - 1] : null;

    return this.yieldNext(node, stack_pointer, node_stack, val_length_stack);
}