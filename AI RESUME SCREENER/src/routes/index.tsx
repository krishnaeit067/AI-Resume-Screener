import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Upload, Sparkles, CheckCircle2, AlertCircle, Loader2, X, Download, Circle } from "lucide-react";
import { toast } from "sonner";
import { downloadCsvReport, downloadPdfReport } from "@/lib/report-export";

import { analyzeResume, type ResumeAnalysis } from "@/lib/resume.functions";
import { RUBRIC_PRESETS, type RubricPresetId } from "@/lib/rubric-presets";
import { extractPdfText } from "@/lib/pdf-extract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Resume Screener — Instant candidate evaluation" },
      {
        name: "description",
        content:
          "Upload a resume PDF and get an AI-powered ATS score, skill breakdown, strengths, weaknesses, and hiring recommendation in seconds.",
      },
      { property: "og:title", content: "AI Resume Screener" },
      {
        property: "og:description",
        content:
          "Upload a resume PDF and get an AI-powered ATS score, skill breakdown, and hiring recommendation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const recColor: Record<ResumeAnalysis["recommendation"], string> = {
  "Strong Hire": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Hire: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Maybe: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  "No Hire": "bg-rose-500/15 text-rose-700 border-rose-500/30",
};

type Stage = "parsing" | "ai" | "scoring" | "summary" | "done" | "error";

const STAGE_ORDER: Stage[] = ["parsing", "ai", "scoring", "summary", "done"];
const STAGE_META: Record<Exclude<Stage, "done" | "error">, { title: string; description: string }> = {
  parsing: {
    title: "Parsing PDF",
    description: "Extracting text from the uploaded file.",
  },
  ai: {
    title: "AI extraction",
    description: "Reading candidate details, skills, and experience.",
  },
  scoring: {
    title: "Scoring",
    description: "Applying rubric weights to each category.",
  },
  summary: {
    title: "Final summary",
    description: "Building the recommendation and rationale.",
  },
};

function Index() {
  const analyze = useServerFn(analyzeResume);
  const [file, setFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [presetId, setPresetId] = useState<RubricPresetId>("general");
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [stage, setStage] = useState<Stage | null>(null);
  const [errorStage, setErrorStage] = useState<Stage | null>(null);
  const [runId, setRunId] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activePreset = RUBRIC_PRESETS.find((p) => p.id === presetId) ?? RUBRIC_PRESETS[0];

  const clearStageTimers = useCallback(() => {
    stageTimersRef.current.forEach((t) => clearTimeout(t));
    stageTimersRef.current = [];
  }, []);

  useEffect(() => () => clearStageTimers(), [clearStageTimers]);

  const mutation = useMutation({
    mutationFn: async () =>
      analyze({
        data: {
          resumeText,
          jobDescription: jobDescription.trim() || undefined,
          presetId,
        },
      }),
    onSuccess: () => {
      clearStageTimers();
      setStage("done");
      setErrorStage(null);
    },
    onError: () => {
      clearStageTimers();
      setErrorStage((prev) => prev ?? (stage && stage !== "done" ? stage : "ai"));
      setStage("error");
    },
  });

  const resetAll = useCallback(() => {
    clearStageTimers();
    setStage(null);
    setErrorStage(null);
    mutation.reset();
  }, [clearStageTimers, mutation]);

  const startAnalyze = useCallback(() => {
    clearStageTimers();
    mutation.reset();
    setErrorStage(null);
    setRunId((n) => n + 1);
    setStage("ai");
    stageTimersRef.current.push(
      setTimeout(() => setStage((s) => (s === "ai" ? "scoring" : s)), 2000),
      setTimeout(() => setStage((s) => (s === "scoring" ? "summary" : s)), 4500),
    );
    mutation.mutate();
  }, [clearStageTimers, mutation]);

  const onFile = useCallback(
    async (f: File) => {
      resetAll();
      setExtractError(null);
      setFile(f);
      setResumeText("");
      setExtracting(true);
      setStage("parsing");
      try {
        const text = await extractPdfText(f);
        if (!text || text.length < 20) {
          setExtractError("Couldn't extract text. Try a different PDF or paste text below.");
          setErrorStage("parsing");
          setStage("error");
        } else {
          setResumeText(text);
          setStage(null);
        }
      } catch (e) {
        setExtractError(e instanceof Error ? e.message : "Failed to read PDF");
        setErrorStage("parsing");
        setStage("error");
      } finally {
        setExtracting(false);
      }
    },
    [resetAll],
  );

  const result = mutation.data;


  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="border-b border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI Resume Screener</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Screen resumes in seconds
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-pretty text-muted-foreground">
            Upload a PDF resume, optionally paste a job description, and get an ATS score, skill
            breakdown, strengths, weaknesses, and a hiring recommendation.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">1. Upload resume</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) onFile(f);
                }}
                onClick={() => inputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-8 text-center transition hover:bg-muted/60"
              >
                {file ? (
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 text-left">
                        <div className="truncate text-sm font-medium">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setResumeText("");
                        setExtractError(null);
                        resetAll();
                      }}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Remove file"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <div className="text-sm font-medium">Drop PDF here or click to browse</div>
                    <div className="mt-1 text-xs text-muted-foreground">PDF only</div>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onFile(f);
                  }}
                />
              </div>

              {extracting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Extracting text…
                </div>
              )}
              {extractError && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div>{extractError}</div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Or paste resume text
                </label>
                <Textarea
                  value={resumeText}
                  onChange={(e) => {
                    setResumeText(e.target.value);
                    if (mutation.data || mutation.error) resetAll();
                  }}
                  placeholder="Paste resume text if PDF extraction fails…"
                  className="min-h-28"
                />
              </div>

              <Separator />

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Scoring rubric
                </label>
                <Select
                  value={presetId}
                  onValueChange={(v) => setPresetId(v as RubricPresetId)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {RUBRIC_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {activePreset.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    Skills {activePreset.weights.skills}%
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Experience {activePreset.weights.experience}%
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Education {activePreset.weights.education}%
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Impact {activePreset.weights.impact}%
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Job description (optional)
                </label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the job description to get a job-fit match score…"
                  className="min-h-28"
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                disabled={resumeText.trim().length < 20 || mutation.isPending || extracting}
                onClick={startAnalyze}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Analyze resume
                  </>
                )}
              </Button>

              {mutation.error && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <div>{(mutation.error as Error).message}</div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-3">
            {!result && !mutation.isPending && stage === null && (
              <Card className="flex min-h-[480px] items-center justify-center border-dashed">
                <div className="p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <div className="text-sm font-medium">Results will appear here</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Upload a resume to get started
                  </div>
                </div>
              </Card>
            )}

            {(mutation.isPending || (stage !== null && stage !== "done" && !result)) && (
              <AnalysisProgress
                stage={stage ?? "ai"}
                errorStage={errorStage}
                errorMessage={
                  stage === "error"
                    ? errorStage === "parsing"
                      ? extractError ?? "Failed to parse the resume."
                      : (mutation.error as Error | null)?.message ?? "Analysis failed."
                    : null
                }
                onRetry={
                  stage === "error" && errorStage !== "parsing" && resumeText.trim().length >= 20
                    ? startAnalyze
                    : undefined
                }
              />
            )}

            {result && stage === "done" && (
              <>
                <EditableResume
                  key={`edit-${runId}`}
                  value={resumeText}
                  onChange={setResumeText}
                  onReanalyze={startAnalyze}
                  disabled={mutation.isPending}
                />
                <Results key={runId} r={result} presetLabel={activePreset.label} />
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Resumes are processed in your browser and via secure server
        functions.
      </footer>
    </div>
  );
}

function Results({ r, presetLabel }: { r: ResumeAnalysis; presetLabel: string }) {
  const [exporting, setExporting] = useState<"pdf" | "csv" | null>(null);

  const runExport = async (kind: "pdf" | "csv") => {
    if (exporting) return;
    setExporting(kind);
    const label = kind.toUpperCase();
    const toastId = toast.loading(`Preparing ${label} report…`);
    try {
      // Yield to the event loop so the loading state renders before heavy work.
      await new Promise((res) => setTimeout(res, 0));
      if (kind === "pdf") {
        await downloadPdfReport(r, presetLabel);
      } else {
        await downloadCsvReport(r, presetLabel);
      }
      toast.success(`${label} downloaded`, { id: toastId });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Couldn't generate ${label}`, {
        id: toastId,
        duration: Infinity,
        description:
          msg.length > 160
            ? "Please try again, or use the Retry button below."
            : msg,
        action: {
          label: "Retry",
          onClick: () => runExport(kind),
        },
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Candidate
              </div>
              <CardTitle className="text-2xl">{r.candidateName}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                onClick={() => runExport("pdf")}
              >
                {exporting === "pdf" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                {exporting === "pdf" ? "Generating…" : "PDF"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={exporting !== null}
                onClick={() => runExport("csv")}
              >
                {exporting === "csv" ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                )}
                {exporting === "csv" ? "Generating…" : "CSV"}
              </Button>
              <Badge className={`border ${recColor[r.recommendation]}`} variant="outline">
                {r.recommendation}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{r.summary}</p>
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">ATS score</span>
              <span className="text-muted-foreground">{r.atsScore}/100</span>
            </div>
            <Progress value={r.atsScore} />
          </div>
          {r.jobFit && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium">Job fit</span>
                <span className="text-muted-foreground">{r.jobFit.matchScore}/100</span>
              </div>
              <Progress value={r.jobFit.matchScore} />
              <p className="mt-2 text-xs text-muted-foreground">{r.jobFit.notes}</p>
            </div>
          )}
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="font-medium">Why: </span>
            {r.recommendationReason}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <SkillGroup label="Technical" items={r.skills.technical} />
            <SkillGroup label="Tools" items={r.skills.tools} />
            <SkillGroup label="Soft skills" items={r.skills.soft} />
          </CardContent>
      </Card>



        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Strengths
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {r.strengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-amber-600" /> Weaknesses
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {r.weaknesses.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle className="text-base">ATS scoring breakdown</CardTitle>
            <div className="text-xs text-muted-foreground">
              Weighted total:{" "}
              <span className="font-semibold text-foreground">{r.atsScore}/100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(["skills", "experience", "education", "impact"] as const).map((key) => {
            const row = r.rubricBreakdown[key];
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{label}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      weight {row.weight}%
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Score <span className="font-semibold text-foreground">{row.score}/100</span>
                    <span className="mx-1.5">·</span>
                    Contributes{" "}
                    <span className="font-semibold text-foreground">
                      {row.weightedContribution.toFixed(1)}
                    </span>{" "}
                    pts
                  </div>
                </div>
                <Progress value={row.score} />
                <p className="text-xs text-muted-foreground">{row.rationale}</p>
              </div>
            );
          })}
          <Separator />
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
            Final ATS score is the sum of each category's weighted contribution
            (score × weight ÷ 100). Recommendation thresholds: 85+ Strong Hire · 70–84 Hire ·
            55–69 Maybe · &lt;55 No Hire.
          </div>
        </CardContent>
      </Card>



      {r.jobFit && (r.jobFit.matchingSkills.length > 0 || r.jobFit.missingSkills.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job description match</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <SkillGroup label="Matching" items={r.jobFit.matchingSkills} tone="good" />
            <SkillGroup label="Missing" items={r.jobFit.missingSkills} tone="bad" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {r.experience.map((e, i) => (
            <div key={i} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-sm font-semibold">{e.role}</div>
                <div className="text-xs text-muted-foreground">{e.duration}</div>
              </div>
              <div className="text-xs text-muted-foreground">{e.company}</div>
              {e.highlights.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {e.highlights.map((h, j) => (
                    <li key={j}>• {h}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {r.experience.length === 0 && (
            <div className="text-sm text-muted-foreground">No experience extracted.</div>
          )}
        </CardContent>
      </Card>

      {r.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.education.map((e, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <div>
                  <span className="font-medium">{e.degree}</span>
                  <span className="text-muted-foreground"> — {e.institution}</span>
                </div>
                <div className="text-xs text-muted-foreground">{e.year}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function SkillGroup({
  label,
  items,
  tone = "neutral",
}: {
  label: string;
  items: string[];
  tone?: "neutral" | "good" | "bad";
}) {
  if (items.length === 0) return null;
  const toneCls =
    tone === "good"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : tone === "bad"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
        : "";
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((s, i) => (
          <Badge key={i} variant="secondary" className={toneCls}>
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AnalysisProgress({
  stage,
  errorStage,
  errorMessage,
  onRetry,
}: {
  stage: Stage;
  errorStage: Stage | null;
  errorMessage: string | null;
  onRetry?: () => void;
}) {
  const steps = STAGE_ORDER.filter((s) => s !== "done") as Array<Exclude<Stage, "done" | "error">>;
  const activeIndex =
    stage === "error"
      ? steps.indexOf((errorStage ?? "ai") as (typeof steps)[number])
      : stage === "done"
        ? steps.length
        : steps.indexOf(stage as (typeof steps)[number]);
  const completedCount = stage === "done" ? steps.length : Math.max(0, activeIndex);
  const percent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="min-h-[480px]">
      <CardHeader>
        <CardTitle className="text-base">
          {stage === "error" ? "Something went wrong" : "Analyzing resume"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <Progress value={percent} />
        </div>

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const meta = STAGE_META[s];
            const isFailed = stage === "error" && i === activeIndex;
            const isActive = stage !== "error" && i === activeIndex;
            const isDone = i < completedCount;
            return (
              <li key={s} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isFailed ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={
                      "text-sm font-medium " +
                      (isFailed
                        ? "text-destructive"
                        : isActive
                          ? "text-foreground"
                          : isDone
                            ? "text-foreground"
                            : "text-muted-foreground")
                    }
                  >
                    {meta.title}
                    {isActive && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        In progress…
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{meta.description}</div>
                  {isFailed && errorMessage && (
                    <div className="mt-1 text-xs text-destructive">{errorMessage}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {stage === "error" && onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function EditableResume({
  value,
  onChange,
  onReanalyze,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onReanalyze: () => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const dirty = draft !== value;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Extracted resume text</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
              {open ? "Hide" : "Edit"}
            </Button>
            <Button
              size="sm"
              disabled={disabled || draft.trim().length < 20}
              onClick={() => {
                if (dirty) onChange(draft);
                onReanalyze();
              }}
            >
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Re-analyze
            </Button>
          </div>
        </div>
      </CardHeader>
      {open && (
        <CardContent className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-64 font-mono text-xs"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {draft.length.toLocaleString()} characters
              {dirty && <span className="ml-2 text-amber-600">Unsaved edits</span>}
            </span>
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setDraft(value)}>
                Revert
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
