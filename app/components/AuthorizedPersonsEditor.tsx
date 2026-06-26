"use client";

import React, { useMemo, useRef, useState } from "react";
import AsyncSelect from "react-select/async";
import type { GroupBase, OptionsOrGroups, StylesConfig, Theme } from "react-select";
import { fetchGroupPersons, fetchGroups, fetchPersons } from "@/app/lib/api";
import { AuthorizedPersons } from "@/types/user";
import { SelectOption } from "@/types/selectOption";

interface AuthorizedPersonsEditorProps {
    value: AuthorizedPersons[];
    onChange: (persons: AuthorizedPersons[]) => void;
    disabled?: boolean;
}

function optionToAuthorizedPerson(option: SelectOption): AuthorizedPersons | null {
    if (!option.person) return null;

    const email = option.person.email;
    if (!email) return null;

    const name = `${option.person.firstname ?? ""} ${option.person.lastname ?? ""}`.trim() || option.label || email;

    return {
        id: String(option.person.sciper ?? option.person.id ?? option.value),
        email,
        name,
    };
}

function mergePersons(current: AuthorizedPersons[], incoming: AuthorizedPersons[]) {
    const seen = new Set(current.map((person) => String(person.id)));
    const added: AuthorizedPersons[] = [];

    for (const person of incoming) {
        const key = String(person.id);
        if (seen.has(key)) continue;
        seen.add(key);
        added.push(person);
    }

    return {
        nextPersons: [...current, ...added],
        addedCount: added.length,
        skippedCount: incoming.length - added.length,
    };
}

export function AuthorizedPersonsEditor({ value, onChange, disabled = false }: AuthorizedPersonsEditorProps) {
    const [message, setMessage] = useState("");
    const timeoutRef = useRef<NodeJS.Timeout | number>(0);

    const selectStyles = useMemo<StylesConfig<SelectOption, false, GroupBase<SelectOption>>>(
        () => ({
            control: (styles) => ({
                ...styles,
                backgroundColor: "white",
                borderColor: "#d1d5db",
                minHeight: "42px",
                ":focus-within": {
                    borderColor: "red",
                    boxShadow: "0 0 0 1px red",
                },
            }),
            option: (styles, { isSelected }) => ({
                ...styles,
                fontWeight: isSelected ? "600" : "normal",
            }),
        }),
        []
    );

    const selectTheme = (theme: Theme): Theme => ({
        ...theme,
        borderRadius: 9,
        colors: {
            ...theme.colors,
            primary25: "rgba(239, 68, 68, 0.1)",
            primary: "rgba(239, 68, 68, 1)",
        },
    });

    function loadOptions(inputValue: string): Promise<OptionsOrGroups<SelectOption, GroupBase<SelectOption>>> {
        if (!inputValue || inputValue.length < 3) return Promise.resolve([]);

        return new Promise<OptionsOrGroups<SelectOption, GroupBase<SelectOption>>>((resolve) => {
            clearTimeout(timeoutRef.current as number);
            timeoutRef.current = setTimeout(async () => {
                try {
                    const [persons, groups] = await Promise.all([
                        fetchPersons(inputValue),
                        fetchGroups(inputValue),
                    ]);
                    resolve([...persons, ...groups]);
                } catch (error) {
                    console.error("Failed to fetch authorized persons", error);
                    resolve([]);
                }
            }, 1000);
        });
    }

    async function addOption(option: SelectOption | null) {
        if (!option) return;

        if (option.group) {
            try {
                const groupMembers = await fetchGroupPersons(option.group.id);
                const persons = groupMembers
                    .map(optionToAuthorizedPerson)
                    .filter((person): person is AuthorizedPersons => Boolean(person));
                const result = mergePersons(value, persons);

                onChange(result.nextPersons);
                setMessage(`Added ${result.addedCount} person${result.addedCount === 1 ? "" : "s"} from ${option.group.name}.${result.skippedCount ? ` ${result.skippedCount} duplicate${result.skippedCount === 1 ? "" : "s"} skipped.` : ""}`);
            } catch (error) {
                console.error("Failed to fetch group members", error);
                setMessage("Could not add this group.");
            }
            return;
        }

        const person = optionToAuthorizedPerson(option);
        if (!person) {
            setMessage("This person can not be added because no email is available.");
            return;
        }

        const result = mergePersons(value, [person]);
        onChange(result.nextPersons);
        setMessage(result.addedCount ? `Added ${person.email}.` : `${person.email} is already in the list.`);
    }

    function removePerson(personId: string) {
        const person = value.find((item) => String(item.id) === String(personId));
        onChange(value.filter((item) => String(item.id) !== String(personId)));
        setMessage(person ? `Removed ${person.email}.` : "");
    }

    return (
        <div className="date-input flex flex-col gap-2 flex-1 print:hidden">
            <label className="font-semibold" htmlFor="authorizedPersons">Authorized persons</label>
            {value.length > 0 ? (
                <ul className="flex flex-col gap-2" id="authorizedPersons">
                    {value.map((person) => (
                        <li key={person.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">{person.name || person.email}</span>
                                <span className="block truncate text-xs text-gray-600">{person.email}</span>
                            </span>
                            {!disabled && (
                                <button
                                    type="button"
                                    className="btn btn-secondary h-8 w-8 shrink-0 p-0"
                                    aria-label={`Remove ${person.email}`}
                                    onClick={() => removePerson(person.id)}
                                >
                                    x
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-600">None</p>
            )}
            {!disabled && (
                <AsyncSelect<SelectOption, false, GroupBase<SelectOption>>
                    cacheOptions
                    defaultOptions={false}
                    loadOptions={loadOptions}
                    value={null}
                    getOptionValue={(option) => String(option.value)}
                    formatOptionLabel={(option) => option.group
                        ? `👥 ${option.group.name}`
                        : `👤 ${option.person?.firstname ?? ""} ${option.person?.lastname ?? ""}${option.person?.email ? ` - ${option.person.email}` : ""}`
                    }
                    onChange={addOption}
                    placeholder="Add person or group..."
                    noOptionsMessage={({ inputValue }) => inputValue ? `No results for "${inputValue}"` : "Type at least 3 chars..."}
                    styles={selectStyles}
                    theme={selectTheme}
                    instanceId="authorized-persons-editor"
                />
            )}
            {message && <p className="text-xs text-gray-600" aria-live="polite">{message}</p>}
        </div>
    );
}
