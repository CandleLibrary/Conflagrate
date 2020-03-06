import { Yielder } from "./yielder.js";

/**
 * Adds a skip method to the node, which, when called, causes the traverser to skip the node's children
 */
export function make_skippable<T, K extends keyof T>(): Yielder<T, K> {

    const obj: Yielder<T, K> = Object.assign(new Yielder<T, K>(), {});

    obj.yield = skipYield;

    return obj;
}

function skipYield<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T & { skip: () => void; } | null {

    const skippable = Object.assign({
        skip: (n: number = 0xFFFF) => skip<T>(stack_pointer, val_length_stack, n)
    }, node);

    return this.yieldNext(skippable, stack_pointer, node_stack, val_length_stack);
}

function skip<T>(
    stack_pointer: number,
    val_length_stack: number[],
    n: number
) {
    val_length_stack[stack_pointer] =
        (val_length_stack[stack_pointer] & 0xFFFF0000) | n;
}


