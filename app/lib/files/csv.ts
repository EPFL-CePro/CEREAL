// Makes Excel read the file as UTF-8 (accented names)
const UTF8_BOM = "﻿"

// Quote a CSV field when it contains a separator, a quote or a line break (RFC 4180)
function escapeCsvField(value: string | number): string {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/* CSV file (comma separated, CRLF line breaks) of the given rows, header
included. Starts with a UTF-8 BOM so that Excel shows the accented names
correctly. */
export function toCsv(rows: (string | number)[][]): string {
  const lines = rows.map((row) => row.map(escapeCsvField).join(","))
  return `${UTF8_BOM}${lines.join("\r\n")}\r\n`
}
