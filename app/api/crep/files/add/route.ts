import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { addCrepFiles } from "@/app/lib/crep/database";
import { getExamFolderName, uploadExamFiles } from "@/app/lib/crep/upload";
import { checkCrepFileAccess } from "@/app/lib/crep/fileAccess";
import { validateFilesSpecs } from "@/app/lib/crep/fileSpecs";
import { CrepFileSpecs } from "@/types/crepExam";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();

  const formData = await req.formData();
  const examId = formData.get("examId");
  const files = formData.getAll("files") as File[];
  const specsJson = formData.get("specs");

  if (!examId || typeof examId !== "string") {
    return NextResponse.json({ error: "Missing examId" }, { status: 400 });
  }
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  // Print settings of every file, in the same order as `files`
  let specs: CrepFileSpecs[];
  try {
    specs = typeof specsJson === "string" ? JSON.parse(specsJson) : [];
  } catch {
    return NextResponse.json({ error: "Invalid print settings" }, { status: 400 });
  }
  if (!Array.isArray(specs) || specs.length !== files.length) {
    return NextResponse.json({ error: "Missing print settings" }, { status: 400 });
  }

  const access = await checkCrepFileAccess(session, examId);
  if (!access.exam) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const { exam } = access;

  const newFiles = files.map((file, index) => ({ ...specs[index], file_name: file.name }));
  const filesError = validateFilesSpecs(newFiles);
  if (filesError) {
    return NextResponse.json({ error: filesError }, { status: 400 });
  }

  const existing = exam.files.map((file) => file.file_name);
  const incomingNames = files.map((f) => f.name);
  const collisions = incomingNames.filter((n, index) => existing.includes(n) || incomingNames.indexOf(n) !== index);
  if (collisions.length > 0) {
    return NextResponse.json(
      { error: "Filename collision", collisions },
      { status: 409 }
    );
  }

  try {
    await uploadExamFiles(files, getExamFolderName(exam));
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save files" }, { status: 500 });
  }

  await addCrepFiles(exam.id, newFiles);

  return NextResponse.json({ ok: true });
}
