import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const applicationPackSchema = z.object({
  shortMotivation: z.string(),
  coverLetter: z.string(),
  cvBullets: z.array(z.string()),
  keywordsToInclude: z.array(z.string()),
  doNotOverclaim: z.array(z.string()),
});

const requestSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  jobDescription: z.string().min(1),
});

const fallbackStopWords = new Set([
  // Swedish common/filler words
  "och",
  "att",
  "som",
  "för",
  "med",
  "till",
  "från",
  "inom",
  "utan",
  "eller",
  "vara",
  "har",
  "kan",
  "ska",
  "kommer",
  "vill",
  "söker",
  "några",
  "andra",
  "arbete",
  "jobbet",
  "rollen",
  "tjänsten",
  "företag",
  "perfekt",
  "spännande",
  "etablerat",
  "flexibelt",
  "kombinera",
  "möjlighet",
  "ansökan",
  "person",
  "dig",
  "oss",
  "vår",
  "våra",
  "din",
  "dina",
  "beslut",
  "välgrundade",
  "kombinerar",
  "kristianstad",
  "uppdrag",
  "nytt",
  "deltid",
  "vecka",

  // English common/filler words
  "this",
  "that",
  "with",
  "from",
  "your",
  "will",
  "have",
  "role",
  "work",
  "team",
  "company",
  "candidate",
  "position",
  "opportunity",
  "apply",
  "looking",
  "responsibilities",
  "requirements",
]);

function extractApplicationKeywords(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}"]/g, " ")
        .replace(/[^\p{L}\p{N}+#.-]+/gu, " ")
        .split(/\s+/)
        .map((word) => word.trim().replace(/^[.-]+|[.-]+$/g, ""))
        .filter((word) => word.length >= 4)
        .filter((word) => !word.endsWith("-"))
        .filter((word) => !word.endsWith("."))
        .filter((word) => !/^\d+$/.test(word))
        .filter((word) => !fallbackStopWords.has(word)),
    ),
  )
    .sort((a, b) => {
      const aHasSpecialChar = /[+#.-]/.test(a) ? 1 : 0;
      const bHasSpecialChar = /[+#.-]/.test(b) ? 1 : 0;

      if (aHasSpecialChar !== bHasSpecialChar) {
        return bHasSpecialChar - aHasSpecialChar;
      }

      return b.length - a.length;
    })
    .slice(0, 10);
}

function createFallbackApplicationPack(
  jobTitle: string,
  company: string,
  jobDescription: string,
  cvText: string,
) {
  const isSwedish =
    /[åäö]/i.test(jobDescription) ||
    /\b(och|att|som|för|med|kund|tjänst|arbetsuppgifter)\b/i.test(
      jobDescription,
    );

  const keywords = extractApplicationKeywords(
    `${jobTitle} ${company} ${jobDescription}`,
  );

  if (isSwedish) {
    return {
      shortMotivation: `Jag är intresserad av rollen som ${jobTitle} hos ${company} eftersom den matchar min erfarenhet av service, problemlösning och kundkontakt. Jag vill bidra med ett lugnt och hjälpsamt bemötande samt en praktisk förmåga att lösa problem. Min bakgrund gör att jag snabbt kan sätta mig in i nya arbetsuppgifter och stötta kunder på ett tydligt sätt.`,
      coverLetter: `Hej ${company},

Jag vill gärna söka tjänsten som ${jobTitle}. Rollen fångade mitt intresse eftersom den verkar passa min erfarenhet av service, kundkontakt och problemlösning.

I mina tidigare roller har jag arbetat med att hjälpa användare och kunder, hantera ärenden och kommunicera tydligt även när problemen behöver lösas snabbt. Jag trivs i roller där jag får vara hjälpsam, strukturerad och bidra till att människor får rätt stöd.

Jag ser gärna möjligheten att bidra hos er med min servicekänsla, ansvarstagande och vilja att utvecklas vidare.

Vänliga hälsningar,
Jonathan Persson`,
      cvBullets: [
        "Hanterade support- och kundärenden med fokus på tydlig kommunikation och snabb problemlösning.",
        "Gav hjälp till användare via digitala kanaler och arbetade strukturerat med ärendehantering.",
        "Felsökte problem kopplade till IT, system och användarstöd på ett pedagogiskt sätt.",
        "Bidrog till god kundupplevelse genom lugnt bemötande och lösningsorienterat arbetssätt.",
        "Anpassade kommunikationen efter användarens behov och tekniska nivå.",
      ],
      keywordsToInclude: keywords,
      doNotOverclaim: [
        "Lägg inte till exakta siffror, procent eller volymer om de inte finns i CV:t.",
        "Påstå inte expertkunskap inom system eller verktyg som inte tydligt nämns i CV:t.",
        "Framställ inte rollen som mer senior än din faktiska erfarenhet stödjer.",
        "Lova inte att kunna lösa alla kundproblem direkt, eftersom vissa ärenden kan behöva eskaleras.",
      ],
    };
  }

  return {
    shortMotivation: `I am interested in the ${jobTitle} role at ${company} because it matches my experience with service, communication, and problem solving. I can contribute with a calm, helpful approach and a practical ability to support customers or users clearly. I am motivated to learn quickly and add value in a structured way.`,
    coverLetter: `Hello ${company},

I would like to apply for the ${jobTitle} position. The role interests me because it connects well with my experience in service, support, communication, and problem solving.

In previous roles, I have helped users and customers, handled support cases, and worked in a structured way to understand and solve problems. I enjoy roles where I can be helpful, clear, and reliable.

I would welcome the opportunity to contribute with my service mindset, responsibility, and willingness to keep developing.

Kind regards,
Jonathan Persson`,
    cvBullets: [
      "Handled support and customer-related cases with focus on clear communication and problem solving.",
      "Supported users through digital channels and worked in a structured way with case handling.",
      "Troubleshot IT, system, and user-related issues in a clear and practical way.",
      "Contributed to a positive customer experience through a calm and solution-oriented approach.",
      "Adapted communication based on the user’s needs and technical level.",
    ],
    keywordsToInclude: keywords,
    doNotOverclaim: [
      "Do not add exact numbers, percentages, or volumes unless they are clearly stated in the CV.",
      "Do not claim expert knowledge of tools or systems that are not clearly supported by the CV.",
      "Do not make the role sound more senior than the real experience supports.",
      "Do not promise to solve every customer issue immediately, because some cases may need escalation.",
    ],
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("cv_text")
    .eq("id", user.id)
    .single();

  if (profileError) {
    console.error("[Application Pack] Error fetching profile:", profileError);

    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }

  if (!profile?.cv_text) {
    return NextResponse.json(
      { error: "CV not found. Please add your CV first." },
      { status: 400 },
    );
  }

  const body = await request.json();
  const validation = requestSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid application pack data",
        details: validation.error.errors,
      },
      { status: 400 },
    );
  }

  try {
    const result = await generateText({
      model: google("gemini-2.5-flash-lite"),
      output: Output.object({ schema: applicationPackSchema }),
      prompt: `You are helping a job seeker prepare a strong but honest job application.

Job title: ${validation.data.jobTitle}
Company: ${validation.data.company}

Job description:
${validation.data.jobDescription}

Candidate CV:
${profile.cv_text}

Create an application pack with:

1. shortMotivation
A short motivation text, 3-5 sentences. It should be practical and natural.

2. coverLetter
A cover letter draft. Keep it clear, honest, and not too formal.

3. cvBullets
5 improved CV bullet suggestions based on the candidate's real experience and the job ad.

4. keywordsToInclude
8-12 keywords from the job ad that the candidate should naturally include if truthful.

5. doNotOverclaim
3-6 things the candidate should avoid exaggerating or claiming if the CV does not clearly support it.

Important:
- Do not invent experience, numbers, metrics, tools, certifications, companies, education, or responsibilities.
- Do not include exact numbers such as percentages, daily ticket counts, user counts, years, or volumes unless they are clearly stated in the CV.
- If a bullet would benefit from a metric but the CV does not provide one, write it without a number.
- Make CV bullet suggestions realistic and based only on the candidate's actual background.
- Do not make the candidate sound fake or overconfident.
- If the job ad is Swedish, write the application material in Swedish.
- If the job ad is English, write it in English.
- Be specific and useful.`,
    });

    if (!result.output) {
      throw new Error("Gemini returned no output");
    }

    return NextResponse.json({
      applicationPack: result.output,
      source: "gemini",
    });
  } catch (error) {
    console.error("[Application Pack] Gemini failed:", error);

    const fallbackPack = createFallbackApplicationPack(
      validation.data.jobTitle,
      validation.data.company,
      validation.data.jobDescription,
      profile.cv_text,
    );

    return NextResponse.json({
      applicationPack: fallbackPack,
      source: "fallback",
      message:
        "Gemini is temporarily unavailable, so a fallback application pack was generated instead.",
    });
  }
}
