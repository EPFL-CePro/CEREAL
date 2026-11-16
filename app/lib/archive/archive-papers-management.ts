export const PAPERS_MANAGEMENT_MESSAGES = {
  repro_collect:
    "The exam papers are at the printing centre and I will come and collect them shortly.",
  repro_destroy:
    "The exam papers are at the printing centre and may be destroyed by CePro.",
  papers_user:
    "The exam papers are in my possession and I will take care of them.",
} as const

export type PapersManagement = keyof typeof PAPERS_MANAGEMENT_MESSAGES

export function formatPapersManagement(
  papersManagement: PapersManagement,
): string {
  return PAPERS_MANAGEMENT_MESSAGES[papersManagement]
}
