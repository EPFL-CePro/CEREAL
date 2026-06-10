'use server';
import { EPFLUser } from "@/types/user";
import { SelectOption } from "../components/forms/ReactSelect";
import { GroupUser } from "@/types/groupUser";

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

export async function fetchCourses(academicYear?: string): Promise<SelectOption[]> {
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
    const url = `${getOasisBaseUrl()}/enseignant-cours/${currentYear}`;
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', '*');

    const bearerToken = process.env.OASIS_BEARER;
    if (bearerToken) {
        headers.set('Authorization', `Bearer ${bearerToken}`);
    }

    const res = await fetch(url, {method: 'GET', headers});
    const data = await res.json();

    interface OasisCourse {
        coursNomFr: string;
        coursCode: string;
        enseignantPrenom: string;
        enseignantNom: string;
        enseignantSciper?: string;
        coursSeanceCode: string;
    }
    const courses = data as OasisCourse[];

    // const filteredCourses = courses.filter(cours => cours.coursSeanceCode == 'LIP_COURS');

    return courses.map(c => ({
      value: `${c.coursNomFr} (${c.enseignantPrenom} ${c.enseignantNom})`,
      label: `${c.coursCode ? c.coursCode : 'Unspecified Code'} - ${c.coursNomFr} (${c.enseignantPrenom} ${c.enseignantNom})`,
      exam: {
          code: c.coursCode ? c.coursCode : 'Unspecified Code',
          title: c.coursNomFr,
          teacherName: c.enseignantNom,
          teacherFirstname: c.enseignantPrenom,
          teacherSciper: c.enseignantSciper,
      }
    }))
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