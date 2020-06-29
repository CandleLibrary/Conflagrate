import URL from "@candlefw/url";
import { Lexer } from "@candlefw/wind";
import { encodeVLQBase64, decodeVLQBase64Array } from "./vlq_base64.js";
import { SourceMap, Segment, Line } from "../types/source_map.js";

/**
 * Extract segment tuples from array;
 */
function* chunk(array):
    Generator<[number, number, number, number, number]> {
    for (let i = 0; i < array.length; i += 5)
        yield array.slice(i, i + 5);
}
/**
 * Creates source map data from a two dimensional number array, where the first
 * dimension is a set of arrays that comprise lines and the second 
 * dimension is a series of numbers parsed into a five component tuples comprising:
 * 
 * `[ column_offset, source_index, original_line, original_column, original_name_index ]`.
 * 
 * Segment data is generated for each tuple, with the column_offset increasing relative to 
 * the previous tuple.
 * 
 * 
 * @param Array 
 * @param 
 * @param number 
 * @param param3 
 */
export function createSourceMap(
    mapping_arrays: Array<number[]>,
    file: string = "",
    root_dir: string = "",
    sources: string[] = null,
    names: string[] = null,
    content: string[] = null
): SourceMap {

    const source_map: SourceMap = <SourceMap>{
        version: 3,
        file: file || "",
        sourceRoot: root_dir || "",
        names: names || [],
        sourceContent: content || [],
        sources: sources || [],
        mappings: []
    };

    let i = 0;

    for (const line of mapping_arrays) {

        const map_line = <Line>{ segments: [], index: i++ };

        let col_offset = 0;

        for (const [col, source, o_line, o_col, o_name] of chunk(line)) {
            map_line.segments.push(createSourceMapSegment(col_offset, source, o_line, o_col, o_name));
            col_offset += col;
        }

        source_map.mappings.push(map_line);
    }

    return source_map;
}

export function createSourceMapSegment(
    current_column: number,
    original_source: number,
    original_line: number,
    original_column: number,
    original_name: number,
): Segment {

    let segment = <Segment>{};

    segment.column = current_column;

    if (original_source > -1) {
        segment.source = original_source;
        segment.original_line = original_line;
        segment.original_column = original_column;
        segment.original_name = original_name;
    }

    return segment;
};

export function createSourceMapJSON(map: SourceMap) {

    let
        source = 0,
        original_line = 0,
        original_column = 0,
        original_name = 0;

    const output = {
        version: map.version,
        file: map.file,
        sourceRoot: map.sourceRoot,
        sources: map.sources,
        sourceContent: map.sourceContent,
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

export function decodeJSONSourceMap(source): SourceMap {

    if (typeof source == "string")
        source = <object>JSON.parse(<string>source);

    let
        name_diff = 0,
        ori_col_diff = 0,
        line_diff = 0,
        source_diff = 0;

    source.mappings = source.mappings.split(";").map(line => {

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

    return source;
}

export function getSourceLineColumn(line: number, column: number, source: SourceMap) {

    const l = source.mappings[line - 1];

    if (!l)
        return {
            line: 0,
            column: 0,
            source: "",
            name: ""
        };

    const
        segments = l.segments;

    let
        prev_col = segments[0].column,
        seg: Segment = { column: 0, original_line: 0, original_column: 0, source: -1, original_name: -1 };

    for (let i = 1; i < segments.length; i++) {

        let curr_col = segments[i].column;

        if (column >= prev_col && column <= curr_col) {
            seg = segments[i - 1];
            break;
        }

        seg = segments[i];
    }

    return {
        line: seg.original_line,
        column: seg.original_column,
        source: seg.source > -1 ? source.sources[seg.source] : "",
        name: seg.original_name > -1 ? source.names[seg.original_name] : ""
    };
}

export function getPositionLexerFromJSONSourceMap(line: number, column: number, JSON_source: string): Lexer {

    if (typeof JSON_source != "string")
        throw TypeError("Expected a JSON string");

    const
        source = decodeJSONSourceMap(JSON_source),
        seg = getSourceLineColumn(line, column, source);

    let content = source.sourceContent[seg.source];

    const lex = new Lexer(content);

    lex.CHARACTERS_ONLY = true;

    while (!lex.END) {
        if (lex.line == seg.line && lex.char > seg.column) break;
        lex.next();
    }

    return lex;
};
