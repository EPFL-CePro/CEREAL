import {
  AcademicCapIcon,
  ArchiveBoxIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  Cog6ToothIcon,
  FolderOpenIcon,
  PlusCircleIcon,
  UserMinusIcon,
} from "@heroicons/react/24/outline"

export const navIcons = {
  academicCap: AcademicCapIcon,
  archiveBox: ArchiveBoxIcon,
  calendarDays: CalendarDaysIcon,
  chartBar: ChartBarIcon,
  chartPie: ChartPieIcon,
  clipboardCheck: ClipboardDocumentCheckIcon,
  clipboardList: ClipboardDocumentListIcon,
  clock: ClockIcon,
  cog: Cog6ToothIcon,
  folderOpen: FolderOpenIcon,
  plusCircle: PlusCircleIcon,
  userMinus: UserMinusIcon,
}

export type NavIconName = keyof typeof navIcons
