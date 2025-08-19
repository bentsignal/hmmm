import { env } from "@/env";
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const status = searchParams.get("status");
  if (!userId) {
    console.error("No email provided");
    return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL, 302);
  }
  const { error } = await tryCatch(
    fetchMutation(api.mail.newsletter.apiUpdatePreference, {
      userId,
      status: status === "true",
      apiKey: env.NEXT_CONVEX_INTERNAL_KEY,
    }),
  );
  if (error) {
    console.error(error);
    throw new Error(`Failed to update newsletter status for user: ${userId}`);
  }
};

export async function GET(request: NextRequest) {
  const { error } = await tryCatch(handler(request));
  if (error) {
    return NextResponse.json(
      { error: "Failed to update newsletter status" },
      { status: 500 },
    );
  }
  return NextResponse.redirect(env.NEXT_PUBLIC_BASE_URL, 302);
}

export async function POST(request: NextRequest) {
  const { error } = await tryCatch(handler(request));
  if (error) {
    return NextResponse.json(
      { error: "Failed to update newsletter status" },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
