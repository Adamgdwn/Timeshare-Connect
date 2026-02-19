import { NextResponse } from "next/server";

type FeedbackKind = "bug" | "idea";

type FeedbackPayload = {
  kind?: FeedbackKind;
  title?: string;
  details?: string;
  pageUrl?: string;
};

function getKindLabel(kind: FeedbackKind) {
  return kind === "bug" ? "Bug" : "Idea";
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FeedbackPayload;
    const kind: FeedbackKind = payload.kind === "idea" ? "idea" : "bug";
    const title = (payload.title || "").trim();
    const details = (payload.details || "").trim();
    const pageUrl = (payload.pageUrl || "").trim();

    if (!details) {
      return NextResponse.json({ error: "Details are required." }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_CONTACT_EMAIL || process.env.NEXT_PUBLIC_ADMIN_CONTACT_EMAIL;
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL;

    if (!resendApiKey || !adminEmail || !fromEmail) {
      return NextResponse.json(
        {
          error:
            "Feedback email is not configured. Set RESEND_API_KEY, FEEDBACK_FROM_EMAIL, and ADMIN_CONTACT_EMAIL.",
        },
        { status: 500 }
      );
    }

    const subject = `[${getKindLabel(kind)}] ${title || "New report"} - Timeshare Connect`;
    const body = `Type: ${getKindLabel(kind)}
Time: ${new Date().toISOString()}
Page: ${pageUrl || "Unknown"}

Details:
${details}
`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [adminEmail],
        subject,
        text: body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Email provider rejected request: ${errorText}` },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to submit feedback." }, { status: 500 });
  }
}

