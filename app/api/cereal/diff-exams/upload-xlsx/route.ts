// app/api/cereal/diff-exams/upload-xlsx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadXLSXFile } from "@/app/lib/manageFiles";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const folderName = formData.get("folder_name") as string;

  if (!file) {
    return NextResponse.json(
      { error: "No file uploaded" },
      { status: 400 }
    );
  }

  if(!folderName) {
    return NextResponse.json(
      { error: "Missing folder_name" },
      { status: 400 }
    );
  }

  try {
    const savedPath = await uploadXLSXFile(file, folderName);

    return NextResponse.json({
      savedPath
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to save file" },
      { status: 500 }
    );
  }
}
