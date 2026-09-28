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

- Keep application pages in TanStack Start file routes rather than React Router; this template's generated route tree and SSR depend on it.
- Keep mock identity in a client context with browser storage and guard both dashboard routes; no server authorization exists until a backend is added.
- Share product controls from `src/components/common` and theme roles from `src/styles.css` so resident and staff screens stay consistent.
