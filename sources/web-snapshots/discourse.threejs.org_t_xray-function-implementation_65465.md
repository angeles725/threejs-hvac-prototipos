<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Xray function implementation](/t/xray-function-implementation/65465)

<div class="topic-category" itemscope=""
itemtype="http://schema.org/BreadcrumbList">

<span itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem">
<a href="/c/questions/6" class="badge-wrapper bullet"
itemprop="item"><span class="badge-category-bg"
style="background-color: #B3B5B4"></span> <span
class="badge-category clear-badge"> <span class="category-name"
itemprop="name">Questions</span> </span></a> </span>

</div>

<div class="topic-category">

<div class="discourse-tags list-tags">

<a href="https://discourse.threejs.org/tag/xray" class="discourse-tag"
rel="tag">xray</a>

</div>

</div>

</div>

<div itemscope="itemscope" itemtype="https://schema.org/QAPage">

<div itemprop="mainEntity" itemscope="itemscope"
itemtype="https://schema.org/Question">

<div id="post_1" class="topic-body crawler-post" qa-question="true">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/JKLEE" rel="nofollow"><span
itemprop="name">JKLEE</span></a> </span>

<span class="crawler-post-infos"> May 13, 2024, 9:11am </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

"I want to implement an X-ray feature. Currently, I change the color of
the selected mesh to red and apply an outline. Other meshes are set to
transparent with applied opacity.

When I do this, as shown in the attached image, there are obscured
parts. Can you provide example code or reference material for
implementing an X-ray feature like this?"

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/d/4ddcffba71e42be289026b34d1df15e51da9ac14.png"
class="lightbox"
data-download-href="/uploads/short-url/b6OfHyC0zuUWQIdfThh7kx34ge0.png?dl=1"
rel="noopener nofollow ugc" title="1"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/d/4ddcffba71e42be289026b34d1df15e51da9ac14_2_232x499.png"
data-base62-sha1="b6OfHyC0zuUWQIdfThh7kx34ge0"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/d/4ddcffba71e42be289026b34d1df15e51da9ac14_2_232x499.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/d/4ddcffba71e42be289026b34d1df15e51da9ac14.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/d/4ddcffba71e42be289026b34d1df15e51da9ac14.png 2x"
data-dominant-color="84E189" width="232" height="499" alt="1" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">1</span><span class="informations">328×706
110 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/2/2/223c3c508d33909154219d945408f06aa6bad53c.png"
class="lightbox"
data-download-href="/uploads/short-url/4SRhRLOC434K9EWqObudb7VpnYM.png?dl=1"
rel="noopener nofollow ugc" title="2"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/2/223c3c508d33909154219d945408f06aa6bad53c_2_190x499.png"
data-base62-sha1="4SRhRLOC434K9EWqObudb7VpnYM"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/2/223c3c508d33909154219d945408f06aa6bad53c_2_190x499.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/2/2/223c3c508d33909154219d945408f06aa6bad53c.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/2/2/223c3c508d33909154219d945408f06aa6bad53c.png 2x"
data-dominant-color="89DE86" width="190" height="499" alt="2" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">2</span><span class="informations">272×714
91.3 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/2/6291511810e35285052004c8eb588c20e3c181cf.png"
class="lightbox"
data-download-href="/uploads/short-url/e3Y8aQNT7sajXOYmqMYkcoioReT.png?dl=1"
rel="noopener nofollow ugc" title="3"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/2/6291511810e35285052004c8eb588c20e3c181cf.png"
data-base62-sha1="e3Y8aQNT7sajXOYmqMYkcoioReT"
data-dominant-color="15E413" width="205" height="500" alt="3" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">3</span><span class="informations">289×702
6.09 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/1/d124e8fa15bfcfa55ad51a0a80c555e326ead0b7.png"
class="lightbox"
data-download-href="/uploads/short-url/tQaRZgbQXDzhTt8H4x9TbMfqtsr.png?dl=1"
rel="noopener nofollow ugc" title="4"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/1/d124e8fa15bfcfa55ad51a0a80c555e326ead0b7_2_152x499.png"
data-base62-sha1="tQaRZgbQXDzhTt8H4x9TbMfqtsr"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/1/d124e8fa15bfcfa55ad51a0a80c555e326ead0b7_2_152x499.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/1/d124e8fa15bfcfa55ad51a0a80c555e326ead0b7.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/1/d124e8fa15bfcfa55ad51a0a80c555e326ead0b7.png 2x"
data-dominant-color="85DF81" width="152" height="499" alt="4" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">4</span><span class="informations">216×710
76.2 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

</div>

<div id="post_2" class="topic-body crawler-post"
itemprop="acceptedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/PavelBoytchev"
rel="nofollow"><span itemprop="name">PavelBoytchev</span></a> </span>

<span class="crawler-post-infos"> May 13, 2024, 10:07am </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

I have no idea how you set the transparency.

You might also want to use `depthTest`, `depthWrite` and `renderOrder`.
Here is a demo of a more stable x-ray-ish effect (i.e. elements do not
pop-up or sink-down):

<div class="video-placeholder-container"
video-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/c/6c3be2ab40387661267cf0d213540f4f8fd112a3.mp4"
thumbnail-src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/6/c6f11403f05a7170fbbccf1b66d3de13f3ac6f0d.png">

</div>

</div>

</div>

<div id="post_3" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/id_4086" rel="nofollow"><span
itemprop="name">id_4086</span></a> </span>

<span class="crawler-post-infos"> May 13, 2024, 10:19am </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

can we use
<a href="https://threejs.org/docs/#api/en/materials/Material.opacity"
rel="noopener nofollow ugc">Material#opacity – three.js docs
(threejs.org)</a> for this so that it can be little bit transparent

</div>

</div>

<div id="post_4" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/JKLEE" rel="nofollow"><span
itemprop="name">JKLEE</span></a> </span>

<span class="crawler-post-infos"> May 14, 2024, 12:32am </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

thank!! solved

</div>

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
<tr id="topic-list-item-24417" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/x-ray-effect-for-transparent-meshes/24417"
class="title raw-link raw-topic-link" itemprop="url">X-ray Effect for
transparent Meshes</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a> ,  <a
href="https://discourse.threejs.org/tag/wireframe/61"
class="discourse-tag">wireframe</a> ,  <a
href="https://discourse.threejs.org/tag/mesh/87"
class="discourse-tag">mesh</a> ,  <a
href="https://discourse.threejs.org/tag/transparency/141"
class="discourse-tag">transparency</a> ,  <a
href="https://discourse.threejs.org/tag/outlineeffect/899"
class="discourse-tag">outlineeffect</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">3</span></td>
<td class="views"><span class="views" title="views">2369</span></td>
<td>May 9, 2021</td>
<td></td>
</tr>
<tr id="topic-list-item-47533" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/visual-big-where-material-with-opacity-applied-lets-you-see-through-meshes-positioned-behind/47533"
class="title raw-link raw-topic-link" itemprop="url">Visual big where
material with opacity applied lets you see through meshes positioned
behind</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
&#10;</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">232</span></td>
<td>February 1, 2023</td>
<td></td>
</tr>
<tr id="topic-list-item-54501" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/setting-transparent-meshes-in-webxr-causes-weird-flickering-glitch/54501"
class="title raw-link raw-topic-link" itemprop="url">Setting transparent
meshes in WebXR causes weird flickering glitch</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a> ,  <a
href="https://discourse.threejs.org/tag/webxr/484"
class="discourse-tag">webxr</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">3</span></td>
<td class="views"><span class="views" title="views">587</span></td>
<td>September 13, 2024</td>
<td></td>
</tr>
<tr id="topic-list-item-24163" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/x-ray-effect-over-a-texture/24163"
class="title raw-link raw-topic-link" itemprop="url">X-Ray effect over a
texture</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/shaders/96"
class="discourse-tag">shaders</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">3</span></td>
<td class="views"><span class="views" title="views">2262</span></td>
<td>July 30, 2021</td>
<td></td>
</tr>
<tr id="topic-list-item-22716" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/transparent-faces-in-three-js/22716"
class="title raw-link raw-topic-link" itemprop="url">Transparent faces
in Three.js</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a> ,  <a
href="https://discourse.threejs.org/tag/transparency/141"
class="discourse-tag">transparency</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">6</span></td>
<td class="views"><span class="views" title="views">1780</span></td>
<td>July 26, 2022</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
