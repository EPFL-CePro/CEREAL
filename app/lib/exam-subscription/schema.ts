import { z } from "zod"

export const examSubscriptionSchema = z.object({
  semester: z.enum(["1", "2"]),
  courseCode: z.string().trim().min(1),
  courseName: z.string().trim().min(1),
  examTypes: z
    .array(
      z.object({
        examTypeId: z.number().int().positive(),
        date: z.iso.date().nullable(), // null = "I don't know yet"
      }),
    )
    .min(1, "Please select at least one exam type.")
    .refine(
      (examTypes) =>
        new Set(examTypes.map((examType) => examType.examTypeId)).size ===
        examTypes.length,
      "Each exam type can only be selected once.",
    ),
  serviceId: z.coerce.number().int().positive(),
  contact: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Invalid sciper."), // SCIPER, the server builds the JSON
  remark: z.string().trim().max(1000).optional().default(""),
})
