"use client"

import { Dispatch, SetStateAction } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";


interface RegisterModalProps {
    setModalOpen: Dispatch<SetStateAction<boolean>>;
    title?: string;
    message?: string;
    isConfirm?: boolean;
    onResult?: (confirmed: boolean) => void;
}

export function RegisterModal({ setModalOpen, title, message, isConfirm, onResult }: RegisterModalProps) {
    const handleResult = (confirmed: boolean) => {
        const dialog = document.getElementById("register-modal") as HTMLDialogElement | null;
        dialog?.close();
        onResult?.(confirmed);
        setModalOpen(false);
    };

    return (
        <form method="dialog" className="modal-content flex flex-col gap-4 p-12 w-full text-foreground bg-background accent-red-500 [&_input]:rounded-lg">
            <button className=" btn p-1 absolute right-5 top-5 hover:bg-gray-100" aria-label="Close" type="button" onClick={() => handleResult(false)}>
                <XMarkIcon className="size-6" aria-hidden="true" />
            </button>
            <div>
                <h4 className={`font-semibold basis-full text-lg`}>{title}</h4>
                <p className="whitespace-pre-line mt-3">{message}</p> {/* if we want to allow html stylings such as italics, bold etc : dangerouslySetInnerHTML={{ __html: message ?? "" }} */}
                <div className="flex flex-row gap-4 justify-end mt-4">
                    {isConfirm && <button className="btn btn-secondary" formMethod="dialog" type="button" onClick={() => handleResult(false)}>Cancel</button>}
                    <button className="btn btn-primary" type="button" onClick={() => handleResult(true)}>OK</button>
                </div>
            </div>
        </form>
    );

}