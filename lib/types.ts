export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  source: string;
  published_date: string;
  job_type: string;
  summary: string;
  url: string;
}

export interface SavedJob extends Job {
  user_id: string;
  job_id: string;
  match_score?: number;
  match_analysis?: SavedMatchAnalysis | null;
  application_pack?: ApplicationPack | null;
  status: "saved" | "applied" | "interview" | "rejected" | "offer";
  created_at: string;
  updated_at: string;
}

export interface AtsScan {
  sectionScore: number;
  keywordScore: number;
  foundKeywords: string[];
  missingKeywords: string[];
  sectionFeedback: string[];
  improvementTips: string[];
}

export interface MatchAnalysis {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  tips: string[];
  atsScan?: AtsScan;
}

export type AnalysisSource = "gemini" | "fallback";

export interface SavedMatchAnalysis extends MatchAnalysis {
  source?: AnalysisSource;
}

export interface ApplicationPack {
  shortMotivation: string;
  coverLetter: string;
  cvBullets: string[];
  keywordsToInclude: string[];
  doNotOverclaim: string[];
}

export interface Profile {
  id: string;
  cv_text: string | null;
  created_at: string;
  updated_at: string;
}

export type JobStatus =
  | "saved"
  | "applied"
  | "interview"
  | "rejected"
  | "offer";

export const STATUS_CONFIG: Record<
  JobStatus,
  { label: string; color: string }
> = {
  saved: { label: "Saved", color: "bg-slate-100 text-slate-700" },
  applied: { label: "Applied", color: "bg-blue-100 text-blue-700" },
  interview: { label: "Interview", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  offer: { label: "Offer", color: "bg-emerald-100 text-emerald-700" },
};
