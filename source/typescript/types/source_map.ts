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
    sources: Array<string>;
    /**
     * An array of the original source file contents.
     */
    sourceContent?: Array<string>;
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
};
export type Line = {
    /**
     * The line number, 0 index based.
     */
    index: number;
    /**
     * List of source mapping segments.
     */
    segments: Array<Segment>;
};
export type Segment = {
    column: number;
    /**
     * Index number to entry SourceMap.sources, relative to previous source index.
     */
    source?: number;
    /**
     * Original Line, relative to previous original line. Present if Segment.source is present.
     */
    original_line?: number;
    /**
     * Original column, relative to previous original column. Present if Segment.source is present.
     */
    original_column?: number;
    /**
     * Index number into SourceMap.names, relative to previous original name.
     */
    original_name?: number;
};
