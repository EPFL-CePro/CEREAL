// app/api/cereal/diff-exams/upload-absence/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadAbsenceFile } from "@/app/lib/files/deferred-exams-files";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No file uploaded" },
      { status: 400 }
    );
  }

  try {
    const fileName = await uploadAbsenceFile(file);

    return NextResponse.json({
      fileName
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }
}
