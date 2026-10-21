import CommentsTable from "@/app/components/exams/comments/CommentsTable";
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
            {allCommentsForExam.length == 0 ?
                <>No comments found for exam id {examId} or exam does not exist.</>
            :
                <CommentsTable comments={allCommentsForExam} />
            }
        </main>
    )
}
