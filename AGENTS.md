<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep lead identity, mock generation, and deduplication in a shared pure module so business identity stays stable across searches and is independently testable.
- Store contacted history in Cloud with owner-scoped read/insert policies and unique per-user business keys; read all pages before generation to prevent history truncation from resurfacing completed leads.
- Keep the home page public with inline social sign-in for saving history; mount one session provider in the root and never expose one account's history to another.
