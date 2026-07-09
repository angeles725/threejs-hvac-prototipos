<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [X-ray Effect for transparent Meshes](/t/x-ray-effect-for-transparent-meshes/24417)

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

<a href="https://discourse.threejs.org/tag/materials"
class="discourse-tag" rel="tag">materials</a>,
<a href="https://discourse.threejs.org/tag/wireframe"
class="discourse-tag" rel="tag">wireframe</a>,
<a href="https://discourse.threejs.org/tag/mesh" class="discourse-tag"
rel="tag">mesh</a>,
<a href="https://discourse.threejs.org/tag/transparency"
class="discourse-tag" rel="tag">transparency</a>,
<a href="https://discourse.threejs.org/tag/outlineeffect"
class="discourse-tag" rel="tag">outlineeffect</a>

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
<a href="https://discourse.threejs.org/u/Garry_Anand"
rel="nofollow"><span itemprop="name">Garry_Anand</span></a> </span>

<span class="crawler-post-infos"> March 15, 2021, 4:54pm </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

<img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/8/c8a47ad34ea0cb16df998c0d018634c5b6f8861a.png"
data-base62-sha1="sCXTcJ6tyScDXF136zF2W2XXCyK" width="518" height="403"
alt="image|30003" />\
How can I achieve an X-ray like effect as above when a mesh is
transparent?\
I have tried using
`THREE.MeshStandardMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.5 , });`
but this only gives half of the outline for rounded surfaces and the
finish is not smooth. Example of what I am getting:\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/e/3e93774fb84c118cfb2a1bb2347e897977b33cd5.png"
class="lightbox"
data-download-href="/uploads/short-url/8VzxXwT3HILuxLEWJTinX0pZ8IB.png?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/e/3e93774fb84c118cfb2a1bb2347e897977b33cd5.png"
data-base62-sha1="8VzxXwT3HILuxLEWJTinX0pZ8IB"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/e/3e93774fb84c118cfb2a1bb2347e897977b33cd5_2_10x10.png"
width="657" height="499" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">800×608
25.2 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

</div>

<div id="post_2" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/gonnavis" rel="nofollow"><span
itemprop="name">gonnavis</span></a> </span>

<span class="crawler-post-infos"> April 1, 2021, 5:48am </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

One option is using the newly added
<a href="https://threejs.org/examples/?q=ssr#webgl_postprocessing_ssrr"
rel="noopener nofollow ugc">SSRrPass</a> with proper specular lighing.

But the bright part at the edge of objects is caused by **Fresnel**
reflection effect, this exists in
<a href="https://threejs.org/examples/?q=ssr#webgl_postprocessing_ssr"
rel="noopener nofollow ugc">SSRPass</a>.

I plan to combine these two Passes into one something like
SSRaytracePass, but now if you want to use this solution, may need
combine them by self.

Now SSRrPass lack the feature of stacked transparent objects, and
postprocessing may be overwhelmed for regular requirements. So just
metion the possible direction here.

Should have simpler non-postprocessing solution, just use normal info
per transparent object with Fresnel effect. Like <a
href="https://threejs.org/examples/?q=materials#webgl_materials_shaders_fresnel"
rel="noopener nofollow ugc">this</a>.

And, is this meet your needs? May just use Three’s exsiting material
with `flatShading=false` and proper `depthWrite` `depthTest` is
sufficient.

<div class="title">

<div class="quote-controls">

</div>

<img
src="https://yyz1.discourse-cdn.com/flex035/user_avatar/discourse.threejs.org/taseenb/48/480_2.png"
class="avatar" loading="lazy" width="24" height="24" /> [Cross fade with
a third scene (or how to cross fade transparent objects in a complex
scene)](https://discourse.threejs.org/t/cross-fade-with-a-third-scene-or-how-to-cross-fade-transparent-objects-in-a-complex-scene/24849)
<a href="/c/questions/6" class="badge-category__wrapper"><span
class="badge-category" data-category-id="6" data-drop-close="true"
title="Use this category for any questions related to three.js. Before posting here, please use the search function to check if your question has already been answered."><span
class="badge-category__name">Questions</span></span></a>

</div>

> I’m looking for some help with a puzzle: The goal is to “simply” cross
> fade two groups of meshes (red appears, blue disappears and vice
> versa). <a
> href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/a/2/a2fb2fc49ad6654f0b419fba538fdffdc99fa926.png"
> class="lightbox"
> data-download-href="/uploads/short-url/nfNvVGLKrWNsIYr7uHW5CtlAXf8.png?dl=1"
> rel="noopener nofollow ugc"
> title="Screenshot 2021-03-28 at 05.21.28">[Screenshot 2021-03-28 at
> 05.21.28]</a> The <a
> href="https://threejs.org/examples/?q=cross#webgl_postprocessing_crossfade"
> rel="noopener nofollow ugc">Cross fade example</a> would be perfect
> BUT it does not work in this case because there are other elements in
> the scene that should not be affected by the cross fade (and may
> intersect with those that are affected). <a
> href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/1/112195fde42e74680a73ba6f024131ae28fb703d.png"
> class="lightbox"
> data-download-href="/uploads/short-url/2ry4CfN6NsFKUtTBnhkGIratff7.png?dl=1"
> rel="noopener nofollow ugc"
> title="Screenshot 2021-03-28 at 05.21.07">[Screenshot 2021-03-28 at
> 05.21.07]</a> Alpha texture and opacity would also be great BUT we ca…

<img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/8/d89a928de3e97dbaddec915a664d62f9e20ad38e.png"
data-base62-sha1="uUaiP7Pmy5WCfibDja4410EhOTY" width="451" height="500"
alt="image" />

May <a href="https://github.com/mrdoob/three.js/pull/20673"
rel="noopener nofollow ugc">this pr</a> is useful to integrate to your
code with existing material too.

</div>

</div>

<div id="post_3" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/gonnavis" rel="nofollow"><span
itemprop="name">gonnavis</span></a> </span>

<span class="crawler-post-infos"> April 20, 2021, 7:51am </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

<a href="https://threejs.org/examples/?q=node#webgl_loader_nodes"
class="onebox" target="_blank"
rel="noopener nofollow ugc">https://threejs.org/examples/?q=node#webgl_loader_nodes</a>\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/l3HN73YHhOZlLeqAsXxUqYYlqCn.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb_2_690x372.jpeg"
data-base62-sha1="l3HN73YHhOZlLeqAsXxUqYYlqCn"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb_2_690x372.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb.jpeg 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9398e876845c4d261f1e18c5ffe488b378091fcb_2_10x10.png"
width="690" height="372" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">953×514
39.1 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

</div>

<div id="post_4" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Garry_Anand"
rel="nofollow"><span itemprop="name">Garry_Anand</span></a> </span>

<span class="crawler-post-infos"> May 9, 2021, 4:10pm </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

Thank you so much! I will check these out
<img src="https://emoji.discourse-cdn.com/twitter/slight_smile.png?v=9"
title=":slight_smile:" class="emoji" alt=":slight_smile:" />

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
<tr id="topic-list-item-65465" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/xray-function-implementation/65465"
class="title raw-link raw-topic-link" itemprop="url">Xray function
implementation</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/xray/1600"
class="discourse-tag">xray</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">3</span></td>
<td class="views"><span class="views" title="views">343</span></td>
<td>May 14, 2024</td>
<td></td>
</tr>
<tr id="topic-list-item-76390" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/transmission-with-transparent-object/76390"
class="title raw-link raw-topic-link" itemprop="url">Transmission with
transparent object</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/textures/34"
class="discourse-tag">textures</a> ,  <a
href="https://discourse.threejs.org/tag/materials/35"
class="discourse-tag">materials</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">4</span></td>
<td class="views"><span class="views" title="views">256</span></td>
<td>January 17, 2025</td>
<td></td>
</tr>
<tr id="topic-list-item-24849" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/cross-fade-with-a-third-scene-or-how-to-cross-fade-transparent-objects-in-a-complex-scene/24849"
class="title raw-link raw-topic-link" itemprop="url">Cross fade with a
third scene (or how to cross fade transparent objects in a complex
scene)</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/post-processing/39"
class="discourse-tag">post-processing</a> ,  <a
href="https://discourse.threejs.org/tag/webgl-renderer/113"
class="discourse-tag">webgl-renderer</a> ,  <a
href="https://discourse.threejs.org/tag/transparency/141"
class="discourse-tag">transparency</a> ,  <a
href="https://discourse.threejs.org/tag/crossfade/528"
class="discourse-tag">crossfade</a> ,  <a
href="https://discourse.threejs.org/tag/rendertarget/923"
class="discourse-tag">rendertarget</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">1</span></td>
<td class="views"><span class="views" title="views">1815</span></td>
<td>March 29, 2021</td>
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
<tr id="topic-list-item-8134" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/outlinepass-with-transparent-sprites/8134"
class="title raw-link raw-topic-link" itemprop="url">OutlinePass with
transparent sprites</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/post-processing/39"
class="discourse-tag">post-processing</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">2284</span></td>
<td>June 17, 2019</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
