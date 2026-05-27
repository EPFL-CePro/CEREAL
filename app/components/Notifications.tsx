"use client"
import React, { useState, useRef, useEffect, JSX } from "react";
import { getLogs, markAsRead } from "../lib/crep/database";
import { User } from "next-auth";

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
}

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
    }));
    return Array.isArray(mapLogs) ? mapLogs : [];
}


function defineAction(action: string, returnIcon: boolean): string | JSX.Element {
    if (returnIcon) {
        switch (action) {
            case "insert":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4.5 h-5">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                );
            case "delete":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4.5 h-5">
                        <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
                    </svg>
                );
            case "update":
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-4.5 h-5">
                        <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                    </svg>
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
            markAsRead(user.sciper);
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.25} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
            </button>
            {open && (
                <div className="fixed right-0 mx-4 md:ml-0 mt-2 bg-white shadow-xl rounded-xl z-50 outline-1 outline-gray-100">
                    <div className="p-4 font-semibold">Notifications</div>
                    <ul>
                        {logs.length === 0 ? (
                            <li className="p-4 text-gray-500">No notifications</li>
                        ) : (
                            logs
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