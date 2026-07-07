"use client";

import { useState, useEffect } from "react";
import { Job, MatchAnalysis, ApplicationPack } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  FileText,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchAnalysisModalProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchAnalysisModal({
  job,
  open,
  onOpenChange,
}: MatchAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCV, setHasCV] = useState<boolean | null>(null);
  const [applicationPack, setApplicationPack] =
    useState<ApplicationPack | null>(null);
  const [packLoading, setPackLoading] = useState(false);
  const [packError, setPackError] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (open && job) {
      setApplicationPack(null);
      setPackError(null);
      checkCVAndAnalyze();
    }
  }, [open, job]);

  const checkCVAndAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Check if user has a CV
      const profileRes = await fetch("/api/profile");
      const profileData = await profileRes.json();

      if (!profileData.data?.cv_text) {
        setHasCV(false);
        setLoading(false);
        return;
      }

      setHasCV(true);

      // Analyze the match
      const res = await fetch("/api/analyze-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job?.title,
          jobDescription: job?.summary,
          company: job?.company,
        }),
      });

      if (!res.ok) throw new Error("Failed to analyze match");

      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      setError("Failed to analyze the match. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateApplicationPack = async () => {
    if (!job) return;

    setPackLoading(true);
    setPackError(null);

    try {
      const response = await fetch("/api/application-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          company: job.company,
          jobDescription: job.summary,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate application pack");
      }

      setApplicationPack(data.applicationPack);
    } catch {
      setPackError("Failed to generate application pack. Please try again.");
    } finally {
      setPackLoading(false);
    }
  };

  const handleCopy = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      window.setTimeout(() => setCopiedSection(null), 1500);
    } catch {
      setPackError("Could not copy text. Please copy it manually.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-slate-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Moderate Match";
    return "Low Match";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CV Match Analysis</DialogTitle>
          <DialogDescription>
            {job?.title} at {job?.company}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Analyzing your CV match...
            </p>
          </div>
        )}

        {!loading && hasCV === false && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 font-medium">No CV Found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your CV in the Profile section to get AI-powered match
              analysis.
            </p>
            <Button
              className="mt-4"
              onClick={() => onOpenChange(false)}
              asChild
            >
              <a href="/dashboard/profile">Go to Profile</a>
            </Button>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="mt-2 text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={checkCVAndAnalyze}
            >
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <div
                className={cn(
                  "text-5xl font-bold",
                  getScoreColor(analysis.score),
                )}
              >
                {analysis.score}%
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {getScoreLabel(analysis.score)}
              </p>
              <Progress value={analysis.score} className="mt-4 h-2" />
            </div>

            {/* Summary */}
            <div>
              <p className="text-sm text-muted-foreground">
                {analysis.summary}
              </p>
            </div>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Your Strengths
                </h4>
                <ul className="mt-2 space-y-1">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Gaps */}
            {analysis.gaps.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                  Areas to Improve
                </h4>
                <ul className="mt-2 space-y-1">
                  {analysis.gaps.map((gap, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tips */}
            {analysis.tips.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Lightbulb className="h-4 w-4" />
                  Tips for Your Application
                </h4>
                <ul className="mt-2 list-none space-y-2">
                  {analysis.tips.map((tip, i) => (
                    <li
                      key={i}
                      className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ATS Scan */}
            {analysis.atsScan && (
              <div className="rounded-lg border p-4">
                <h4 className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4" />
                  ATS Scan
                </h4>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Section Score</span>
                      <span className="text-muted-foreground">
                        {analysis.atsScan.sectionScore}%
                      </span>
                    </div>
                    <Progress
                      value={analysis.atsScan.sectionScore}
                      className="mt-2 h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Keyword Score</span>
                      <span className="text-muted-foreground">
                        {analysis.atsScan.keywordScore}%
                      </span>
                    </div>
                    <Progress
                      value={analysis.atsScan.keywordScore}
                      className="mt-2 h-2"
                    />
                  </div>
                </div>

                {analysis.atsScan.sectionFeedback.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">CV Structure</p>
                    <ul className="mt-2 list-none space-y-1">
                      {analysis.atsScan.sectionFeedback.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.atsScan.missingKeywords.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">Missing Keywords</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {analysis.atsScan.missingKeywords
                        .slice(0, 10)
                        .map((keyword, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {analysis.atsScan.improvementTips.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">ATS Improvement Tips</p>
                    <ul className="mt-2 list-none space-y-2">
                      {analysis.atsScan.improvementTips.map((tip, i) => (
                        <li
                          key={i}
                          className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                        >
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Application Pack */}
            <div className="rounded-lg border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-sm font-medium">Application Pack</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate application text, CV bullet suggestions, and
                    keywords for this job.
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={handleGenerateApplicationPack}
                  disabled={packLoading}
                >
                  {packLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Generate Pack
                </Button>
              </div>

              {packError && (
                <p className="mt-3 text-sm text-destructive">{packError}</p>
              )}

              {applicationPack && (
                <div className="mt-4 space-y-5">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Short Motivation</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            applicationPack.shortMotivation,
                            "shortMotivation",
                          )
                        }
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedSection === "shortMotivation"
                          ? "Copied"
                          : "Copy"}
                      </Button>
                    </div>
                    <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                      {applicationPack.shortMotivation}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">Cover Letter Draft</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(applicationPack.coverLetter, "coverLetter")
                        }
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedSection === "coverLetter" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                    <p className="mt-2 whitespace-pre-line rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                      {applicationPack.coverLetter}
                    </p>
                  </div>

                  {applicationPack.cvBullets.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          CV Bullet Suggestions
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleCopy(
                              applicationPack.cvBullets.join("\n"),
                              "cvBullets",
                            )
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copiedSection === "cvBullets" ? "Copied" : "Copy"}
                        </Button>
                      </div>
                      <ul className="mt-2 list-none space-y-2">
                        {applicationPack.cvBullets.map((bullet, i) => (
                          <li
                            key={i}
                            className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {applicationPack.keywordsToInclude.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Keywords to Include</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {applicationPack.keywordsToInclude.map((keyword, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {applicationPack.doNotOverclaim.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Do Not Overclaim</p>
                      <ul className="mt-2 list-none space-y-2">
                        {applicationPack.doNotOverclaim.map((item, i) => (
                          <li
                            key={i}
                            className="rounded-md bg-muted px-3 py-2 text-sm leading-relaxed text-muted-foreground"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
