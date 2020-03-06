import { Yielder } from "../yielder.js";

export type ASTIterator<T, K extends keyof T> = Iterable<T> & {
    /**
     * Adds a Yielder to the end of the yield chain.
     *
     * @param next_yielder A Node Yielder
     */
    then: (arg0: Yielder<T, K>) => ASTIterator<T, K>;
    /**
     * Iterate through the Iterator
     */
    run: () => void;
};
