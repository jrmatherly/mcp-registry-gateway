# Repository Setup Guide

This document describes the manual configuration steps required after forking/cloning this repository.

## Required GitHub Settings

### 1. GitHub Pages (for Documentation)

The `docs.yml` workflow automatically builds and deploys documentation using MkDocs.

**Setup Steps:**

1. Go to **Settings > Pages**
2. Under "Build and deployment", set **Source** to: `GitHub Actions`
3. The documentation will be available at: `https://jrmatherly.github.io/mcp-registry-gateway/`

**Verification:**

- After the first successful `docs.yml` workflow run, check that the Pages deployment succeeded
- Visit the documentation URL to confirm it's working

### 2. Codecov Integration (Optional - for Code Coverage)

Three workflows use Codecov for coverage reporting:

- `registry-test.yml`
- `auth-server-test.yml`
- `metrics-service-test.yml`

**Setup Steps:**

1. Go to [codecov.io](https://codecov.io) and sign in with GitHub
2. Add this repository to Codecov
3. Copy the `CODECOV_TOKEN` from Codecov dashboard
4. In GitHub, go to **Settings > Secrets and variables > Actions**
5. Click **New repository secret**
6. Name: `CODECOV_TOKEN`
7. Value: (paste the token from Codecov)

**Note:** Workflows will still pass without Codecov configured; coverage upload will simply be skipped.

### 3. GitHub Advanced Security (for SARIF Uploads)

The `terraform-test.yml` workflow uploads SARIF files for security scanning.

**For Public Repositories:**

- SARIF uploads work automatically (GitHub Advanced Security is free for public repos)

**For Private Repositories:**

- Requires GitHub Advanced Security license
- Go to **Settings > Security > Code security and analysis**
- Enable "Code scanning"
- Without this, SARIF uploads will be skipped (workflow continues with `continue-on-error: true`)

## Repository Labels

The following labels are used by issue templates and should be created if not already present.

### Option A: Create via GitHub CLI (Recommended)

Run these commands from your local repository:

```bash
# Create all recommended labels
gh label create "bug" --description "Something isn't working" --color "d73a4a"
gh label create "enhancement" --description "New feature or request" --color "a2eeef"
gh label create "documentation" --description "Improvements or additions to documentation" --color "0075ca"
gh label create "dependencies" --description "Pull requests that update a dependency" --color "0366d6"
gh label create "python" --description "Python-related changes" --color "3572A5"
gh label create "javascript" --description "JavaScript/TypeScript-related changes" --color "f1e05a"
gh label create "github-actions" --description "CI/CD workflow changes" --color "000000"
gh label create "docker" --description "Docker-related changes" --color "0db7ed"
gh label create "terraform" --description "Terraform infrastructure changes" --color "7B42BC"
gh label create "frontend" --description "Frontend-related changes" --color "61DAFB"
gh label create "metrics-service" --description "Metrics service changes" --color "FF6B6B"
```

### Option B: Create via Web UI

1. Go to repository on GitHub
2. Click **Issues** tab
3. Click **Labels** button (above issues list)
4. Click **New label**
5. Enter name, description, and color
6. Click **Create label**

### Label Reference

| Label | Color | Description |
|-------|-------|-------------|
| `bug` | `#d73a4a` | Something isn't working |
| `enhancement` | `#a2eeef` | New feature or request |
| `documentation` | `#0075ca` | Improvements or additions to documentation |
| `dependencies` | `#0366d6` | Pull requests that update a dependency |
| `python` | `#3572A5` | Python-related changes |
| `javascript` | `#f1e05a` | JavaScript/TypeScript-related changes |
| `github-actions` | `#000000` | CI/CD workflow changes |
| `docker` | `#0db7ed` | Docker-related changes |
| `terraform` | `#7B42BC` | Terraform infrastructure changes |
| `frontend` | `#61DAFB` | Frontend-related changes |
| `metrics-service` | `#FF6B6B` | Metrics service changes |

## Branch Protection (Recommended)

For production use, configure branch protection for `main`:

1. Go to **Settings > Branches**
2. Click **Add branch protection rule**
3. Branch name pattern: `main`
4. Recommended settings:
   - [x] Require a pull request before merging
   - [x] Require status checks to pass before merging
     - Select: `test-registry`, `lint`, `security`
   - [x] Require branches to be up to date before merging
   - [x] Do not allow bypassing the above settings

## Environment Variables for Workflows

Some workflows may require additional secrets:

| Secret | Used By | Description |
|--------|---------|-------------|
| `CODECOV_TOKEN` | `*-test.yml` | Codecov upload token |
| `AWS_ACCESS_KEY_ID` | Deployment workflows | AWS credentials (if deploying to AWS) |
| `AWS_SECRET_ACCESS_KEY` | Deployment workflows | AWS credentials (if deploying to AWS) |

## Verification Checklist

After completing setup, verify:

- [ ] GitHub Pages is enabled and documentation is accessible
- [ ] Dependabot is creating PRs for dependency updates
- [ ] CI workflows pass on the main branch
- [ ] Issue templates appear when creating new issues
- [ ] PR template appears when creating new pull requests
- [ ] CODEOWNERS file is recognized (check Settings > Branches)
