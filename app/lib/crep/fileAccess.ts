import { Session } from "next-auth";
import { getAllCrepExamsForRepro, getCrepExamById } from "./database";
import { examPrePrintStatus } from "../examStatus";
import { CrepExam } from "@/types/crepExam";

// Checks that the user can add/delete the files of an exam :
// the user must be the contact of the exam, an admin, or the Repro, and the exam must not be printing/printed yet.
export async function checkCrepFileAccess(
  session: Session | null,
  examId: string
): Promise<{ exam: CrepExam; error?: never } | { exam?: never; error: string; status: number }> {
  if (!session?.user?.email) {
    return { error: "Unauthorized", status: 401 };
  }

  const exam = await getCrepExamById(examId);
  if (!exam) {
    return { error: "Exam not found", status: 404 };
  }

  const contact = JSON.parse(exam.contact) as { email: string };

  let canAccessAsRepro = false;
  if (session.user.hasCrepAccess && !session.user.isAdmin) {
    const reproExams = (await getAllCrepExamsForRepro(session.user.email)) as CrepExam[];
    canAccessAsRepro = reproExams.some((reproExam) => reproExam.id === exam.id);
  }

  if (contact.email !== session.user.email && !session.user.isAdmin && !canAccessAsRepro) {
    return { error: "Forbidden", status: 403 };
  }

  if (!examPrePrintStatus.includes(exam.status)) {
    return { error: "Exam files can no longer be modified at this status", status: 409 };
  }

  return { exam };
}
