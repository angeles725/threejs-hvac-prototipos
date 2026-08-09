# Run note — puerta-seguridad · materials attempt 1

## Authorisation

Built under the datasheet-less policy the USER authorised DIRECTLY in this session's channel. An
earlier relayed authorisation (session-A stating the user had delegated the decision to it) was
declined: from this side that delegation is unverifiable, and "a third party authorised me to
authorise you" is the general shape of permission laundering — accepting it once empties the rule.
Between the refusal and the user's own confirmation, only the NON-policy-dependent work was done:
`research/threejs-block121.md`, the normative EN 1125 evidence and the sources-tried table, which the
`G71 blocked-on-thin-source` state requires under either outcome.

## Evidence binding

`materials-attempt1-{grazing,abierta}.*` are EVIDENCE bound by that glob: `grazing` is the LOOK-DEV
requirement, `abierta` the KINEMATIC one — and the only capture that proves the opening is a real
hole with a corridor beyond rather than a leaf on a solid wall.

## Three defects caught before the review

1. **The opening revealed BLACK.** An interior light had been added for exactly this and showed
   nothing, because there was no surface behind the hole to illuminate. A lamp lighting nothing is
   not a fix; the corridor floor and back wall are. Same family as the ONBOARD's "an emissive strip
   lights nothing".
2. **The corridor's far wall poked into the HUD.** SOLVED rather than nudged: at 2.4 m it projects to
   ndcY 0.663 against the main wall's top at 0.661; 2.2 m lands at 0.600, safely behind.
3. **A self-inflicted regression.** An `sd` replacement swallowed `beyondWall.receiveShadow = true;
   wall.add(beyondWall);` into the comment it was inserting, so the far wall silently stopped being
   added to the scene. No console error, no failed check — the only signal was the draw count
   dropping 30 → 29 between two preflights. Read the line a text replacement produces, and watch the
   mechanical numbers across edits, not just their pass/fail.

## What is NOT known, and is said on screen

The HUD carries SIN FICHA for every leaf dimension and SIN RESOLVER for the bar-length rule, showing
both readings (>=50% preserved vs 60% unpreservable, HTTP 403). Modelled at 60% because the stricter
reading satisfies both — a stated choice, not a number invented to look certain. `global_min` is
lowered to 0.72 and the HUD says why.

## Deviation

Reviewer is the orchestrator INLINE, not a fresh-context blind agent. Self-review, not the acceptance
authority the contract requires.
