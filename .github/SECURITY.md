# Security policy

Context Capsule handles private AI conversation content. A vulnerability here can expose
material a user never intended to leave their machine, so please report privately.

## Supported versions

No release has shipped yet. The project is pre-release and the only implemented code is
the `capsule-schema` package. When a version ships, this section will name the supported
versions and this line will be removed.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository:
**Security → Report a vulnerability**. That keeps the report out of public issues and
attaches it to the repository.

Please do not open a public issue, pull request, or discussion for a suspected
vulnerability.

> A dedicated security contact address is not yet established — it depends on the legal
> entity and support contact decisions still open in
> [CONTEXT.md](../CONTEXT.md). Until then, private vulnerability reporting is the only
> channel, and if it is unavailable on this repository, open a public issue that says only
> that you have a security report and requests a private channel — with no details.

### What to include

- What an attacker can do, and what they need in order to do it
- Steps to reproduce, using **synthetic conversation content only** — never paste real
  chats, credentials, cookies, or tokens into a report
- Affected surface: extension, capsule format, import path, provider adapter, or tooling
- Chrome and extension versions

### What to expect

This is a small project without a staffed on-call rotation, so response is best-effort
rather than contractual. Reports are triaged in the order received. There is no bug bounty.

## Scope

Especially relevant to this project:

- Anything that causes conversation content to leave the machine without explicit consent
- Import handling that executes content, injects script, or escapes validation
- A provider adapter reading or exfiltrating host page data beyond captured turns
- Insertion that sends a message automatically or destroys an existing draft
- Secrets reaching source, logs, capsules, exports, or sync payloads
- Permission or manifest scope wider than documented in
  [Document 11](../docs/11_security_architecture.md)

Out of scope: vulnerabilities in ChatGPT, Claude, or Gemini themselves — report those to
the respective provider. Reports that require a compromised browser or a malicious
extension already installed are also out of scope.

## Reference

- [Document 11 — Security architecture](../docs/11_security_architecture.md)
- [Document 23 — Known limitations](../docs/23_known_limitations.md)
