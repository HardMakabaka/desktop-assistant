# COMMAND_TEMPLATE

## Metadata

- Task ID:
- Request summary:
- Target branch:
- Release impact: `none | patch | minor | major`

## Objective

Describe the user-visible or system-visible outcome in one short paragraph.

## Preconditions

- Confirm the current branch and base branch
- Confirm relevant entries in `ENV_INDEX.md`
- Confirm relevant entries in `PROJECT_INDEX.md`
- Confirm the intended gate from `CI_CD_POLICY.md`

## Inputs

- files, directories, or modules expected to change
- external systems or credentials involved
- acceptance criteria

## Execution

1. Inspect current code and docs
2. Make the smallest viable implementation change
3. Update matching docs or indexes when behavior or structure changes
4. Run the minimum useful validation locally
5. Prepare release-only steps if the task changes shipped behavior

## Validation

- required local checks:
  - `npm run openclaw:check`
  - `npm run verify`
- optional checks:
  - `npm run pack`
  - `npm run pack:linux`
- manual checks:
  - user flow summary
  - regression notes

## Outputs

- changed files
- validation summary
- release summary if applicable
- index updates if applicable

## Rollback

- revert the implementation commit
- remove the release tag if it was created by mistake
- restore policy or index docs if they were changed incorrectly

## Notes

Use this template as a command-expansion contract, not a prose essay.
If a task touches release behavior, packaging, repo structure, or CI expectations, update the matching `.openclaw` file in the same change.
