import { Yielder } from "./yielder.js";

export interface extractorYielder<T, K extends keyof T> extends Yielder<T, K> {
    receiver: { ast?: T | null; };

}
/**
 * Extracts root node from a traversed AST. If the node has been replaced, then it's replacement is
 * extracted.
 *  
 * @param receiver - An object with a property [ast] that will be assigned to the root node.
 */
export function extract<T, K extends keyof T>(receiver: { ast?: T | null; }): extractorYielder<T, K> {

    if (!receiver || typeof receiver !== "object")
        throw new TypeError("Expected argument receiver to be of type [Object] when calling function extract.");

    const obj: extractorYielder<T, K> = Object.assign(new Yielder<T, K>(), {
        receiver
    });

    obj.complete = extractorComplete;

    return obj;
}

function extractorComplete<T>(node: T, stack_pointer: number, node_stack: T[], val_length_stack: number[]): T | null {

    this.receiver.ast = node;

    return this.completeNext(node, stack_pointer, node_stack, val_length_stack);
}