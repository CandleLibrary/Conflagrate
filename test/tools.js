export function createTestTree(max_children = 3, node_count = { num: 0 }, types = [], bit_types = [], max_depth = 3) {

    const r = Math.random, rn = Math.round;

    const
        children_count = max_depth > 0 ? Math.max(rn(r() * max_children - 1), 1) : 0,
        types_index = Math.max(rn((r() * types.length) - 1), 0),
        bit_types_index = Math.max(rn((r() * bit_types.length) - 1), 0);

    node_count.num++;

    return {

        bit_type: bit_types[bit_types_index],

        type: types[types_index],

        children: Array(children_count).fill(
            null
        ).map(() => createTestTree(
            max_children,
            node_count,
            types,
            bit_types,
            max_depth - 1
        ))
    };
}