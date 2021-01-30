import { Yielder } from "./yielder.js";
import { ReplaceFunction } from "./replaceable.js";

export class ImpersonateYielder<T, K extends keyof T, B> extends Yielder<T, K> {
    replace_function: ReplaceFunction<T, K, B>;
    protected yield(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {

        const
            new_node = this.replace_function(node, meta);

        if (new_node) {

            node_stack[stack_pointer] = new_node;

            if (!new_node[this.key]) {
                val_length_stack[stack_pointer] = 0;
            }

        } else {

            val_length_stack[stack_pointer]--;

            return null;
        }

        return this.yieldNext(new_node, stack_pointer, node_stack, val_length_stack, meta);
    }

}

/**
 * Allows another node to appear in the traversal in place of expected node in the tree. 
 */
export function impersonate<T, K extends keyof T, B>(replace_function: ReplaceFunction<T, K, B>): ImpersonateYielder<T, K, B> {
    return Object.assign(new ImpersonateYielder<T, K, B>(), { replace_function });
}


