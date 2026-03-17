# OpenClaw Process

## Purpose

This repo uses OpenClaw as the orchestration layer and Opencode as the execution layer.
The goal is to turn a user request into reproducible commands, verifiable output, and gated promotion from `Draft` to `Ready`.

## Layers

### OpenClaw

Responsible for:
- intake and requirement framing
- technical direction and environment setup
- command template generation
- policy definition
- environment facts

Primary outputs:
- `COMMAND_TEMPLATE.md`
- `CI_CD_POLICY.md`
- `ENV_INDEX.md`

### Opencode

Responsible for:
- expanding structured commands into an execution plan
- implementation, verification, and packaging
- updating project facts and reusable knowledge

Primary inputs:
- `COMMAND_TEMPLATE.md`
- `CI_CD_POLICY.md`
- `ENV_INDEX.md`
- `PROJECT_INDEX.md`
- repo documentation and codebase facts

Primary outputs:
- code changes
- test and build results
- release artifacts
- updated project documentation

### CIFlow

Responsible for:
- running automated checks from `.github/workflows/**`
- enforcing policy guardrails
- controlling whether a change stays `Draft` or can become `Ready`

## Stages

1. `Intake`
   - capture the request, scope, and acceptance criteria
2. `Analyze`
   - identify target area, risk, dependencies, and release impact
3. `Select`
   - choose the technical path, validation path, and release path
4. `Prepare`
   - confirm environment and toolchain facts in `ENV_INDEX.md`
5. `Expand`
   - turn the command template into concrete steps
6. `Execute`
   - implement and iterate with focused verification
7. `Build`
   - produce release-ready output and update project facts
8. `Gate`
   - let CI and policy determine `Draft` versus `Ready`
9. `Release`
   - publish only after all blocking checks are green
10. `Reflect`
   - write back useful lessons into process, policy, or indexes

## Inputs And Outputs

### Required inputs before execution
- a clear objective
- acceptance criteria
- current environment facts from `ENV_INDEX.md`
- current repo facts from `PROJECT_INDEX.md`
- active rules from `CI_CD_POLICY.md`

### Required outputs after execution
- implementation diff
- validation summary
- build or package summary when relevant
- updates to indexes if repo shape or commands changed

## State Machine

- `Intake`
- `Analyzing`
- `Planned`
- `Executing`
- `Built`
- `Draft`
- `Ready`
- `Released`
- `Blocked`

## Feedback Loops

- execution issues feed back into `COMMAND_TEMPLATE.md`
- environment mismatches feed back into `ENV_INDEX.md`
- repo structure drift feeds back into `PROJECT_INDEX.md`
- missing or weak gates feed back into `CI_CD_POLICY.md`

## Failure Classification

Every failed run should be categorized as one of:
- environment mismatch
- project index drift
- command template gap
- code or test failure
- policy or CI gap

## Working Rule

If a change modifies repo layout, validation commands, release behavior, or branch rules, update the matching `.openclaw` document in the same change.
