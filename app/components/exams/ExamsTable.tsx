'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { deleteExam, getAllAcademicYears, getAllExamStatus, getAllExamTypes, getAllSections, getAllServiceLevels, getAllServices, getExamsByAcademicYear, updateExamDate, updateExamPagesNumber, updateExamRemark, updateExamResponsible, updateExamService, updateExamServiceLevel, updateExamStatus, updateExamStudentsNumber, updateExamType } from '@/app/lib/database'
import { Exam } from '@/types/exam'
import { FormattedAcademicYear } from '@/types/academicYear'
import { useRouter } from 'next/navigation'
import { ServiceLevel } from '@/types/serviceLevel'
import { Service } from '@/types/service'
import { ExamType } from '@/types/examType'
import { ExamStatus } from '@/types/examStatus'
import { FormattedSection } from '@/types/section'
import { fetchCeproAdminsIT, fetchPersonBySciper } from '@/app/lib/api'
import { EPFLUser } from '@/types/user'
import { GroupUser } from '@/types/groupUser'

interface ExamsTableProps {
  academicYear: string
}

export default function ExamsTable({ academicYear }: ExamsTableProps) {
  const router = useRouter()
  const [globalFilter, setGlobalFilter] = React.useState('') // Plain text searching, searching in the whole table
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [exams, setExams] = React.useState<Exam[]>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [academicYears, setAcademicYears] = React.useState<FormattedAcademicYear[]>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [allServiceLevels, setAllServiceLevels] = React.useState<ServiceLevel[]>([])
  const [allServices, setAllServices] = React.useState<Service[]>([])
  const [allExamTypes, setAllExamTypes] = React.useState<ExamType[]>([])
  const [allExamStatus, setAllExamStatus] = React.useState<ExamStatus[]>([])
  const [allSections, setAllSections] = React.useState<FormattedSection[]>([])
  const [selectedExam, setSelectedExam] = React.useState<Exam | null>(null)
  const [selectedContact, setSelectedContact] = React.useState<EPFLUser | null>(null)
  const [isLoadingContact, setIsLoadingContact] = React.useState(false)
  const [isLoadingTable, setIsLoadingTable] = React.useState(true)
  const [allCeproAdminsIT, setAllCeproAdminsIT] = React.useState<GroupUser[]>([])
  const latestContactRequest = React.useRef<string | null>(null)
  const compactSelectClassName =
    'h-9 max-w-[9rem] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-600'
  const compactInputClassName =
    'h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-600'

  const updateExamInState = React.useCallback(
    (examId: string, updates: Partial<Exam>) => {
      setExams((currentExams) =>
        currentExams.map((exam) =>
          exam.id === examId ? { ...exam, ...updates } : exam
        )
      )
      setSelectedExam((currentExam) =>
        currentExam?.id === examId ? { ...currentExam, ...updates } : currentExam
      )
    },
    []
  )

  React.useEffect(() => {
    let isActive = true
    setIsLoadingTable(true)

    ;(async function () {
      try {
        const [
          allExamsForAcademicYear,
          serviceLevels,
          services,
          examTypes,
          examStatus,
          sections,
          allAcademicYears,
          ceproAdminsIT,
        ] = await Promise.all([
          getExamsByAcademicYear(academicYear) as Promise<Exam[]>,
          getAllServiceLevels(),
          getAllServices(),
          getAllExamTypes(),
          getAllExamStatus(),
          getAllSections(),
          getAllAcademicYears() as Promise<FormattedAcademicYear[]>,
          fetchCeproAdminsIT() as Promise<GroupUser[]>,
        ])

        if (!isActive) return

        setExams(allExamsForAcademicYear)
        setAllServiceLevels(serviceLevels)
        setAllServices(services)
        setAllExamTypes(examTypes)
        setAllExamStatus(examStatus)
        setAllSections(sections)
        setAcademicYears(allAcademicYears.reverse()) // Reversing so that the most recent academic year is at the top of the select
        setAllCeproAdminsIT(ceproAdminsIT)
      } finally {
        if (isActive) {
          setIsLoadingTable(false)
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [academicYear])

  const handleOpenExamDetails = async (exam: Exam) => {
    setSelectedExam(exam)
    setSelectedContact(null)
    setIsLoadingContact(true)
    latestContactRequest.current = exam.contact

    try {
      const person = await fetchPersonBySciper(exam.contact)
      if (latestContactRequest.current === exam.contact) {
        setSelectedContact(person)
      }
    } catch (error) {
      console.error('Failed to fetch contact person', error)
    } finally {
      if (latestContactRequest.current === exam.contact) {
        setIsLoadingContact(false)
      }
    }
  }

  type RemarkTextareaProps = {
    id: string;
    initialValue?: string;
  };

  function RemarkTextarea({ id, initialValue }: RemarkTextareaProps) {
    const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

    return (
      <textarea
        className="min-h-[4.5rem] w-[13rem] rounded-xl border border-slate-200 bg-slate-50 p-2 text-sm text-slate-700"
        defaultValue={initialValue || ''}
        rows={2}
        onChange={(e) => {
          const value = e.target.value;

          if (debounceRef.current) {
            clearTimeout(debounceRef.current);
          }

          debounceRef.current = setTimeout(async () => {
            await updateExamRemark(id, value)
            updateExamInState(id, { remark: value })
          }, 700);
        }}
      />
    );
  }

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => (
        <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-mono font-semibold tracking-[0.14em] text-red-700">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'name',
      header: 'Course',
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[18rem]">
          <div className="flex items-center text-sm font-semibold text-slate-950 md:text-base">
            <span
              className="mr-2 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: allExamStatus.find((element:ExamStatus) => element.id == row.original.exam_status_id)?.color}}
            />
            <span className="truncate">{row.original.name}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'service_level_id',
      header: 'Service level',
      cell: ({ row }) => (
        <div>
          <select
              defaultValue={allServiceLevels.find((element:ServiceLevel) => element.id == row.original.service_level_id)?.id}
              className={compactSelectClassName}
              onChange={async (e) => {
                await updateExamServiceLevel(row.original.id, e.target.value)
                updateExamInState(row.original.id, {
                  service_level_id: Number(e.target.value),
                })
              }}
            >
              {allServiceLevels.map((serviceLevel) => (
                <option key={serviceLevel.id} value={serviceLevel.id}>
                  {serviceLevel.name}
                </option>
              ))}
            </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const serviceLevelName =
          allServiceLevels
            .find(
              (element: ServiceLevel) => element.id == row.getValue(columnId)
            )
            ?.name.toLowerCase() ?? ''

        return serviceLevelName.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const serviceLevelNameA =
          allServiceLevels
            .find(
              (element: ServiceLevel) => element.id == firstRow.getValue(columnId)
            )
            ?.name.toLowerCase() ?? ''

        const serviceLevelNameB =
          allServiceLevels
            .find(
              (element: ServiceLevel) => element.id == secondRow.getValue(columnId)
            )
            ?.name.toLowerCase() ?? ''

        return serviceLevelNameA.localeCompare(serviceLevelNameB)
      },
    },
    {
      accessorKey: 'service_id',
      header: 'Service',
      cell: ({ row }) => (
        <div>
          <select
              defaultValue={allServices.find((element:Service) => element.id == row.original.service_id)?.id}
              className={compactSelectClassName}
              onChange={async (e) => {
                await updateExamService(row.original.id, e.target.value)
                updateExamInState(row.original.id, {
                  service_id: Number(e.target.value),
                })
              }}
            >
              {allServices.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.code}
                </option>
              ))}
            </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const serviceCode =
          allServices
            .find(
              (element: Service) => element.id == row.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return serviceCode.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const serviceCodeA =
          allServices
            .find(
              (element: Service) => element.id == firstRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        const serviceCodeB =
          allServices
            .find(
              (element: Service) => element.id == secondRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return serviceCodeA.localeCompare(serviceCodeB)
      },
    },
    {
      accessorKey: 'exam_type_id',
      header: 'Exam type',
      cell: ({ row }) => (
        <div>
          <select
              defaultValue={allExamTypes.find((element:ExamType) => element.id == row.original.exam_type_id)?.id}
              className={compactSelectClassName}
              onChange={async (e) => {
                await updateExamType(row.original.id, e.target.value)
                updateExamInState(row.original.id, {
                  exam_type_id: Number(e.target.value),
                })
              }}
            >
              {allExamTypes.map((examType) => (
                <option key={examType.id} value={examType.id}>
                  {examType.code}
                </option>
              ))}
            </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const examTypeCode =
          allExamTypes
            .find(
              (element: ExamType) => element.id == row.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return examTypeCode.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const examTypeCodeA =
          allExamTypes
            .find(
              (element: ExamType) => element.id == firstRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        const examTypeCodeB =
          allExamTypes
            .find(
              (element: ExamType) => element.id == secondRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return examTypeCodeA.localeCompare(examTypeCodeB)
      },
    },
    {
      accessorKey: 'exam_status_id',
      header: 'Exam status',
      cell: ({ row }) => (
        <div>
          <select
              defaultValue={allExamStatus.find((element:ExamStatus) => element.id == row.original.exam_status_id)?.id}
              className={compactSelectClassName}
              onChange={async (e) => {
                await updateExamStatus(row.original.id, e.target.value)
                updateExamInState(row.original.id, {
                  exam_status_id: Number(e.target.value),
                })
              }}
            >
              {allExamStatus.map((examStatus) => (
                <option key={examStatus.id} value={examStatus.id}>
                  {examStatus.code}
                </option>
              ))}
            </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const examStatusCode =
          allExamStatus
            .find(
              (element: ExamStatus) => element.id == row.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return examStatusCode.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const examStatusCodeA =
          allExamStatus
            .find(
              (element: ExamStatus) => element.id == firstRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        const examStatusCodeB =
          allExamStatus
            .find(
              (element: ExamStatus) => element.id == secondRow.getValue(columnId)
            )
            ?.code.toLowerCase() ?? ''

        return examStatusCodeA.localeCompare(examStatusCodeB)
      },
    },
    {
      accessorKey: 'exam_date',
      header: 'Exam date',
      cell: ({ row }) => (
        <div>
          <input
            type="date"
            defaultValue={row.original.exam_date ? (row.original.exam_date as Date).toISOString().split('T')[0] : ''}
            className={`${compactInputClassName} w-[8.5rem]`}
            onChange={async (e) => {
              await updateExamDate(row.original.id, e.target.value)
              updateExamInState(row.original.id, {
                exam_date: e.target.value || null,
              })
            }}
          />
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim()
        if (!search) return true

        const examDate = row.getValue(columnId)

        if (!examDate) return false

        const formattedDate = new Date(examDate as string | Date)
          .toISOString()
          .split('T')[0]

        return formattedDate.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const examDateA = firstRow.getValue(columnId)
        const examDateB = secondRow.getValue(columnId)

        if (!examDateA && !examDateB) return 0
        if (!examDateA) return 1
        if (!examDateB) return -1

        return (
          new Date(examDateA as string | Date).getTime() -
          new Date(examDateB as string | Date).getTime()
        )
      },
    },
    {
      accessorKey: 'exam_semester',
      header: 'Semester',
      cell: ({ row }) => (
        <div className="min-w-0">
          {row.original.exam_semester}
        </div>
      ),
    },
    {
      accessorKey: 'nb_students',
      header: 'NB Students',
      cell: ({ row }) => (
        <div>
          <input
            type="number"
            defaultValue={row.original.nb_students ? row.original.nb_students : ''}
            className={`${compactInputClassName} w-[5.5rem]`}
            onChange={async (e) => {
              await updateExamStudentsNumber(row.original.id, e.target.value)
              updateExamInState(row.original.id, {
                nb_students: e.target.value ? Number(e.target.value) : null,
              })
            }}
          />
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim()
        if (!search) return true

        return !isNaN(Number(search)) && row.original.nb_students == Number(search)
      }
    },
    {
      accessorKey: 'nb_pages',
      header: 'NB Pages',
      cell: ({ row }) => (
        <div>
          <input
            type="number"
            defaultValue={row.original.nb_pages ? row.original.nb_pages : ''}
            className={`${compactInputClassName} w-[5.5rem]`}
            onChange={async (e) => {
              await updateExamPagesNumber(row.original.id, e.target.value)
              updateExamInState(row.original.id, {
                nb_pages: e.target.value ? Number(e.target.value) : null,
              })
            }}
          />
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim()
        if (!search) return true

        return !isNaN(Number(search)) && row.original.nb_pages == Number(search)
      }
    },
    {
      accessorKey: 'remark',
      header: 'Remark',
      cell: ({ row }) => (
        <RemarkTextarea id={row.original.id} initialValue={row.original.remark ? row.original.remark : ''} />
      ),
    },
    {
      accessorKey: 'section_id',
      header: 'Section',
      cell: ({ row }) => (
        <div>
            <input
              className="h-9 w-11 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-sm text-slate-500 opacity-70"
              defaultValue={allSections.find((element:FormattedSection) => element.section.id == row.original.section_id)?.section.code}
              type="text"
              disabled
            />
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const sectionCode =
          allSections
            .find(
              (element: FormattedSection) => element.section.id == row.getValue(columnId)
            )
            ?.section.code.toLowerCase() ?? ''

        return sectionCode.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const sectionCodeA =
          allSections
            .find(
              (element: FormattedSection) => element.section.id == firstRow.getValue(columnId)
            )
            ?.section.code.toLowerCase() ?? ''

        const sectionCodeB =
          allSections
            .find(
              (element: FormattedSection) => element.section.id == secondRow.getValue(columnId)
            )
            ?.section.code.toLowerCase() ?? ''

        return sectionCodeA.localeCompare(sectionCodeB)
      },
    },
    {
      accessorKey: 'responsible_id',
      header: 'Responsible',
      cell: ({ row }) => (
        <div>
          <select
              defaultValue={allCeproAdminsIT.find((element:GroupUser) => Number(element.id) == Number(row.original.responsible_id))?.id}
              className="h-9 max-w-[11rem] rounded-xl border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-600"
              onChange={async (e) => {
                await updateExamResponsible(row.original.id, e.target.value)
                updateExamInState(row.original.id, {
                  responsible_id: e.target.value ? Number(e.target.value) : null,
                })
              }}
            >
              {allCeproAdminsIT.map((adminIT) => (
                <option key={adminIT.id} value={adminIT.id}>
                  {adminIT.display}
                </option>
              ))}
            </select>
        </div>
      ),
      filterFn: (row, columnId, filterValue) => {
        const search = String(filterValue ?? '').trim().toLowerCase()
        if (!search) return true

        const adminITDisplay =
          allCeproAdminsIT
            .find(
              (element: GroupUser) => element.id == row.getValue(columnId)
            )
            ?.display.toLowerCase() ?? ''

        return adminITDisplay.includes(search)
      },
      sortingFn: (firstRow, secondRow, columnId) => {
        const adminITDisplayA =
          allCeproAdminsIT
            .find(
              (element: GroupUser) => element.id == firstRow.getValue(columnId)
            )
            ?.display.toLowerCase() ?? ''

        const adminITDisplayB =
          allCeproAdminsIT
            .find(
              (element: GroupUser) => element.id == secondRow.getValue(columnId)
            )
            ?.display.toLowerCase() ?? ''

        return adminITDisplayA.localeCompare(adminITDisplayB)
      },
    },
    {
      accessorKey: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            className="
              border-2
              border-blue-500
              rounded-lg
              px-3
              py-2
              text-sm
              text-blue-700
              hover:cursor-pointer
              hover:bg-blue-800
              hover:text-white
              hover:border-blue-800
              transition
              ease-in-out
            "
            onClick={() => {
              handleOpenExamDetails(row.original)
            }}
          >
            More
          </button>
          <button
            className="
              border-2
              border-red-500
              rounded-lg
              px-3
              py-2
              text-sm
              text-red-700
              hover:cursor-pointer
              hover:bg-red-800
              hover:text-white
              hover:border-red-800
              transition
              ease-in-out
            "
            onClick={async () => {
              if(window.confirm("Are you sure that you want to delete this exam ? This action is irreversible.")) {
                await deleteExam(row.original.id);
                setExams((currentExams) =>
                  currentExams.filter((exam) => exam.id !== row.original.id)
                )
                setSelectedExam((currentExam) =>
                  currentExam?.id === row.original.id ? null : currentExam
                )
              }
            }}
          >
            Delete
          </button>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ]

  const table = useReactTable({
    data: exams,
    columns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
      pagination,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue ?? '').trim().toLowerCase()

      const examDate = row.original.exam_date
      const formattedExamDate = examDate
        ? new Date(examDate as string | Date).toISOString().split('T')[0]
        : ''

      const responsibleDisplay =
        allCeproAdminsIT
          .find(
            (element: GroupUser) => Number(element.id) == Number(row.original.responsible_id)
          )
          ?.display.toLowerCase() ?? ''

      const remark = row.original.remark?.toLowerCase() ?? ''

      return (
        row.original.name.toLowerCase().includes(search) ||
        row.original.code.toLowerCase().includes(search) ||
        (allServiceLevels.find((element:ServiceLevel) => element.id == row.original.service_level_id)?.name.toLowerCase().includes(search) || false) ||
        (allServices.find((element:Service) => element.id == row.original.service_id)?.code.toLowerCase().includes(search) || false) ||
        (allExamTypes.find((element:ExamType) => element.id == row.original.exam_type_id)?.code.toLowerCase().includes(search) || false) ||
        (allExamStatus.find((element:ExamStatus) => element.id == row.original.exam_status_id)?.code.toLowerCase().includes(search) || false) ||
        formattedExamDate.includes(search) ||
        !isNaN(Number(search)) && row.original.exam_semester == Number(search) ||
        !isNaN(Number(search)) && row.original.nb_students == Number(search) ||
        !isNaN(Number(search)) && row.original.nb_pages == Number(search) ||
        remark.includes(search) ||
        (allSections.find((element:FormattedSection) => element.section.id == row.original.section_id)?.section.code.toLowerCase().includes(search) || false) ||
        responsibleDisplay.includes(search)
      )
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rowCount = table.getRowModel().rows.length
  const totalRows = table.getRowCount()
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = table.getPageCount()
  const startRow =
    rowCount === 0
      ? 0
      : table.getState().pagination.pageIndex *
          table.getState().pagination.pageSize +
        1
  const endRow = rowCount === 0 ? 0 : startRow + rowCount - 1
  const selectedServiceLevel = selectedExam
    ? allServiceLevels.find(
        (element: ServiceLevel) => element.id == selectedExam.service_level_id
      )?.name
    : ''
  const selectedService = selectedExam
    ? allServices.find((element: Service) => element.id == selectedExam.service_id)
        ?.code
    : ''
  const selectedExamType = selectedExam
    ? allExamTypes.find(
        (element: ExamType) => element.id == selectedExam.exam_type_id
      )?.code
    : ''
  const selectedExamStatus = selectedExam
    ? allExamStatus.find(
        (element: ExamStatus) => element.id == selectedExam.exam_status_id
      )?.code
    : ''
  const selectedSection = selectedExam
    ? allSections.find(
        (element: FormattedSection) => element.section.id == selectedExam.section_id
      )?.section.code
    : ''
  const formattedSelectedExamDate =
    selectedExam?.exam_date
      ? new Date(selectedExam.exam_date as string | Date).toISOString().split('T')[0]
      : 'Not set'
  const formattedSelectedContact = selectedContact
    ? `${selectedContact.firstname} ${selectedContact.lastname} (${selectedContact.email})`
    : isLoadingContact
      ? 'Loading...'
      : selectedExam?.contact || 'Not set'

  return (
    <div className="min-h-screen px-4 py-8 md:px-8 md:py-10 lg:px-14">
      <div className="mx-auto">
        <div className="mb-6 overflow-hidden rounded-[2rem] backdrop-blur">
          <div className="px-6 py-5 md:px-8">
            <div className="max-w-7xl ml-auto mr-auto flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-4 lg:flex-row">
                <label className="group flex h-14 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100 lg:max-w-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-focus-within:bg-red-100">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Search
                    </div>
                    <input
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                      placeholder="Search an exam..."
                      className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 md:text-base"
                    />
                  </div>
                </label>

                <label className="flex h-14 min-w-[16rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm xl:ml-auto">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M7 4h10" />
                      <path d="M5 8h14" />
                      <path d="M8 12h8" />
                      <path d="M10 16h4" />
                      <path d="M12 20v-4" />
                    </svg>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Academic year
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={academicYear}
                        disabled={isLoadingTable}
                        aria-busy={isLoadingTable}
                        className="w-full border-none bg-transparent text-sm font-medium text-slate-700 outline-none disabled:cursor-wait disabled:text-slate-400 md:text-base"
                        onChange={(e) => {
                          setIsLoadingTable(true)
                          router.push(`/exams/${e.target.value}`)
                        }}
                      >
                        {academicYears.map((academic) => (
                          <option key={academic.label} value={academic.label}>
                            {academic.label}
                          </option>
                        ))}
                      </select>

                      {isLoadingTable && (
                        <span
                          className="inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-slate-300 border-t-red-500"
                          aria-label="Loading academic year data"
                        />
                      )}
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)]">
          {isLoadingTable && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-red-500"
                  aria-hidden="true"
                />
                Loading exams...
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50/80">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="align-top">
                  {headerGroup.headers.map((header) => {
                    const isSorted = header.column.getIsSorted()
                    const canSort = header.column.getCanSort()
                    const canFilter = header.column.getCanFilter()

                    return (
                      <th
                        key={header.id}
                        className={`border-b border-slate-200 px-4 py-4 text-left align-top first:pl-5 last:pr-5 ${
                          header.column.id === 'actions'
                            ? 'sticky right-0 z-20 bg-slate-50/95 min-[3150px]:static min-[3150px]:bg-transparent'
                            : ''
                        }`}
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <div className="flex flex-col gap-2.5">
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-slate-900"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}

                              <span
                                aria-hidden="true"
                                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[0.65rem] ${
                                  isSorted
                                    ? 'border-red-200 bg-red-50 text-red-600'
                                    : 'border-slate-200 bg-white text-slate-400'
                                }`}
                              >
                                {isSorted === 'asc' && '▼'}
                                {isSorted === 'desc' && '▲'}
                                {!isSorted && '•'}
                              </span>
                            </button>

                            {canFilter && (
                              <label className="group flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 shadow-sm transition focus-within:border-red-300 focus-within:ring-4 focus-within:ring-red-100">
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4 shrink-0 text-slate-400 transition group-focus-within:text-red-500"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="11" cy="11" r="7" />
                                  <path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                  type="text"
                                  value={
                                    (header.column.getFilterValue() ?? '') as string
                                  }
                                  onChange={(e) =>
                                    header.column.setFilterValue(e.target.value)
                                  }
                                  placeholder={`Filter ${String(
                                    header.column.columnDef.header
                                  ).toLowerCase()}...`}
                                  className="w-full min-w-20 border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                                />
                              </label>
                            )}
                          </div>
                        ) : (
                          <div className="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </th>
                    )
                  })}
                  </tr>
                ))}
              </thead>

              <tbody>
                {rowCount === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="px-8 py-16">
                      <div className="flex flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-8 w-8 text-slate-300"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                          </svg>
                        </div>
                        <h3 className="mt-5 text-xl font-semibold text-slate-900">
                          No exams match these filters
                        </h3>
                        <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                          Try broadening your search or clearing a column filter
                          to bring the hidden rows back into view.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="group transition hover:bg-red-50/50"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={`border-b border-slate-100 px-4 py-3.5 align-middle text-slate-900 first:pl-5 last:pr-5 ${
                            index === table.getRowModel().rows.length - 1
                              ? 'border-b-0'
                              : ''
                          } ${
                            cell.column.id === 'actions'
                              ? 'sticky right-0 z-10 bg-white min-[3150px]:static min-[3150px]:bg-transparent'
                              : ''
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="max-w-4xl ml-auto mr-auto mt-5 flex flex-col gap-4 rounded-[1.75rem] border border-slate-200/80 bg-white px-5 py-4 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)] md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-800">{startRow}</span>
              {' '}- <span className="font-semibold text-slate-800">{endRow}</span>
              {' '}from <span className="font-semibold text-slate-800">{totalRows}</span>
              {' '}exams
            </div>
            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <span className="font-medium text-slate-500">Rows</span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="border-none bg-transparent font-semibold text-slate-800 outline-none"
              >
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} per page
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600">
              Page <span className="text-slate-900">{currentPage}</span> of{' '}
              <span className="text-slate-900">{Math.max(totalPages, 1)}</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold transition ${
                  !table.getCanPreviousPage()
                    ? 'cursor-not-allowed text-slate-300'
                    : 'text-slate-700 hover:bg-slate-100 cursor-pointer'
                }`}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
              >
                ‹
              </button>
              <button
                type="button"
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold transition ${
                  !table.getCanNextPage()
                    ? 'cursor-not-allowed text-slate-300'
                    : 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
                }`}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/25 backdrop-blur-sm">
            <dialog
              open
              className="modal top-1/8 left-1/8 w-3/4 rounded-xl opacity-98 drop-shadow-2xl md:left-1/4 md:w-2/4"
              onClose={() => {
                setSelectedExam(null)
                setSelectedContact(null)
                setIsLoadingContact(false)
              }}
            >
              <div className="rounded-xl bg-white p-8 text-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Exam details
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{selectedExam.name}</h2>
                  <p className="mt-1 font-mono text-sm text-slate-500">{selectedExam.code}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExam(null)
                    setSelectedContact(null)
                    setIsLoadingContact(false)
                  }}
                  className="
                    rounded-full
                    border
                    border-red-400
                    px-3
                    py-1
                    text-sm
                    text-gray-600
                    hover:bg-red-600
                    hover:text-white
                    hover:cursor-pointer
                    transition
                    ease-in-out
                  "
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Service level</p>
                  <p className="mt-1 text-sm font-medium">{selectedServiceLevel || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Service</p>
                  <p className="mt-1 text-sm font-medium">{selectedService || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Exam type</p>
                  <p className="mt-1 text-sm font-medium">{selectedExamType || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Status</p>
                  <p className="mt-1 text-sm font-medium">{selectedExamStatus || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Exam date</p>
                  <p className="mt-1 text-sm font-medium">{formattedSelectedExamDate}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Semester</p>
                  <p className="mt-1 text-sm font-medium">{selectedExam.exam_semester}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Students</p>
                  <p className="mt-1 text-sm font-medium">{selectedExam.nb_students ?? 'Not set'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pages</p>
                  <p className="mt-1 text-sm font-medium">{selectedExam.nb_pages ?? 'Not set'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Section</p>
                  <p className="mt-1 text-sm font-medium">{selectedSection || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Contact</p>
                  <p className="mt-1 text-sm font-medium">{formattedSelectedContact}</p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Remark</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium">
                  {selectedExam.remark || 'No remark'}
                </p>
              </div>
              </div>
            </dialog>
          </div>
        )}
      </div>
    </div>
  )
}
