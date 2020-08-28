import { Yielder } from "./yielder.js";

export class ExtractYielder<T, K extends keyof T> extends Yielder<T, K> {
    protected receiver: { ast?: T | null; };

    complete(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[], meta): T | null {

        this.receiver.ast = node;

        return this.completeNext(node, stack_pointer, node_stack, val_length_stack, meta);
    }

}
/**
 * Extracts root node from a traversed AST. If the node has been replaced, then its replacement is
 * extracted.
 *  
 * @param receiver - An object with a property [ast] that will be assigned to the root node.
 */
export function extract<T, K extends keyof T>(receiver: { ast?: T | null; }): ExtractYielder<T, K> {

    if (!receiver || typeof receiver !== "object")
        throw new TypeError("Expected argument receiver to be of type [Object] when calling function extract.");

    return Object.assign(new ExtractYielder<T, K>(), { receiver });
}