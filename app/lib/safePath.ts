import path from "path";

/**
 * Safely resolves and joins path segments to prevent path traversal attacks.
 * Ensures the resulting target path remains strictly within the base directory.
 */
export function safeJoinPath(base: string, ...segments: string[]): string {
    const resolvedBase = path.resolve(base);
    const target = path.resolve(resolvedBase, ...segments);

    // Prevent directory traversal by ensuring target is inside resolvedBase
    if (target !== resolvedBase && !target.startsWith(resolvedBase + path.sep)) {
        throw new Error("Invalid path");
    }

    return target;
}