'use server';
import { EPFLUser } from "@/types/user";
import { CourseSelectOption, SelectOption } from "@/types/selectOption";
import { GroupUser } from "@/types/groupUser";
import { Teacher } from "@/types/teacher";

function getOasisBaseUrl(): string {
    if (process.env.OASIS_BASE_URL) {
        return process.env.OASIS_BASE_URL;
    }

    return process.env.NODE_ENV === "development"
        ? "https://oasis-t.epfl.ch:8484"
        : "https://oasis.epfl.ch:8484";
}

export async function fetchPersons(query: string): Promise<SelectOption[]> {
    const url = `https://api.epfl.ch/v1/persons?query=${encodeURIComponent(query)}`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
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
    const url = `https://api.epfl.ch/v1/groups?name=${encodeURIComponent(query)}`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
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
    const url = `https://api.epfl.ch/v1/groups/${encodeURIComponent(groupId)}/persons?pagesize=0`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
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
    const url = `https://api.epfl.ch/v1/persons/${sciper}`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
    const data = await res.json();
    return data;
}

export async function fetchMultiplePersonsBySciper(scipersWithCommas: string): Promise<EPFLUser[]> {
    const url = `https://api.epfl.ch/v1/persons?ids=${encodeURIComponent(scipersWithCommas)}`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
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
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');

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
    const date = new Date();
    const month = date.getMonth();
    let currentYear;
    if(academicYear) {
        currentYear = academicYear;
    } else if(month >= 1 && month <= 8) {
        currentYear = (date.getFullYear() - 1).toString() + '-' + date.getFullYear().toString();
    } else {
        currentYear = date.getFullYear().toString() + '-' + (date.getFullYear() +1).toString();
    }
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
    const url = `https://api.epfl.ch/v1/groups/CePro_admin_IT/members`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');
    headers.set('Authorization', 'Basic ' + Buffer.from(process.env.EPFL_API_USERNAME + ":" + process.env.EPFL_API_PASSWORD).toString('base64'));
    const res = await fetch(url, {method: 'GET', headers});
    const data = await res.json();
    return data.members;
}