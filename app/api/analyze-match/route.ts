import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { analyzeMatchSchema } from "@/lib/api-schemas";

const matchAnalysisSchema = z.object({
  score: z.number().min(0).max(100).describe("Match score from 0 to 100"),
  summary: z.string().describe("Brief summary of the match analysis"),
  strengths: z
    .array(z.string())
    .describe("List of candidate strengths that match the job"),
  gaps: z.array(z.string()).describe("List of skills or experience gaps"),
  tips: z.array(z.string()).describe("Tips for improving the application"),
});

const commonWords = new Set([
  // Swedish common words
  "och",
  "att",
  "som",
  "för",
  "med",
  "till",
  "har",
  "kan",
  "ska",
  "skall",
  "det",
  "den",
  "ett",
  "dina",
  "din",
  "dig",
  "du",
  "vi",
  "ni",
  "de",
  "dem",
  "dom",
  "är",
  "var",
  "vara",
  "blir",
  "bli",
  "på",
  "av",
  "i",
  "en",
  "om",
  "så",
  "men",
  "eller",
  "också",
  "även",
  "där",
  "här",
  "när",
  "hur",
  "vad",
  "vem",
  "vilka",
  "vilket",
  "vilken",
  "detta",
  "denna",
  "dessa",
  "sig",
  "sin",
  "sitt",
  "sina",
  "vår",
  "vårt",
  "våra",
  "er",
  "ert",
  "era",
  "hos",
  "mot",
  "under",
  "över",
  "inom",
  "utan",
  "efter",
  "före",
  "från",
  "upp",
  "ner",
  "ut",
  "in",
  "ha",
  "få",
  "får",
  "fick",
  "fått",
  "kommer",
  "vill",
  "behöver",
  "söker",
  "några",
  "andra",
  "ser",
  "gärna",
  "mycket",
  "bra",
  "god",
  "goda",
  "stark",
  "starka",
  "perfekt",
  "spännande",
  "etablerat",
  "flexibelt",
  "kombinera",
  "kombinerar",
  "möjlighet",
  "ansökan",
  "beslut",
  "välgrundade",
  "kristianstad",
  "uppdrag",
  "nytt",
  "deltid",
  "vecka",
  "intresse",
  "intresserad",
  "gillar",
  "hjälpa",
  "människor",
  "personer",
  "roll",
  "rollen",
  "tjänst",
  "tjänsten",
  "arbete",
  "jobbet",
  "arbetsuppgifter",
  "arbetsplats",
  "företag",
  "kunden",
  "kund",
  "kunder",
  "team",
  "gruppen",
  "tillsammans",
  "ansvar",
  "ansvara",
  "ansvarar",
  "arbeta",
  "arbetar",
  "arbetat",
  "erbjuder",
  "erbjuds",
  "möjligheter",
  "plats",
  "platsen",
  "området",
  "arbetsbeskrivning",
  "uppdraget",
  "placering",
  "företaget",
  "kundernas",
  "brinner",
  "besvara",
  "kunders",
  "problem",
  "kundens",
  "innebär",
  "frågor",
  "första",

  // English common words
  "the",
  "and",
  "for",
  "with",
  "from",
  "you",
  "your",
  "have",
  "are",
  "this",
  "that",
  "will",
  "work",
  "job",
  "role",
  "company",
  "position",
  "opportunity",
  "apply",
  "team",
  "candidate",
  "experience",
  "responsibilities",
  "requirements",
  "looking",
  "seeking",
  "join",
  "good",
  "strong",
  "excellent",
  "great",
  "people",
  "person",
  "within",
  "about",
  "where",
  "when",
  "what",
  "make",
  "help",
  "based",
  "include",
  "including",
  "new",
  "part",
  "full",
  "time",
]);

const allowedShortKeywords = new Set([
  "c#",
  "sql",
  "api",
  "crm",
  "erp",
  "css",
  "git",
  "ui",
  "ux",
  "it",
]);

function extractKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .normalize("NFC")
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}"]/g, " ")
        .replace(/[^\p{L}\p{N}+#.-]+/gu, " ")
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => !word.endsWith("-"))
        .map((word) => word.replace(/^[.-]+|[.-]+$/g, ""))
        .filter((word) => {
          if (word.length < 4 && !allowedShortKeywords.has(word)) return false;
          if (commonWords.has(word)) return false;
          if (/^\d+$/.test(word)) return false;
          return true;
        }),
    ),
  );
}

function rankKeywords(keywords: string[]) {
  return [...keywords].sort((a, b) => {
    const aHasSpecialChar = /[+#.-]/.test(a) ? 1 : 0;
    const bHasSpecialChar = /[+#.-]/.test(b) ? 1 : 0;

    const specialScore = bHasSpecialChar - aHasSpecialChar;
    if (specialScore !== 0) return specialScore;

    return b.length - a.length;
  });
}

function fallbackAnalyzeMatch(
  cv: string,
  jobTitle: string,
  jobSummary: string,
) {
  const cvKeywords = extractKeywords(cv);
  const jobKeywords = extractKeywords(`${jobTitle} ${jobSummary}`);

  const matchedKeywords = rankKeywords(
    jobKeywords.filter((keyword) => cvKeywords.includes(keyword)),
  );

  const missingKeywords = rankKeywords(
    jobKeywords.filter((keyword) => !cvKeywords.includes(keyword)),
  ).slice(0, 12);

  const matchRatio =
    jobKeywords.length > 0 ? matchedKeywords.length / jobKeywords.length : 0;

  const score = Math.min(95, Math.max(20, Math.round(matchRatio * 100)));

  const strengths =
    matchedKeywords.length > 0
      ? matchedKeywords
          .slice(0, 6)
          .map(
            (keyword) =>
              `Your CV mentions "${keyword}", which appears relevant to this role.`,
          )
      : [
          "Your CV is saved, but the fallback scanner found few direct keyword matches.",
        ];

  const gaps =
    missingKeywords.length > 0
      ? missingKeywords.map(
          (keyword) =>
            `The job ad mentions "${keyword}", but it was not clearly found in your CV.`,
        )
      : ["No major keyword gaps found by the fallback scanner."];

  const tips = [
    "Mirror the most important job keywords naturally in your CV and application.",
    "Add concrete examples that prove your experience instead of only listing skills.",
    "Be honest. Do not overclaim skills you do not have.",
    "For Swedish job ads, use the same language as the ad when possible.",
  ];

  return {
    score,
    summary: `Fallback keyword analysis found ${matchedKeywords.length} matching keywords out of ${jobKeywords.length}. This is a basic estimate used when AI analysis is unavailable.`,
    strengths,
    gaps,
    tips,
  };
}

function runAtsScan(cv: string, jobTitle: string, jobSummary: string) {
  const lowerCv = cv.toLowerCase();

  const requiredSections = [
    {
      name: "experience",
      labels: [
        "experience",
        "work experience",
        "arbetslivserfarenhet",
        "erfarenhet",
      ],
    },
    {
      name: "education",
      labels: ["education", "utbildning"],
    },
    {
      name: "skills",
      labels: ["skills", "technical skills", "kompetenser", "färdigheter"],
    },
    {
      name: "contact",
      labels: ["email", "@", "phone", "telefon", "linkedin"],
    },
  ];

  const foundSections = requiredSections.filter((section) =>
    section.labels.some((label) => lowerCv.includes(label)),
  );

  const sectionScore = Math.round(
    (foundSections.length / requiredSections.length) * 100,
  );

  const cvKeywords = extractKeywords(cv);
  const jobKeywords = extractKeywords(`${jobTitle} ${jobSummary}`);

  const foundKeywords = rankKeywords(
    jobKeywords.filter((keyword) => cvKeywords.includes(keyword)),
  ).slice(0, 12);

  const missingKeywords = rankKeywords(
    jobKeywords.filter((keyword) => !cvKeywords.includes(keyword)),
  ).slice(0, 12);

  const keywordScore =
    jobKeywords.length > 0
      ? Math.round(
          (foundKeywords.length / Math.min(jobKeywords.length, 30)) * 100,
        )
      : 0;

  const sectionFeedback = requiredSections.map((section) => {
    const found = section.labels.some((label) => lowerCv.includes(label));

    return found
      ? `Found a likely ${section.name} section.`
      : `Could not clearly find a ${section.name} section.`;
  });

  const improvementTips = [
    "Use clear section headings such as Experience, Skills, Education, and Contact.",
    "Mirror important keywords from the job ad naturally in your CV.",
    "Use simple formatting so ATS systems can read the text correctly.",
    "Add measurable achievements where possible, not only responsibilities.",
  ];

  return {
    sectionScore,
    keywordScore: Math.min(100, keywordScore),
    foundKeywords,
    missingKeywords,
    sectionFeedback,
    improvementTips,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's CV
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_text")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[v0] Error fetching profile:", profileError);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }

  if (!profile?.cv_text) {
    return NextResponse.json(
      { error: "CV not found. Please upload your CV first." },
      { status: 400 },
    );
  }

  const body = await request.json();

  // Validate input
  const validation = analyzeMatchSchema.safeParse({
    cv: profile.cv_text,
    jobTitle: body.jobTitle,
    jobSummary: body.jobDescription,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: "Invalid analysis data", details: validation.error.errors },
      { status: 400 },
    );
  }

  try {
    const result = await generateText({
      model: google("gemini-2.5-flash-lite"),
      output: Output.object({ schema: matchAnalysisSchema }),
      prompt: `You are a career advisor analyzing how well a candidate's CV matches a job posting.

Job Title: ${validation.data.jobTitle}
Job Description: ${validation.data.jobSummary}

Candidate's CV:
${validation.data.cv}

Analyze the match between this CV and the job posting. Provide:
1. A match score from 0-100 based on skills, experience, and requirements alignment
2. A brief summary of the overall match
3. Key strengths the candidate has for this role
4. Gaps or areas where the candidate might be lacking
5. Practical tips for improving their application

Keep the answer practical, honest, and concise.`,
    });

    if (!result.output) {
      throw new Error("Gemini returned no output");
    }

    const atsScan = runAtsScan(
      validation.data.cv,
      validation.data.jobTitle,
      validation.data.jobSummary,
    );

    return NextResponse.json({
      analysis: {
        ...result.output,
        atsScan,
      },
      source: "gemini",
    });
  } catch (aiError) {
    console.error("[v0] Gemini analysis failed, using fallback:", aiError);

    const fallbackAnalysis = fallbackAnalyzeMatch(
      validation.data.cv,
      validation.data.jobTitle,
      validation.data.jobSummary,
    );

    const atsScan = runAtsScan(
      validation.data.cv,
      validation.data.jobTitle,
      validation.data.jobSummary,
    );

    return NextResponse.json({
      analysis: {
        ...fallbackAnalysis,
        atsScan,
      },
      source: "fallback",
      message: "Gemini was unavailable, so fallback keyword scoring was used.",
    });
  }
}
