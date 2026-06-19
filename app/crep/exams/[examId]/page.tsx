import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "../../../../auth";
import { Footer } from "../../../components/Footer";
import { getCrepExamById } from "../../../lib/crep/database";
import { examPrePrintStatus } from "../../../lib/examStatus";
import { formatDateOnlyValue } from "../../../lib/dateTime";
import { ExamFilesManager } from "../../../components/crep/exams/ExamFilesManager";

export const metadata = {
  title: "CREP - Exam files",
};

export default async function ExamProfilePage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const session = await auth();
  if (!session?.user?.email) return;

  const exam = await getCrepExamById(examId);
  if (!exam) notFound();

  const contact = JSON.parse(exam.contact) as { email: string };
  if (contact.email !== session.user.email && !session.user.isAdmin) {
    return (
      <div className="font-sans grid grid-rows items-center justify-items-center px-6 sm:px-12 gap-8 pt-8 sm:pb-0">
        <div className="w-full max-w-3xl">
          <p className="text-red-700">
            You are not the contact person of this exam.
          </p>
          <Link href="/crep/exams" className="text-sm underline">
            Back to my exams
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const files: string[] = JSON.parse(exam.files);
  const editable = examPrePrintStatus.includes(exam.status);

  return (
    <div className="font-sans grid grid-rows items-center justify-items-center px-6 sm:px-12 gap-8 pt-8 sm:pb-0">
      <div className="w-full max-w-3xl space-y-6">
        <div>
          <Link href="/crep/exams" className="text-sm text-slate-600 hover:underline">
            ← My exams
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h1 className="text-xl font-semibold">{exam.exam_name}</h1>
          </div>
          <div className="text-sm text-slate-600 space-x-4">
            <span className="font-mono">{exam.exam_code}</span>
            <span>Desired print date : {formatDateOnlyValue(exam.desired_date)}</span>
          </div>
        </div>

        <ExamFilesManager examId={exam.id} files={files} editable={editable} />
      </div>

      <Footer />
    </div>
  );
}
