import { Yielder } from "../yielders/yielder.js";
import { TraversedNode } from "../types/traversed_node.js";
import { Traverser } from "./Traverser.js";

export interface MetaRoot<T, K> {
    key: K;
    index: number,
    parent: T,
    prev: T,
    next: T,
    depth: number;
}

/**
 * This traverses a tree and yields nodes depth first. Uses Yielders 
 * to perform non-destructive transforms on the AST.
 * @param node - The root node of the AST tree.
 * @param children_key - The property of a node that contains its immediate descendants.
 * @param max_depth - The maximum level of the tree to return nodes from, starting at 1 level for the root node.
 */
export function traverse<T, K extends keyof T>(node: T, children_key: K, max_depth: number = Infinity) {

    let yielder: Yielder<TraversedNode<T>, K> = null;

    max_depth = Math.max(0, Math.min(100000, max_depth - 1));

    return new Traverser<T, K, MetaRoot<T, K>>(node, children_key, { depth: 0, key: children_key, index: 0, parent: null }, max_depth);
}

