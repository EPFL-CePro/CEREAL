export const maxRemarkLines = 12;

export function limitTextToLines(value: string, maxLines = maxRemarkLines) {
    return value.split(/\r\n|\r|\n/).slice(0, maxLines).join("\n");
}
