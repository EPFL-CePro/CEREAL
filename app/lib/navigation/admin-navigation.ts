import type { NavGroup } from "@/app/lib/navigation/navigation"

export const adminNavGroups: NavGroup[] = [
  {
    label: "CREP",
    links: [
      { label: "Calendar", url: "/crep", icon: "calendarDays" },
      { label: "Register an exam", url: "/crep/register", icon: "plusCircle" },
      { label: "Manage exams", url: "/crep/exams", icon: "folderOpen" },
      { label: "Statistics", url: "/crep/stats", icon: "chartBar" },
    ],
  },
  {
    label: "Exams",
    links: [
      { label: "All exams", url: "/exams", icon: "clipboardList" },
      { label: "Statistics", url: "/exams/stats", icon: "chartPie" },
      {
        label: "Digital archiving",
        url: "/digital-archiving",
        icon: "archiveBox",
      },
    ],
  },
  {
    label: "Subscriptions",
    links: [
      {
        label: "Teachers exam subscribe",
        url: "/teachers-exam-subscribe",
        icon: "academicCap",
      },
      {
        label: "Deferred exam subscribe",
        url: "/diff-exam-subscribe",
        icon: "clock",
      },
    ],
  },
  {
    label: "SAC",
    links: [{ label: "Absences", url: "/sac-absences", icon: "userMinus" }],
  },
  {
    label: "Administration",
    links: [{ label: "Admin", url: "/admin", icon: "cog" }],
  },
]
