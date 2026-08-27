// app/api/cereal/diff-exams/check-existing-xlsx/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getExistingXLSXFileMetadata } from "@/app/lib/manageFiles";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderName = req.nextUrl.searchParams.get("folder_name");
  if (!folderName) {
    return NextResponse.json(
      { error: "Missing folder_name" },
      { status: 400 }
    );
  }

  try {
    const file = await getExistingXLSXFileMetadata(folderName);

    return NextResponse.json({
      file
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to get XLSX file" },
      { status: 500 }
    );
  }
}
