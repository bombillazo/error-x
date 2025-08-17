module.exports = {
  types: [
    { value: 'feat', name: 'feat:     A new feature' },
    { value: 'fix', name: 'fix:      A bug fix' },
    { value: 'docs', name: 'docs:     Documentation only changes' },
    { value: 'style', name: 'style:    Code style changes' },
    { value: 'refactor', name: 'refactor: A non-bugfix, non-feature change' },
    { value: 'test', name: 'test:     Add/correct tests' },
    { value: 'chore', name: 'chore:    Other changes' },
  ],
  scopes: ['core', 'docs', 'build'],
  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix'],
  skipQuestions: ['scope'],
  subjectLimit: 100,
  disableSubjectLowerCase: true,
}
