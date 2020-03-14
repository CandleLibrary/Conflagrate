import { Yielder } from "./yielder.js";
/**
 * Skips the yielding of the root node.
 */
export function skip_root<T, K extends keyof T, D extends keyof T>(): Yielder<T, K> {
    return Object.assign(new Yielder<T, K>(), { yield: skipRootYielder });
}

function skipRootYielder<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {
    if (stack_pointer == 0)
        return null;
    return node;
}