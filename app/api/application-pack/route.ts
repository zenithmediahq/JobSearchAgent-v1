import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const ApplicationPackSchema = z.object({
    motivation: z
        .string()
        .describe("Short motivation text, 3-5 sentences, in the same language as the job ad."),
    coverLetter: z
        .string()
        .describe("Full cover letter draft, professional tone, in the same language as the job ad."),
    cvBullets: z
        .array(z.string())
        .describe("3-6 CV bullet suggestions tailored to this job, based on the user's CV."),
    keywords: z
        .array(z.string())
        .describe("Important keywords from the job ad the user should include."),
    avoidClaims: z
        .array(z.string())
        .describe("Things the user should NOT overclaim based on their actual CV."),
})

export async function POST(req: Request) {
    try {
        // Auth: get current user
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Fetch CV from profile
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("cv_text")
            .eq("id", user.id)
            .single()

        if (profileError && profileError.code !== "PGRST116") {
            console.error("[application-pack] profile fetch error:", profileError)
            return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
        }

        if (!profile?.cv_text) {
            return NextResponse.json(
                { error: "No CV found. Please add your CV in the Profile section first." },
                { status: 400 }
            )
        }

        // Get job from request body — no CV needed from client anymore
        const { job } = await req.json()

        if (!job) {
            return NextResponse.json(
                { error: "Missing job in request body" },
                { status: 400 }
            )
        }

        const jobText = `
Title: ${job.title ?? ""}
Company: ${job.company ?? job.employer ?? ""}
Location: ${job.location ?? ""}
Description:
${job.description ?? ""}
`.trim()

        const prompt = `
You are helping a job seeker apply for a specific job in Sweden.
Use the job ad and the user's CV to generate an application pack.

Rules:
- Detect the language of the job ad (Swedish or English) and write motivation and coverLetter in that language.
- Be honest. Do not invent skills or experience that are not in the CV.
- Keep tone professional but human.
- cvBullets must be concrete and based on the CV.
- keywords must come from the job ad.
- avoidClaims must flag any skill in the job ad that is NOT in the CV.

JOB AD:
${jobText}

USER CV:
${profile.cv_text}
`.trim()

        const { object } = await generateObject({
            model: google("gemini-2.5-flash-lite"),
            schema: ApplicationPackSchema,
            prompt,
        })

        return NextResponse.json(object)
    } catch (err: any) {
        console.error("[application-pack] error:", err)
        return NextResponse.json(
            { error: err?.message ?? "Failed to generate application pack" },
            { status: 500 }
        )
    }
}
