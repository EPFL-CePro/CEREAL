import { z } from "zod"

import { type CrepFile, type CrepFileSpecs } from "@/types/crepExam"

export const paperFormats = [
  { value: "A3", label: "Saddle stitch (A3)" },
  { value: "A4", label: "Staple (A4)" },
]

export const paperColors = [
  { value: "greyscale", label: "Greyscale" },
  { value: "color", label: "Color" },
]

export const printSides = [
  { value: "recto", label: "Recto" },
  { value: "recto-verso", label: "Recto-verso" },
]

export const defaultFileSpecs: CrepFileSpecs = {
  exam_students: 0,
  exam_pages: 0,
  paper_format: "A3",
  paper_color: "greyscale",
  print: "recto-verso",
  need_scan: true,
}

// Business rule : A3 page multiple 4
const A3_PAGE_MULTIPLE = 4
const isValidA3PageCount = (format: string, pages: number) =>
  format !== "A3" || pages % A3_PAGE_MULTIPLE === 0

// Generic Validation
const positiveInt = (message: string) => z.coerce.number().int().min(1, message)

export const fileSpecsSchema = z
  .object({
    exam_students: positiveInt("The number of copies must be at least 1."),
    exam_pages: positiveInt(
      "The number of pages per document must be at least 1.",
    ),
    paper_format: z.enum(
      paperFormats.map((x) => x.value),
      "Invalid bindings.",
    ),
    paper_color: z.enum(
      paperColors.map((x) => x.value),
      "Invalid paper color.",
    ),
    print: z.enum(
      printSides.map((x) => x.value),
      "Invalid print side.",
    ),
    need_scan: z.coerce.boolean(),
  })
  .refine((s) => isValidA3PageCount(s.paper_format, s.exam_pages), {
    message:
      "When printing in A3, the number of pages per document must be a multiple of 4.",
    path: ["exam_pages"],
  })

export function pickFileSpecs(file: CrepFileSpecs): CrepFileSpecs {
  return {
    exam_students: Number(file.exam_students),
    exam_pages: Number(file.exam_pages),
    paper_format: file.paper_format,
    paper_color: file.paper_color,
    print: file.print,
    need_scan: Boolean(file.need_scan),
  }
}

export function validateFileSpecs(specs: CrepFileSpecs): string | null {
  const result = fileSpecsSchema.safeParse(specs)
  return result.success ? null : result.error.issues[0].message
}

// Validates the print settings of several files, the error message is prefixed by the file name.
export function validateFilesSpecs(
  files: (CrepFileSpecs & { file_name?: string | null })[],
): string | null {
  for (const file of files) {
    const error = validateFileSpecs(file)
    if (error) return `${file.file_name ?? "File not uploaded yet"} : ${error}`
  }
  return null
}

export function getTotalCopies(files: CrepFileSpecs[]): number {
  return files.reduce((total, file) => total + Number(file.exam_students), 0)
}

export function getBindingLabel(paperFormat: string): string {
  return (
    paperFormats.find(({ value }) => value === paperFormat)?.label ??
    paperFormat
  )
}

// e.g. "exam.pdf — 200 copies × 16 pages, Saddle stitch (A3), greyscale, recto-verso, scan"
export function describeFile(
  file: CrepFileSpecs & Pick<CrepFile, "file_name">,
): string {
  return `${file.file_name ?? "File not uploaded yet"} — ${file.exam_students} copies × ${file.exam_pages} pages, ${getBindingLabel(file.paper_format)}, ${file.paper_color}, ${file.print}${file.need_scan ? ", scan" : ""}`
}
