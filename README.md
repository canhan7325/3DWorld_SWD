# Antigravity 4-Agent Starter

A tool-light software delivery pipeline:

Planner -> Coder -> Tester -> Reviewer -> Human merge

## Install into an existing repo
Copy these items into the repository root:
- `AGENTS.md`
- `.agents/`
- `.bangiao/`
- `new-task.ps1`

## Start a task on Windows PowerShell
```powershell
.\new-task.ps1 -TaskId "auth-login"
```
Then edit `.bangiao/auth-login/00-yeu-cau.md`.

## Agent sequence in Antigravity
1. Select/start custom agent `planner` and say:
   `Task id: auth-login. Read .bangiao/auth-login/00-yeu-cau.md, inspect the repository, and create the plan.`
2. Review the plan yourself.
3. Select `coder` and say:
   `Task id: auth-login. The plan is approved. Implement it and write the coder handoff.`
4. Select `tester` and say:
   `Task id: auth-login. Test the implementation according to the plan and write the test report.`
5. If FAIL, return to Coder for a repair, then rerun Tester. Maximum two repair rounds.
6. On PASS, select `reviewer` and say:
   `Task id: auth-login. Independently review the implementation and write the final verdict.`
7. You inspect the result and decide whether to commit/merge.

## Recommended Git usage
Create a feature branch before starting:
```powershell
git switch -c feature/auth-login
```
Never give an agent permission to merge directly to `main`.
