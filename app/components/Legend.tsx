import {getAllowedExamStatus} from "@/app/lib/crep/exam-status";

interface LegendProps {
    isAdmin: boolean;
}

export function Legend({isAdmin} : LegendProps) {
    return (
        <>
            {getAllowedExamStatus(isAdmin).map(status => {
                return (
                    <div key={status.value} className="flex items-center">
                        <div className="w-4 h-4 mr-2 rounded-sm" style={{ backgroundColor: status.fcColor }} />
                        <span className="text-sm">{status.label}</span>
                    </div>
                );
            })}
        </>
    )
}