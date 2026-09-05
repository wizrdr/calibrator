import { parseIssueLines } from './parseIssueLines'

describe('parseIssueLines', () => {
  it('splits key and summary, skipping blank lines', () => {
    expect(parseIssueLines('CAL-1 Login form\n\n  CAL-2   Fix flaky test  \nCAL-3')).toEqual([
      { key: 'CAL-1', summary: 'Login form' },
      { key: 'CAL-2', summary: 'Fix flaky test' },
      { key: 'CAL-3', summary: '' },
    ])
  })
})
