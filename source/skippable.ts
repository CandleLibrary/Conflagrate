import { Yielder } from "./yielder.js";

/**
 * Adds a skip method to the node, allowing traversal of the node's children to be skipped.
 */
export function make_skippable<T, K extends keyof T>() {

    const obj: Yielder<T, K> = Object.assign(new Yielder<T, K>(), {});

    obj.yield = skipYield;

    return obj;
}

function skipYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {

    const skippable = Object.assign({
        skip: () => skip<T>(stack_pointer, val_length_stack)
    }, node);

    return this.yieldNext(skippable, stack_pointer, node_stack, val_length_stack);
}

function skip<T>(
    stack_pointer: number,
    val_length_stack: number[]
) {
    val_length_stack[stack_pointer] = 0;
}


