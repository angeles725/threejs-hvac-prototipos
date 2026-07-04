<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Browser-based 3D texture painter & PBR material editor built with three.js](/t/browser-based-3d-texture-painter-pbr-material-editor-built-with-three-js/92552)

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

<a href="https://discourse.threejs.org/tag/textures"
class="discourse-tag" rel="tag">textures</a>,
<a href="https://discourse.threejs.org/tag/materials"
class="discourse-tag" rel="tag">materials</a>,
<a href="https://discourse.threejs.org/tag/shaders"
class="discourse-tag" rel="tag">shaders</a>,
<a href="https://discourse.threejs.org/tag/gltf-loader"
class="discourse-tag" rel="tag">gltf-loader</a>

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
<a href="https://discourse.threejs.org/u/Mixos" rel="nofollow"><span
itemprop="name">Mixos</span></a> </span>

<span class="crawler-post-infos"> June 30, 2026, 8:45pm </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

Hey all

I’ve been building Mixos (<a href="https://mixos.io"
rel="noopener nofollow ugc">https://mixos.io</a>) — a 3D texture painter
and\
PBR material editor that runs entirely in the browser, no install.
three.js\
drives the whole viewport and the painting pipeline sits on top of it.

Some three.js-specific things that were fun/hard to figure out:

- Painting directly onto meshes via UV-space raycasting, then writing
  back\
  into texture layers in real time
- A layer-based PBR compositor feeding custom materials (albedo,
  roughness,\
  metalness, normal, height) into the three.js render loop
- Round-tripping imported GLB/USD models and re-exporting textures for\
  Blender / Unreal / C4D
- Pushing the renderer with WebGPU for the heavier compositing work
  while\
  keeping the three.js scene graph as the source of truth

Think of it as a browser-native take on Substance Painter, built on top
of\
the library you all know well. Would love feedback from this community\
specifically, you know exactly where the hard edges are.

Happy to go deep on any of the three.js / material / raycasting
internals.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">2 Likes</span>

</div>

</div>

<div id="post_2" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Steveeeie" rel="nofollow"><span
itemprop="name">Steveeeie</span></a> </span>

<span class="crawler-post-infos"> July 4, 2026, 8:35pm </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

This is incredible, very well done.

Do you plan to make a desktop app?

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
<a href="https://discourse.threejs.org/u/Mixos" rel="nofollow"><span
itemprop="name">Mixos</span></a> </span>

<span class="crawler-post-infos"> July 4, 2026, 9:29pm </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

Thank you! I’m open to it for performance purposes. I feel like
everything’s moving towards web so I’m trying to optimize it and prepare
it for new advancements in technology. I will look into adapting it for
desktop.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

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
<tr id="topic-list-item-89714" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/lumina-workbench-visual-shader-node-editor-with-ai-generation/89714"
class="title raw-link raw-topic-link" itemprop="url">Lumina Workbench -
Visual Shader Node Editor with AI Generation</a> </span>
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
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/3d-applications/291"
class="discourse-tag">3d-applications</a> ,  <a
href="https://discourse.threejs.org/tag/nodes/1304"
class="discourse-tag">nodes</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">223</span></td>
<td>February 9, 2026</td>
<td></td>
</tr>
<tr id="topic-list-item-89926" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/voxigen-ai-powered-browser-voxel-editor-generate-edit-3d-models-from-text-images/89926"
class="title raw-link raw-topic-link" itemprop="url">VoxiGen: AI-Powered
Browser Voxel Editor – Generate &amp; Edit 3D Models from
Text/Images</a> </span>
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
class="discourse-tag">threejs</a> ,  <a
href="https://discourse.threejs.org/tag/browser/727"
class="discourse-tag">browser</a> ,  <a
href="https://discourse.threejs.org/tag/generative/754"
class="discourse-tag">generative</a> ,  <a
href="https://discourse.threejs.org/tag/ai/1131"
class="discourse-tag">ai</a> ,  <a
href="https://discourse.threejs.org/tag/voxel/1295"
class="discourse-tag">voxel</a> ,  <a
href="https://discourse.threejs.org/tag/creative-coding/1802"
class="discourse-tag">creative-coding</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">0</span></td>
<td class="views"><span class="views" title="views">539</span></td>
<td>February 19, 2026</td>
<td></td>
</tr>
<tr id="topic-list-item-13891" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/paint-color-and-images-on-3d-model/13891"
class="title raw-link raw-topic-link" itemprop="url">Paint color and
images on 3d model</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">22</span></td>
<td class="views"><span class="views" title="views">10723</span></td>
<td>September 9, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-71155" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/willing-to-achieve-realistic-images-in-threejs-or-somehow-in-brower/71155"
class="title raw-link raw-topic-link" itemprop="url">Willing to achieve
realistic images in threejs or somehow in brower</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a> ,  <a
href="https://discourse.threejs.org/tag/render/797"
class="discourse-tag">render</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">346</span></td>
<td>September 30, 2024</td>
<td></td>
</tr>
<tr id="topic-list-item-64796" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/paid-company-looking-to-hire-freelancer-for-3d-model-preview-tool/64796"
class="title raw-link raw-topic-link" itemprop="url">[PAID] Company
looking to hire freelancer for 3D model preview tool</a> </span>
<div class="link-bottom-line">
<a href="/c/jobs/9" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #25AAE2"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Jobs</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">4</span></td>
<td class="views"><span class="views" title="views">386</span></td>
<td>May 1, 2024</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
