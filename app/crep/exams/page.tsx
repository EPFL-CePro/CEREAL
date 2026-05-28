import { auth } from "../../../auth";
import { Footer } from "../../components/Footer";
import { ExamsManageFilesTable } from "../../components/crep/exams/ExamsManageFilesTable";
import { getAllCrepExams, getCrepExamsByContactEmail } from "../../lib/crep/database";
import { CrepExam } from "@/types/crepExam";

export const metadata = {
  title: "CREP - My exams",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) return;

  let exams:CrepExam[];

  if(session.user.isAdmin) {
    exams = (await getAllCrepExams()) as CrepExam[];
  } else {
    exams = (await getCrepExamsByContactEmail(session.user.email)) as CrepExam[];
  }

  return (
    <div className="font-sans grid grid-rows items-center justify-items-center px-6 sm:px-12 gap-8 pt-16 sm:pb-0">
      <div className="w-full max-w-7xl mb-8">
        <h1 className="text-2xl font-semibold mb-6">My exams registered for printing</h1>
        <ExamsManageFilesTable exams={exams} isAdmin={session.user.isAdmin} />
      </div>
      
      <div className="mb-12">
        <Footer />
      </div>
    </div>
  );
}
