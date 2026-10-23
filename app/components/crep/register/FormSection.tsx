interface FormSectionProps {
    number: number;
    title: string;
    children: React.ReactNode;
}

export default function FormSection({ number, title, children }: FormSectionProps) {
    return (
        <div className="border border-gray-200 rounded-xl p-4 flex flex-col gap-4">
            <div className="flex flex-row gap-4 items-center">
                <span className="bg-red-500 rounded-3xl inline-block text-white px-4 text-2xl font-bold">
                    {number}
                </span>
                <h2 className="text-2xl">{title}</h2>
            </div>
            {children}
        </div>
    );
}
