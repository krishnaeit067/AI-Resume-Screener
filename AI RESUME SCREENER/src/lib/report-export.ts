import { jsPDF } from "jspdf";
import type { ResumeAnalysis } from "./resume.functions";

const safeFilename = (name: string) =>
  (name || "candidate").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const csvEscape = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadCsvReport(r: ResumeAnalysis, presetLabel: string) {
  const rows: (string | number)[][] = [
    ["AI Resume Screener — ATS Report"],
    ["Generated", new Date().toISOString()],
    ["Candidate", r.candidateName],
    ["Rubric preset", presetLabel],
    ["ATS score", r.atsScore],
    ["Recommendation", r.recommendation],
    ["Recommendation reason", r.recommendationReason],
    [],
    ["Category", "Score (0-100)", "Weight (%)", "Weighted contribution", "Rationale"],
  ];
  (["skills", "experience", "education", "impact"] as const).forEach((k) => {
    const row = r.rubricBreakdown[k];
    rows.push([
      k.charAt(0).toUpperCase() + k.slice(1),
      row.score,
      row.weight,
      row.weightedContribution.toFixed(1),
      row.rationale,
    ]);
  });
  rows.push([]);
  rows.push(["Summary", r.summary]);
  rows.push(["Strengths", r.strengths.join(" | ")]);
  rows.push(["Weaknesses", r.weaknesses.join(" | ")]);
  rows.push(["Technical skills", r.skills.technical.join(", ")]);
  rows.push(["Tools", r.skills.tools.join(", ")]);
  rows.push(["Soft skills", r.skills.soft.join(", ")]);
  if (r.jobFit) {
    rows.push([]);
    rows.push(["Job fit score", r.jobFit.matchScore]);
    rows.push(["Matching skills", r.jobFit.matchingSkills.join(", ")]);
    rows.push(["Missing skills", r.jobFit.missingSkills.join(", ")]);
    rows.push(["Job fit notes", r.jobFit.notes]);
  }

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, `ats-report-${safeFilename(r.candidateName)}.csv`);
}

export function buildAtsPdf(r: ResumeAnalysis, presetLabel: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const text = (
    s: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}
  ) => {
    const { size = 11, bold = false, color = [30, 30, 30], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(s, pageW - margin * 2);
    ensureSpace(lines.length * (size * 1.25) + gap);
    doc.text(lines, margin, y);
    y += lines.length * (size * 1.25) + gap;
  };

  const hr = () => {
    ensureSpace(10);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;
  };

  // Header
  text("AI Resume Screener", { size: 18, bold: true, gap: 2 });
  text("ATS Scoring Report", { size: 11, color: [110, 110, 110], gap: 8 });
  hr();

  text(`Candidate: ${r.candidateName}`, { size: 13, bold: true });
  text(`Rubric preset: ${presetLabel}`, { size: 10, color: [110, 110, 110] });
  text(`Generated: ${new Date().toLocaleString()}`, { size: 10, color: [110, 110, 110], gap: 10 });

  // Score + recommendation box
  const boxH = 72;
  ensureSpace(boxH + 6);
  doc.setDrawColor(220);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, boxH, 8, 8, "FD");
  // Big score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(20, 20, 20);
  doc.text(`${r.atsScore}`, margin + 20, y + 46);
  const scoreW = doc.getTextWidth(`${r.atsScore}`);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text("/ 100", margin + 24 + scoreW, y + 46);
  doc.text("ATS score", margin + 20, y + 60);
  // Recommendation on right
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text("RECOMMENDATION", pageW - margin - 20, y + 26, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(r.recommendation, pageW - margin - 20, y + 46, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Rubric: ${presetLabel}`, pageW - margin - 20, y + 60, { align: "right" });
  y += boxH + 14;

  text("Why", { size: 11, bold: true, gap: 3 });
  text(r.recommendationReason, { size: 10, color: [70, 70, 70], gap: 12 });

  hr();
  text("Scoring breakdown", { size: 13, bold: true, gap: 8 });

  const cats = ["skills", "experience", "education", "impact"] as const;
  const contentW = pageW - margin * 2;
  cats.forEach((k) => {
    const row = r.rubricBreakdown[k];
    const label = k.charAt(0).toUpperCase() + k.slice(1);
    const rationaleLines = doc.splitTextToSize(row.rationale, contentW) as string[];
    // Reserve: header row (14) + bar (6) + gap (10) + rationale (lines*12) + block gap (10)
    const blockH = 14 + 6 + 10 + rationaleLines.length * 12 + 10;
    ensureSpace(blockH);

    // Header row: label left, metrics right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text(
      `${row.score}/100  ·  weight ${row.weight}%  ·  +${row.weightedContribution.toFixed(1)} pts`,
      pageW - margin,
      y,
      { align: "right" }
    );
    y += 8;

    // Bar
    doc.setFillColor(230, 230, 235);
    doc.roundedRect(margin, y, contentW, 6, 3, 3, "F");
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, y, (contentW * Math.min(100, row.score)) / 100, 6, 3, 3, "F");
    y += 14;

    // Rationale
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(rationaleLines, margin, y);
    y += rationaleLines.length * 12 + 10;
  });

  hr();
  text("Summary", { size: 13, bold: true, gap: 4 });
  text(r.summary, { size: 10, color: [60, 60, 60], gap: 8 });

  if (r.strengths.length) {
    text("Strengths", { size: 12, bold: true, gap: 2 });
    r.strengths.forEach((s) => text(`• ${s}`, { size: 10, color: [60, 60, 60], gap: 2 }));
    y += 4;
  }
  if (r.weaknesses.length) {
    text("Weaknesses", { size: 12, bold: true, gap: 2 });
    r.weaknesses.forEach((s) => text(`• ${s}`, { size: 10, color: [60, 60, 60], gap: 2 }));
    y += 4;
  }

  const skillsLine = (label: string, items: string[]) => {
    if (!items.length) return;
    text(`${label}: ${items.join(", ")}`, { size: 10, color: [60, 60, 60], gap: 4 });
  };
  hr();
  text("Skills", { size: 13, bold: true, gap: 4 });
  skillsLine("Technical", r.skills.technical);
  skillsLine("Tools", r.skills.tools);
  skillsLine("Soft", r.skills.soft);

  if (r.jobFit) {
    hr();
    text("Job fit", { size: 13, bold: true, gap: 4 });
    text(`Match score: ${r.jobFit.matchScore}/100`, { size: 11, bold: true, gap: 4 });
    skillsLine("Matching", r.jobFit.matchingSkills);
    skillsLine("Missing", r.jobFit.missingSkills);
    if (r.jobFit.notes) text(r.jobFit.notes, { size: 10, color: [60, 60, 60], gap: 4 });
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  return doc;
}

export function downloadPdfReport(r: ResumeAnalysis, presetLabel: string) {
  const doc = buildAtsPdf(r, presetLabel);
  doc.save(`ats-report-${safeFilename(r.candidateName)}.pdf`);
}
