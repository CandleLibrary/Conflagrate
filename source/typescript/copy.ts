import { Lexer } from "@candlelib/wind";
/**
 * Copies compatible node tree.
 * @param node - Any node in an acyclic AST tree compatible with cfw.conflagrate
 * @returns A deep copy of the node.
 */
export function copy<T>(node: T): T {
    if (!node) return null;

    let clone = node;

    if (typeof node == "object") {

        if (Array.isArray(node))
            return <T><unknown>node.map(copy);

        clone = Object.assign({}, node);

        for (const name in clone) {

            let val = clone[name];

            if (typeof val == "object") {
                if (val instanceof Lexer)
                    (<Lexer><unknown>clone[name]) = val.copy();
                else if (Array.isArray(val))
                    (<Array<T>><unknown>clone[name]) = val.map(copy);
                else if (val !== null)
                    (<unknown>clone[name]) = copy(val);
            }
        }
    }

    return clone;
}