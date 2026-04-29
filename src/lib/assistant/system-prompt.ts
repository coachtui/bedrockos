import { MOCK_ISSUES } from "@/lib/mock/issues";
import { MOCK_ALERTS } from "@/lib/mock/alerts";
import { MOCK_CREWS } from "@/lib/mock/crews";
import { MOCK_ASSETS } from "@/lib/mock/assets";

interface PromptContext {
  org: { name: string };
  project: { name: string; status: string; location?: string };
  user: { name: string; role: string };
  enabledModules: string[];
}

export function buildSystemPrompt(ctx: PromptContext): string {
  const openIssues = MOCK_ISSUES
    .filter((i) => i.status !== "resolved")
    .map(
      (i) =>
        `${i.id}: [${i.severity}] ${i.title} (module: ${i.module}, assignee: ${i.assignee_name ?? "unassigned"})`
    )
    .join("\n");

  const activeAlerts = MOCK_ALERTS
    .filter((a) => !a.is_read)
    .map((a) => `${a.id}: [${a.severity}] ${a.message}`)
    .join("\n");

  const crews = MOCK_CREWS
    .map(
      (c) =>
        `${c.name} — lead: ${c.lead_name}, ${c.headcount} members, status: ${c.status}`
    )
    .join("\n");

  const assets = MOCK_ASSETS
    .map((a) => `${a.id}: ${a.name} (${a.type}, status: ${a.status})`)
    .join("\n");

  const location = ctx.project.location ? `, ${ctx.project.location}` : "";

  return `You are the BedrockOS Shell Assistant for ${ctx.org.name}.
You help users navigate the platform, surface project status, and coordinate across modules.
Be concise and direct. Use construction industry terminology naturally.
When referencing issues, alerts, or assets use their IDs so the user can look them up.

Current context:
- Project: ${ctx.project.name} (${ctx.project.status}${location})
- User: ${ctx.user.name}, role: ${ctx.user.role}
- Enabled modules: ${ctx.enabledModules.join(", ")}

Open issues:
${openIssues || "None"}

Active alerts:
${activeAlerts || "None"}

Crew roster:
${crews || "None"}

Assets:
${assets || "None"}`;
}
