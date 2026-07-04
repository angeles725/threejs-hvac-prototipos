<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Viewer3D — real-time 3D warehouse SCADA, ~30k pallets in vanilla three.js (no framework)](/t/viewer3d-real-time-3d-warehouse-scada-30k-pallets-in-vanilla-three-js-no-framework/92418)

<div class="topic-category" itemscope=""
itemtype="http://schema.org/BreadcrumbList">

<span itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem">
<a href="/c/showcase/7" class="badge-wrapper bullet"
itemprop="item"><span class="badge-category-bg"
style="background-color: #BF1E2E"></span> <span
class="badge-category clear-badge"> <span class="category-name"
itemprop="name">Showcase</span> </span></a> </span>

</div>

<div class="topic-category">

<div class="discourse-tags list-tags">

<a href="https://discourse.threejs.org/tag/webgl" class="discourse-tag"
rel="tag">webgl</a>,
<a href="https://discourse.threejs.org/tag/performance"
class="discourse-tag" rel="tag">performance</a>,
<a href="https://discourse.threejs.org/tag/showcase"
class="discourse-tag" rel="tag">showcase</a>,
<a href="https://discourse.threejs.org/tag/orthographic-camera"
class="discourse-tag" rel="tag">orthographic-camera</a>,
<a href="https://discourse.threejs.org/tag/threejs"
class="discourse-tag" rel="tag">threejs</a>

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
<a href="https://discourse.threejs.org/u/Marcomon" rel="nofollow"><span
itemprop="name">Marcomon</span></a> </span>

<span class="crawler-post-infos"> June 25, 2026, 9:39pm </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

Hi everyone!
<img src="https://emoji.discourse-cdn.com/twitter/waving_hand.png?v=15"
title=":waving_hand:" class="emoji" loading="lazy" width="20"
height="20" alt=":waving_hand:" />

I’d like to share **Viewer3D**, a real-time 3D SCADA visualization for
warehouse / factory automation layouts — roller & chain conveyors,
racking, twin-column stacker cranes, ring-shuttles, AGVs and forklifts.
It renders a live warehouse floor and animates the full pallet
lifecycle: pallets flow along a conveyor graph, a shuttle hands them off
to a stacker crane, the crane puts them away into storage cells and
retrieves them back out onto the outfeed lines.

**<img src="https://emoji.discourse-cdn.com/twitter/link.png?v=15"
title=":link:" class="emoji" loading="lazy" width="20" height="20"
alt=":link:" /> Live demo:**
<a href="https://www.format.it/demo/viewer3d/" class="inline-onebox"
rel="noopener nofollow ugc">Viewer 3D - Scada3D</a>

*(toggle 2D/3D and the light/dark theme from the top-right; nav-cube to
orbit; `E` for edit mode)*

<div class="d-image-grid">

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/3/0387775b619efdeae994e604157b00098b8aad33.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/vdFnP4sMtP9yC4cRTePA2ffiWD.jpeg?dl=1"
rel="noopener nofollow ugc" title="viewer3d-01-overview"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/3/0387775b619efdeae994e604157b00098b8aad33_2_690x388.jpeg"
data-base62-sha1="vdFnP4sMtP9yC4cRTePA2ffiWD"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/3/0387775b619efdeae994e604157b00098b8aad33_2_690x388.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/3/0387775b619efdeae994e604157b00098b8aad33_2_1035x582.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/3/0387775b619efdeae994e604157b00098b8aad33_2_1380x776.jpeg 2x"
data-dominant-color="1B1B1E" width="690" height="388"
alt="viewer3d-01-overview" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">viewer3d-01-overview</span><span class="informations">1600×900
352 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/c/4c760d61d3c9832148d160793110c3872b9993ad.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/aUpdf1cpmcsxoUoPH85CFKR03Ap.jpeg?dl=1"
rel="noopener nofollow ugc" title="viewer3d-04-detail"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/c/4c760d61d3c9832148d160793110c3872b9993ad_2_690x388.jpeg"
data-base62-sha1="aUpdf1cpmcsxoUoPH85CFKR03Ap"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/c/4c760d61d3c9832148d160793110c3872b9993ad_2_690x388.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/c/4c760d61d3c9832148d160793110c3872b9993ad_2_1035x582.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/c/4c760d61d3c9832148d160793110c3872b9993ad_2_1380x776.jpeg 2x"
data-dominant-color="908B87" width="690" height="388"
alt="viewer3d-04-detail" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">viewer3d-04-detail</span><span class="informations">1600×900
569 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/6/0683bdaf1c6e5af951254af599fcd95281c007ff.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/VD7lz1GfzBBPqnYsgcE9NoWEDt.jpeg?dl=1"
rel="noopener nofollow ugc" title="viewer3d-03-light"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/6/0683bdaf1c6e5af951254af599fcd95281c007ff_2_690x388.jpeg"
data-base62-sha1="VD7lz1GfzBBPqnYsgcE9NoWEDt"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/6/0683bdaf1c6e5af951254af599fcd95281c007ff_2_690x388.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/6/0683bdaf1c6e5af951254af599fcd95281c007ff_2_1035x582.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/6/0683bdaf1c6e5af951254af599fcd95281c007ff_2_1380x776.jpeg 2x"
data-dominant-color="88888A" width="690" height="388"
alt="viewer3d-03-light" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">viewer3d-03-light</span><span class="informations">1600×900
389 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/b/dbba42fd2d46c2d5bd275def50af0cd207c602b4.png"
class="lightbox"
data-download-href="/uploads/short-url/vlND33EgF7E0ss0jDwscXaZL1R2.png?dl=1"
rel="noopener nofollow ugc" title="viewer3d-02-2dview"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/b/dbba42fd2d46c2d5bd275def50af0cd207c602b4_2_690x388.png"
data-base62-sha1="vlND33EgF7E0ss0jDwscXaZL1R2"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/b/dbba42fd2d46c2d5bd275def50af0cd207c602b4_2_690x388.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/b/dbba42fd2d46c2d5bd275def50af0cd207c602b4_2_1035x582.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/b/dbba42fd2d46c2d5bd275def50af0cd207c602b4_2_1380x776.png 2x"
data-dominant-color="272526" width="690" height="388"
alt="viewer3d-02-2dview" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">viewer3d-02-2dview</span><span class="informations">1600×900
239 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

### <a href="#p-231600-whats-interesting-to-me-anyway-1"
id="p-231600-whats-interesting-to-me-anyway-1" class="anchor"
aria-label="Heading link"></a>What’s interesting (to me, anyway)

It’s built with **plain three.js (r184) and vanilla ES modules — no
React / R3F, no TypeScript, no bundler in development**. The browser
loads the modules natively; three.js comes straight from the jsdelivr
CDN via an import map. All geometry is **procedural** — no Blender, no
imported models — every mesh is generated in code from real warehouse
dimensions (mm).

The whole thing is engineered to scale to **tens of thousands of stock
pallets and ~1,000 conveyor modules at 60 fps**. On the full scene above
it sits around **~90 fps with ~670 draw calls / ~2.6M triangles**.

**Tech / approach:**

- **Custom minimal ECS** drives the simulation systems (conveyor
  transport, crane put-away & retrieval, shuttle transfer, cradle lifts,
  owner-follow), with memoized queries so most frames are cache hits.
- **Draw-call reduction is the core strategy:** `InstancedMesh` pools
  for repeated pallets / conveyor modules (one draw call per pool,
  instances stay raycast-pickable), static composites merged into single
  meshes with **baked vertex colors**, and edge outlines batched into
  one `LineSegments` per opacity group.
- **Render-on-demand + FPS cap:** the RAF loop skips the render entirely
  when nothing moved, so an idle scene drops the GPU to ~0.
- **Smooth 2D ⇄ 3D camera:** orthographic ↔ perspective via an
  **element-wise projection-matrix morph** (instead of a hard camera
  swap that pops), plus nav-cube rotations and fly-to/home tweens.
- **In-browser edit mode:** move/rotate/resize/retype equipment, marquee
  multi-select with AutoCAD window/crossing semantics, magnet-snap
  conveyor connections, and layout save.
- Backend is
  <a href="http://ASP.NET" rel="noopener nofollow ugc">ASP.NET</a> Core
  serving static files only — all logic is on the frontend.

The pallet movement you see is currently simulated; next step is feeding
**live positions from the backend via SignalR**.

Happy to answer questions — especially about the instancing / draw-call
batching or the 2D⇄3D projection morph. Feedback very welcome!
<img src="https://emoji.discourse-cdn.com/twitter/folded_hands.png?v=15"
title=":folded_hands:" class="emoji" loading="lazy" width="20"
height="20" alt=":folded_hands:" />

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">8 Likes</span>

</div>

</div>

<div id="post_2" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/xjindf" rel="nofollow"><span
itemprop="name">xjindf</span></a> </span>

<span class="crawler-post-infos"> June 26, 2026, 2:53am </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

It’s really smooth. I look forward to you sharing more details.<img
src="https://emoji.discourse-cdn.com/twitter/grinning_face.png?v=15"
title=":grinning_face:" class="emoji" loading="lazy" width="20"
height="20" alt=":grinning_face:" />

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
<a href="https://discourse.threejs.org/u/agrafikr" rel="nofollow"><span
itemprop="name">agrafikr</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 1:01pm </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

It works in Chrome; but in Firefox, only the loading screen appears (no
error messages).

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_4" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/manthrax" rel="nofollow"><span
itemprop="name">manthrax</span></a> </span>

<span class="crawler-post-infos"> June 29, 2026, 5:23pm </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

Very nice. Great look to it.

I did some conveyor belt stuff recently for fun, using the InstanceCurve
modifier.. you might find it useful or fun to look at:

<a href="https://manthrax.github.io/InstanceCurve/index.html"
class="onebox" target="_blank"
rel="noopener">https://manthrax.github.io/InstanceCurve/index.html</a>

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
<tr id="topic-list-item-47895" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/a-project-to-create-3d-warehouse-with-drivable-forklift-from-2d-map/47895"
class="title raw-link raw-topic-link" itemprop="url">A project to create
3D warehouse, with drivable forklift, from 2D map.</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/models/1"
class="discourse-tag">models</a> ,  <a
href="https://discourse.threejs.org/tag/animation/163"
class="discourse-tag">animation</a> ,  <a
href="https://discourse.threejs.org/tag/interaction/400"
class="discourse-tag">interaction</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">4</span></td>
<td class="views"><span class="views" title="views">5413</span></td>
<td>February 11, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-91548" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/production-oriented-real-time-3d-furniture-experience-built-with-three-js/91548"
class="title raw-link raw-topic-link" itemprop="url">Production-Oriented
Real-Time 3D Furniture Experience Built with Three.js</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a> ,  <a
href="https://discourse.threejs.org/tag/loaders/44"
class="discourse-tag">loaders</a> ,  <a
href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a> ,  <a
href="https://discourse.threejs.org/tag/camera/67"
class="discourse-tag">camera</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/animation/163"
class="discourse-tag">animation</a> ,  <a
href="https://discourse.threejs.org/tag/gltf-loader/296"
class="discourse-tag">gltf-loader</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">179</span></td>
<td>May 15, 2026</td>
<td></td>
</tr>
<tr id="topic-list-item-85652" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/three-js-examples-playground/85652"
class="title raw-link raw-topic-link" itemprop="url">Three.js examples
playground</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/examples/29"
class="discourse-tag">examples</a> ,  <a
href="https://discourse.threejs.org/tag/editor/33"
class="discourse-tag">editor</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">4</span></td>
<td class="views"><span class="views" title="views">435</span></td>
<td>August 4, 2025</td>
<td></td>
</tr>
<tr id="topic-list-item-90198" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/money-visualizer-interactive-3d-currency-visualization-using-three-js-and-react-three-fiber/90198"
class="title raw-link raw-topic-link" itemprop="url">Money Visualizer:
Interactive 3D currency visualization using Three.js and React Three
Fiber</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/webgl/11"
class="discourse-tag">webgl</a> ,  <a
href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a> ,  <a
href="https://discourse.threejs.org/tag/threejs/668"
class="discourse-tag">threejs</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">10</span></td>
<td class="views"><span class="views" title="views">555</span></td>
<td>March 7, 2026</td>
<td></td>
</tr>
<tr id="topic-list-item-82878" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/developed-a-custom-web-application-featuring-a-realistic-3d-model-to-provide-a-real-life-preview-of-uploaded-designs/82878"
class="title raw-link raw-topic-link" itemprop="url">Developed a custom
web application featuring a realistic 3D model to provide a real-life
preview of uploaded designs</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/loaders/44"
class="discourse-tag">loaders</a> ,  <a
href="https://discourse.threejs.org/tag/camera/67"
class="discourse-tag">camera</a> ,  <a
href="https://discourse.threejs.org/tag/animation/163"
class="discourse-tag">animation</a> ,  <a
href="https://discourse.threejs.org/tag/gltf-loader/296"
class="discourse-tag">gltf-loader</a> ,  <a
href="https://discourse.threejs.org/tag/gltf/413"
class="discourse-tag">gltf</a> ,  <a
href="https://discourse.threejs.org/tag/threejs/668"
class="discourse-tag">threejs</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">73</span></td>
<td>May 20, 2025</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
