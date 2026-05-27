import { useState } from "react";
import { ExportModal } from "./ExportModal";
import { User } from "next-auth";

interface AppUser extends User {
  isAdmin?: boolean;
}

interface ExportProps {
    user: AppUser;
}

export function Export({ user }: ExportProps) {
    const [modalOpen, setModalOpen] = useState(false);

    return(
        <>        
            <button className="btn btn-secondary" onClick={() => {
                const dialog = document.getElementById("export-modal") as HTMLDialogElement;
                dialog.showModal();
                setModalOpen(true);
            }}>
                Export data
            </button>
            <dialog id="export-modal" className="modal fixed top-1/8 left-1/8 w-3/4 md:left-1/4 md:w-2/4 rounded-xl flex items-center justify-center z-50 drop-shadow-2xl backdrop:backdrop-blur-xs opacity-98" onClose={() => {
                setModalOpen(false);
            }}>
                {modalOpen && (
                    <ExportModal setModalOpen={setModalOpen} user={user}/>
                )}
            </dialog >
        </>
    )
}