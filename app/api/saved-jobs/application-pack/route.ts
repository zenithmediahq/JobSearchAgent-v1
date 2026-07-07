import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const applicationPackSchema = z.object({
  shortMotivation: z.string(),
  coverLetter: z.string(),
  cvBullets: z.array(z.string()),
  keywordsToInclude: z.array(z.string()),
  doNotOverclaim: z.array(z.string()),
});

const saveApplicationPackSchema = z.object({
  savedJobId: z.string().uuid(),
  applicationPack: applicationPackSchema,
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = saveApplicationPackSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid application pack data",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("saved_jobs")
      .update({ application_pack: validation.data.applicationPack })
      .eq("id", validation.data.savedJobId)
      .eq("user_id", user.id)
      .select("id, application_pack")
      .maybeSingle();

    if (error) {
      console.error("[Saved Jobs] Error saving application pack:", error);
      return NextResponse.json(
        { error: "Failed to save application pack" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Saved job not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[Saved Jobs] Error in POST /application-pack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
