// the safelist below is needed for Tailwind to generate the classes used for exam status:
// bg-blue-500 bg-yellow-500 bg-green-500 bg-red-500 bg-gray-500 text-blue-500 text-yellow-500 text-green-500 text-red-500 text-gray-500 bg-violet-400 text-violet-400
// border-blue-500 border-yellow-500 border-green-500 border-red-500 border-violet-400
export const examStatus = [
    { value: 'registered', label: 'Registered', color: 'blue-500', hexColor: '#3b82f6', fcColor: 'oklch(62.3% 0.214 259.815)', needsAdmin: true },
    { value: 'registered-warning', label: 'Registered-Warning', color: 'yellow-800', hexColor: '#784e14', fcColor: 'oklch(0.4608 0.0901 69.77)', needsAdmin: true },
    { value: 'registered-error', label: 'Registered-Error', color: 'red-500', hexColor: '#ef4444', fcColor: '#fb2c36', needsAdmin: true },
    { value: 'toPrint', label: 'To Print', color: 'yellow-500', hexColor: '#eab308', fcColor: 'oklch(79.5% 0.184 86.047)', needsAdmin: false },
    { value: 'printing', label: 'Printing', color: 'green-500', hexColor: '#22c55e', fcColor: 'oklch(72.3% 0.219 149.579)', needsAdmin: false },
    { value: 'finished', label: 'Finished', color: 'gray-500', hexColor: '#6a7282', fcColor: 'oklch(0.551 0.0267 264.33)', needsAdmin: false },
    { value: 'delivered', label: 'Delivered', color: 'violet-400', hexColor: '#8b5cf6', fcColor: '#8b5cf6', needsAdmin: false },
    { value: 'canceled', label: 'Canceled', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'prep_teach', label: 'Prep-Teach', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'prep_2compile', label: 'Prep-2compile', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'prep_2check', label: 'Prep-2check', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'pick_up', label: 'Pick-up', color: '', hexColor: '#020617', fcColor: '#0000000', needsAdmin: true },
    { value: 'picked_up', label: 'Picked-up', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'wait_scan', label: 'Wait-Scan', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'rep_cut', label: 'Rep-Cut', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: '2scan', label: '2Scan', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'scanned', label: 'Scanned', color: '', hexColor: '#020617', fcColor: '#0000000', needsAdmin: true },
    { value: 'wait_teach', label: 'Wait-Teach', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true },
    { value: 'to_contact', label: 'To-Contact', color: '', hexColor: '#020617', fcColor: '#000000', needsAdmin: true }
];

export const examNotAdminStatus = examStatus.filter(status => !status.needsAdmin);

export const examAdminStatus = examStatus.filter(status => status.needsAdmin);

export const examPrePrintStatus = [
    'registered',
    'registered-warning',
    'registered-error',
    'toPrint'
];

export const examBlockingPrintStatus = [
    'registered',
    'registered-warning',
    'registered-error',
    'toPrint',
    'printing',
];

export const getAllowedExamStatus = (isAdmin: boolean) => {
    return isAdmin ? examStatus : examNotAdminStatus;
}