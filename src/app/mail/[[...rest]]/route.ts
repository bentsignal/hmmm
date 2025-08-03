import { env } from "@/env";
import { NextRequest, NextResponse } from "next/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { tryCatch } from "@/lib/utils";

const handler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const status = searchParams.get("status");
  if (!email) {
    return NextResponse.redirect("https://qbe.sh", 302);
  }
  const { error } = await tryCatch(
    fetchMutation(api.mail.mail_mutations.updateNewsletterPreferenceForUser, {
      email,
      status: status === "true",
      key: env.NEXT_CONVEX_INTERNAL_KEY,
    }),
  );
  if (error) {
    console.error(error);
    throw new Error(`Failed to update newsletter status for user: ${email}`);
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
  return NextResponse.redirect("https://qbe.sh", 302);
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
