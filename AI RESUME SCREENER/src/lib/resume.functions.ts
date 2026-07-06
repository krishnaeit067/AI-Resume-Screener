import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { getPreset, type RubricPresetId } from "./rubric-presets";

const PRESET_IDS = [
  "general",
  "software-engineer",
  "data-scientist",
  "intern",
  "product-manager",
  "designer",
] as const;

const CategorySchema = z.object({
  score: z.number().describe("Raw 0-100 score for this dimension"),
  weight: z.number().describe("Rubric weight % applied"),
  weightedContribution: z.number().describe("score * weight / 100"),
  rationale: z.string().describe("1-2 sentence justification"),
});

const AnalysisSchema = z.object({
  candidateName: z.string().describe("Full name of the candidate, or 'Unknown' if not found"),
  summary: z.string().describe("2-3 sentence professional summary"),
  atsScore: z.number().describe("ATS compatibility score 0-100"),
  skills: z.object({
    technical: z.array(z.string()),
    soft: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  experience: z.array(
    z.object({
      role: z.string(),
      company: z.string(),
      duration: z.string(),
      highlights: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      degree: z.string(),
      institution: z.string(),
      year: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  rubricBreakdown: z.object({
    skills: CategorySchema,
    experience: CategorySchema,
    education: CategorySchema,
    impact: CategorySchema,
  }),
  recommendation: z.enum(["Strong Hire", "Hire", "Maybe", "No Hire"]),
  recommendationReason: z.string(),
  jobFit: z
    .object({
      matchScore: z.number(),
      matchingSkills: z.array(z.string()),
      missingSkills: z.array(z.string()),
      notes: z.string(),
    })
    .nullable(),
});

export type ResumeAnalysis = z.infer<typeof AnalysisSchema>;

type RubricWeights = {
  skills: number;
  experience: number;
  education: number;
  impact: number;
};

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toStringValue = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    : [];

const clampScore = (value: unknown, fallback = 0): number => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric * 10) / 10));
};

const weightedContribution = (score: number, weight: number): number =>
  Math.round(((score * weight) / 100) * 10) / 10;

const recommendationFromScore = (score: number): ResumeAnalysis["recommendation"] => {
  if (score >= 85) return "Strong Hire";
  if (score >= 70) return "Hire";
  if (score >= 55) return "Maybe";
  return "No Hire";
};

const normalizeRecommendation = (
  value: unknown,
  score: number
): ResumeAnalysis["recommendation"] => {
  const normalized = toStringValue(value).toLowerCase();
  if (normalized.includes("strong")) return "Strong Hire";
  if (normalized.includes("no") || normalized.includes("reject")) return "No Hire";
  if (normalized.includes("maybe") || normalized.includes("hold")) return "Maybe";
  if (normalized.includes("hire") || normalized.includes("yes")) return "Hire";
  return recommendationFromScore(score);
};

const parseJsonObject = (text: string): JsonObject => {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (isObject(parsed)) return parsed;
  } catch {
    // Try extracting the first balanced JSON object from surrounding prose.
  }

  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const parsed = JSON.parse(cleaned.slice(start, i + 1));
        if (isObject(parsed)) return parsed;
      }
    }
  }

  throw new Error("The AI response was not valid JSON. Please try again.");
};

const normalizeAnalysis = (
  raw: unknown,
  weights: RubricWeights,
  hasJobDescription: boolean
): ResumeAnalysis => {
  const source = isObject(raw) ? raw : {};
  const suppliedScore = clampScore(source.atsScore, 60);
  const rubricSource = isObject(source.rubricBreakdown) ? source.rubricBreakdown : {};

  const makeCategory = (key: keyof RubricWeights) => {
    const categorySource = isObject(rubricSource[key]) ? rubricSource[key] : {};
    const score = clampScore(categorySource.score, suppliedScore);
    return {
      score,
      weight: weights[key],
      weightedContribution: weightedContribution(score, weights[key]),
      rationale: toStringValue(
        categorySource.rationale,
        "The AI response did not include a detailed rationale for this category."
      ),
    };
  };

  const rubricBreakdown = {
    skills: makeCategory("skills"),
    experience: makeCategory("experience"),
    education: makeCategory("education"),
    impact: makeCategory("impact"),
  };

  const atsScore = clampScore(
    rubricBreakdown.skills.weightedContribution +
      rubricBreakdown.experience.weightedContribution +
      rubricBreakdown.education.weightedContribution +
      rubricBreakdown.impact.weightedContribution,
    suppliedScore
  );

  const skillsSource = isObject(source.skills) ? source.skills : {};
  const jobFitSource = isObject(source.jobFit) ? source.jobFit : null;

  const normalized = {
    candidateName: toStringValue(source.candidateName, "Unknown"),
    summary: toStringValue(
      source.summary,
      "The resume was analyzed, but the AI response did not include a summary."
    ),
    atsScore,
    skills: {
      technical: toStringArray(skillsSource.technical),
      soft: toStringArray(skillsSource.soft),
      tools: toStringArray(skillsSource.tools),
    },
    experience: Array.isArray(source.experience)
      ? source.experience.map((item) => {
          const experience = isObject(item) ? item : {};
          return {
            role: toStringValue(experience.role, "Role not specified"),
            company: toStringValue(experience.company, "Company not specified"),
            duration: toStringValue(experience.duration, "Duration not specified"),
            highlights: toStringArray(experience.highlights),
          };
        })
      : [],
    education: Array.isArray(source.education)
      ? source.education.map((item) => {
          const education = isObject(item) ? item : {};
          return {
            degree: toStringValue(education.degree, "Degree not specified"),
            institution: toStringValue(education.institution, "Institution not specified"),
            year: toStringValue(education.year, "Year not specified"),
          };
        })
      : [],
    strengths: toStringArray(source.strengths),
    weaknesses: toStringArray(source.weaknesses),
    rubricBreakdown,
    recommendation: normalizeRecommendation(source.recommendation, atsScore),
    recommendationReason: toStringValue(
      source.recommendationReason,
      `${recommendationFromScore(atsScore)} based on a weighted ATS score of ${atsScore}/100.`
    ),
    jobFit:
      hasJobDescription && jobFitSource
        ? {
            matchScore: clampScore(jobFitSource.matchScore, atsScore),
            matchingSkills: toStringArray(jobFitSource.matchingSkills),
            missingSkills: toStringArray(jobFitSource.missingSkills),
            notes: toStringValue(jobFitSource.notes, "Job-fit notes were not provided."),
          }
        : null,
  };

  return AnalysisSchema.parse(normalized);
};


const InputSchema = z.object({
  resumeText: z.string().min(20),
  jobDescription: z.string().optional().default(""),
  presetId: z.enum(PRESET_IDS).optional().default("general"),
});

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<ResumeAnalysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    const preset = getPreset(data.presetId as RubricPresetId);
    const { weights } = preset;

    const system = `You are an expert technical recruiter and ATS system evaluating candidates for the role profile: "${preset.label}".

Score the resume using this rubric (weights sum to 100):
- Skills match: ${weights.skills}%
- Experience relevance & depth: ${weights.experience}% (baseline expectation: ${preset.minYears}+ years of relevant experience; do not over-penalize when the profile targets early-career candidates)
- Education: ${weights.education}%
- Impact & measurable outcomes: ${weights.impact}%

Role focus: ${preset.focus}

Compute atsScore as the weighted sum (0-100). Also populate rubricBreakdown with per-category { score (0-100), weight (use the exact weights above), weightedContribution = score * weight / 100, rationale }. The four weightedContribution values must sum to atsScore (±1). Base recommendation on that same weighted score:
- 85+ Strong Hire, 70-84 Hire, 55-69 Maybe, <55 No Hire.
In recommendationReason, briefly cite which rubric dimensions drove the score. Return structured JSON matching the schema exactly. Be concise and specific.`;

    const prompt = `Analyze the following resume${
      data.jobDescription ? " against the provided job description" : ""
    } for the "${preset.label}" role profile.

RESUME:
"""
${data.resumeText.slice(0, 15000)}
"""
${
  data.jobDescription
    ? `\nJOB DESCRIPTION:\n"""\n${data.jobDescription.slice(0, 5000)}\n"""\nCompute jobFit. `
    : "\nSet jobFit to null. "
}Return only JSON matching the schema.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: `${prompt}

Return one valid JSON object and no markdown. Use this exact shape:
{
  "candidateName": "string",
  "summary": "string",
  "atsScore": number,
  "skills": { "technical": ["string"], "soft": ["string"], "tools": ["string"] },
  "experience": [{ "role": "string", "company": "string", "duration": "string", "highlights": ["string"] }],
  "education": [{ "degree": "string", "institution": "string", "year": "string" }],
  "strengths": ["string"],
  "weaknesses": ["string"],
  "rubricBreakdown": {
    "skills": { "score": number, "weight": ${weights.skills}, "weightedContribution": number, "rationale": "string" },
    "experience": { "score": number, "weight": ${weights.experience}, "weightedContribution": number, "rationale": "string" },
    "education": { "score": number, "weight": ${weights.education}, "weightedContribution": number, "rationale": "string" },
    "impact": { "score": number, "weight": ${weights.impact}, "weightedContribution": number, "rationale": "string" }
  },
  "recommendation": "Strong Hire | Hire | Maybe | No Hire",
  "recommendationReason": "string",
  "jobFit": ${data.jobDescription ? `{ "matchScore": number, "matchingSkills": ["string"], "missingSkills": ["string"], "notes": "string" }` : "null"}
}`,
      });
      return normalizeAnalysis(parseJsonObject(text), weights, Boolean(data.jobDescription?.trim()));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) throw new Error("Rate limit exceeded. Please try again shortly.");
      if (msg.includes("402"))
        throw new Error("AI credits exhausted. Add credits in Settings → Plans & credits.");
      throw new Error(`Analysis failed: ${msg}`);
    }
  });
