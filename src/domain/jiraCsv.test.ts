import { parseJiraCsv, toJiraCsv } from './jiraCsv'

const companyManaged = `Summary,Issue key,Issue id,Status,Custom field (Story Points),Time Spent,Sprint,Sprint,Resolved
"Login, remember me",CAL-1,10001,Done,3,21600,CAL Sprint 4,,05/Sep/26 10:12 AM
"Fix ""flaky"" test",CAL-2,10002,Done,5,,CAL Sprint 3,CAL Sprint 4,04/Sep/26 6:30 PM
Backlog thing,CAL-3,10003,To Do,,,,,
`

const teamManaged = `Issue key,Summary,Status,Story point estimate,Time Spent,Sprint
CAL-9,Search,Done,8,3600,CAL Sprint 4
`

describe('parseJiraCsv', () => {
  it('reads company-managed exports: quoted fields, seconds, repeated Sprint columns', () => {
    expect(parseJiraCsv(companyManaged)).toEqual([
      { key: 'CAL-1', summary: 'Login, remember me', status: 'Done', sp: 3, timeSpentSec: 21600, sprints: ['CAL Sprint 4'], resolved: '05/Sep/26 10:12 AM' },
      { key: 'CAL-2', summary: 'Fix "flaky" test', status: 'Done', sp: 5, timeSpentSec: null, sprints: ['CAL Sprint 3', 'CAL Sprint 4'], resolved: '04/Sep/26 6:30 PM' },
      { key: 'CAL-3', summary: 'Backlog thing', status: 'To Do', sp: null, timeSpentSec: null, sprints: [], resolved: null },
    ])
  })

  it('reads team-managed exports with "Story point estimate"', () => {
    expect(parseJiraCsv(teamManaged)).toEqual([
      { key: 'CAL-9', summary: 'Search', status: 'Done', sp: 8, timeSpentSec: 3600, sprints: ['CAL Sprint 4'], resolved: null },
    ])
  })

  it('throws when there is no Issue key column', () => {
    expect(() => parseJiraCsv('Summary,Status\nfoo,Done\n')).toThrow(/Issue key/)
  })

  it('round-trips through toJiraCsv', () => {
    const rows = parseJiraCsv(companyManaged)
    expect(parseJiraCsv(toJiraCsv(rows))).toEqual(rows)
  })
})
