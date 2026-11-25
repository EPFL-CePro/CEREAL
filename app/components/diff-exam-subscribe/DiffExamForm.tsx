"use client"
// This form allows users to register their exams into the system.
import React from "react"

import { DocumentTextIcon, TrashIcon } from "@heroicons/react/24/outline"
import { type User } from "next-auth"
import { Controller, useForm, type SubmitHandler } from "react-hook-form"
import { toast } from "sonner"

import Checkbox from "@/app/components/forms/Checkbox"
import DateInput from "@/app/components/forms/DateInput"
import FileDropzone from "@/app/components/forms/FileDropZone"
import FormSection from "@/app/components/forms/FormSection"
import { RedAsterisk } from "@/app/components/forms/RedAsterisk"
import Callout from "@/app/components/ui/Callout"
import { insertAbsence, insertDiffExamSubscription } from "@/app/lib/database"
import { isDeferredExamRegistrationOpen } from "@/app/lib/dates/business-days"
import { preventEnterSubmit } from "@/app/lib/forms/prevent-enter-submit"
import { sendEmailAbsenceConfirmation } from "@/app/lib/mail/cereal-notifications"
import { type BoFileForUser } from "@/types/boFile"
import { type DiffExamFormInputs } from "@/types/diffExamForm"

interface DiffExamFormProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean
  sciper: string
}

function getStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function parseDateInputValue(value: string) {
  if (!value) return null

  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null

  return new Date(year, month - 1, day)
}

export default function DiffExamForm({ user }: DiffExamFormProps) {
  const [boFileForUser, setBoFileForUser] = React.useState<
    BoFileForUser[] | null
  >(null)
  const [isBoFileLoading, setIsBoFileLoading] = React.useState(true)
  const [boFileError, setBoFileError] = React.useState("")

  const [isSubscribeToDiffChecked, setIsSubscribeToDiffChecked] =
    React.useState(false)

  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const defaultValues: DiffExamFormInputs = {
    startingAbsenceDate: "",
    endingAbsenceDate: "",
    absenceFile: [],
    comment: "",
    diffExams: [],
  }

  const { control, handleSubmit, register, setValue, watch, reset } =
    useForm<DiffExamFormInputs>({ defaultValues })

  const beginAbsenceDate = parseDateInputValue(watch("startingAbsenceDate"))
  const endAbsenceDate = parseDateInputValue(watch("endingAbsenceDate"))
  const selectedDiffExams = watch("diffExams") ?? []

  const filteredBoFileForUser = React.useMemo(() => {
    if (!boFileForUser) return null
    if (!beginAbsenceDate || !endAbsenceDate) return boFileForUser

    const rangeStart = getStartOfDay(beginAbsenceDate).getTime()
    const rangeEnd = getStartOfDay(endAbsenceDate).getTime()
    const minDate = Math.min(rangeStart, rangeEnd)
    const maxDate = Math.max(rangeStart, rangeEnd)

    return boFileForUser.filter((exam) => {
      const examDate = new Date(exam["date séance"])
      if (Number.isNaN(examDate.getTime())) return false

      const examDay = getStartOfDay(examDate).getTime()
      return examDay >= minDate && examDay <= maxDate
    })
  }, [beginAbsenceDate, boFileForUser, endAbsenceDate])

  function getExamKey(exam: BoFileForUser) {
    return `${exam["codification matière (indépendant du plan)"]}-${exam["date séance"]}`
  }

  function handleDiffExamChange(exam: BoFileForUser, isChecked: boolean) {
    const examKey = getExamKey(exam)
    const nextDiffExams = isChecked
      ? [...selectedDiffExams, exam]
      : selectedDiffExams.filter(
          (selectedExam) => getExamKey(selectedExam) !== examKey,
        )

    setValue("diffExams", nextDiffExams, {
      shouldDirty: true,
      shouldTouch: true,
    })
  }

  const showError = (title: string, message: string) =>
    toast.error(title, { description: message })

  React.useEffect(() => {
    register("diffExams")
  }, [register])

  const onSubmit: SubmitHandler<DiffExamFormInputs> = async (data) => {
    if (!beginAbsenceDate || !endAbsenceDate) {
      showError(
        "Date Selection Error",
        "Please select a beginning and ending absence date.",
      )
      return
    }

    if (data.absenceFile.length === 0) {
      showError("File Error", "Please upload a valid absence file.")
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append("file", data.absenceFile[0])

      const res = await fetch("/api/cereal/diff-exams/upload-absence", {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => null)
        console.error(error)
        showError(
          "File Error",
          error?.error ??
            "An error occurred while uploading your absence file. Please try again.",
        )
        return
      }
      const { fileName } = (await res.json()) as { fileName: string }

      const absenceId = await insertAbsence({
        sciper: Number(user.sciper),
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        certificate_date_from: new Date(data.startingAbsenceDate),
        certificate_date_to: new Date(data.endingAbsenceDate),
        certificate_file_name: fileName,
        comment: data.comment,
      })
      for (let index = 0; index < data.diffExams.length; index++) {
        const exam = data.diffExams[index]
        await insertDiffExamSubscription({
          exam_student_absence_id: absenceId,
          exam_code: exam["codification matière (indépendant du plan)"],
          exam_name: exam["matière (libellé fr)"],
          exam_date: new Date(exam["date séance"]),
          exam_start_time: exam["heure séance"] || null,
          exam_end_time: exam["heure fin séance"] || null,
          isa_has_grade: false,
        })
      }

      await sendEmailAbsenceConfirmation(absenceId)

      toast.success("Success", {
        description:
          "Your absence has been successfully submitted. An email should have been sent to you.",
      })
      reset()
      setIsSubscribeToDiffChecked(false)
    } catch (err) {
      console.error(err)
      showError(
        "Unexpected Error",
        "An unexpected error occurred while submitting your absence.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function getBoFile() {
    setIsBoFileLoading(true)
    setBoFileError("")

    try {
      const res = await fetch("/api/cereal/diff-exams/get-bo-user", {
        method: "GET",
      })
      if (!res.ok) {
        console.error(await res.text())
        setBoFileError(
          "Unable to load BO file information. Please try again later.",
        )
        setBoFileForUser(null)
        return
      }
      const responseJson = await res.json()

      const uniqueBoFile = responseJson.boFile.filter(
        (exam: BoFileForUser, index: number) =>
          responseJson.boFile.findIndex(
            (otherExam: BoFileForUser) =>
              otherExam["codification matière (indépendant du plan)"] ===
                exam["codification matière (indépendant du plan)"] &&
              otherExam["date séance"] === exam["date séance"],
          ) === index,
      )

      setBoFileForUser(uniqueBoFile)
    } catch (error) {
      console.error(error)
      setBoFileError(
        "Unable to load BO file information. Please try again later.",
      )
      setBoFileForUser(null)
    } finally {
      setIsBoFileLoading(false)
    }
  }

  React.useEffect(() => {
    getBoFile()
  }, [])

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <div className="flex flex-col items-center m-24">
      <form
        className="flex flex-col gap-4 w-full max-w-3xl"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={preventEnterSubmit}
        encType="multipart/form-data"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-center">
            Absence submission & Deferred exams subscription
          </h1>
          <p>
            Submit your absence certificate and, if needed, subscribe to the
            deferred exams. All fields marked with <RedAsterisk /> are required.
          </p>
        </div>

        <FormSection number={1} title="Absence">
          <Callout>Fill the dates according to the absence file</Callout>
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Beginning of the absence"
              required
              registration={register("startingAbsenceDate")}
            />
            <DateInput
              label="End of the absence"
              required
              registration={register("endingAbsenceDate")}
            />
          </div>

          <div className="flex flex-col gap-3">
            <h2>
              Absence file <RedAsterisk />
            </h2>
            <Controller
              name="absenceFile"
              control={control}
              render={({ field }) => {
                const [file] = field.value
                return file ? (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-3 shadow-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <DocumentTextIcon
                        className="size-6 shrink-0 text-red-500"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 text-sm">
                        <div className="truncate font-medium">{file.name}</div>
                        <div className="text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      disabled={isSubmitting}
                      onClick={() => field.onChange([])}
                    >
                      <TrashIcon className="size-4" aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                ) : (
                  <FileDropzone
                    multiple={false}
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={isSubmitting}
                    onFiles={field.onChange}
                  />
                )
              }}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="absence-comment">Remark</label>
            <textarea
              id="absence-comment"
              rows={5}
              className="p-2 border rounded-md accent-red-500 border-slate-300"
              placeholder="Additional remarks (optional)"
              {...register("comment")}
            />
          </div>
        </FormSection>

        <FormSection number={2} title="Deferred exams">
          <Checkbox
            label="I also want to subscribe to deferred exams"
            checked={isSubscribeToDiffChecked}
            onChange={(checked) => {
              setIsSubscribeToDiffChecked(checked)
              if (!checked) setValue("diffExams", []) // clean diffExams if unchecked
            }}
          />

          {isSubscribeToDiffChecked &&
            (!beginAbsenceDate || !endAbsenceDate ? (
              <Callout type="info">
                Please select a beginning and ending absence date first.
              </Callout>
            ) : isBoFileLoading ? (
              <Callout type="info">Loading your exams...</Callout>
            ) : boFileError ? (
              <Callout type="error">{boFileError}</Callout>
            ) : filteredBoFileForUser ? (
              <div className="overflow-x-auto rounded-md border border-slate-300">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-300">
                      <th className="p-2 font-semibold">Code</th>
                      <th className="p-2 font-semibold">Course name</th>
                      <th className="p-2 font-semibold">Teacher(s)</th>
                      <th className="p-2 font-semibold">Exam date</th>
                      <th className="p-2 font-semibold">
                        Subscribe to deferred exam
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBoFileForUser.map((exam, index) => {
                      const examKey = getExamKey(exam)
                      const isExamSelected = selectedDiffExams.some(
                        (selectedExam) => getExamKey(selectedExam) === examKey,
                      )
                      const isRegistrationOpen = isDeferredExamRegistrationOpen(
                        exam["date séance"],
                      )

                      return (
                        <tr
                          className="border-b border-slate-200 last:border-b-0"
                          key={`${examKey}-${index}`}
                        >
                          <td className="p-2">
                            {exam["codification matière (indépendant du plan)"]}
                          </td>
                          <td className="p-2">
                            {exam["matière (libellé fr)"]}
                          </td>
                          <td className="p-2">
                            {exam["enseignant(s) responsable"]}
                          </td>
                          <td className="p-2">
                            {new Date(exam["date séance"]).toLocaleDateString()}
                          </td>
                          <td className="p-2 text-center">
                            {isRegistrationOpen ? (
                              <input
                                type="checkbox"
                                aria-label={`Subscribe to the deferred exam of ${exam["matière (libellé fr)"]}`}
                                className="size-5 cursor-pointer accent-red-500"
                                checked={isExamSelected}
                                onChange={(e) =>
                                  handleDiffExamChange(exam, e.target.checked)
                                }
                              />
                            ) : (
                              <span className="block text-xs text-slate-500">
                                Registration closed
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Callout type="info">
                No BO file uploaded for the moment. Please come back later.
              </Callout>
            ))}

          <button
            className="btn btn-primary flex items-center justify-center gap-2 hover:cursor-pointer disabled:cursor-wait disabled:opacity-80"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            <span>{isSubmitting ? "Submitting..." : "Submit absence"}</span>
          </button>
        </FormSection>
      </form>
    </div>
  )
}
