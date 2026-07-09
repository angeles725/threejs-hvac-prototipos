<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Houdini Vertex Animation Textures (VAT 3.0) for WGSL](/t/houdini-vertex-animation-textures-vat-3-0-for-wgsl/92245)

<div class="topic-category" itemscope=""
itemtype="http://schema.org/BreadcrumbList">

<span itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem">
<a href="/c/resources/8" class="badge-wrapper bullet"
itemprop="item"><span class="badge-category-bg"
style="background-color: #ED207B"></span> <span
class="badge-category clear-badge"> <span class="category-name"
itemprop="name">Resources</span> </span></a> </span>

</div>

<div class="topic-category">

<div class="discourse-tags list-tags">

<a href="https://discourse.threejs.org/tag/shaders"
class="discourse-tag" rel="tag">shaders</a>,
<a href="https://discourse.threejs.org/tag/animation"
class="discourse-tag" rel="tag">animation</a>,
<a href="https://discourse.threejs.org/tag/rendering"
class="discourse-tag" rel="tag">rendering</a>,
<a href="https://discourse.threejs.org/tag/wgsl" class="discourse-tag"
rel="tag">wgsl</a>

</div>

</div>

</div>

<div itemscope="itemscope"
itemtype="http://schema.org/DiscussionForumPosting">

<div itemprop="publisher" itemscope=""
itemtype="http://schema.org/Organization">

<div itemprop="logo" itemscope=""
itemtype="http://schema.org/ImageObject">

</div>

</div>

<div id="post_1" class="topic-body crawler-post">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> June 15, 2026, 6:06pm </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

Hey guys, and I wanted to share a module I have been working on which
ports SideFX Houdini’s VAT 3.0 tools to WGSL. Below are some notes, a
link to a repository with the code, and playground example showing a
version created for Babylon-js (stackblitz version to come). There are a
wealth of interesting tools and tutorials available online
(<a href="https://sidefxlabs.artstation.com/projects"
rel="noopener nofollow ugc">SideFX Labs</a>) explaining how the same
tools have been used to create effects for Unreal and Unity. The
repository contains a basic demo which shows each of the variants
running from a local server.

Please take a look, and let me know what you think.

# <a href="#p-231220-vat3-houdini-vertex-animation-textures-1"
id="p-231220-vat3-houdini-vertex-animation-textures-1" class="anchor"
aria-label="Heading link"></a>**VAT3 — Houdini Vertex Animation Textures**

VAT3 brings SideFX Houdini’s Vertex Animation Textures (VAT) workflow to
modern WebGPU renderers.

Artists author simulations in Houdini and export them as a portable
asset package consisting of geometry, textures, and metadata. At
runtime, Babylon.js and Three.js reconstruct those simulations entirely
on the GPU by sampling animation data from textures rather than
evaluating animation or simulation logic on the CPU.

The result is a scalable workflow for rendering cloth, destruction,
fluids, crowds, particles, and other complex effects in real time while
preserving a clean separation between content creation and runtime
implementation.

# <a href="#p-231220-vat3-github-repo-2" id="p-231220-vat3-github-repo-2"
class="anchor" aria-label="Heading link"></a>**VAT3 — Github Repo**

<div class="source">

<a href="https://github.com/floating-world-lda/vat3-wgsl-ts"
target="_blank" rel="noopener nofollow ugc">github.com</a>

</div>

<div class="github-row" github-private-repo="false">

<img
src="https://opengraph.githubassets.com/04d66373b04d6a7639f884cee2808e56/floating-world-lda/vat3-wgsl-ts"
class="thumbnail" width="690" height="344" />

### <a href="https://github.com/floating-world-lda/vat3-wgsl-ts"
target="_blank" rel="noopener nofollow ugc">GitHub -
floating-world-lda/vat3-wgsl-ts: VAT3 wgsl shader code and typescript
interfaces...</a>

<span class="github-repo-description">VAT3 wgsl shader code and
typescript interfaces for babylon-js and three-js</span>

</div>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

# <a href="#p-231220-vat3-babylonjs-interactive-playground-3"
id="p-231220-vat3-babylonjs-interactive-playground-3" class="anchor"
aria-label="Heading link"></a>**VAT3 — Babylon.js Interactive Playground**

<div class="source">

<img src="https://www.babylonjs.com/favicon.ico" class="site-icon"
width="16" height="16" />
<a href="https://playground.babylonjs.com/#XKW2C5" target="_blank"
rel="noopener nofollow ugc">playground.babylonjs.com</a>

</div>

### <a href="https://playground.babylonjs.com/#XKW2C5" target="_blank"
rel="noopener nofollow ugc">Babylon.js Playground</a>

Babylon.js playground is a live editor for Babylon.js WebGL and WebGPU
3D scenes

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">3 Likes</span>

</div>

</div>

<div id="post_2" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 15, 2026, 6:34pm </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

This sounds pretty cool. Will this work in WebGL as well?

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_3" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> June 15, 2026, 6:36pm </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

There is a Godot repository which contains most of the code for WebGL,
but it’s not my intention to support it.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_4" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 2:29am </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

I got curious about this, so I took your samples, and some others that I
found, and combined the logic along with logic from other repos like the
babylon one, to make this:

demo:

<div class="source">

<a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">manthrax.github.io</a>

</div>

### <a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">WebGL2 Houdini VAT2 &amp; VAT3 - Demo</a>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

code:

<div class="source">

<a href="https://github.com/manthrax/three-vat" target="_blank"
rel="noopener">github.com</a>

</div>

<div class="github-row" github-private-repo="false">

<img
src="https://opengraph.githubassets.com/3052640760c297b48b68494be0821ea0/manthrax/three-vat"
class="thumbnail" width="690" height="344" />

### <a href="https://github.com/manthrax/three-vat" target="_blank"
rel="noopener">GitHub - manthrax/three-vat: threejs houdini vat3 vat2
loader, instancer</a>

<span class="github-repo-description">threejs houdini vat3 vat2 loader,
instancer</span>

</div>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

Fun stuff !!

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_5" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/dubois" rel="nofollow"><span
itemprop="name">dubois</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 3:34am </span>

<span itemprop="position">5</span>

</div>

<div class="post" itemprop="text">

Weren’t we saying something about Claude not understanding 3d? Lol

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_6" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 3:58am </span>

<span itemprop="position">6</span>

</div>

<div class="post" itemprop="text">

You’re probably thinking of someone else. I’ve been LLM pilled for a
while now…

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_7" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 7:08am </span>

<span itemprop="position">7</span>

</div>

<div class="post" itemprop="text">

That’s really cool, and thanks for migrating the assets instead of
hacking headers. I was thinking about adding some per-instance data and
this looks great.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_8" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 3:15pm </span>

<span itemprop="position">8</span>

</div>

<div class="post" itemprop="text">

awesome! glad it could give you some ideas. thanks for the inspiration!

I wanted to try to keep it as general as possible in the hopes that it
could open VATs from different sources…

But I also tried some VATs that were used/created for unity hdrp, and
I’m having mixed/bad results. I want to track down more examples to test
with in there.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_9" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 3:40pm </span>

<span itemprop="position">9</span>

</div>

<div class="post" itemprop="text">

The Unity outputs are y-up lh and would need to be converted (probably
not worth your time). I am going to migrate the particle work to compute
shaders, and in the process open the simulation up for enrichment
(particle trails, advection, icp search, mesh collisions). Houdini can
create infinite combinations of simulation data and export packed
(sparse) containers that expand into shader inputs (dense
reconstructions) at runtime. It’s a work flow leveraged a lot in Unreal
games that really raises the quality bar of renders.

I added your link to the post I made a few weeks ago on LinkedIn, but
wasn’t able to find your profile to directly site you. Let me know if
that’s important and I’ll update it.

(Robert Durnin)

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_10" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 5:01pm </span>

<span itemprop="position">10</span>

</div>

<div class="post" itemprop="text">

All good… no need to cite me, but for your reference
<img src="https://emoji.discourse-cdn.com/twitter/smiley.png?v=15"
title=":smiley:" class="emoji" loading="lazy" width="20" height="20"
alt=":smiley:" /> :

<div class="source">

<img src="https://github.githubassets.com/favicons/favicon.svg"
class="site-icon" width="32" height="32" />
<a href="https://github.com/manthrax/" target="_blank"
rel="noopener">GitHub</a>

</div>

<img src="https://avatars.githubusercontent.com/u/350247?v=4?s=400"
class="thumbnail onebox-avatar" width="460" height="460" />

### <a href="https://github.com/manthrax/" target="_blank"
rel="noopener">manthrax - Overview</a>

manthrax has 82 repositories available. Follow their code on GitHub.

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

<div class="source">

<a href="https://manthrax.github.io/" target="_blank"
rel="noopener">manthrax.github.io</a>

</div>

### <a href="https://manthrax.github.io/" target="_blank"
rel="noopener">GitHub Pages Portfolio</a>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_11" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 7:28pm </span>

<span itemprop="position">11</span>

</div>

<div class="post" itemprop="text">

<a href="/u/rdurnin" class="mention">@rdurnin</a> I fixed interpolation
for rigidBody + particles + softBody.. so now you can actually use lower
FPS exports and still get smooth motion… (doesn’t apply to fluids which
have variable topology)

Check it out, ( try setting the speed to slower and observe that the
fracture+particles+softBody all look smooth in slow motion
<img src="https://emoji.discourse-cdn.com/twitter/smiley.png?v=15"
title=":smiley:" class="emoji" loading="lazy" width="20" height="20"
alt=":smiley:" /> )

<div class="source">

<a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">manthrax.github.io</a>

</div>

### <a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">WebGL2 Houdini VAT2 &amp; VAT3 - Demo</a>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_12" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 8:15pm </span>

<span itemprop="position">12</span>

</div>

<div class="post" itemprop="text">

Nice. Let me know when you push it as I will make the same update to the
Babylon.js repo, and thanks.

r

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_13" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 30, 2026, 4:21am </span>

<span itemprop="position">13</span>

</div>

<div class="post" itemprop="text">

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/f/c/fc80a35b912bd573d6ea56928bb78dd7834658fc.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/A1JVyWyNI8divtfeyDDdVfGS5xq.jpeg?dl=1"
title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/c/fc80a35b912bd573d6ea56928bb78dd7834658fc_2_690x288.jpeg"
data-base62-sha1="A1JVyWyNI8divtfeyDDdVfGS5xq"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/c/fc80a35b912bd573d6ea56928bb78dd7834658fc_2_690x288.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/c/fc80a35b912bd573d6ea56928bb78dd7834658fc_2_1035x432.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/c/fc80a35b912bd573d6ea56928bb78dd7834658fc_2_1380x576.jpeg 2x"
data-dominant-color="727169" width="690" height="288" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1920×804
378 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="source">

<a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">manthrax.github.io</a>

</div>

### <a href="https://manthrax.github.io/three-vat/" target="_blank"
rel="noopener">WebGL2 Houdini VAT2 &amp; VAT3 - Demo</a>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

demo/repo is updated.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">3 Likes</span>

</div>

</div>

<div id="post_14" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> July 2, 2026, 6:09pm </span>

<span itemprop="position">14</span>

</div>

<div class="post" itemprop="text">

<a href="/u/rdurnin" class="mention">@rdurnin</a>

I added some new VATs to my VAT demo:
<a href="https://manthrax.github.io/three-vat/"
class="inline-onebox">WebGL2 Houdini VAT2 &amp; VAT3 - Demo</a>

And also fixed a bunch of bugs.. like shadows, etc.

And I also wrote an exporter for Blender to export VATs so you can make
your own.. and a test suite, in a .blend file in the repo as well.

I had tried to get OpenVAT to work, but its export wasn’t very
conformant to how the vat3 demos work, so I wrote my own exporter
(available in the repo) that emits something easier to consume.\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/d/6d1d28ee5f8f3d714274886fb3f94d1ac30aa8a7.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/fzgwbdZiwrhSWD5UDsI4Q8Imaij.jpeg?dl=1"
title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/d/6d1d28ee5f8f3d714274886fb3f94d1ac30aa8a7_2_690x311.jpeg"
data-base62-sha1="fzgwbdZiwrhSWD5UDsI4Q8Imaij"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/d/6d1d28ee5f8f3d714274886fb3f94d1ac30aa8a7_2_690x311.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/d/6d1d28ee5f8f3d714274886fb3f94d1ac30aa8a7_2_1035x466.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/d/6d1d28ee5f8f3d714274886fb3f94d1ac30aa8a7_2_1380x622.jpeg 2x"
data-dominant-color="444545" width="690" height="311" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1920×867
215 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

it supports rigidbody, particles, dynamicMesh (fluids), and softBody
(cloth etc).\
(both .exr and .png, variable framerate setting etc.)

(The demos on the right, are exported from Blender with the exporter I
wrote)

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/2/b2e289519fbdc3aa01b05a37cdd402629eb86bad.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/pwulbEJWOMi74mJMO6oLIu7AC8l.jpeg?dl=1"
title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/2/b2e289519fbdc3aa01b05a37cdd402629eb86bad_2_690x288.jpeg"
data-base62-sha1="pwulbEJWOMi74mJMO6oLIu7AC8l"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/2/b2e289519fbdc3aa01b05a37cdd402629eb86bad_2_690x288.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/2/b2e289519fbdc3aa01b05a37cdd402629eb86bad_2_1035x432.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/2/b2e289519fbdc3aa01b05a37cdd402629eb86bad_2_1380x576.jpeg 2x"
data-dominant-color="605F56" width="690" height="288" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1920×804
372 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Perhaps you may find it useful/interesting !

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">2 Likes</span>

</div>

</div>

<div id="post_15" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> July 2, 2026, 6:27pm </span>

<span itemprop="position">15</span>

</div>

<div class="post" itemprop="text">

Wow, thanks, and I have shared the repo with the Babylon.js forum as
well. As a side note, I added a flag that would allow you to use 8 bit
color textures with the 32 fp animation data (rotation, position, etc).
There isn’t much value in loading those textures high-res and it’s worth
checking if the Blender version isn’t automatically applying gamma to
them on export.

r

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_16" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> July 2, 2026, 6:42pm </span>

<span itemprop="position">16</span>

</div>

<div class="post" itemprop="text">

Ooo that sounds like a good optimization. My blender exporter does
either/or (all png, or all exr), but not mixed.. (png for rot/norm, exr
for position).\
I’ll have to figure out how to tag it in the metadata.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_17" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/rdurnin" rel="nofollow"><span
itemprop="name">rdurnin</span></a> </span>

<span class="crawler-post-infos"> July 2, 2026, 8:20pm </span>

<span itemprop="position">17</span>

</div>

<div class="post" itemprop="text">

You shouldn’t need to as there is already a switch named isColorTexHdr
(might need porting as it’s used on asset ingest and not in the shader).
I built an accompanying particle shading lib (nova) which requires
emissive maps to use linear textures, as they apply a (rough) scaling
factor to improve glow (required tone mapping). It’s a carry over from
how Unity handles glow, but it makes for nicer looking fire and
explosions (etc).

Thanks again for any efforts you have made. It’s always a pleasure to
see what someone else can do when you pass them a ball.

r

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">2 Likes</span>

</div>

</div>

<div id="post_18" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Anh_Tuan" rel="nofollow"><span
itemprop="name">Anh_Tuan</span></a> </span>

<span class="crawler-post-infos"> July 3, 2026, 9:22am </span>

<span itemprop="position">18</span>

</div>

<div class="post" itemprop="text">

This isn’t exactly the same, but I once worked on something
similar—fundamentally the same concept—but applied to volume. I wonder
if anyone has optimized this aspect yet.

I’m using a few tricks to keep the file size around 300KB for an
animation nearly a second long—spanning 30 to 60 frames. I’m not using
compression because the resulting errors are too significant.

<div class="video-placeholder-container"
video-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/6/d6d7ed0df05f8e77702609bf090208da2938b5d2.mp4"
thumbnail-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/4/04589b1279e7658f1f044095b548d378b8e2c0d5.jpeg"
video-base62-sha1="uEANts3GpFt7prv631u66f5m2TU.mp4">

</div>

<div class="video-placeholder-container"
video-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/4/3457f8dcc0b67b786a2dd5e9f2d53576a8273c10.mp4"
thumbnail-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/4/143cababdab1ebf68a362a3a6c405289169122c4.jpeg"
video-base62-sha1="7t3j5p8pNz823ARNErT5iCFq4Fi.mp4">

</div>

<div class="video-placeholder-container"
video-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/8/7887eac177076f8aff1f6dc0840938f4bb32b409.mp4"
thumbnail-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/d/7d9da5bb72317599e294a35b67eb6d416ded3720.jpeg"
video-base62-sha1="hcguPFYGE5pTTTrWXWNvKE3YbiN.mp4">

</div>

<div class="video-placeholder-container"
video-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/b/bb16d70b1c8fbe594a88c4e8919f6e5a631ebe15.mp4"
thumbnail-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/e/7ef2230d6ee6e518de613a6e902e697f015dae38.jpeg"
video-base62-sha1="qH4dJm7m77gE25A5Gdih7JB8MM5.mp4">

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

</div>

<div id="related-topics" class="more-topics__list" role="complementary"
aria-labelledby="related-topics-title">

### Related topics

<div class="topic-list-container" itemscope=""
itemtype="http://schema.org/ItemList">

<table class="topic-list">
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<thead>
<tr>
<th>Topic</th>
<th></th>
<th class="replies">Replies</th>
<th class="views">Views</th>
<th>Activity</th>
</tr>
</thead>
<tbody>
<tr id="topic-list-item-7411" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/bringing-soft-and-fluid-body-vertex-animations-from-houdinifx-to-threejs/7411"
class="title raw-link raw-topic-link" itemprop="url">Bringing Soft and
Fluid Body Vertex Animations from HoudiniFX to ThreeJS</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/glsl/17"
class="discourse-tag">glsl</a> ,  <a
href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/animation/163"
class="discourse-tag">animation</a> ,  <a
href="https://discourse.threejs.org/tag/houdini/523"
class="discourse-tag">houdini</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">5122</span></td>
<td>May 7, 2019</td>
<td></td>
</tr>
<tr id="topic-list-item-58337" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/freeciv3d-port-shader-from-webgl-to-webgpu-shader-language-wgsl/58337"
class="title raw-link raw-topic-link" itemprop="url">Freeciv3D - port
shader from WebGL to WebGPU Shader Language (WGSL)</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a> ,  <a
href="https://discourse.threejs.org/tag/wgsl/1534"
class="discourse-tag">wgsl</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">7</span></td>
<td class="views"><span class="views" title="views">918</span></td>
<td>December 4, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-59498" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/houdini-threejs-with-glsl-shader/59498"
class="title raw-link raw-topic-link" itemprop="url">Houdini -&gt;
threejs with GLSL shader</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
&#10;</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">382</span></td>
<td>December 20, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-51209" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/a-wgsl-based-unity-like-shader-graph/51209"
class="title raw-link raw-topic-link" itemprop="url">a WGSL based Unity
"like" Shader Graph</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">999</span></td>
<td>May 5, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-62121" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/help-port-shader-to-tsl-or-wgsl-shader-for-three-js-webgpu-renderer/62121"
class="title raw-link raw-topic-link" itemprop="url">Help port shader to
TSL or WGSL shader for Three.js WebGPU renderer</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">411</span></td>
<td>February 29, 2024</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
