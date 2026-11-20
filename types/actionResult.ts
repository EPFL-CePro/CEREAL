// Result returned by a server action: it never throws for an expected error
export type ActionResult =
  | { success: true; warning?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> }
