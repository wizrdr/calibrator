import { applyFacts, importHistory, listTeamIssues } from '@/data/queries'
import { DEMO_PARAMS } from '@/domain/demoParams'
import { toHistoryPayload } from '@/domain/historyPayload'
import { matchImport } from '@/domain/importFacts'
import { generateSynthetic } from '@/domain/synthetic'

// Example data in one click: six fake sprints with known biases, facts applied as if imported from Jira.
export async function seedDemo(teamId: string, seed = DEMO_PARAMS.seed): Promise<void> {
  const out = generateSynthetic({ ...DEMO_PARAMS, seed })
  await importHistory(teamId, toHistoryPayload(out))
  const issues = await listTeamIssues(teamId)
  const preview = matchImport(out.jiraRows, issues)
  await applyFacts(
    preview.matched.map(({ issueId, row }) => ({
      issueId,
      jira_sp: row.sp,
      time_spent_sec: row.timeSpentSec,
      sprints: row.sprints,
      status: row.status || null,
      resolved_at: null,
    })),
  )
}
