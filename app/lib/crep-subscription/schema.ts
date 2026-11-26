import z from "zod"

import { formatDateInputValue } from "@/app/lib/dates/date-time"

const todayString = () => formatDateInputValue(new Date())

// ---------- Reusable building blocks
/** Required YYYY-MM-DD date that must be after today */
const futureDate = (label: string) =>
  z.iso
    .date(`Please select ${label}.`)
    .refine((d) => d > todayString(), `The ${label} must be after today.`)

/** A numeric id, either as an n-digit string or as a positive integer */
const numericId = (digits: number, message: string) =>
  z.union(
    [
      z
        .string()
        .trim()
        .regex(new RegExp(`^\\d{${digits}}$`)),
      z.number().int().positive(),
    ],
    message,
  )

const sciper = (message: string) => numericId(6, message)

export const fileSpecsSchema = z.object({
  copiesNumber: z.number(),
  pagesPerDocument: z.number(),
  printType: z.enum(["recto", "recto-verso"]),
  binding: z.enum(["A3", "A4"]),
  paperColor: z.enum(["grayscale", "color"]),
  needsToBeScanned: z.boolean(),
})

export const crepSubscriptionSchema = z
  .object({
    course: z.object(
      {
        exam: z.object({
          code: z.string().trim().min(1),
          title: z.string().trim().min(1),
        }),
      },
      "Please select a course.",
    ),
    examDate: futureDate("an exam date"),
    desiredDeliveryDate: futureDate("a desired delivery date"),
    isReserved: z.boolean(),
    files: z.array(fileSpecsSchema.extend({ file: z.file() })),
    financialCenter: numericId(4, "Insert a correct financial center."),
    contact: sciper("Please select a contact."),
    authorizedPersons: z
      .array(sciper("Please select a valid authorized person."))
      .optional(),
    remark: z.string(),
  })
  .refine((data) => data.desiredDeliveryDate <= data.examDate, {
    path: ["desiredDeliveryDate"],
    message: "Desired delivery date cannot be later than the exam date.",
    when: ({ value }) => {
      const v = value as { examDate?: string; desiredDeliveryDate?: string }
      return !!v.examDate && !!v.desiredDeliveryDate
    },
  })

export type CrepSubscription = z.infer<typeof crepSubscriptionSchema>
export type CrepFileSpecs = z.infer<typeof fileSpecsSchema>
