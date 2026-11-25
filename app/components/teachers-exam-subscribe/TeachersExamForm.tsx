"use client"
// This form allows users to register their exams into the system.
import { useEffect, useState } from "react"

import Link from "next/link"

import { zodResolver } from "@hookform/resolvers/zod"
import { type User } from "next-auth"
import {
  Controller,
  useForm,
  type SubmitHandler,
  useFieldArray,
  useWatch,
} from "react-hook-form"
import { toast } from "sonner"

import Callout from "@/app/components/ui/Callout"
import Checkbox from "@/app/components/forms/Checkbox"
import ChoiceCards from "@/app/components/forms/ChoiceCards"
import DateInput from "@/app/components/forms/DateInput"
import FormSection from "@/app/components/forms/FormSection"
import { FieldError } from "@/app/components/forms/FieldError"
import { getAllExamTypes, getAllServices } from "@/app/lib/database"
import { subscribeExams } from "@/app/lib/exam-subscription/actions"
import {
  examSubscriptionSchema,
  type ExamSubscription,
} from "@/app/lib/exam-subscription/schema"
import { preventEnterSubmit } from "@/app/lib/forms/prevent-enter-submit"
import { type ExamType } from "@/types/examType"
import { type Service } from "@/types/service"

import ReactSelect from "../forms/ReactSelect"
import { RedAsterisk } from "../forms/RedAsterisk"

interface RegisterProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean
  sciper: string
}

export default function TeachersExamForm({ user }: RegisterProps) {
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

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExamSubscription>({
    resolver: zodResolver(examSubscriptionSchema),
    defaultValues: {
      semester: "1",
      contact: user.sciper,
      examTypes: [],
      remark: "",
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "examTypes",
  })
  const watchedExamTypes = useWatch({ control, name: "examTypes" })

  const showError = (title: string, message: string) =>
    toast.error(title, { description: message })

  const onSubmit: SubmitHandler<ExamSubscription> = async (data) => {
    setIsSubmitting(true)

    try {
      const result = await subscribeExams(data)
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
        onSubmit={handleSubmit(onSubmit, () =>
          showError("Form error", "Please check the form for errors."),
        )}
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
            name="semester"
            render={({ field }) => (
              <ChoiceCards
                required
                label="Exam semester"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "1", label: "Semester 1" },
                  { value: "2", label: "Semester 2" },
                ]}
              />
            )}
          />
          <FieldError message={errors.semester?.message} />
          <div className="flex flex-col gap-2">
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
            <FieldError message={errors.course?.message} />
          </div>
        </FormSection>

        <FormSection number={2} title="Exam types and dates">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-2">
              Exam type <RedAsterisk />
            </legend>
            {examTypes.map((examType) => {
              const index = fields.findIndex(
                (field) => field.examTypeId === examType.id,
              )
              const selected = index !== -1
              return (
                <div key={examType.id} className="flex flex-col gap-3">
                  <Checkbox
                    label={examType.name}
                    checked={selected}
                    onChange={(checked) =>
                      checked
                        ? append({ examTypeId: examType.id, date: "" })
                        : remove(index)
                    }
                  />
                  {selected && (
                    <div className="grid grid-cols-1 gap-4 items-end ml-8 pl-4 border-l-2 border-red-200 sm:grid-cols-2">
                      <DateInput
                        label="Exam Date"
                        registration={register(`examTypes.${index}.date`)}
                      />
                      {/* mb-2 matches the bottom margin of the date input */}
                      <div className="mb-2">
                        <Checkbox
                          label="I don't know yet"
                          // null = "I don't know yet"
                          checked={watchedExamTypes?.[index]?.date === null}
                          onChange={(checked) =>
                            setValue(
                              `examTypes.${index}.date`,
                              checked ? null : "",
                              { shouldValidate: true },
                            )
                          }
                        />
                      </div>
                      {errors.examTypes?.[index]?.date && (
                        <div className="sm:col-span-2">
                          <FieldError
                            message={errors.examTypes[index].date.message}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <FieldError
              message={
                errors.examTypes?.message ?? errors.examTypes?.root?.message
              }
            />
          </fieldset>
        </FormSection>

        <FormSection number={3} title="Service">
          <Controller
            control={control}
            name="serviceId"
            render={({ field }) => (
              <ChoiceCards
                required
                label="Service"
                value={field.value ? String(field.value) : ""}
                onChange={(value) => field.onChange(Number(value))}
                options={services.map((service) => ({
                  value: String(service.id),
                  label: service.description,
                }))}
              />
            )}
          />
          <FieldError message={errors.serviceId?.message} />
        </FormSection>

        <FormSection number={4} title="Contact and remarks">
          <Callout type="warning">
            Please select here the person <u>from your course</u> who will be in
            contact with CePro for preparation. This is the person who will
            coordinate the preparation of the exam and with whom CePro will be
            in contact depending on the level of support. This does not preclude
            having several people for the preparation of your exam, but we
            prefer to have just one contact person for organisational reasons.
          </Callout>
          <ReactSelect
            required
            control={control}
            label="Contact"
            placeholder="Select contact..."
            name={"contact"}
            isMultiChoice={false}
            instanceId={2}
          />
          <FieldError message={errors.contact?.message} />
          <label htmlFor="remark">Additional remarks</label>
          <textarea
            id="remark"
            className="mb-2 rounded-md border border-slate-300 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            {...register("remark")}
            placeholder="Additional remarks (optional)"
          />
          <FieldError message={errors.remark?.message} />

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
