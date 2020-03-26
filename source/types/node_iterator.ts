import { Yielder } from "../yielders/yielder.js";
import { TraversedNode } from "./traversed_node.js";
import { A } from "@candlefw/wind/build/types/ascii_code_points";

export interface TraverserOutput<T, B> {
    node: T;
    meta: B;
};

export type CombinedYielded<A, B> = A & B;

export interface ASTIterator<T, K extends keyof T, B> {

    [Symbol.iterator](): { next(): { done?: boolean, value: TraverserOutput<T, B>; }; };
    /**
     * Iterate through the Iterator
     */
    run: () => void;

    then(arg0: Yielder<T, K>): ASTIterator<T, K, CombinedYielded<Yielder<T, K>, B>>;
};