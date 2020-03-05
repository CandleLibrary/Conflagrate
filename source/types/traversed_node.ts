/**
 * This is a either the raw node found within the tree
 * or a wrapped node with on several methods and 
 * properties introduced from Yielders.
 */
export type TraversedNode<T> = T & {
    /**
     * Call this method to force the traverser to skip
     * the traversal of the node's descendents.
     *
     * This method will be present on the node if the node
     * is yielded from a traverser that has a `make_skippable`
     * Yielder attached to it.
     */
    skip?: () => void;

    /**
     * Call this to replace the node with another node or to 
     * completely remove it from the tree.
     * 
     * This method will be present on the node if the node
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
     * This property will be present on the node if the node
     * is yielded from a traverser that has a `add_parent`
     * Yielder attached to it.
     */
    parent? : T;

};
