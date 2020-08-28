/**
 * This is a either the raw node found within the tree
 * or a wrapped node with on several methods and 
 * properties introduced from Yielders.
 */
export type TraversedNode<T> = T & {
    /**
     * Call this method to force the traverser to skip
     * the traversal of the node's descendants.
     *
     * This method will be present if the node
     * is yielded from a traverser that has a `make_skippable`
     * Yielder attached to it.
     * 
     * @param {number} - If n is a number, skip to the nth descendent
     * instead of skipping all descendants.
     */
    skip?: (n?: number) => void;

    /**
     * Call this to replace the node with another node or to 
     * completely remove it from the tree.
     * 
     * This method will be present if the node
     * is yielded from a traverser that has a `make_replaceable`
     * Yielder attached to it.
     * 
     * @param {T} new_node - Can either be a new node to replace 
     * the current one with, or null to remove the node from 
     * the parent. 
     */
    replace?: (new_node?: T | null) => void;

    /**
     * Call this to replace the node with another node or to 
     * completely remove it from the tree.
     * 
     * This property will be present if the node 
     * is yielded from a traverser that has an `add_parent`
     * Yielder attached to it.
     */
    parent?: T;

};
