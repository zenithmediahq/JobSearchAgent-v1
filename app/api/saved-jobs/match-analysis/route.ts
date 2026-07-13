import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const atsScanSchema = z.object({
  sectionScore: z.number().min(0).max(100),
  keywordScore: z.number().min(0).max(100),
  foundKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  sectionFeedback: z.array(z.string()),
  improvementTips: z.array(z.string()),
});

const matchAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  tips: z.array(z.string()),
  atsScan: atsScanSchema.optional(),
});

const saveMatchAnalysisSchema = z.object({
  savedJobId: z.string().uuid(),
  analysis: matchAnalysisSchema,
  source: z.enum(["gemini", "fallback"]),
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
    const validation = saveMatchAnalysisSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid match analysis data",
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const { savedJobId, analysis, source } = validation.data;
    const { data, error } = await supabase
      .from("saved_jobs")
      .update({
        match_score: analysis.score,
        match_analysis: { ...analysis, source },
      })
      .eq("id", savedJobId)
      .eq("user_id", user.id)
      .select("id, match_score, match_analysis")
      .maybeSingle();

    if (error) {
      console.error("[Saved Jobs] Error saving match analysis:", error);
      return NextResponse.json(
        { error: "Failed to save match analysis" },
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
    console.error("[Saved Jobs] Error in POST /match-analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
