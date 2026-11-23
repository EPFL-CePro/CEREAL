"use client"
// This form allows users to register their exams into the system.
import { useEffect, useState } from "react"

import Link from "next/link"

import { type User } from "next-auth"
import {
  Controller,
  useForm,
  type SubmitHandler,
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { toast } from "sonner"

import Callout from "@/app/components/Callout"
import Checkbox from "@/app/components/crep/register/Checkbox"
import ChoiceCards from "@/app/components/crep/register/ChoiceCards"
import DateInput from "@/app/components/crep/register/DateInput"
import FormSection from "@/app/components/crep/register/FormSection"
import { getAllExamTypes, getAllServices } from "@/app/lib/database"
import { subscribeExams } from "@/app/lib/exam-subscription/subscribe-exams"
import { preventEnterSubmit } from "@/app/lib/forms/prevent-enter-submit"
import { type ExamType } from "@/types/examType"
import { type Inputs } from "@/types/inputs"
import { type Service } from "@/types/service"

import ReactSelect from "./ReactSelect"
import { RedAsterisk } from "../RedAsterisk"

interface RegisterProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean
  sciper: string
}

export default function App({ user }: RegisterProps) {
  const [services, setServices] = useState<Service[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    ;(async () => {
      const allServices = await getAllServices()
      setServices(allServices)

      const allExamTypes = await getAllExamTypes()
      setExamTypes(allExamTypes)
    })()
  }, [])

  const { control, register, handleSubmit, reset } = useForm<Inputs>({
    defaultValues: {
      contact: user.sciper,
      examType: [],
    },
  })

  useEffect(() => {
    if (!examTypes.length) return

    reset((prev) => ({
      ...prev,
      examType: examTypes.map((examType) => ({
        id: examType.id,
        code: examType.code,
        name: examType.name,
        checked: false,
        date: "",
        dontKnowYet: false,
      })),
    }))
  }, [examTypes, reset])

  const { fields } = useFieldArray({
    control,
    name: "examType",
  })
  const watchedExamTypes = useWatch({ control, name: "examType" })

  const showError = (title: string, message: string) =>
    toast.error(title, { description: message })

  const onSubmit: SubmitHandler<Inputs> = async (data) => {
    setIsSubmitting(true)
    if (!data.course) {
      showError("Course Selection Error", "Please select a course.")
      setIsSubmitting(false)
      return
    }

    if (!data.examType.some((examType) => examType.checked)) {
      showError(
        "Exam type selection Error",
        "Please select at least one exam type.",
      )
      setIsSubmitting(false)
      return
    }

    for (let index = 0; index < data.examType.length; index++) {
      const examType = data.examType[index]
      if (!examType.checked) continue

      if (!examType.dontKnowYet && !examType.date) {
        showError(
          "Exam type selection Error",
          `Please select a date for your exam type "${examType.name}". If you are not sure about the date, please check the "I don't know yet" box.`,
        )
        setIsSubmitting(false)
        return
      }

      if (examType.date && examType.dontKnowYet) {
        showError(
          "Exam type selection Error",
          `You have checked the "I don't know yet" box for your "${examType.name}" exam type, but a date is also selected. Please either only check the "I don't know yet" box, or only select a date for the exam.`,
        )
        setIsSubmitting(false)
        return
      }
    }

    if (!data.service) {
      showError("Service Selection Error", "Please select a service.")
      setIsSubmitting(false)
      return
    }

    if (!data.contact) {
      showError("Contact Selection Error", "Please select a contact.")
      setIsSubmitting(false)
      return
    }

    try {
      const result = await subscribeExams({
        semester: data.examSemester,
        course: data.course,
        examTypes: data.examType
          .filter((examType) => examType.checked)
          .map((examType) => ({
            examTypeId: examType.id,
            date: examType.dontKnowYet ? null : examType.date,
          })),
        serviceId: Number(data.service),
        contact: data.contact,
        remark: data.remark,
      })

      if (!result.success) {
        showError("Registration Error", result.error)
        return
      }
      if (result.warning) {
        toast.warning("Registration Successful", {
          description: result.warning,
          duration: 10000,
        })
      } else {
        toast.success("Registration Successful", {
          description: `Your Exam ${data.course.exam.code} has been registered and a confirmation has been sent to your email.`,
        })
      }
      reset()
    } catch (err) {
      console.error(err)
      showError(
        "Unexpected Error",
        "An unexpected error occurred while registering the exam.",
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    /* "handleSubmit" will validate your inputs before invoking "onSubmit" */
    <div className="flex flex-col items-center m-24">
      <form
        className="flex flex-col gap-4 w-full max-w-3xl"
        onSubmit={handleSubmit(onSubmit)}
        onKeyDown={preventEnterSubmit}
        encType="multipart/form-data"
      >
        {/* register your input into the hook by invoking the "register" function */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-center">
            CePro — Exam service subscription
          </h1>
          <p>
            Please provide us all the necessary information about your exam (end
            of semester exams){" "}
            <u>2 months before the date of your assessment.</u> Those
            information will allow us to plan technical support according to
            service levels. All fields marked with <RedAsterisk /> are required.
          </p>
          <Callout type="info">
            For more information about the different services and levels
            provided by the CePro, see{" "}
            <Link
              className="underline font-medium"
              href="https://exadoc.epfl.ch/"
              target="_blank"
            >
              Learn more
            </Link>
            .
          </Callout>
        </div>

        <FormSection number={1} title="Exam">
          <Controller
            control={control}
            name="examSemester"
            defaultValue="1"
            render={({ field }) => (
              <ChoiceCards
                legend="Exam semester *"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "1", label: "Semester 1" },
                  { value: "2", label: "Semester 2" },
                ]}
              />
            )}
          />
          <div>
            <h3>
              Select your exam <RedAsterisk />
            </h3>
            <ReactSelect
              control={control}
              label={"course"}
              name={"course"}
              isMultiChoice={false}
              containCourses={true}
              instanceId={1}
            />
          </div>
        </FormSection>

        <FormSection number={2} title="Exam types and dates">
          <p>
            Exam type <RedAsterisk />
          </p>
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-3">
              <Controller
                control={control}
                name={`examType.${index}.checked`}
                render={({ field: checkbox }) => (
                  <Checkbox
                    label={field.name}
                    checked={Boolean(checkbox.value)}
                    onChange={checkbox.onChange}
                  />
                )}
              />
              {watchedExamTypes?.[index]?.checked && (
                <div className="grid grid-cols-1 gap-4 items-end ml-8 pl-4 border-l-2 border-red-200 sm:grid-cols-2">
                  <DateInput
                    label="Exam Date"
                    registration={register(`examType.${index}.date`)}
                  />
                  <Controller
                    control={control}
                    name={`examType.${index}.dontKnowYet`}
                    render={({ field: checkbox }) => (
                      // mb-2 matches the bottom margin of the date input
                      <div className="mb-2">
                        <Checkbox
                          label="I don't know yet"
                          checked={Boolean(checkbox.value)}
                          onChange={checkbox.onChange}
                        />
                      </div>
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </FormSection>

        <FormSection number={3} title="Service">
          <Controller
            control={control}
            name="service"
            render={({ field }) => (
              <ChoiceCards
                legend="Service *"
                value={field.value ?? ""}
                onChange={field.onChange}
                options={services.map((service) => ({
                  value: String(service.id),
                  label: service.description,
                }))}
              />
            )}
          />
        </FormSection>

        <FormSection number={4} title="Contact and remarks">
          <label>
            Contact <RedAsterisk />
          </label>
          <Callout type="warning">
            Please select here the person <u>from your course</u> who will be in
            contact with CePro for preparation. This is the person who will
            coordinate the preparation of the exam and with whom CePro will be
            in contact depending on the level of support. This does not preclude
            having several people for the preparation of your exam, but we
            prefer to have just one contact person for organisational reasons.
          </Callout>
          <ReactSelect
            control={control}
            label={"contact"}
            name={"contact"}
            isMultiChoice={false}
            instanceId={2}
          />
          <label htmlFor="remark">Additional remarks</label>
          <textarea
            id="remark"
            className="mb-2 p-2 border rounded-md accent-red-500 border-slate-300"
            {...register("remark")}
            placeholder="Additional remarks (optional)"
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
        </FormSection>
      </form>
    </div>
  )
}
