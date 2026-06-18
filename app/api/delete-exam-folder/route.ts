// app/api/delete-exam-folder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteExamFolder } from "@/app/lib/crep/upload";
import { auth } from "@/auth";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();

  const folder_name = formData.get("folder_name");

  if (!folder_name || typeof folder_name !== "string") {
    return NextResponse.json(
      { error: "Missing folder_name" },
      { status: 400 }
    );
  }

  try {
    await deleteExamFolder(folder_name);

    return NextResponse.json({
      folder_name,
    });
  } catch (err) {
    console.error(err);

    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return NextResponse.json(
        { error: "Exam folder not found", code: "FOLDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete exam folder" },
      { status: 500 }
    );
  }
}
