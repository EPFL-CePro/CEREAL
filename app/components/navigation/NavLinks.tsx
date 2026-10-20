"use client"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import type { NavGroup, NavLink } from "@/app/lib/navigation";
import { navIcons } from "@/app/lib/navIcons";

const linkClass = (isActive: boolean) =>
    `flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap ${isActive ? "bg-primary text-white" : "hover:bg-(--background-secondary)"}`;

interface NavLinksProps {
    groups: NavGroup[];
}

export function NavLinks({ groups }: NavLinksProps) {
    const pathname = usePathname();
    const [openGroup, setOpenGroup] = useState<string | null>(null);
    const navRef = useRef<HTMLUListElement>(null);

    // Several links can match as prefixes. only the longest one is the active page.
    const activeUrl = groups
        .flatMap(group => group.links)
        .filter(({ url }) => pathname === url || pathname.startsWith(`${url}/`))
        .sort((a, b) => b.url.length - a.url.length)[0]?.url;

    // close the open menu after navigating, on outside click and on Escape
    useEffect(() => setOpenGroup(null), [pathname]);
    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (!navRef.current?.contains(e.target as Node)) setOpenGroup(null);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpenGroup(null);
        };
        document.addEventListener("mousedown", onClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onClick);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    const renderLink = ({ label, url, icon }: NavLink, prefix?: string) => {
        const Icon = navIcons[icon];
        return (
            <Link
                key={url}
                href={url}
                aria-current={url === activeUrl ? "page" : undefined}
                className={linkClass(url === activeUrl)}
            >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                {prefix ? `${prefix} - ${label}` : label}
            </Link>
        );
    };

    return (
        <ul ref={navRef} className="flex flex-wrap items-center justify-center gap-2">
            {groups.map(group => {
                if (group.links.length === 1) {
                    return <li key={group.label}>{renderLink(group.links[0], group.label)}</li>;
                }

                const isOpen = openGroup === group.label;
                const hasActive = group.links.some(link => link.url === activeUrl);
                return (
                    <li key={group.label} className="relative">
                        <button
                            type="button"
                            aria-expanded={isOpen}
                            aria-haspopup="true"
                            onClick={() => setOpenGroup(isOpen ? null : group.label)}
                            className={`${linkClass(false)} cursor-pointer ${hasActive ? "bg-(--background-secondary)" : ""}`}
                        >
                            {group.label}
                            <ChevronDownIcon className={`size-4 shrink-0 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>
                        {isOpen && (
                            <ul className="absolute left-0 top-full z-50 mt-1 flex min-w-56 flex-col gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-md">
                                {group.links.map(link => <li key={link.url}>{renderLink(link)}</li>)}
                            </ul>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}
