import React from 'react';
import {
    InformationCircleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
} from '@heroicons/react/24/outline';

type CalloutType = 'info' | 'success' | 'warning' | 'error';

const STYLES: Record<CalloutType, { colors: string; Icon: typeof InformationCircleIcon }> = {
    info: { colors: 'bg-[#e5f6fd] text-[#014361] [&>svg]:text-[#0288d1]', Icon: InformationCircleIcon },
    success: { colors: 'bg-[#edf7ed] text-[#1e4620] [&>svg]:text-[#2e7d32]', Icon: CheckCircleIcon },
    warning: { colors: 'bg-[#fff4e5] text-[#663c00] [&>svg]:text-[#ed6c02]', Icon: ExclamationTriangleIcon },
    error: { colors: 'bg-[#fdeded] text-[#5f2120] [&>svg]:text-[#d32f2f]', Icon: XCircleIcon },
};

export default function Callout({
    type = 'info',
    title,
    children,
}: {
    type?: CalloutType;
    title?: string;
    children: React.ReactNode;
}) {
    const { colors, Icon } = STYLES[type];

    return (
        <div role="alert" className={`flex items-start gap-3 rounded-sm px-4 py-3 text-sm ${colors}`}>
            <Icon className="size-[22px] shrink-0" aria-hidden="true" />
            <div>
                {title && <p className="font-medium">{title}</p>}
                {children}
            </div>
        </div>
    );
}
