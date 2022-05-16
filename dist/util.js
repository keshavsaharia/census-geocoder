"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csvSplit = exports.csvEscape = void 0;
const COMMA = ',';
const QUOTE = '"';
function csvEscape(str) {
    return str.trim().replace(/\"/g, '""');
}
exports.csvEscape = csvEscape;
function csvSplit(line, delimiter = COMMA) {
    const split = [];
    let start = 0, end = 0;
    while (end < line.length) {
        // Quotation enclosed item
        if (start == end && line.charAt(start) == QUOTE) {
            start++;
            end = start;
            while (line.charAt(end) != QUOTE ||
                (line.charAt(end) == QUOTE && line.charAt(end + 1) == QUOTE)) {
                // CSV escaped quote
                if (line.charAt(end) == QUOTE && line.charAt(end + 1) == QUOTE)
                    end++;
                end++;
            }
            split.push(line.substring(start, end));
            start = end + 2;
            end = start;
        }
        else if (line.charAt(end) == delimiter) {
            split.push(line.substring(start, end));
            start = end + 1;
            end = start;
        }
        else
            end++;
    }
    if (start < end) {
        split.push(line.substring(start, end));
    }
    if (line.endsWith(delimiter))
        split.push('');
    return split;
}
exports.csvSplit = csvSplit;
