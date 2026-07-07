---
title: 'tag it and ship it: building a CD pipeline for a startup in alpha'
description: "How a two-engineer startup went from SSH-and-pray to a tag-based GitLab CD pipeline, and what changed between the clean plan and what actually runs."
pubDate: 2026-07-23
tags: ['devops', 'ci-cd']
---

When you're a small startup with two engineers and zero users watching, it's tempting to just SSH into the server and run `docker run` manually every time you want to ship something.

We did that for a while. It worked. But it was painful.

This is the story of how we built a real CI/CD pipeline for [Audition Cat](/projects/audition-cat/), a casting and audition platform currently in alpha, and what changed between "the plan" and "the thing that actually runs in production."

## why we needed a pipeline

The manual deploy worked fine, honestly. But it was both painful and potentially very unreliable, with us leaning into hope that copy/paste of commands would work the same each time and have no operator errors.

"Just SSH in" stops being cute when:

- You're often shipping release candidates to staging before they touch prod
- Production deploys need a human to approve before they run
- You want the same process every time, not "where's my copy/paste reference again?"

We also wanted versioning. Real versioning. The kind where you can look at a running container and know exactly what code is in it.

So we sat down and made some decisions.

## the decisions (the plan)

**Git flow + tag-based deployment.** Not branch-based. We push a tag, the pipeline runs. No magic branch names, no manual triggers.

**Semantic versioning.** `vMAJOR.MINOR.PATCH`, e.g. `v1.0.0`. Frontend and backend are versioned independently because they don't always ship together.

**Two tag patterns, two behaviors:**

- `v1.0.0-rc.1` → staging deploy ("release candidate," automatic)
- `v1.0.0` → production deploy (manual approval required)

**Staging and prod are separate environments.** Staging runs on its own EC2 instance. Same RDS cluster, but with a different database (`auditioncat_staging`). Zero code changes needed. We just pass different env vars.

**Docker images go to Docker Hub.** Tagged by version. Every deploy pulls the exact image it needs. No rebuilding on the server.

That was the plan. Clean. Reasonable. Mostly right.

## what actually happened when we built it

### the runner architecture changed completely

The original plan had one runner, `mindi-local` (my Linux machine on a Raspberry Pi). It was handling everything: building Docker images, SSHing into servers, running deploys.

_You can see more about my adventures setting up this GitLab runner:_

<a href="/blog/experiences-with-a-local-gitlab-runner-part-1" class="hov-card" style="display:inline-block;font-family:var(--font-mono);font-size:0.7rem;padding:0.35rem 0.6rem;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--text)">gitlab runner - part 1 →</a>
<a href="/blog/experiences-with-a-local-gitlab-runner-part2" class="hov-card" style="display:inline-block;font-family:var(--font-mono);font-size:0.7rem;padding:0.35rem 0.6rem;border:1px solid var(--border);border-radius:6px;text-decoration:none;color:var(--text)">gitlab runner - part 2 →</a>

But...that wasn't enough power or space.

Building multi-platform Docker images from a local machine and SSHing into EC2s across every deploy is slow, brittle, and created a hard dependency on my machine being on and available.

Not great.

What we ended up with instead were dedicated GitLab runners on the EC2 instances themselves.

- `ec2-runner-staging` lives on the staging server. It builds staging images and deploys them locally. No SSH, no remote commands, just `docker run` on the machine it's already on.
- `mindi-local` still handles dev CI pipelines and production deploys.

### disk space is real

Early on, the staging server started choking. Docker images build up fast, and a t2.micro doesn't have a lot of room to breathe.

One fix was adding cleanup steps directly into the pipeline:

```yaml
before_script:
  - docker system prune -af || true
  - docker builder prune -af || true
after_script:
  - docker image prune -f
  - docker builder prune -f
```

Not glamorous, though extremely necessary. If you're running Docker on a small instance, build cleanup into your pipeline from day one.

### SSH key encoding tripped us up

The prod backend deploy still runs from `mindi-local` via SSH. When we set up the GitLab CI variable for the SSH key, we stored it base64-encoded (common approach for multiline secrets in CI). Fine, except the deploy script needs to decode it before adding it to the agent:

```yaml
- echo "$EC2_SSH_KEY" | base64 -d | ssh-add -
```

The original draft had `tr -d '\r'` instead of `base64 -d`. The wrong format for how we ended up storing the key. We caught it when the first prod deploy attempt just sat there doing nothing. Always test your SSH setup in a throwaway pipeline first!

### docs get linted too

The backend pipeline picked up a `docs-lint-job` that wasn't in the original plan. We're using TypeDoc for API documentation, and it turns out having a lint step for your docs is actually useful. Broken doc comments fail the pipeline before they get anywhere near a deploy.

## what the pipeline looks like now

**On every merge request:**
`lint → build → test` (including API docs lint on backend)

If any of those fail, the MR doesn't merge. Simple.

**On a release candidate tag (`v1.0.0-rc.1`):**
`docker build (staging) → deploy to staging` (automatic)

Both frontend and backend deploy independently. Staging is up within a few minutes of pushing the tag.

**On a production tag (`v1.0.0`):**
`docker build → deploy to production` (plus manual approval required)

The manual gate is intentional. We're a small team and production deploys should feel deliberate for now, not automatic.

**On a schedule:**
[Renovate](https://docs.renovatebot.com/) runs and opens dependency update MRs automatically. We review them as often as possible.

## what's next

The pipeline is solid but we're still filling in some gaps:

**Changelog automation.** We recently set up an automation to take in our changelog updates. The pipeline scans commits since the last tag, we run it through AI just to come up with more user-friendly descriptions, and then push an entry to our Notion changelog DB automatically on every production deploy.

**Moving the backend prod deploy off mindi-local.** It works, but the dependency on my machine being available is annoying. `ec2-runner-backend` is on the list. I initially set up my local runner to learn something new and for cost efficiency. We could also use existing resources, like EC2 instances already active.

## if you're building something similar

A few things I'd do from the start:

1. **Runners on the servers, not remote SSH.** It's faster, simpler, and you don't need to manage SSH keys across every job.
2. **Add disk cleanup to Docker jobs.** You will run out of space. Build the cleanup in before you need it.
3. **Separate tag patterns for staging vs prod.** The `v*-rc*` / `v*.*.*` split is clean and easy to reason about.

We went from "SSH and pray" to a pipeline we actually trust. It took a few rounds of iteration, but it runs, it's repeatable, and the best part is that neither of us has to remember a deploy checklist anymore!

Are you building CI/CD for a small team or solo project? I'd love to hear what your setup looks like. 🚀

_[Audition Cat](/projects/audition-cat/) is a casting and audition platform currently in alpha. Follow along as we build it in public._
