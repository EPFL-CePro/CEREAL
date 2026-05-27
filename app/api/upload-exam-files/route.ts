// app/api/upload-exam-files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { uploadExamFiles } from "@/app/lib/crep/upload";
import { auth } from "@/auth";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  const folder_name = formData.get("folder_name");
  const files = formData.getAll("files") as File[];

  if (!folder_name || typeof folder_name !== "string") {
    return NextResponse.json(
      { error: "Missing folder_name" },
      { status: 400 }
    );
  }

  if (!files || files.length === 0) {
    return NextResponse.json(
      { error: "No files uploaded" },
      { status: 400 }
    );
  }

  try {
    const savedPaths = await uploadExamFiles(files, folder_name);

    return NextResponse.json({
      folder_name,
      savedPaths,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save files" },
      { status: 500 }
    );
  }
}
