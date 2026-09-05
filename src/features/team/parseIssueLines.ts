import type { NewIssue } from '@/data/queries'

export function parseIssueLines(text: string): NewIssue[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [key, ...rest] = l.split(/\s+/)
      return { key, summary: rest.join(' ') }
    })
}
