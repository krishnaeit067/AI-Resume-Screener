export type RubricPresetId =
  | "general"
  | "software-engineer"
  | "data-scientist"
  | "intern"
  | "product-manager"
  | "designer";

export type RubricWeights = {
  skills: number;
  experience: number;
  education: number;
  impact: number;
};

export type RubricPreset = {
  id: RubricPresetId;
  label: string;
  description: string;
  weights: RubricWeights;
  focus: string;
  minYears: number;
};

export const RUBRIC_PRESETS: RubricPreset[] = [
  {
    id: "general",
    label: "General",
    description: "Balanced scoring across all dimensions",
    weights: { skills: 30, experience: 35, education: 15, impact: 20 },
    focus: "Balanced evaluation across skills, experience, education, and measurable impact.",
    minYears: 2,
  },
  {
    id: "software-engineer",
    label: "Software Engineer",
    description: "Emphasizes technical skills, systems, and shipped projects",
    weights: { skills: 40, experience: 35, education: 5, impact: 20 },
    focus:
      "Programming languages, frameworks, system design, code quality, shipped production systems, open-source contributions.",
    minYears: 2,
  },
  {
    id: "data-scientist",
    label: "Data Scientist",
    description: "Weighs ML, statistics, and quantitative education",
    weights: { skills: 35, experience: 25, education: 20, impact: 20 },
    focus:
      "Statistics, ML/DL frameworks, SQL, Python/R, experimentation, model deployment, quantitative degrees, publications.",
    minYears: 2,
  },
  {
    id: "intern",
    label: "Intern / New Grad",
    description: "Prioritizes education, coursework, and projects over experience",
    weights: { skills: 30, experience: 15, education: 35, impact: 20 },
    focus:
      "Coursework, GPA, academic projects, internships, hackathons, extracurriculars. Do not penalize for lack of full-time experience.",
    minYears: 0,
  },
  {
    id: "product-manager",
    label: "Product Manager",
    description: "Weights outcomes, cross-functional impact, and communication",
    weights: { skills: 20, experience: 35, education: 15, impact: 30 },
    focus:
      "Product strategy, user research, roadmapping, cross-functional leadership, measurable business outcomes, stakeholder management.",
    minYears: 3,
  },
  {
    id: "designer",
    label: "Designer",
    description: "Focus on portfolio, craft, and design process",
    weights: { skills: 35, experience: 30, education: 10, impact: 25 },
    focus:
      "Design systems, prototyping tools (Figma), UX research, visual craft, portfolio quality, shipped user-facing work.",
    minYears: 2,
  },
];

export const getPreset = (id: RubricPresetId): RubricPreset =>
  RUBRIC_PRESETS.find((p) => p.id === id) ?? RUBRIC_PRESETS[0];
