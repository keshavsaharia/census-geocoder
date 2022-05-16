const COMMA = ','
const QUOTE = '"'

export function csvEscape(str: string) {
	return str.trim().replace(/\"/g, '""')
}

export function csvSplit(line: string, delimiter: string = COMMA): Array<string> {
	const split: Array<string> = []
	let start = 0, end = 0
	while (end < line.length) {
		// Quotation enclosed item
		if (start == end && line.charAt(start) == QUOTE) {
			start++
			end = start
			while (line.charAt(end) != QUOTE ||
				  (line.charAt(end) == QUOTE && line.charAt(end + 1) == QUOTE)) {
				// CSV escaped quote
				if (line.charAt(end) == QUOTE && line.charAt(end + 1) == QUOTE)
					end++
				end++
			}
			split.push(line.substring(start, end))
			start = end + 2
			end = start
		}
		else if (line.charAt(end) == delimiter) {
			split.push(line.substring(start, end))
			start = end + 1
			end = start
		}
		else end++
	}
	if (start < end) {
		split.push(line.substring(start, end))
	}
	if (line.endsWith(delimiter))
		split.push('')

	return split
}
