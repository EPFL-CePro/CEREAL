import { getAllCommentsForExam } from "@/app/lib/database";
import { auth } from "@/auth";

export const metadata = {
    title: "Exam comments",
}

export default async function Page({
    params,
}: {
    params: Promise<{ examId?: string }>
}) {
    const session = await auth();
    if (!session?.user) return;

    const { examId } = await params;
    const allCommentsForExam = await getAllCommentsForExam(examId || '');

    return (
        <main>
            <ul>
                <li><strong>Exam id : </strong>{examId}</li>
                <li><strong>Comments length : </strong>{allCommentsForExam.length}</li>
            </ul>
        </main>
    )
}
