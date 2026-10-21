import CommentsTable from "@/app/components/exams/comments/CommentsTable";
import { getAllCommentsForExam, getExamById } from "@/app/lib/database";
import { auth } from "@/auth";

export const metadata = {
    title: "Exam comments",
}

export default async function Page({
    params,
}: {
    params: Promise<{ examId: string }>
}) {
    const session = await auth();
    if (!session?.user) return;

    const { examId } = await params;
    const examInDb = await getExamById(examId);
    const allCommentsForExam = await getAllCommentsForExam(examId);

    return (
        <main>
            {examInDb.length == 0 ?
                <>Exam with id {examId} does not exist in the database.</>
            :
                <CommentsTable comments={allCommentsForExam} user={session.user} examId={examId} exam={examInDb[0]} />
            }
        </main>
    )
}
