import { z } from "zod"

export const examSubscriptionSchema = z.object({
  semester: z.enum(["1", "2"], "Please select a semester."),
  course: z.object(
    {
      exam: z.object({
        code: z.string().trim().min(1),
        title: z.string().trim().min(1),
      }),
    },
    "Please select a course.",
  ),
  examTypes: z
    .array(
      z.object({
        examTypeId: z.number().int().positive(),
        date: z.iso
          .date(`Please select a date, or check "I don't know yet".`)
          .nullable(), // null = "I don't know yet"
      }),
    )
    .min(1, "Please select at least one exam type.")
    .refine(
      (examTypes) =>
        new Set(examTypes.map((examType) => examType.examTypeId)).size ===
        examTypes.length,
      "Each exam type can only be selected once.",
    ),
  serviceId: z.number("Please select a service.").int().positive(),
  contact: z.union(
    [
      z
        .string()
        .trim()
        .regex(/^\d{6}$/),
      z.number().int().positive(),
    ],
    "Please select a contact.",
  ),
  remark: z.string().trim().max(1000, "The remark can't be longer than 1000 characters").optional(),
})

export type ExamSubscription = z.infer<typeof examSubscriptionSchema>
