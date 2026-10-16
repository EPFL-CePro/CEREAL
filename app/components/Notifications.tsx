"use client"
import React, { useState, useRef, useEffect, JSX } from "react";
import { getLogs, markAsRead } from "../lib/crep/database";
import { User } from "next-auth";
import { BellIcon } from "@heroicons/react/24/outline";
import { ArrowPathIcon, MinusIcon, PlusIcon } from "@heroicons/react/20/solid";

type Log = {
    id: number;
    action: string;
    contact: string;
    date_time: Date;
    delivery_date: string;
    exam_date: string;
    exam_name: string;
    exam_code: string;
    is_read: boolean;
    read_at?: Date | null;
    changes: LogChanges | null;
}

// true = big value changed (so we are not stocking it)
type LogChanges = Record<string, { old: unknown; new: unknown } | true>;

interface AppUser extends User {
    isAdmin?: boolean;
    sciper: string;
}

interface notifProps {
    user: AppUser
}

async function fetchLogs(sciper: string): Promise<Log[]> {
    const logs = await getLogs(sciper) as Log[];
    const mapLogs = logs.map((log: Log) => ({
        id: log.id,
        action: log.action,
        contact: log.contact,
        date_time: new Date(log.date_time),
        delivery_date: new Date(log.delivery_date).toDateString(),
        exam_date: new Date(log.exam_date).toDateString(),
        exam_name: log.exam_name,
        exam_code: log.exam_code,
        is_read: Boolean(log.is_read),
        read_at: log.read_at ? new Date(log.read_at) : null,
        changes: typeof log.changes === "string" ? JSON.parse(log.changes) : log.changes,
    }));
    return Array.isArray(mapLogs) ? mapLogs : [];
}

function formatChange(field: string, change: LogChanges[string]): string {
    if (change === true) return `${field} modified`;
    return `${field}: ${change.old ?? "-"} → ${change.new ?? "-"}`;
}

function defineAction(action: string, returnIcon: boolean): string | JSX.Element {
    if (returnIcon) {
        switch (action) {
            case "insert":
                return (
                    <PlusIcon className="size-5" aria-hidden="true" />
                );
            case "delete":
                return (
                    <MinusIcon className="size-5" aria-hidden="true" />
                );
            case "update":
                return (
                    <ArrowPathIcon className="size-5" aria-hidden="true" />
                );
            default:
                return "ℹ️";
        }
    } else {
        switch (action) {
            case "insert":
                return "Added";
            case "delete":
                return "Deleted";
            case "update":
                return "Updated";
            default:
                return "Info";
        }
    }
}

export default function Notifications({ user }: notifProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const hasUnread = logs.some(l => !l.is_read);

    useEffect(() => {
        (async () => {
            const list = await fetchLogs(user.sciper);
            setLogs(list ?? []);
        })();
        async function handleClickOutside(event: MouseEvent) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
            await markAsRead(user.sciper);
            const list = await fetchLogs(user.sciper);
            setLogs(list ?? []);

        }
        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open, user.sciper]);

    return (
        <div className="relative mr-4" ref={ref}>
            <button
                aria-label="Notifications"
                className={`p-2 rounded-full hover:bg-gray-200 hover:cursor-pointer  ${hasUnread ? 'transition hover:animate-wiggle' : ''} ${open ? 'bg-gray-200' : ''}`}
                onClick={() => setOpen((prev) => !prev)}
            >
                {hasUnread && <span className="absolute right-2.5 top-2.5 inline-flex size-2 rounded-full bg-red-500"></span>}
                <BellIcon className="size-6" strokeWidth={1.25} aria-hidden="true" />
            </button>
            {open && (
                <div className="fixed right-0 mx-4 md:ml-0 mt-2 bg-white shadow-xl rounded-xl z-50 outline-1 outline-gray-100">
                    <div className="p-4 font-semibold">Notifications</div>
                    <ul>
                        {logs.length === 0 ? (
                            <li className="p-4 text-gray-500">No notifications</li>
                        ) : (
                            logs
                                .filter(log => {
                                    if (user.isAdmin) return true;
                                    return (typeof user.email === "string" && log.contact.includes(user.email))
                                })
                                .sort((a, b) => b.id - a.id)
                                .slice(0, 7)
                                .map((n) => {
                                    const contact = JSON.parse(n.contact);
                                    return (
                                        <li key={n.id} className={`p-4 gap-x-4 ps-10 gap-y-1.5 ${n.is_read ? "opacity-70" : "bg-gray-50"} hover:bg-gray-100 flex hover:rounded-xl hover:outline-white hover:ring-4 hover:ring-white flex-col hover:ring-inset`}>
                                            <span className={`absolute inline-flex left-4 mt-8 size-2 rounded-full ${n.is_read ? "" : "bg-red-500 opacity-75"} `}></span>
                                            <div className="flex justify-between flex-col sm:flex-row">
                                                <span className="text-sm text-gray-700 flex gap-1 tracking-wide">{defineAction(n.action, true)} {defineAction(n.action, false)} | contact : {contact.firstname} {contact.lastname} ({contact.email}) </span>
                                                <span className="text-xs  text-gray-400">{n.date_time.toDateString()}</span>
                                            </div>
                                            <span className="text-md">{n.exam_code} {n.exam_name}</span>
                                            {n.changes && (
                                                <ul className="text-sm text-gray-600">
                                                    {Object.entries(n.changes).map(([field, change]) => (
                                                        <li key={field}>{formatChange(field, change)}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="flex flex-col sm:flex-row justify-between">
                                                <span className="text-sm text-gray-500">Delivery Date: {n.delivery_date}</span>
                                                <span className="text-sm text-gray-500 mr-10">Exam Date: {n.exam_date}</span>
                                            </div>
                                        </li>
                                    )
                                })
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}