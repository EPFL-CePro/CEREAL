import type { KeyboardEvent } from "react";

export const preventEnterSubmit = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Enter") return;

    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    event.preventDefault();
};