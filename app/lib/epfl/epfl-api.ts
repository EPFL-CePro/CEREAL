'use server';
import { EPFLUser } from "@/types/user";
import { CourseSelectOption, SelectOption } from "@/types/selectOption";
import { GroupUser } from "@/types/groupUser";
import { Teacher } from "@/types/teacher";
import { getCurrentAcademicYear } from "@/app/lib/dates/academic-year";

function getOasisBaseUrl(): string {
    if (process.env.OASIS_BASE_URL) {
        return process.env.OASIS_BASE_URL;
    }

    return process.env.NODE_ENV === "development"
        ? "https://oasis-t.epfl.ch:8484"
        : "https://oasis.epfl.ch:8484";
}
const EPFL_API_ORIGIN = 'https://api.epfl.ch';
const EPFL_API_BASE = `${EPFL_API_ORIGIN}/v1`;
const getApiEpflCredentials = () => Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64');

const SCIPER_REGEX = /^\d{6}$/;

function assertSciper(sciper: string): void {
    if (!SCIPER_REGEX.test(sciper)) {
        throw new Error("Invalid SCIPER");
    }
}

function epflFetch(url: string | URL) {
    if (new URL(url).origin !== EPFL_API_ORIGIN) {
        throw new Error("Invalid EPFL API URL");
    }

    const headers = new Headers();
    headers.set('Authorization', `Basic ${getApiEpflCredentials()}`);
    return fetch(url, {method: 'GET', headers});
}

// Check that a financial center (FC) exists. Returns an error message if the EPFL API could not be reached.
export async function validateFinancialCenter(financialCenter: string): Promise<boolean | string> {
    const url = new URL(`${EPFL_API_BASE}/funds`);
    url.searchParams.set('cfs', financialCenter);
    url.searchParams.set('pagesize', '1');

    try {
        const res = await epflFetch(url);
        if (!res.ok) return `EPFL API error (${res.status})`;
        const data = await res.json();
        return data.count > 0;
    } catch {
        return 'EPFL API unreachable';
    }
}

export async function fetchPersons(query: string): Promise<SelectOption[]> {
    const url = `${EPFL_API_BASE}/persons?query=${encodeURIComponent(query)}`;
    const res = await epflFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.persons) return [];
    return data.persons.map((p: { id: string, firstname: string, lastname: string, email: string }) => ({
        value: Number(p.id),
        label: `${p.firstname} ${p.lastname}`.trim() || (p.email),
        person: {
            id: Number(p.id),
            firstname: p.firstname,
            lastname: p.lastname,
            email: p.email,
            sciper: p.id,
        }
    })).filter((o: SelectOption) => !!o.value && !!o.person?.email);
}

export async function fetchGroups(query: string): Promise<SelectOption[]> {
    const url = `${EPFL_API_BASE}/groups?name=${encodeURIComponent(query)}`;
    const res = await epflFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.groups) return [];
    return data.groups.map((g: { id: string, name: string }) => ({
        value: g.id,
        label: g.name,
        group: {
            id: g.id,
            name: g.name,
        }
    }));
}

export async function fetchGroupPersons(groupId: string): Promise<SelectOption[]> {
    const url = `${EPFL_API_BASE}/groups/${encodeURIComponent(groupId)}/persons?pagesize=0`;
    const res = await epflFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.persons) return [];
    return data.persons.map((p: { id: string, display: string, email: string, type?: string }) => ({
        value: Number(p.id),
        label: p.display,
        person: {
            id: Number(p.id),
            firstname: p.display,
            email: p.email,
            sciper: p.id,
        }
    })).filter((o: SelectOption) => !!o.value && !isNaN(Number(o.value)) && !!o.person?.email);
}

export async function fetchPersonBySciper(sciper: string): Promise<EPFLUser> {
    assertSciper(sciper);
    const url = `${EPFL_API_BASE}/persons/${sciper}`;
    const res = await epflFetch(url);
    const data = await res.json();
    return data;
}

export async function fetchMultiplePersonsBySciper(scipersWithCommas: string): Promise<EPFLUser[]> {
    const scipers = scipersWithCommas.split(",").filter(Boolean);
    if (scipers.length === 0) return [];
    scipers.forEach(assertSciper);

    const url = `${EPFL_API_BASE}/persons?ids=${encodeURIComponent(scipers.join(","))}`;
    const res = await epflFetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.persons;
}

interface OasisTeacherCourse {
    coursNomFr: string;
    coursCode?: string;
    enseignantPrenom: string;
    enseignantNom: string;
    enseignantSciper?: string;
    enseignantRole?: string;
    coursSeanceCode?: string;
}

// Oasis returns one row per teacher-course relation.
async function fetchOasisTeacherCourses(academicYear: string): Promise<OasisTeacherCourse[]> {
    const url = `${getOasisBaseUrl()}/enseignant-cours/${academicYear}?type=Enseignement`;
    const headers = new Headers();
    const bearerToken = process.env.OASIS_BEARER;
    if (bearerToken) {
        headers.set('Authorization', `Bearer ${bearerToken}`);
    }

    const res = await fetch(url, {method: 'GET', headers});
    if (!res.ok) return [];
    const data = await res.json();
    return data as OasisTeacherCourse[];
}

function addTeacherOnce(teachers: Teacher[], row: OasisTeacherCourse) {
    const alreadyListed = teachers.some(t =>
        row.enseignantSciper
            ? t.sciper === row.enseignantSciper
            : t.firstname === row.enseignantPrenom && t.name === row.enseignantNom
    );
    if (!alreadyListed) {
        teachers.push({
            firstname: row.enseignantPrenom,
            name: row.enseignantNom,
            sciper: row.enseignantSciper,
        });
    }
}

export async function fetchCourses(academicYear?: string): Promise<CourseSelectOption[]> {
    const currentYear = academicYear ?? getCurrentAcademicYear();
    const courses = await fetchOasisTeacherCourses(currentYear);

    // const filteredCourses = courses.filter(cours => cours.coursSeanceCode == 'LIP_COURS');

    // Group rows by course so that a course taught by several teachers only appears once in the select.
    interface GroupedCourse {
        code: string;
        title: string;
        teachers: Teacher[];
    }
    const grouped = new Map<string, GroupedCourse>();
    for (const c of courses) {
        if (c.enseignantRole && c.enseignantRole !== 'Enseignement') continue;

        const key = `${c.coursCode ?? ''}|${c.coursNomFr}`;
        let course = grouped.get(key);
        if (!course) {
            course = {
                code: c.coursCode ? c.coursCode : 'Unspecified Code',
                title: c.coursNomFr,
                teachers: [],
            };
            grouped.set(key, course);
        }
        addTeacherOnce(course.teachers, c);
    }

    return Array.from(grouped.entries()).map(([key, course]) => ({
      value: key,
      label: `${course.code} - ${course.title} (${course.teachers.map(t => `${t.firstname} ${t.name}`).join(', ')})`,
      exam: {
          code: course.code,
          title: course.title,
          teachers: course.teachers,
      }
    }))
}

// Fetch all courses, group teachers for each course
export async function fetchTeachersByCourseCode(academicYear: string): Promise<Record<string, Teacher[]>> {
    const rows = await fetchOasisTeacherCourses(academicYear);

    const teachersByCourse: Record<string, Teacher[]> = {};
    for (const row of rows) {
        if (!row.coursCode) continue;
        if (row.enseignantRole && row.enseignantRole !== 'Enseignement') continue;

        const teachers = teachersByCourse[row.coursCode] ?? (teachersByCourse[row.coursCode] = []);
        addTeacherOnce(teachers, row);
    }

    return teachersByCourse;
}

export async function fetchCeproAdminsIT(): Promise<GroupUser[]> {
    const url = `${EPFL_API_BASE}/groups/CePro_admin_IT/members`;
    const res = await epflFetch(url);
    const data = await res.json();
    return data.members;
}