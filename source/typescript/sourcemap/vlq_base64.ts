
const
    base64Map = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="),
    base64LU = new Map(base64Map.map((v, i) => [v, i]));
//*
export function encodeVLQBase64(number) {

    let sign = 0;

    if (number < 0) {
        number = -number;
        sign = 1;
    }

    const segments = Array(6)
        .fill(0, 0, 6)
        .map((r, i) => (number >> (i * 5 - 1)) & 0x1F);

    segments[0] = ((number & 0xF) << 1) | sign;

    const
        m_s =
            segments
                .reduce((r, s, i) => (s & 0x3F) ? i : r, 0),
        base64 =
            segments
                .map((s, i) => i < m_s ? 0x20 | s : s)
                .slice(0, m_s + 1)
                .map(e => base64Map[e])
                .join("");

    return base64;
}

export function decodeVLQBase64(string: string) {
    const $ = base64LU, segments = Array.from(string), ls = segments[0], sign = 1 - (($.get(ls) & 1) << 1);
    return segments
        .slice(1)
        .reduce((r, s, i) => r | (($.get(s) & 0x1F) << ((i * 5) + 4)), ($.get(ls) & 0x1F) >> 1) * sign;
}

export function decodeVLQBase64Array(string): number[] {
    const
        array = Array.from(string).map(e => base64LU.get(<string>e)),
        out_array = [];

    let start = 0;

    for (let i = 0; i < array.length; i++) {

        if (!(array[i] & 0x20)) {
            const VLQ = array.slice(start, i + 1),
                ls = VLQ[0],
                sign = 1 - ((ls & 1) << 1),
                val = VLQ
                    .slice(1)
                    .reduce((r, s, i) => r | ((s & 0x1F) << ((i * 5) + 4)), (ls & 0x1F) >> 1) * sign;

            out_array.push(val);

            start = i + 1;
        }
    }
    return out_array;
}
//*/---------------------------------
