import type { IssueState } from "../bug-reports";
import { optionalEnvironment } from "./lib";

// GitHub for Vera Support's bug reports: creating issues and reading how
// their fixes are going. Needs GITHUB_TOKEN (a fine-grained token with
// read and write access to issues, read access to pull requests and
// contents) and GITHUB_REPOSITORY ("owner/name"). Without them, reports are
// kept on the PDS only (supportReports.ts).

export interface GitHubConfig {
  readonly name: string;
  readonly owner: string;
  readonly token: string;
}

export function githubConfig(): GitHubConfig | null {
  const token = optionalEnvironment("GITHUB_TOKEN");
  const repository = optionalEnvironment("GITHUB_REPOSITORY");
  if (token === null || repository === null) return null;
  const [owner, name] = repository.split("/");
  if (!owner || !name) return null;
  return { name, owner, token };
}

export async function github(
  config: GitHubConfig,
  path: string,
  init: { body?: unknown; method?: string } = {},
): Promise<unknown> {
  const response = await fetch(`https://api.github.com${path}`, {
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "User-Agent": "vera-support",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    method: init.method ?? "GET",
  });
  if (!response.ok) {
    throw new GitHubError(
      response.status,
      `GitHub ${init.method ?? "GET"} ${path}: ${String(response.status)} ${await response.text()}`,
    );
  }
  return response.json();
}

class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function createIssue(
  config: GitHubConfig,
  issue: { body: string; labels: readonly string[]; title: string },
) {
  const path = `/repos/${config.owner}/${config.name}/issues`;
  let created: unknown;
  try {
    created = await github(config, path, { body: issue, method: "POST" });
  } catch (error) {
    // A label GitHub won't take shouldn't lose the report.
    if (!(error instanceof GitHubError) || error.status !== 422) throw error;
    created = await github(config, path, {
      body: { body: issue.body, title: issue.title },
      method: "POST",
    });
  }
  const number = read(created, "number");
  const url = read(created, "html_url");
  if (typeof number !== "number" || typeof url !== "string") {
    throw new Error("GitHub returned an issue without a number");
  }
  return { number, url };
}

export async function commentOnIssue(
  config: GitHubConfig,
  number: number,
  body: string,
) {
  await github(
    config,
    `/repos/${config.owner}/${config.name}/issues/${String(number)}/comments`,
    { body: { body }, method: "POST" },
  );
}

const PULL_REQUEST_FIELDS = `number url state merged baseRefName
  mergeCommit { oid }
  files(first: 100) { nodes { path } }`;

/** Each issue's state, by number, in one request. Missing issues are left out. */
export async function issueStates(
  config: GitHubConfig,
  numbers: readonly number[],
) {
  const states = new Map<number, IssueState>();
  if (numbers.length === 0) return states;
  const issues = numbers
    .map(
      (number) => `i${String(number)}: issue(number: ${String(number)}) {
        number state stateReason
        assignees(first: 1) { totalCount }
        closedByPullRequestsReferences(first: 10, includeClosedPrs: true) {
          nodes { ${PULL_REQUEST_FIELDS} }
        }
        timelineItems(last: 20, itemTypes: [CLOSED_EVENT]) {
          nodes { ... on ClosedEvent { closer { __typename ... on Commit { oid } } } }
        }
      }`,
    )
    .join("\n");
  const result = await github(config, "/graphql", {
    body: {
      query: `query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef { name }
          ${issues}
        }
      }`,
      variables: { name: config.name, owner: config.owner },
    },
    method: "POST",
  });
  const repository = read(read(result, "data"), "repository");
  const defaultBranch = read(read(repository, "defaultBranchRef"), "name");
  for (const number of numbers) {
    const issue = read(repository, `i${String(number)}`);
    if (issue === null || issue === undefined) continue;
    const pullRequests = nodes(read(issue, "closedByPullRequestsReferences"))
      // Only merges into the default branch reach a release.
      .filter((pr) => read(pr, "baseRefName") === defaultBranch)
      .map((pr) => ({
        mergeCommit: stringOrNull(read(read(pr, "mergeCommit"), "oid")),
        merged: read(pr, "merged") === true,
        open: read(pr, "state") === "OPEN",
        paths: nodes(read(pr, "files"))
          .map((file) => read(file, "path"))
          .filter((path) => typeof path === "string"),
        ref: {
          number: Number(read(pr, "number")),
          url: String(read(pr, "url")),
        },
      }));
    const closingCommit =
      nodes(read(issue, "timelineItems"))
        .map((event) => read(event, "closer"))
        .filter((closer) => read(closer, "__typename") === "Commit")
        .map((closer) => stringOrNull(read(closer, "oid")))
        .findLast((oid) => oid !== null) ?? null;
    states.set(number, {
      assigned: Number(read(read(issue, "assignees"), "totalCount")) > 0,
      closingCommit,
      pullRequests,
      state: read(issue, "state") === "CLOSED" ? "CLOSED" : "OPEN",
      stateReason: stringOrNull(read(issue, "stateReason")),
    });
  }
  return states;
}

/**
 * Open and closed issues, and merged pull requests, that match `query`,
 * best first: what support checks before filing a report.
 */
export async function searchRepository(config: GitHubConfig, query: string) {
  const repo = `repo:${config.owner}/${config.name}`;
  async function search(filter: string): Promise<unknown[]> {
    const result = await github(
      config,
      `/search/issues?per_page=5&q=${encodeURIComponent(`${query} ${repo} ${filter}`)}`,
    );
    const items = read(result, "items");
    return Array.isArray(items) ? items.map((item: unknown) => item) : [];
  }
  const [issues, pullRequests] = await Promise.all([
    search("is:issue"),
    search("is:pr is:merged"),
  ]);
  return {
    issues: issues.map((issue) => ({
      about: excerpt(read(issue, "body")),
      createdAt: String(read(issue, "created_at")),
      number: Number(read(issue, "number")),
      state: String(read(issue, "state")),
      stateReason: stringOrNull(read(issue, "state_reason")),
      title: String(read(issue, "title")),
      url: String(read(issue, "html_url")),
    })),
    pullRequests: pullRequests.map((pr) => ({
      about: excerpt(read(pr, "body")),
      mergedAt: stringOrNull(read(read(pr, "pull_request"), "merged_at")),
      number: Number(read(pr, "number")),
      title: String(read(pr, "title")),
      url: String(read(pr, "html_url")),
    })),
  };
}

/** A merged pull request's merge commit and the files it changed. */
export async function pullRequestFix(config: GitHubConfig, number: number) {
  const path = `/repos/${config.owner}/${config.name}/pulls/${String(number)}`;
  const [pr, files] = await Promise.all([
    github(config, path),
    github(config, `${path}/files?per_page=100`),
  ]);
  return {
    mergeCommit: stringOrNull(read(pr, "merge_commit_sha")),
    paths: (Array.isArray(files) ? files : [])
      .map((file) => read(file, "filename"))
      .filter((name) => typeof name === "string"),
  };
}

export function read(value: unknown, name: string): unknown {
  return typeof value === "object" && value !== null
    ? Reflect.get(value, name)
    : undefined;
}

function nodes(connection: unknown): unknown[] {
  const list = read(connection, "nodes");
  return Array.isArray(list) ? list : [];
}

/** The start of an issue or pull request's description. */
function excerpt(body: unknown) {
  return typeof body === "string" ? body.slice(0, 400) : "";
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
