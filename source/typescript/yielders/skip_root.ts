import { Yielder } from "./yielder.js";


export class SkipRootYielder<T, K extends keyof T> extends Yielder<T, K> {

    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta) {
        if (stack_pointer <= 1)
            return null;

        return this.yieldNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }

}

/**
 * Skips the yielding of the root node.
 */
export function skip_root<T, K extends keyof T>(): SkipRootYielder<T, K> {
    return new SkipRootYielder<T, K>();
}