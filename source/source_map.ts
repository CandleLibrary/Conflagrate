//@ts-nocheck for now

import { Lexer } from "@candlefw/whind";
import URL from "@candlefw/url";

export type SourceMap = {
    /**
     * Version of the SourceMap format. This mapping system implements
     * version 3
     * 
     * https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#
     */
    version: number;
    /**
     * Name of the generated file. 
     */
    file?: string;
    /**
     * Source root.
     */
    sourceRoot?: string;
    /**
     * An array of original source file names / URIs. 
     */
    sources: Map<string, number>;
    /**
     * An array of the original source file contents. 
     */
    sourceContent?: Array<null | string>;
    /**
     * 
     */
    names?: Array<string>;
    /**
     * The source to generated mappings. 
     * 
     * Each line of the generated content mapped to a semicolon [ ; ], except for the first line.
     * 
     * Each segment is divided by a comma [ , ], where each segment is a type Segment converted to a Base64 VLQ field.
     */
    mappings: Array<Line>;

    meta: any;
};

type Line = {
    /**
     * The line number, 0 index based. 
     */
    index: number;
    /**
     * List of source mapping segments.
     */
    segments: Array<Segment>;
};


type Segment = {
    column: number,
    /**
     * Index number to entry SourceMap.sources, relative to previous source index. 
     */
    source?: number,
    /**
     * Original Line, relative to previous original line. Present if Segment.source is present.
     */
    original_line?: number,
    /**
     * Original column, relative to previous original column. Present if Segment.source is present.
     */
    original_column?: number,
    /**
     * Index number into SourceMap.names, relative to previous original name.
     */
    original_name?: number,
};

const
    base64Map = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),
    base64LU = new Map(base64Map.map((v, i) => [v, i]));

export function encodeVLQBase64(number) {
    //divide into 5 bit segments
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
        m_s = segments
            .reduce((r, s, i) => (s & 0x3F) ? i : r, 0),

        base64 = segments
            .map((s, i) => i < m_s ? 0x20 | s : s)
            .slice(0, m_s + 1)
            .map(e => base64Map[e])
            .join("");

    return base64;
};



export function createSourceMap(): SourceMap {
    return {
        version: 3,
        file: "",
        names: [],
        sourceContent: [],
        sourceRoot: "",
        sources: new Map,
        mappings: [],
        meta: {
            current_offset: 0,
            original_column: 0,
            original_line: 0,
            current_source: 0,
            original_source: 0
        }
    };
}
export function createSourceMapEntry(
    current_line,
    current_column,
    original_line,
    original_column,
    original_file_name,
    original_name,
    source_map?: SourceMap
): SourceMap {

    if (!source_map)
        source_map = createSourceMap();

    let last_line = source_map.mappings[source_map.mappings.length - 1];

    if (!last_line) {
        last_line = {
            index: 0,
            segments: []
        };

        source_map.mappings.push(last_line);
    }

    while (current_line > last_line.index) {

        last_line = {
            index: last_line.index + 1,
            segments: []
        };
        source_map.mappings.push(last_line);
    }

    let segment = <Segment>{};

    segment.column = current_column;

    let source_index = -1;

    if (original_file_name) {
        if (source_map.sources.has(original_file_name))
            source_index = source_map.sources.get(original_file_name);
        else {
            source_index = source_map.sources.size;
            source_map.sources.set(original_file_name, source_map.sources.size);
        }
    }

    if (source_index > -1) {
        segment.column = current_column;
        segment.source = source_index;
        segment.original_line = original_line;
        segment.original_column = original_column;
    }

    last_line.segments.push(<Segment>segment);

    return source_map;
};

export function createSourceMapJSON(map: SourceMap, ...content: string[]) {

    let
        source = 0,
        original_line = 0,
        original_column = 0,
        original_name = 0;

    const output = {
        version: map.version,
        file: map.file || "",
        sourceRoot: map.sourceRoot,
        sources: Array.from(map.sources.keys()),
        sourceContent: (map.sourceContent.length > 0) ? map.sourceContent : content,
        names: map.names,
        mappings: map.mappings.map(line => {

            let column = 0;

            return line.segments.map((seg, i) => {

                const segment_string_array = [];

                const column_diff = seg.column - column;
                column = seg.column;
                segment_string_array.push(encodeVLQBase64(column_diff));

                if (seg.source !== undefined) {

                    const source_diff = seg.source - source;
                    source = seg.source;
                    segment_string_array.push(encodeVLQBase64(source_diff));

                    const line_diff = seg.original_line - original_line;
                    original_line = seg.original_line;
                    segment_string_array.push(encodeVLQBase64(line_diff));

                    const original_column_diff = seg.original_column - original_column;
                    original_column = seg.original_column;
                    segment_string_array.push(encodeVLQBase64(original_column_diff));

                    if (seg.original_name) {
                        const original_name_diff = seg.original_column - original_name;
                        original_name = seg.original_column;
                        segment_string_array.push(encodeVLQBase64(original_name_diff));
                    }
                }
                return segment_string_array.join("");

            }).join(",");
        }).join(";")
    };

    return JSON.stringify(output);
}

export function readSourceMapJSON(string: string) {

}


export function decodeVLQBase64(string: string) {

    const
        $ = base64LU,
        segments = Array.from(string),
        ls = segments[0],
        sign = 1 - (($.get(ls) & 1) << 1);

    return segments
        .slice(1)
        .reduce((r, s, i) => r | (($.get(s) & 0x1F) << ((i * 5) + 4)), ($.get(ls) & 0x1F) >> 1) * sign;
}

function decodeVLQBase64Array(string): any {
    const
        array = Array.from(string).map(e => base64LU.get(<string>e)),
        out_array = [];

    let start = 0;

    for (let i = 0; i < array.length; i++) {
        if (!(array[i] & 0x20)) {

            const
                VLQ = array.slice(start, i + 1),
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
export function getPositionLexerFromJsonSourceMap(line: number, column: number, source: string | SourceMap): Lexer {


    if (typeof source == "string")
        source = <object>JSON.parse(<string>source);

    let
        name_diff = 0,
        ori_col_diff = 0,
        line_diff = 0,
        source_diff = 0;

    const mappings = source.mappings.split(";").map(line => {

        let col_diff = 0;

        return <Line>{
            segments: line.split(",").map(segment => {

                const
                    [column, source, original_line, original_column, original_name] = decodeVLQBase64Array(segment),
                    c = (col_diff += (column || 0)),
                    s = (source_diff += (source || 0)),
                    ol = (line_diff += (original_line || 0)),
                    oc = (ori_col_diff += (original_column || 0)),
                    on = (name_diff += (original_name || 0));

                return <Segment>{
                    column: c,
                    source: s,
                    original_line: ol,
                    original_column: oc,
                    original_name: on,
                };
            })
        };
    });

    const segments = mappings[line - 1].segments;

    let
        prev_col = segments[0].column,
        seg = null;

    for (let i = 1; i < segments.length; i++) {

        let curr_col = segments[i].column;

        if (column >= prev_col && column <= curr_col) {
            seg = segments[i - 1];
            break;
        }

        seg = segments[i];
    }

    let content = source.sourceContent[seg.source];

    const lex = new Lexer(content);

    // lex.CHARACTERS_ONLY = true;

    while (!lex.END) {
        if (lex.line == seg.original_line && lex.char >= seg.original_column) break;
        lex.next();
    }

    return lex;
};
