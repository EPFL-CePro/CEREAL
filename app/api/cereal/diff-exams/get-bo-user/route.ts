// app/api/cereal/diff-exams/get-bo-user/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBOFileRowsForSciper } from "@/app/lib/manageFiles";

// ensure Node.js runtime (needed for fs / NAS)
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const boFile = await getBOFileRowsForSciper(session.user.sciper);

    return NextResponse.json({
      boFile
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to get BO file" },
      { status: 500 }
    );
  }
}
