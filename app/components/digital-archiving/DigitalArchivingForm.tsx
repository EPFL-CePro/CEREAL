"use client"

import { useId, useState } from "react"

import { DocumentTextIcon, TrashIcon } from "@heroicons/react/24/outline"
import { type User } from "next-auth"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"
import { toast } from "sonner"

import ChoiceCards from "@/app/components/forms/ChoiceCards"
import FileDropzone from "@/app/components/forms/FileDropZone"
import FormSection from "@/app/components/forms/FormSection"
import NumberInput from "@/app/components/forms/NumberInput"
import ReactSelect from "@/app/components/forms/ReactSelect"
import { RedAsterisk } from "@/app/components/forms/RedAsterisk"
import Callout from "@/app/components/ui/Callout"
import { PAPERS_MANAGEMENT_MESSAGES } from "@/app/lib/archive/archive-papers-management"
import {
  getAcademicYearOptions,
  getCurrentAcademicYear,
} from "@/app/lib/dates/academic-year"
import { preventEnterSubmit } from "@/app/lib/forms/prevent-enter-submit"
import { sendEmailArchivingConfirmation } from "@/app/lib/mail/cereal-notifications"
import { type DigitalArchiveInputs } from "@/types/digitalArchiveInputs"

interface RegisterProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean
  sciper: string
}

interface ArchiveUploadResult {
  fileName: string
  destination: string
  numberOfPdfs: number
  durationMs: number
  durationSeconds: number
  permissionsGranted: boolean
}

const papersManagementOptions = Object.entries(PAPERS_MANAGEMENT_MESSAGES).map(
  ([value, label]) => ({ value, label }),
)

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  const units = ["KB", "MB", "GB", "TB"]
  let value = size / 1024
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

export default function DigitalArchivingForm({ user }: RegisterProps) {
  const currentAcademicYear = getCurrentAcademicYear()
  const academicYears = getAcademicYearOptions("2024-2025", currentAcademicYear)
  const { handleSubmit, control, register, reset, watch } =
    useForm<DigitalArchiveInputs>({
      defaultValues: { academicYear: currentAcademicYear },
    })
  const selectedAcademicYear = watch("academicYear")
  const academicYearId = useId()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<ArchiveUploadResult | null>(null)

  const showError = (title: string, message: string) =>
    toast.error(title, { description: message })

  const onSubmit: SubmitHandler<DigitalArchiveInputs> = async (data) => {
    setResult(null)

    const courseCode = data.course?.exam.code
    if (!courseCode) {
      showError("Form error", "Select an exam.")
      return
    }

    if (!data.numberCopies) {
      showError(
        "Form error",
        "Specify a number of copies. It has to be the same number as the number of PDFs in the ZIP file.",
      )
      return
    }

    if (!selectedFile) {
      showError("Form error", "Upload a ZIP file.")
      return
    }

    if (!selectedFile.name.toLowerCase().endsWith(".zip")) {
      showError("Form error", "The selected document has to be a .zip file.")
      return
    }

    if (!data.papersManagement) {
      showError("Form error", "Please choose a papers management method.")
      return
    }

    setIsUploading(true)
    try {
      const params = new URLSearchParams({
        numberCopies: String(data.numberCopies),
        academicYear: data.academicYear,
        courseCode,
      })
      const response = await fetch(`/api/digital-archiving/unzip?${params}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/zip",
          "X-Archive-Name": encodeURIComponent(selectedFile.name),
          "X-Requested-By": user.sciper,
        },
        body: selectedFile,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "La decompression a echoue.")
      }

      const uploadResult = payload as ArchiveUploadResult
      setResult(uploadResult)
      setSelectedFile(null)

      await sendEmailArchivingConfirmation({
        courseName: `${data.course?.exam.code} - ${data.course?.exam.title}`,
        academicYear: data.academicYear,
        pdfsNumber: uploadResult.numberOfPdfs,
        papersManagement: data.papersManagement,
        nasPath: uploadResult.destination,
      })

      reset()
    } catch (err) {
      showError(
        "Archiving Error",
        err instanceof Error
          ? err.message
          : "Erreur inattendue pendant le test.",
      )
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center m-24">
      <form
        className="flex flex-col gap-4 w-full max-w-3xl"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={preventEnterSubmit}
        encType="multipart/form-data"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-center">
            Digital archiving of exam papers
          </h1>
          <p>
            Archive the scanned copies of an exam. All fields marked with{" "}
            <RedAsterisk /> are required.
          </p>
        </div>

        <Callout type="info" title="Guidelines for Digital Archiving">
          <ul className="mt-2 list-disc pl-4 flex flex-col gap-2">
            <li>
              <span className="font-medium">General requirements:</span> exam
              papers must be complete, legible, and available in digital
              format.
            </li>
            <li>
              <span className="font-medium">File format:</span> a ZIP file,
              containing one PDF per exam copy (300 students = 300 PDFs in the
              ZIP).
            </li>
            <li>
              <span className="font-medium">Scan quality:</span> PDFs must be
              of sufficient quality to be readable and archivable.
            </li>
            <li>
              <span className="font-medium">PDF quality and compression:</span>{" "}
              when using software to generate or scan PDFs, ensure that the
              settings do not overly compress the file. Some programs reduce
              quality by default when exporting to PDF—please verify that all
              pages remain clear and legible.
            </li>
            <li>
              <span className="font-medium">Completeness of PDFs:</span> if
              certain copies could not be corrected using AMC (due to poor
              scans, additional pages, or special arrangements such as
              extra-muros exams), they must still be scanned manually. A proper
              PDF must be created and included in the archive for each such
              case.
            </li>
            <li>
              <span className="font-medium">PDF file naming convention:</span>{" "}
              SURNAME_FIRSTNAME_SCIPER.pdf, for example{" "}
              <i>Dupre_Frederic_351248.pdf</i>
            </li>
          </ul>
        </Callout>

        <FormSection number={1} title="Exam">
          <div className="flex flex-col gap-2">
            <label htmlFor={academicYearId}>
              Academic year <RedAsterisk />
            </label>
            <select
              id={academicYearId}
              className="w-40 rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              {...register("academicYear")}
            >
              {academicYears.map((academicYear) => (
                <option key={academicYear} value={academicYear}>
                  {academicYear}
                </option>
              ))}
            </select>
          </div>
          <ReactSelect
            required
            control={control}
            label="Select your exam"
            placeholder="Select course..."
            name={"course"}
            isMultiChoice={false}
            containCourses={true}
            instanceId={1}
            academicYear={selectedAcademicYear}
          />
        </FormSection>

        <FormSection number={2} title="Exam papers">
          <Controller
            name="numberCopies"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Number of copies (must be the same as the number of PDF files)"
                required
                min={1}
                value={field.value ?? ""}
                onChange={field.onChange}
                disabled={isUploading}
              />
            )}
          />

          <div className="flex flex-col gap-3">
            <h2>
              ZIP file <RedAsterisk />
            </h2>
            {selectedFile ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white p-3 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <DocumentTextIcon
                    className="size-6 shrink-0 text-red-500"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 text-sm">
                    <div className="truncate font-medium">
                      {selectedFile.name}
                    </div>
                    <div className="text-slate-500">
                      {formatBytes(selectedFile.size)}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${selectedFile.name}`}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  disabled={isUploading}
                  onClick={() => setSelectedFile(null)}
                >
                  <TrashIcon className="size-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ) : (
              <FileDropzone
                multiple={false}
                accept=".zip,application/zip,application/x-zip-compressed"
                disabled={isUploading}
                onFiles={(files) => {
                  setResult(null)
                  setSelectedFile(files[0] ?? null)
                }}
              />
            )}
          </div>
        </FormSection>

        <FormSection number={3} title="Exam papers management">
          <Controller
            name="papersManagement"
            control={control}
            render={({ field }) => (
              <ChoiceCards
                label="What happens to the paper copies?"
                required
                stacked
                value={field.value ?? ""}
                options={papersManagementOptions}
                onChange={field.onChange}
                disabled={isUploading}
              />
            )}
          />

          {result && (
            <Callout
              type="success"
              title="Your exam has been archived, no more action needed"
            >
              <p>
                Time taken: {result.durationSeconds.toFixed(2)} s (
                {result.durationMs} ms)
              </p>
              <p>{result.numberOfPdfs} PDFs</p>
              <p>
                <strong>Folder path in NAS</strong> : {result.destination}
              </p>
            </Callout>
          )}

          {result && !result.permissionsGranted && (
            <Callout type="warning">
              The access rights to the archive folder could not be properly
              given to the teachers of the exam. Please inform CePro.
            </Callout>
          )}

          <button
            className="btn btn-primary flex items-center justify-center gap-2 hover:cursor-pointer disabled:cursor-wait disabled:opacity-80"
            type="submit"
            disabled={isUploading}
          >
            {isUploading && (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            )}
            <span>{isUploading ? "Submitting..." : "Submit"}</span>
          </button>
        </FormSection>
      </form>
    </div>
  )
}
