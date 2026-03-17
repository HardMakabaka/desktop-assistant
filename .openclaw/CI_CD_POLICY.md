# CI_CD_POLICY

## Purpose

This document defines the minimum automation policy for moving a change from implementation to release.
It is the human-readable source of truth that CI should mirror.

## Branch Rules

- Base branch: `main`
- CI must run on pushes to `main`
- CI must run on pull requests targeting `main`
- Automation branches may use `ulw/**`

## Required Checks

These checks are blocking unless the change is explicitly documentation-only.

- `npm run openclaw:check`
- `npm run verify`
- `npm run pack` on Windows runners
- `npm run pack:linux` on Linux runners

## Release Rules

- Release tags must match `v*`
- A release tag should only be created from a green commit on `main`
- Release workflows must typecheck and build before packaging
- Published assets must include platform-specific packages and updater metadata

## Draft Versus Ready

### Draft
A change stays `Draft` when any of the following is true:
- a blocking CI check is red or missing
- required index files are absent or stale
- release behavior changed but policy was not updated
- acceptance criteria are still unresolved

### Ready
A change can move to `Ready` when all of the following is true:
- blocking checks are green
- repo and environment indexes reflect current reality
- release conditions are satisfied for the intended target
- no unresolved blocker remains in the validation summary

## Policy Guard Expectations

The policy guard should fail when:
- required `.openclaw` documents are missing
- required sections are missing from those documents
- required CI commands are not present in workflow definitions
- release tag conventions drift from workflow triggers

## Change Management Rules

Update this file whenever you change:
- branch conventions
- required CI commands
- release tagging rules
- promotion criteria
- policy guard behavior
