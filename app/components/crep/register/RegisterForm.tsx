"use client"
// This form allows users to register their exams into the system.
import { useState } from "react"

import { type User } from "next-auth"
import { useForm, type SubmitHandler } from "react-hook-form"

import FilesAndPrintSettings from "@/app/components/crep/register/FilesAndPrintSettings"
import Checkbox from "@/app/components/forms/Checkbox"
import DateInput from "@/app/components/forms/DateInput"
import Callout from "@/app/components/ui/Callout"
import { insertExamForPrint } from "@/app/lib/crep/database"
import {
  defaultFileSpecs,
  getTotalCopies,
  validateFilesSpecs,
} from "@/app/lib/crep/file-specs"
import { countPdfPages } from "@/app/lib/crep/pdf-pages"
import {
  isDeliveryTooSoon,
  schedulePrint,
} from "@/app/lib/crep/print-schedule"
import { limitTextToLines } from "@/app/lib/crep/remark-lines"
import {
  getPreviousBusinessDay,
  MIN_BUSINESS_DAYS_BEFORE_DELIVERY,
} from "@/app/lib/dates/business-days"
import {
  validateFinancialCenter,
  fetchMultiplePersonsBySciper,
  fetchPersonBySciper,
} from "@/app/lib/epfl/epfl-api"
import { preventEnterSubmit } from "@/app/lib/forms/prevent-enter-submit"
import { sendEmailCrepPrintingConfirmation } from "@/app/lib/mail/crep-notifications"
import { type CrepFileSpecs } from "@/types/crepExam"
import { type Inputs } from "@/types/inputs"
import { type AuthorizedPersons } from "@/types/user"

import FormSection from "../../forms/FormSection"
import ReactSelect from "../../forms/ReactSelect"
import { RedAsterisk } from "../../forms/RedAsterisk"
import { MessageModal } from "../../ui/MessageModal"

interface RegisterProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean
  sciper: string
}

export default function RegisterForm({ user }: RegisterProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
    reset,
    setValue,
  } = useForm<Inputs>({
    defaultValues: {
      course: null,
      contact: user.sciper,
      authorizedPersons: "",
      remark: "",
    },
  })
  // One card per file, each file having its own print settings
  const [selectedFiles, setSelectedFiles] = useState<
    { file: File; specs: CrepFileSpecs }[]
  >([])
  // Print settings of a reserved exam, whose files are not uploaded yet
  const [reservedSpecs, setReservedSpecs] =
    useState<CrepFileSpecs>(defaultFileSpecs)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalTitle, setModalTitle] = useState("Registration Successful")
  const [modalMessage, setModalMessage] = useState(
    "Your exam has been successfully registered.",
  )
  const [modalResolver, setModalResolver] = useState<
    ((confirmed: boolean) => void) | null
  >(null)
  const [isConfirmModal, setIsConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hideFiles, setHideFiles] = useState(false)

  const openModal = (title: string, message: string) => {
    setIsConfirmModal(false)
    setModalResolver(null)
    setModalTitle(title)
    setModalMessage(message)
    setModalOpen(true)
    const dialog = document.getElementById(
      "register-modal",
    ) as HTMLDialogElement | null
    dialog?.showModal?.()
  }
  const openConfirmationModal = (title: string, message: string) =>
    new Promise<boolean>((resolve) => {
      setIsConfirmModal(true)
      setModalResolver(() => resolve)
      setModalTitle(title)
      setModalMessage(message)
      setModalOpen(true)
      const dialog = document.getElementById(
        "register-modal",
      ) as HTMLDialogElement | null
      dialog?.showModal?.()
    })
  const handleModalResult = (confirmed: boolean) => {
    if (modalResolver) {
      modalResolver(confirmed)
      setModalResolver(null)
    }
    setModalOpen(false)
  }

  const handleFilesChange = (newFiles: File[]) => {
    if (newFiles.length === 0) return

    // Two files of the same exam can not have the same name (they are stored in the same folder)
    const duplicates = newFiles.filter((file) =>
      selectedFiles.some((selected) => selected.file.name === file.name),
    )
    const merged = [...selectedFiles]
    newFiles.forEach((file) => {
      if (merged.some((selected) => selected.file.name === file.name)) return
      // Print settings are pre-filled with the ones of the previous file
      const previousSpecs =
        merged.length > 0 ? merged[merged.length - 1].specs : defaultFileSpecs
      merged.push({ file, specs: { ...previousSpecs } })
    })
    setSelectedFiles(merged)

    // The page count read from the PDF takes precedence over the inherited one
    newFiles.forEach(async (file) => {
      const pages = await countPdfPages(file)
      if (pages === null) return
      setSelectedFiles((prev) =>
        prev.map((selected) =>
          selected.file === file
            ? { ...selected, specs: { ...selected.specs, exam_pages: pages } }
            : selected,
        ),
      )
    })

    setFilesError(
      duplicates.length > 0
        ? `A file with the same name has already been selected : ${duplicates.map((file) => file.name).join(", ")}. Please rename it before adding it.`
        : null,
    )
  }

  const handleRemoveFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updated)
    setFilesError(
      updated.length === 0 ? "Please upload at least one file" : null,
    )
  }

  const handleFileSpecsChange = (index: number, specs: CrepFileSpecs) => {
    setSelectedFiles((prev) =>
      prev.map((selected, i) =>
        i === index ? { ...selected, specs } : selected,
      ),
    )
  }
  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    // validate that desiredDate is not later than examDate
    const { examDate, desiredDate } = data

    const today = new Date()
    if (!data.course) {
      openModal("Course Selection Error", "Please select a course.")
      return
    }

    // check uploaded files not empty
    if (selectedFiles.length === 0 && !hideFiles) {
      setFilesError("Please upload at least one file")
      openModal(
        "File Upload Error",
        "You need to upload at least one file before submitting the form.",
      )
      return
    }
    // Check that the financial center exists
    const financialCenterExists = await validateFinancialCenter(
      data.financialCenter,
    )
    if (typeof financialCenterExists === "string") {
      openModal(
        "Financial Center error",
        "We could not verify the financial center right now. Please try again in a few minutes.",
      )
      return
    } else if (!financialCenterExists) {
      openModal(
        "Financial Center error",
        "Please enter a valid financial center.",
      )
      return
    }

    // Files to print with their print settings. A reserved exam has a single file, not uploaded yet.
    const printFiles = hideFiles
      ? [{ file_name: null, ...reservedSpecs }]
      : selectedFiles.map(({ file, specs }) => ({
          file_name: file.name,
          ...specs,
        }))

    const printFilesError = validateFilesSpecs(printFiles)
    if (printFilesError) {
      setFilesError(printFilesError)
      return
    }
    setFilesError(null)

    if (examDate && desiredDate) {
      const exam = new Date(examDate)
      const desired = new Date(desiredDate)
      if (desired > exam) {
        setError("desiredDate", {
          type: "validate",
          message: "Desired delivery date cannot be later than the exam date.",
        })
        return
      }

      today.setHours(0, 0, 0, 0)

      if (exam <= today || desired <= today) {
        openModal(
          "Date selection error",
          "The exam date or the desired delivery date can not be before today's date.",
        )
        return
      } else if (isDeliveryTooSoon(desired)) {
        const confirmed = await openConfirmationModal(
          "Date Validation Warning",
          `There must be at least ${MIN_BUSINESS_DAYS_BEFORE_DELIVERY} business days between today and the desired delivery date.\n\nDo you still want to submit your exam?`,
        )
        if (!confirmed) {
          return
        }
      } else {
        // clear any previous date error
        clearErrors("desiredDate")
      }
    }

    setIsSubmitting(true)

    try {
      let authorizedPersons: AuthorizedPersons[]

      if (data.authorizedPersons) {
        const pers = data.authorizedPersons as unknown as Array<string>
        const authorizedPersonsList = await fetchMultiplePersonsBySciper(
          pers.join(","),
        )
        authorizedPersons = authorizedPersonsList.map((user) => {
          return {
            id: user?.id,
            email: user?.email,
            name: user ? `${user.firstname} ${user.lastname}` : "",
          }
        })
      } else {
        authorizedPersons = []
      }

      const contact = await fetchPersonBySciper(data.contact)
      const formattedContact = {
        id: contact.id,
        email: contact.email,
        firstname: contact.firstname,
        lastname: contact.lastname,
      }

      const examName = `${data.course.exam.title} (${data.course.exam.teachers.map((t) => `${t.firstname} ${t.name}`).join(", ")})`
      const examCode = data.course.exam.code

      const { printDate, status } = await schedulePrint({
        desiredDeliveryDate: data.desiredDate,
        totalCopies: getTotalCopies(printFiles),
        isReserved: hideFiles,
      })

      const insertedExamId = await insertExamForPrint(
        {
          exam_name: examName,
          exam_code: examCode,
          exam_date: data.examDate,
          print_date: printDate,
          contact: JSON.stringify(formattedContact),
          // contact: data.contact, //if we want the id only
          authorized_persons: JSON.stringify(authorizedPersons),
          remark: data.remark,
          repro_remark: null,
          status,
          registered_by: user.email || "",
          financial_center: data.financialCenter,
          desired_date: data.desiredDate,
        },
        printFiles,
      )

      if (typeof insertedExamId !== "number") {
        openModal(
          "Registration Error",
          "An error occurred while registering your exam. Please try again later.",
        )
        return
      }

      if (!hideFiles) {
        const formData = new FormData()
        formData.append("examId", String(insertedExamId))

        selectedFiles.forEach(({ file }) => {
          formData.append("files", file)
        })

        const res = await fetch("/api/upload-exam-files", {
          method: "POST",
          body: formData,
        })
        if (!res.ok) {
          console.error(await res.text())
          openModal(
            "File Upload Error",
            "An error occurred while uploading exam files. Please try again.",
          )
          return
        }
      }

      await sendEmailCrepPrintingConfirmation(String(insertedExamId))

      if (status === "registered-warning") {
        // CrepExamModal with warning that there is less than `MIN_BUSINESS_DAYS_BEFORE_DELIVERY` business days between today and the desired delivery date.
        openModal(
          "REQUIRES ATTENTION - Registration Successful",
          `
                    Your exam ${examCode} has been registered, but with a delivery date that is inferior to ${MIN_BUSINESS_DAYS_BEFORE_DELIVERY} business days from today.
                    An email has been sent to you as a confirmation.
                    The CePro team can contact you at any time to discuss about your situation.
                `,
        )
      } else if (status === "registered-error") {
        // CrepExamModal with error message that a printing session could not be calculated and that the CePro team will contact the user as soon as possible.
        openModal(
          "REQUIRES ATTENTION - REGISTRATION ERROR",
          `
                    You filled the form correctly, but due to a printing planning extremely full or too tight delays, we could not determine a printing session for your exam.
                    The CePro team will contact you as soon as possible to discuss about your situation.
                    An email has been sent to you and the CePro team as information.
                `,
        )
      } else {
        openModal(
          "Registration Successful",
          `Your Exam ${examCode} has been registered and a confirmation has been sent to your email.`,
        )
      }
      reset()
      setSelectedFiles([])
      setReservedSpecs(defaultFileSpecs)
      setFilesError(null)
      clearErrors()
    } catch (err) {
      console.error(err)
      openModal(
        "Unexpected Error",
        "An unexpected error occurred while registering the exam.",
      )
    } finally {
      setIsSubmitting(false)
      setHideFiles(false)
    }
  }

  const remarkField = register("remark")

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <div className="flex flex-col items-center m-24">
      <dialog
        id="register-modal"
        className="modal fixed top-3/8 left-1/8 w-3/4 md:left-1/4 md:w-2/4 rounded-xl flex items-center justify-center z-50 drop-shadow-2xl backdrop:backdrop-blur-xs opacity-98"
        onClose={() => {
          setModalOpen(false)
          if (modalResolver) {
            modalResolver(false)
            setModalResolver(null)
          }
        }}
      >
        {modalOpen && (
          <MessageModal
            setModalOpen={setModalOpen}
            title={modalTitle}
            message={modalMessage}
            isConfirm={isConfirmModal}
            onResult={handleModalResult}
          />
        )}
      </dialog>
      <form
        className="flex flex-col gap-4 w-full max-w-3xl"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={preventEnterSubmit}
        encType="multipart/form-data"
      >
        {/* register your input into the hook by invoking the "register" function */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-center">
            CePro - Exam Printing Order
          </h1>
          <p>
            Order printed copies of an exam for your class. All fields marked
            with <RedAsterisk /> are required.
          </p>
        </div>

        <FormSection number={1} title="Exam and dates">
          <ReactSelect
            required
            control={control}
            label="Select your exam"
            placeholder="Select course..."
            name={"course"}
            isMultiChoice={false}
            containCourses={true}
            instanceId={1}
          />
          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="Exam Date"
              required
              registration={register("examDate", {
                required: true,
                // The desired delivery date is the business day before the exam
                onChange: (e) =>
                  setValue(
                    "desiredDate",
                    getPreviousBusinessDay(e.target.value),
                    { shouldDirty: true, shouldValidate: true },
                  ),
              })}
            />
            <DateInput
              label="Desired delivery date"
              required
              registration={register("desiredDate", { required: false })}
              error={errors.desiredDate?.message}
            />
          </div>
        </FormSection>
        <FormSection number={2} title="Files and Print settings">
          {user.isAdmin && (
            <Checkbox
              label="Reserved, no files yet"
              description="The exam is booked, the files can be added later."
              checked={hideFiles}
              onChange={(checked) => {
                setHideFiles(checked)
                setFilesError(null)
              }}
            />
          )}
          <FilesAndPrintSettings
            hideFiles={hideFiles}
            selectedFiles={selectedFiles}
            reservedSpecs={reservedSpecs}
            filesError={filesError}
            onFilesChange={handleFilesChange}
            onRemoveFile={handleRemoveFile}
            onFileSpecsChange={handleFileSpecsChange}
            onReservedSpecsChange={setReservedSpecs}
          />
        </FormSection>
        <FormSection number={3} title="Billing and pickup">
          <label htmlFor="financial-center">
            Financial Center <RedAsterisk />
          </label>
          <Callout type="info">
            Contact your administration if you dont know your financial center.
          </Callout>
          <input
            id="financial-center"
            className="mb-2 p-2 border rounded-md accent-red-500 border-slate-300"
            type="text"
            placeholder="FCXXXX"
            maxLength={8}
            {...register("financialCenter", { required: true })}
          />
          {errors.financialCenter && (
            <span className="text-red-600">This field is required</span>
          )}
          <ReactSelect
            required
            control={control}
            label="Contact"
            placeholder="Select contact..."
            name={"contact"}
            isMultiChoice={false}
            instanceId={2}
          />
          <Callout type="warning">
            Only the persons that will be selected here will be authorized to
            come pick up the exam at the Repro.
            <br />
            The Repro will ask for the Camipro of the person that came to pick
            up the exam.
            <br />
            The Repro has the right to not give the exam to the person if they
            are not selected in this list.
          </Callout>
          <ReactSelect
            control={control}
            label="Authorized persons"
            placeholder="Select authorized persons..."
            name={"authorizedPersons"}
            isMultiChoice={true}
            instanceId={3}
          />
          <label>Additional remarks</label>
          <textarea
            className="mb-2 p-2 border rounded-md accent-red-500 border-slate-300"
            {...remarkField}
            placeholder="Additional remarks (optional)"
            onChange={(e) => {
              e.target.value = limitTextToLines(e.target.value)
              remarkField.onChange(e)
              setValue("remark", e.target.value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
          />

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
            <span>
              {isSubmitting ? "Submitting..." : "Submit exam registration"}
            </span>
          </button>
          {(Object.keys(errors).length > 0 || filesError) && (
            <span className="text-red-500">
              The form contains error(s), please see message(s) above to correct
              every error(s).
            </span>
          )}
        </FormSection>
      </form>
    </div>
  )
}
