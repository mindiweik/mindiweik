---
title: "tag it and ship it: building a CD pipeline for a startup in alpha"
description: "how a two-engineer startup went from SSH-and-pray to a tag-based pipeline, and what changed between the plan and production."
pubDate: 2026-07-16
tags: ["devops","ci-cd"]
draft: true
---

When you're a small startup with two engineers and zero users watching, it's tempting to just SSH into the server and run `docker run` manually every time you want to ship something.

We did that for a while. It worked. Until it didn't.

This is the story of how we built a real CI/CD pipeline for [Audition Cat](https://app.audition.cat), a casting and audition platform currently in alpha, and what changed between "the plan" and "the thing that actually runs in production."

## why we needed a pipeline

The manual deploy worked great until we had a staging environment, a production environment, and two people who both needed to ship things independently.

"Just SSH in" stops being cute when:

- You're shipping release candidates to staging before they touch prod
- Production deploys need a human to approve before they run
- You want the same process every time, not "whichever commands I remember"

We also wanted versioning. Real versioning. The kind where you can look at a running container and know exactly what code is in it.

So we sat down and made some decisions.

## the decisions (the plan)

**Git flow + tag-based deployment.** Not branch-based. We push a tag, the pipeline runs. No magic branch names, no manual triggers.

**Semantic versioning.** `vMAJOR.MINOR.PATCH`, e.g. `v1.0.0`. Frontend and backend are versioned independently because they don't always ship together.

**Two tag patterns, two behaviors:**

- `v1.0.0-rc.1` → staging deploy (automatic)
- `v1.0.0` → production deploy (manual approval required)

**Staging and prod are separate environments.** Staging runs on its own EC2 instance. Same RDS cluster, different database (`auditioncat_staging`). Zero code changes needed. We just pass a different `POSTGRES_DB` env var.

**Docker images go to Docker Hub.** Tagged by version. Every deploy pulls the exact image it needs. No rebuilding on the server.

That was the plan. Clean. Reasonable. Mostly right.

## what actually happened when we built it

### the runner architecture changed completely

The original plan had one runner, `mindi-local` (my Linux machine), handling everything: building Docker images, SSHing into servers, running deploys.

That lasted about five minutes of real use before it fell apart.

Building multiplatform Docker images from a local machine and SSHing into EC2s across every deploy is slow, brittle, and creates a hard dependency on my machine being on and available. Not great.

What we ended up with instead: dedicated GitLab runners on the EC2 instances themselves.

- `ec2-runner-staging` lives on the staging server. It builds staging images and deploys them locally. No SSH, no remote commands, just `docker run` on the machine it's already on.
- `ec2-runner-frontend` lives on the frontend production server, same idea.
- `mindi-local` still handles the backend production deploy (via SSH), something we'll probably move eventually.

Each runner only has access to the environment it needs. Cleaner, faster, and way less "please be online, please be online."

### disk space is real

Early on, the staging server started choking. Docker images build up fast, and a t2.micro doesn't have a lot of room to breathe.

The fix was adding cleanup steps directly into the pipeline:

```yaml
before_script:
  - docker system prune -af || true
  - docker builder prune -af || true
after_script:
  - docker image prune -f
  - docker builder prune -f
```

Not glamorous. Extremely necessary. If you're running Docker on a small instance, build cleanup into your pipeline from day one.

### SSH key encoding tripped us up

The prod backend deploy still runs from `mindi-local` via SSH. When we set up the GitLab CI variable for the SSH key, we stored it base64-encoded (common approach for multiline secrets in CI). Fine, except the deploy script needs to decode it before adding it to the agent:

```yaml
- echo "$EC2_SSH_KEY" | base64 -d | ssh-add -
```

The original draft had `tr -d '\r'` instead of `base64 -d`. Wrong format for how we ended up storing the key. Caught it when the first prod deploy attempt just sat there doing nothing. Always test your SSH setup in a throwaway pipeline first.

### docs get linted too

The backend pipeline picked up a `docs-lint-job` that wasn't in the original plan. We're using TypeDoc for API documentation, and it turns out having a lint step for your docs is actually useful. Broken doc comments fail the pipeline before they get anywhere near a deploy.

## what the pipeline looks like now

**On every merge request:**
`lint → build → test` (including docs lint on backend)

If any of those fail, the MR doesn't merge. Simple.

**On a release candidate tag (`v1.0.0-rc.1`):**
`docker build (staging) → deploy to staging` (automatic)

Both frontend and backend deploy independently. Staging is up within a few minutes of pushing the tag.

**On a production tag (`v1.0.0`):**
`docker build → deploy to production` (manual approval required)

The manual gate is intentional. We're a small team and production deploys should feel deliberate, not automatic.

**On a schedule:**
Renovate runs and opens dependency update MRs automatically. We review them on Wednesdays.

## the part I wasn't expecting to care about: environment indicators

The frontend container takes an env var called `NO_NV`, set to `"Staging"` or `"Production"`. This surfaces in the UI so you always know which environment you're looking at.

Small thing. Saved us from deploying to prod when we meant staging at least twice.

## what's next

The pipeline is solid but we're still filling in some gaps:

**Changelog automation.** Right now we're manually updating the "What's New" section in the app. The plan is to have the pipeline scan commits since the last tag and push an entry to our Notion changelog DB automatically on every production deploy. The hook is built, it just needs wiring up.

**Moving the backend prod deploy off mindi-local.** It works, but the dependency on my machine being available is annoying. `ec2-runner-backend` is on the list.

## if you're building something similar

A few things I'd do from the start:

1. **Runners on the servers, not remote SSH.** It's faster, simpler, and you don't need to manage SSH keys across every job.
2. **Add disk cleanup to every Docker job.** You will run out of space. Build the cleanup in before you need it.
3. **Manual gate on production.** Even if it feels like overkill when it's just you. The habit is worth building early.
4. **Separate tag patterns for staging vs prod.** The `v*-rc*` / `v*.*.*` split is clean and easy to reason about.

We went from "SSH and pray" to a pipeline we actually trust. It took a few rounds of iteration (and at least one moment of "why is the SSH key not working" at midnight), but it runs, it's repeatable, and neither of us has to remember a deploy checklist anymore.

Are you building CI/CD for a small team or solo project? I'd love to hear what your setup looks like. 🚀

*Audition Cat is a casting and audition platform currently in alpha. Follow along as we build it in public.*
