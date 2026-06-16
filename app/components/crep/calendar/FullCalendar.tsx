"use client"
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction'; // handles event clicks
import { useEffect, useRef, useState, useMemo, Dispatch } from "react";
import { EventDropArg, EventInput, EventSourceInput } from "@fullcalendar/core/index.js";
import { getAllCrepExams, getAllNonAdminExams, updateExamDateById } from "@/app/lib/crep/database";
import { fromDatabaseDateTime, formatDateTimeForDatabase, formatDateTimeInputValue, formatDateYYYYMMDD } from "@/app/lib/dateTime";
import { Modal } from "../../Modal";
import { User } from "next-auth";
import { getAllowedExamStatus } from "@/app/lib/examStatus";
import { Filters } from "../../Filters";
import { ExamSearch } from "./ExamSearch";
import { QueryResult } from "mysql2";
import { Legend } from "../../Legend";
import { EventApi } from "@fullcalendar/core";
import { useSearchParams } from "next/navigation";
import { getPrintingDurationInMinutes } from "@/app/lib/crep/printingDuration";

interface CalendarProps {
  user: AppUser
}

interface AppUser extends User {
  isAdmin?: boolean;
}

function getEndDateOfPrinting(printDate: Date, nbStudents: number): Date {
  return new Date(
    fromDatabaseDateTime(printDate).getTime() +
      getPrintingDurationInMinutes(nbStudents) * 60000
  );
}

export default function Calendar({ user }: CalendarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventApi>();

  const searchParams = useSearchParams();
  const openExamParam = searchParams.get('openExam');
  const dayParam = searchParams.get('day');
  const hasOpenedExamFromQueryRef = useRef(false);

  const [exams, setExams] = useState<EventSourceInput | undefined>();
  const calRef = useRef<FullCalendar | null>(null);

  const [filters, setFilters] = useState<{ label: string, value: string }[]>([]);
  const availableStatus = useMemo(
    () => getAllowedExamStatus(user.isAdmin || false),
    [user.isAdmin]
  );

  useEffect(() => {
    (async function () {
      const data = user.isAdmin ? await getAllCrepExams() as Array<QueryResult> : await getAllNonAdminExams() as Array<QueryResult>;
      const startDate = new Date();

      const filteredData = data.map((e: EventInput, i: number) => {
        const currentStart = new Date(startDate);
        currentStart.setDate(startDate.getDate() + i);

        const currentEnd = new Date(currentStart);
        currentEnd.setHours(currentStart.getHours() + 1);
        const eventColor = availableStatus.find(status => status.value === e.status)?.fcColor;
        return {
          title: `${e.exam_code} - ${e.exam_name}`,
          start: formatDateTimeInputValue(fromDatabaseDateTime(e.print_date)),
          end: formatDateTimeInputValue(getEndDateOfPrinting(e.print_date, e.exam_students)),
          description: e.exam_name,
          durationEditable: false,
          id: e.id,
          status: e.status,
          backgroundColor: eventColor,
          borderColor: eventColor,
          remark: e.remark,
          reproRemark: e.repro_remark,
          financialCenter: e.financial_center,
          examDate: e.exam_date,
          copiesNumber: e.exam_students,
          pagesPerCopy: e.exam_pages,
          paperFormat: e.paper_format,
          paperColor: e.paper_color,
          needScan: e.need_scan,
          contact: e.contact,
          authorizedPersons: e.authorized_persons,
          files: e.files,
          desiredDate: e.desired_date,
          code: e.exam_code,
          print: e.print,
          boxes: e.boxes,
          priceUnit: e.price_unit,
          priceTotal: e.price_total,
        }
      })
      setExams(filteredData);
    })();
  }, [availableStatus, user.isAdmin])

  const startOfDay = (date: Date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const handleEventDrop = async (arg: EventDropArg) => {
    const id = arg.event.id;
    const startDate = arg.event.start;
    const formattedStartDate = arg.event.startStr
      ? arg.event.startStr.slice(0, 19).replace("T", " ")
      : formatDateTimeForDatabase(startDate || new Date());
    const formattedEventStart = arg.event.startStr
      ? arg.event.startStr.slice(0, 19)
      : startDate ? formatDateTimeInputValue(startDate) : undefined;
    const formattedEventEnd = arg.event.endStr
      ? arg.event.endStr.slice(0, 19)
      : arg.event.end ? formatDateTimeInputValue(arg.event.end) : undefined;
    const previousEventStart = arg.oldEvent.startStr
      ? arg.oldEvent.startStr.slice(0, 19)
      : arg.oldEvent.start ? formatDateTimeInputValue(arg.oldEvent.start) : undefined;
    const previousEventEnd = arg.oldEvent.endStr
      ? arg.oldEvent.endStr.slice(0, 19)
      : arg.oldEvent.end ? formatDateTimeInputValue(arg.oldEvent.end) : undefined;

    const newStart = arg.event.start;
    const examDateRaw = arg.event.extendedProps.examDate;

    if (!newStart || !examDateRaw) {
      arg.revert();
      return;
    }

    const movedDate = startOfDay(newStart);
    const examDate = startOfDay(new Date(examDateRaw));

    if (movedDate > examDate) {
      arg.revert();
      return;
    }

    if (!formattedEventStart) {
      arg.revert();
      return;
    }

    setExams((currentExams: EventSourceInput | undefined) => Array.isArray(currentExams)
      ? currentExams.map((exam: EventInput) => exam.id == id
        ? {
          ...exam,
          start: formattedEventStart,
          end: formattedEventEnd,
        }
        : exam)
      : currentExams
    );
    eventsCacheRef.current = { key: "", events: [] };

    try {
      await updateExamDateById(id, formattedStartDate)
    } catch (error) {
      setExams((currentExams: EventSourceInput | undefined) => Array.isArray(currentExams)
        ? currentExams.map((exam: EventInput) => exam.id == id
          ? {
            ...exam,
            start: previousEventStart,
            end: previousEventEnd,
          }
          : exam)
        : currentExams
      );
      eventsCacheRef.current = { key: "", events: [] };
      arg.revert();
      console.error("Failed to update exam print date", error);
    }
  }

  const eventsCacheRef = useRef<{ key: string; events: EventInput[] }>({ key: "", events: [] });

  const statusColorMap = useMemo(() => {
    const m = new Map<string, string>();
    (availableStatus || []).forEach(s => m.set(s.value, s.fcColor || "#000000"));
    return m;
  }, [availableStatus]);

  function parseDayParam(value: string): Date | null {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/); // YYYY-MM-DD
    if (!match) return null;

    const [, year, month, day] = match;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));

    if (
      parsedDate.getFullYear() !== Number(year) ||
      parsedDate.getMonth() !== Number(month) - 1 ||
      parsedDate.getDate() !== Number(day)
    ) {
      return null;
    }

    return parsedDate;
  }

  const targetDayDate = useMemo(() => {
    if (!dayParam) return undefined;

    const targetDate = parseDayParam(dayParam);
    if (!targetDate) return undefined;

    return targetDate;
  }, [dayParam]);

  function openExamModal(calendarEvent: EventApi, examsList: EventInput[]) {
    const clickedExam = examsList.find((e: EventInput) => e.id == calendarEvent.id);
    if (!clickedExam?.contact) return;

    const contact = JSON.parse(clickedExam.contact);
    const folderName = `${clickedExam.code}_${contact.lastname}_${formatDateYYYYMMDD(clickedExam.desiredDate)}`;

    calendarEvent.setExtendedProp('status', clickedExam.status);
    calendarEvent.setExtendedProp('remark', clickedExam.remark);
    calendarEvent.setExtendedProp('reproRemark', clickedExam.reproRemark);
    calendarEvent.setExtendedProp('financialCenter', clickedExam.financialCenter);
    calendarEvent.setExtendedProp('examDate', clickedExam.examDate);
    calendarEvent.setExtendedProp('copiesNumber', clickedExam.copiesNumber);
    calendarEvent.setExtendedProp('pagesPerCopy', clickedExam.pagesPerCopy);
    calendarEvent.setExtendedProp('paperFormat', clickedExam.paperFormat);
    calendarEvent.setExtendedProp('paperColor', clickedExam.paperColor);
    calendarEvent.setExtendedProp('needScan', clickedExam.needScan);
    calendarEvent.setExtendedProp('contact', JSON.parse(clickedExam.contact));
    calendarEvent.setExtendedProp('authorizedPersons', JSON.parse(clickedExam.authorizedPersons)); // Necessary since it's an Array of objects.
    calendarEvent.setExtendedProp('files', JSON.parse(clickedExam.files)); // Necessary since it's an Array of strings.
    calendarEvent.setExtendedProp('desiredDate', clickedExam.desiredDate);
    calendarEvent.setExtendedProp('folderName', folderName);
    calendarEvent.setExtendedProp('printSchedule', clickedExam.start);
    calendarEvent.setExtendedProp('print', clickedExam.print);
    calendarEvent.setExtendedProp('boxes', clickedExam.boxes);
    calendarEvent.setExtendedProp('priceUnit', clickedExam.priceUnit);
    calendarEvent.setExtendedProp('priceTotal', clickedExam.priceTotal);
    setSelectedEvent(calendarEvent);

    const dialog = document.getElementById("modal") as HTMLDialogElement | null;
    dialog?.showModal();
    setModalOpen(true);
  }

  function handleSearchSelect(exam: EventInput) {
    const api = calRef.current?.getApi();
    if (!api || !exam.start) return;

    const printDate = new Date(exam.start as string);
    if (Number.isNaN(printDate.getTime())) return;

    // Jump the calendar to the week of the selected exam, then open its modal.
    api.gotoDate(printDate);

    window.requestAnimationFrame(() => {
      const calendarEvent = api.getEventById(String(exam.id));
      if (!calendarEvent || !Array.isArray(exams)) return;
      openExamModal(calendarEvent, exams as EventInput[]);
    });
  }

  useEffect(() => {
    if (!openExamParam || hasOpenedExamFromQueryRef.current || !Array.isArray(exams)) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const examToOpen = exams
      .filter((exam: EventInput) => exam.code == openExamParam && !!exam.start)
      .map((exam: EventInput) => ({
        exam,
        printStartDate: new Date(exam.start as string),
      }))
      .filter(({ printStartDate }) => {
        if (Number.isNaN(printStartDate.getTime())) return false;

        const printDay = new Date(printStartDate);
        printDay.setHours(0, 0, 0, 0);
        return printDay >= today;
      })
      .sort((a, b) => a.printStartDate.getTime() - b.printStartDate.getTime())[0]?.exam;

    if (!examToOpen) return;

    const frameId = window.requestAnimationFrame(() => {
      const calendarEvent = calRef.current?.getApi().getEventById(String(examToOpen.id));
      if (!calendarEvent) return;

      openExamModal(calendarEvent, exams as EventInput[]);
      hasOpenedExamFromQueryRef.current = true;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [exams, openExamParam]);

  function makeEventsKey(
    examsArr: EventSourceInput,
    filtersArr: { label: string, value: string }[],
    examStatusArr: {
      value: string;
      label: string;
      color: string;
      hexColor: string;
      fcColor: string;
      needsAdmin: boolean;
    }[]) {
    const examsPart = Array.isArray(examsArr) ? examsArr.map(e => `${e.id}:${e.status}:${e.start}:${e.end}:${e.boxes}`).join("|") : "";
    const filtersPart = (filtersArr || []).map(f => f.value).join(",");
    const statusPart = (examStatusArr || []).map(s => `${s.value}:${s.fcColor}`).join(",");

    // Key to invalidate the cache if something changed using the exams, the filters or the status.
    return `${examsPart}::${filtersPart}::${statusPart}`;
  }

  return (
    <div className="flex flex-col gap-4 justify-between">
      <div className=" w-full flex flex-row justify-between gap-4 flex-wrap md:flex-nowrap">
        <div className="flex flex-grow-8 flex-row">
          <div className="flex-col ml-4 gap-2 grid grid-cols-4">
            <Legend />
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-auto md:flex-row md:items-start">
          <div className="flex-min-2 md:min-w-64 w-full md:w-auto">
            <ExamSearch
              exams={Array.isArray(exams) ? (exams as EventInput[]) : []}
              onSelect={handleSearchSelect}
            />
          </div>
          <div className="flex-min-2 md:min-w-80 w-full md:w-auto">
            <Filters
              examStatus={availableStatus}
              user={user}
              setFilters={setFilters as Dispatch<unknown>}
            />
          </div>
        </div>
      </div>
      <FullCalendar
        key={targetDayDate ? targetDayDate.toISOString().slice(0, 10) : "current-week"}
        ref={calRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        initialDate={targetDayDate}
        contentHeight="71dvh"
        firstDay={1}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        timeZone="Europe/Zurich"
        expandRows={true}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
        }}
        views={{
          dayGridMonth: { buttonText: 'Month' },
          timeGridWeek: { buttonText: 'Week' },
          timeGridDay: { buttonText: 'Day' },
          listWeek: { buttonText: 'List' },
        }}
        eventClick={(info) => {
          if (!Array.isArray(exams)) return;
          openExamModal(info.event, exams as EventInput[]);
        }}
        editable={user.isAdmin ? true : false}
        selectable={true}
        events={(info, successCallback) => {
          if (!exams) return successCallback([]);

          const key = makeEventsKey(exams, filters, availableStatus);

          // If nothing changed, send back the cache
          if (eventsCacheRef.current.key === key) {
            return successCallback(eventsCacheRef.current.events);
          }

          // Else, calculate the exams list + inject colors
          const allSelectedFiltersValues = filters.map((item: { label: string, value: string }) => item.value);
          const filteredEvents = allSelectedFiltersValues.length === 0
            ? exams
            : (exams as EventInput[]).filter((ev) => allSelectedFiltersValues.includes(ev.status));

          const prepared = (filteredEvents as EventInput[]).map((ev: EventInput) => {
            const color = statusColorMap.get(ev.status) || "#000000";

            const eventStartPrintDate = new Date(ev.start as string);
            const today = new Date();
            const isToday = eventStartPrintDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
            const isBreathingPrint = isToday && ev.status === "toPrint";
            const isMovable = ["registered", "registered-warning", "registered-error", "toPrint"].includes(ev.status);

            return {
              ...ev,
              backgroundColor: color,
              borderColor: isToday && ev.status == "toPrint" ? "#ff47c5" : color,
              classNames: [
                isBreathingPrint ? "fc-event-breathing-pink" : ""
              ].filter(Boolean),
              extendedProps: { ...(ev.extendedProps || {}), status: ev.status, remark: ev.remark, reproRemark: ev.reproRemark, examDate: ev.examDate, boxes: ev.boxes },
              startEditable: isMovable,
            };
          });

          // Put new results in cache
          eventsCacheRef.current = { key, events: prepared };
          successCallback(prepared);
        }}
        allDaySlot={false}
        eventDrop={handleEventDrop}
      />
      {/* dialog modal starts empty, then is populated with event details on click. Closing the modal will reset the state. */}
      <dialog id="modal" className="modal fixed inset-0 z-50 m-0 h-dvh w-screen max-h-none max-w-none overflow-y-auto bg-transparent p-4 backdrop:backdrop-blur-xs open:flex open:items-center open:justify-center md:p-8" onClose={() => {
        setModalOpen(false);
      }}>
        {modalOpen && (
          <Modal
            event={selectedEvent}
            user={user}
            exams={exams}
            setExams={setExams}
            examStatus={availableStatus}
          />
        )}
      </dialog >
    </div>
  );
}
