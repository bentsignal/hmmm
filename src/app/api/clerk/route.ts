import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { tryCatch } from "@/lib/utils";
import { env } from "@/env";
import { api } from "@/convex/_generated/api";
import { fetchMutation } from "convex/nextjs";

export async function POST(req: NextRequest) {
  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing required headers" },
      { status: 400 },
    );
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let event: WebhookEvent;
  try {
    const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook:", error);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { id } = event.data;
    if (!id) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 },
      );
    }
    const email = event.data.email_addresses[0].email_address;
    if (!email) {
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 },
      );
    }
    const { error } = await tryCatch(
      fetchMutation(api.users.createUser, {
        userId: id,
        email,
        requestSecret: env.CLERK_WEBHOOK_SECRET,
      }),
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ message: "Not allowed" }, { status: 405 });
}
