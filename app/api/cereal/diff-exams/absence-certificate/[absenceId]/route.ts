import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { getAbsenceCertificateFileNameById } from "@/app/lib/database";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ absenceId: string }> }
) {
  const session = await auth();

  if (!session?.user.hasSACAccess && !session?.user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { absenceId } = await params;
  const fileName = await getAbsenceCertificateFileNameById(absenceId);

  if (!fileName) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const basePath = process.env.DEFFERED_EXAMS_DIR;

  if (!basePath) {
    return NextResponse.json({ error: "Missing files directory" }, { status: 500 });
  }

  const certificatesDir = path.resolve(basePath, "certificates");
  const safeFileName = path.basename(fileName);

  if (safeFileName !== fileName) {
    return NextResponse.json({ error: "Invalid certificate filename" }, { status: 400 });
  }

  const filePath = path.resolve(certificatesDir, safeFileName);

  if (!filePath.startsWith(`${certificatesDir}${path.sep}`)) {
    return NextResponse.json({ error: "Invalid certificate path" }, { status: 400 });
  }

  try {
    const file = await readFile(filePath);
    const contentType = contentTypes[path.extname(safeFileName).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(new Uint8Array(file).buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }
}
