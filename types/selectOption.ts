import { Teacher } from "./teacher";

export type PersonSelectOption = {
    value: number | string;
    label: string;
    person: {
        id: number;
        firstname?: string;
        lastname?: string;
        email?: string;
        sciper?: string;
    };
    group?: never;
    exam?: never;
};

export type GroupSelectOption = {
    value: number | string;
    label: string;
    group: {
        id: string;
        name: string;
    };
    person?: never;
    exam?: never;
};

export type CourseSelectOption = {
    value: number | string;
    label: string;
    exam: {
        code: string;
        title: string;
        teachers: Teacher[];
    };
    person?: never;
    group?: never;
};

export type SelectOption =
    | PersonSelectOption
    | GroupSelectOption
    | CourseSelectOption;
