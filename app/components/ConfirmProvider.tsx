"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ConfirmFn = (message: string) => Promise<boolean>;

interface PendingConfirm {
    message: string;
    resolve: (confirmed: boolean) => void;
}

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
    const confirm = useContext(ConfirmContext);
    if (!confirm) {
        throw new Error("useConfirm must be used inside <ConfirmProvider>");
    }
    return confirm;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [pending, setPending] = useState<PendingConfirm | null>(null);

    const confirm = useCallback<ConfirmFn>((message) => new Promise<boolean>((resolve) => {
        setPending({ message, resolve });
    }), []);

    // showModal() to be displayed above the other modals.
    useEffect(() => {
        if (pending) dialogRef.current?.showModal();
    }, [pending]);

    const answer = (confirmed: boolean) => {
        pending?.resolve(confirmed);
        setPending(null);
    };

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {pending && (
                <dialog ref={dialogRef} onClose={() => answer(false)} className="fixed inset-0 m-auto w-full max-w-md rounded-xl p-0 drop-shadow-2xl backdrop:backdrop-blur-xs">
                    <div className="flex flex-col gap-4 p-8 bg-background text-foreground">
                        <h4 className="font-semibold text-lg">Confirmation</h4>
                        <p className="whitespace-pre-line">{pending.message}</p>
                        <div className="flex flex-row gap-4 justify-end mt-2">
                            <button className="btn btn-secondary" type="button" onClick={() => answer(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" type="button" autoFocus onClick={() => answer(true)}>
                                OK
                            </button>
                        </div>
                    </div>
                </dialog>
            )}
        </ConfirmContext.Provider>
    );
}
