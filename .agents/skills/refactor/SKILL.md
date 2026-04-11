---
name: refactor
description: Code refactor to improve implementation details, only use when explicitly requested by user.
---

# Overview

This skill turns "it works" code into code that is robust, maintainable, and aligned with the project's standards.
Instead of reading every rule yourself and trying to apply them all at once, delegate to subagents, one per skill. Each subagent becomes a deep expert on its skill and evaluates the current changes entirely through that lens.

## 1. Determine the scope

The user may specify a scope — for example, "refactor the convex package" or "just look at the CMS app changes." When they do, pass that scope to each subagent so it only examines the relevant subset of changes.

If the user does not specify a scope, the default is the entire active change set (all staged and unstaged changes across the repo).

## 2. Spawn one subagent per skill

Look at which files were changed and determine which skills are necessary to refactor. Once you've figured that out, spawn one subagent per skill so that that specific subagent focuses solely on that one skill. **_IMPORTANT_**: Typically, changes don't require every single skill to be used, so make sure you don't use skills that aren't relevant to the changes made.

For each subagent, provide these instructions:

1. **Role:** You are a senior engineer mentoring a junior teammate. You have been given a skill that describes coding standards the team has agreed on. Your job is to deeply internalize every rule in the skill, study the current changes, and produce a thorough assessment of how the code should be overhauled to fully align with these standards.
2. **Read-only constraint:** Do NOT edit, create, or delete any files. Your only job is to read code, analyze it, and return findings.
3. **Skill:** Read the skill file and all of its reference files carefully and completely before doing anything else.
4. **Getting the changes:** Run `git diff` and `git diff --cached` to see the current change set. If the user specified a scope (e.g. a specific package or app), filter to only those paths — for example `git diff -- packages/convex/` or `git diff -- apps/cms/`. Also read the full contents of every changed file so you have complete context, not just the diff hunks.
5. **What to return:** Report **every single finding** — no filtering, no prioritizing, no "I'll skip the small stuff." Every violation of the skill standards, from major architectural missteps down to the smallest style nit, must be included. Do not summarize or group findings to save space. Do not omit issues you consider minor. The main agent needs the complete, unabridged list to present to the user. Look for places where the implementation approach itself is wrong and needs to be overhauled — but also catch every small issue along the way. If the code uses the wrong patterns, the wrong architecture, the wrong abstractions - recommend ripping out the current approach and replacing it with one that properly aligns with the standards. Partial adjustments are not enough when the foundation is wrong.
   For each finding, include:
   - What is wrong with the current approach and why it does not satisfy the standard
   - Where the problem is (file path and relevant code)
   - What the correct approach looks like — described in enough detail that someone could implement it without having to re-read the skill
   - Why this matters (what breaks, degrades, or becomes unmaintainable if left as-is)

6. **If no issues are found:** Explicitly state that the current changes already satisfy the standards and no changes are needed.

## 3. Synthesize findings

Once all subagents have returned their findings, consolidate everything they reported. Identify overlaps, dependencies, and conflicts between findings from different skills. Do not leave out any details provided by subagents.

Present the combined findings to the user as a proposed plan. Ask the user questions about how they want to proceed — which findings to act on, which to skip, and any tradeoffs between competing concerns.

### Handling conflicts

Different skills will sometimes recommend incompatible approaches for the same code. When this happens, do not resolve the conflict yourself. Present the conflict to the user, explain what each skill is asking for and why they are at odds, and let the user decide. Every conflict is its own question. Do not bundle multiple conflicts into a single question and do not silently pick a side.
