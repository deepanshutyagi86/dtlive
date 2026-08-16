import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

// Compression happens client-side and could be bypassed by a crafted
// request straight to this route — 8MB is generous headroom above the
// ~1600px WebP output the client actually produces, but still a hard
// server-side ceiling regardless of what the client claims to have sent.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Without this, anyone on the internet who finds this route can
        // upload arbitrary files into the store until the quota is dead —
        // no token is issued unless there's a verified admin session.
        const admin = await getAdminSession();
        if (!admin) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: message === "Unauthorized" ? 401 : 400 });
  }
}
