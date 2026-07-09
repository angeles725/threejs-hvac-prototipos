<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Volumetric lighting in WebGPU](/t/volumetric-lighting-in-webgpu/87959)

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

<a href="https://discourse.threejs.org/tag/lighting"
class="discourse-tag" rel="tag">lighting</a>,
<a href="https://discourse.threejs.org/tag/shaders"
class="discourse-tag" rel="tag">shaders</a>,
<a href="https://discourse.threejs.org/tag/fog" class="discourse-tag"
rel="tag">fog</a>,
<a href="https://discourse.threejs.org/tag/webgpu" class="discourse-tag"
rel="tag">webgpu</a>,
<a href="https://discourse.threejs.org/tag/volumetric"
class="discourse-tag" rel="tag">volumetric</a>

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
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 6, 2025, 3:34pm </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

A while ago I [played
around](https://discourse.threejs.org/t/shade-webgpu-graphics/66969/22)
with atmospheric scattering in [my webgpu
renderer](https://discourse.threejs.org/t/shade-webgpu-graphics).\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/2/427caa1114f3b72d2a8492afe072e53967489849.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/9uaBw7sFLLefdaZZZYSzfzTerFf.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-01-28 235937"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/2/427caa1114f3b72d2a8492afe072e53967489849_2_500x500.jpeg"
data-base62-sha1="9uaBw7sFLLefdaZZZYSzfzTerFf"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/2/427caa1114f3b72d2a8492afe072e53967489849_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/2/427caa1114f3b72d2a8492afe072e53967489849_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/2/427caa1114f3b72d2a8492afe072e53967489849_2_1000x1000.jpeg 2x"
data-dominant-color="626D6E" width="500" height="500"
alt="Screenshot 2025-01-28 235937" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-01-28 235937</span><span class="informations">1078×1077 599
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The results were generally positive, but I didn’t like the traditional
approach of marching rays through the atmosphere for every pixel. It
works, but it’s a lot of calculations.

At the time, I read a paper by Sebastian Hillaire of Epic Games, called
<a href="https://www.youtube.com/watch?v=SW30QX1wxTY"
rel="noopener nofollow ugc">"A Scalable and Production Ready Sky and
Atmosphere Rendering Technique”</a>.

There was a small burb in there about creating a LUT for volumetrics. In
the grand scheme of things, for the sky - it’s not the most important
part.

A few weeks ago, I came back to it, and my goal was to add both the
atmosphere, as well as volumetric lighting to the engine.

What I mean by that are things like light shafts\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/4/14696c62cd1f621e3e4f8135207078fcf6d4eb67.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/2UzpUEDB4qR3oRYycdRiF9whiDl.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14696c62cd1f621e3e4f8135207078fcf6d4eb67_2_690x345.jpeg"
data-base62-sha1="2UzpUEDB4qR3oRYycdRiF9whiDl"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14696c62cd1f621e3e4f8135207078fcf6d4eb67_2_690x345.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14696c62cd1f621e3e4f8135207078fcf6d4eb67_2_1035x517.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/4/14696c62cd1f621e3e4f8135207078fcf6d4eb67.jpeg 2x"
data-dominant-color="44423A" width="690" height="345" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1280×640
204 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Volumetric fog\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/c/bce8126756462d1308d5f706b46b9ef407e54755.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/qX8YwpCSKdkY52UfTSmoFOEqBW5.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/c/bce8126756462d1308d5f706b46b9ef407e54755_2_690x386.jpeg"
data-base62-sha1="qX8YwpCSKdkY52UfTSmoFOEqBW5"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/c/bce8126756462d1308d5f706b46b9ef407e54755_2_690x386.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/c/bce8126756462d1308d5f706b46b9ef407e54755_2_1035x579.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/c/bce8126756462d1308d5f706b46b9ef407e54755_2_1380x772.jpeg 2x"
data-dominant-color="A39A8F" width="690" height="386" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1495×837
307 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

And local light scattering events\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/9/0921b13211f869c87ac54b9d3882b5c71e928d2e.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/1iMtUfGwVnIVfBN8Nv5NsmmH59A.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/9/0921b13211f869c87ac54b9d3882b5c71e928d2e_2_690x385.jpeg"
data-base62-sha1="1iMtUfGwVnIVfBN8Nv5NsmmH59A"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/9/0921b13211f869c87ac54b9d3882b5c71e928d2e_2_690x385.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/9/0921b13211f869c87ac54b9d3882b5c71e928d2e.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/9/0921b13211f869c87ac54b9d3882b5c71e928d2e.jpeg 2x"
data-dominant-color="313A4F" width="690" height="385" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1005×561
150 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/2/32d5cbc3b98a13c292495ab5b99fd56f8884fdbb.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/7fHVC0SXSpN3g7iJliWJ8LUqAR5.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/2/32d5cbc3b98a13c292495ab5b99fd56f8884fdbb.jpeg"
data-base62-sha1="7fHVC0SXSpN3g7iJliWJ8LUqAR5" width="690" height="388"
alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">690×388
23.1 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Somewhat unsurprisingly, this was achieved years ago, the first
reference I could find dates back to 2014, SIGGRAPH paper titled
“Volumetric Fog: Unified compute shader based solution to atmospheric
scattering” by Bartlomiej Wronski, Ubisoft.

The paper/presentation had basically the same goals\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/8/38dc98de71f02ca59820fd7da473e77bffa63b4e.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/871mFa4BlHTJ4X0qc3pohpg6Efs.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/8/38dc98de71f02ca59820fd7da473e77bffa63b4e_2_690x389.jpeg"
data-base62-sha1="871mFa4BlHTJ4X0qc3pohpg6Efs"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/8/38dc98de71f02ca59820fd7da473e77bffa63b4e_2_690x389.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/8/38dc98de71f02ca59820fd7da473e77bffa63b4e_2_1035x583.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/8/38dc98de71f02ca59820fd7da473e77bffa63b4e_2_1380x778.jpeg 2x"
data-dominant-color="A3A099" width="690" height="389" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1438×811
337 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The funny thing to me, is that I found this paper in a reverse order. I
read everything from 2020s, then papers from 2017-19, then 2016 and only
later did I get to this one.

I highly recommend the paper, it’s quite easy to read and has pretty
much everything you need, the tech has changed surprisingly little since
then.

The first thing I was going for were light shafts (aka “God Rays”), and
with a bit of effort, here’s what I got:\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/8/4/843f1c940cba9167494a24a90e6bc339b5a12464.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/iRUf0PvXAk01M3TXpC6U5Roeia0.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-03 225028"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/4/843f1c940cba9167494a24a90e6bc339b5a12464_2_501x500.jpeg"
data-base62-sha1="iRUf0PvXAk01M3TXpC6U5Roeia0"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/4/843f1c940cba9167494a24a90e6bc339b5a12464_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/4/843f1c940cba9167494a24a90e6bc339b5a12464_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/4/843f1c940cba9167494a24a90e6bc339b5a12464_2_1002x1000.jpeg 2x"
data-dominant-color="666F7B" width="501" height="500"
alt="Screenshot 2025-11-03 225028" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-03 225028</span><span class="informations">1078×1075 175
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/1/31d74ab5e22ac917baf326a9a61fe366d6c0076e.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/76UEIiX4YXyQS3UfZPNJczaj8K2.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-03 224525"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/1/31d74ab5e22ac917baf326a9a61fe366d6c0076e_2_500x500.jpeg"
data-base62-sha1="76UEIiX4YXyQS3UfZPNJczaj8K2"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/1/31d74ab5e22ac917baf326a9a61fe366d6c0076e_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/1/31d74ab5e22ac917baf326a9a61fe366d6c0076e_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/1/31d74ab5e22ac917baf326a9a61fe366d6c0076e_2_1000x1000.jpeg 2x"
data-dominant-color="949193" width="500" height="500"
alt="Screenshot 2025-11-03 224525" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-03 224525</span><span class="informations">1077×1077 152
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/3/9378da766de7dda5ffeeb4cd2f11e482b43fbed6.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/l2B79eH3VDoyFK9TrccMhj6s31I.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-02 225932"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9378da766de7dda5ffeeb4cd2f11e482b43fbed6_2_498x500.jpeg"
data-base62-sha1="l2B79eH3VDoyFK9TrccMhj6s31I"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9378da766de7dda5ffeeb4cd2f11e482b43fbed6_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9378da766de7dda5ffeeb4cd2f11e482b43fbed6_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/3/9378da766de7dda5ffeeb4cd2f11e482b43fbed6_2_996x1000.jpeg 2x"
data-dominant-color="65585E" width="498" height="500"
alt="Screenshot 2025-11-02 225932" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-02 225932</span><span class="informations">1075×1078 397
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/e/f/ef651480a978e2ea06c0eb52891cccdb34ab6a8d.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/y9MG4g7myWW7I4tnl2oRuSWV4e1.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-03 213836"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/f/ef651480a978e2ea06c0eb52891cccdb34ab6a8d_2_502x500.jpeg"
data-base62-sha1="y9MG4g7myWW7I4tnl2oRuSWV4e1"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/f/ef651480a978e2ea06c0eb52891cccdb34ab6a8d_2_502x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/f/ef651480a978e2ea06c0eb52891cccdb34ab6a8d_2_753x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/f/ef651480a978e2ea06c0eb52891cccdb34ab6a8d_2_1004x1000.jpeg 2x"
data-dominant-color="6C6468" width="502" height="500"
alt="Screenshot 2025-11-03 213836" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-03 213836</span><span class="informations">1078×1073 322
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The basic idea is quite simple, you pre-integrate scattering and
transmission to a froxel texture (3d texture aligned on NDC view
frustum, **FR**ustum V**OXEL**)

The tricky part for me was the physics, but after a bit of reading it
turns out to be way simpler than it seems at a first glance, it’s all
about scattering and transmission\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/5/353efb317d5072ebcb8a8577fc9406b9dd98e55e.png"
class="lightbox"
data-download-href="/uploads/short-url/7B2f2uu1JQbLyZFvh71tFM8KSQu.png?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/353efb317d5072ebcb8a8577fc9406b9dd98e55e_2_690x391.png"
data-base62-sha1="7B2f2uu1JQbLyZFvh71tFM8KSQu"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/353efb317d5072ebcb8a8577fc9406b9dd98e55e_2_690x391.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/353efb317d5072ebcb8a8577fc9406b9dd98e55e_2_1035x586.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/353efb317d5072ebcb8a8577fc9406b9dd98e55e_2_1380x782.png 2x"
data-dominant-color="C1B6A8" width="690" height="391" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1435×814
213 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

For now I put a pause on it, as I hit a point where denoising is
necessary and other unpleasant parts of turning theory into
production-ready technique. But I’m super excited about it in general.
The whole thing takes sub-1ms time to compute even on 10 year old
hardware, and during shading it’s basically free (1 texture lookup).

Other interesting paper I would recommend is:

- “Physically Based and Unified Volumetric Rendering” by Sebastien
  Hillaire, from SIGGRAPH 2015, back when he was at EA

This is a recurring theme for me, both in graphics research and other
technical areas:

Something doesn’t work, I don’t understand why, so I read a dozen papers
and write a few prototypes and suddenly it all makes sense.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">17 Likes</span>

</div>

<div class="crawler-linkback-list">

<div>

[Reverse Z infinite
projection](https://discourse.threejs.org/t/reverse-z-infinite-projection/88394)

</div>

</div>

</div>

<div id="post_2" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Oserebameh"
rel="nofollow"><span itemprop="name">Oserebameh</span></a> </span>

<span class="crawler-post-infos"> November 6, 2025, 6:55pm </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

Thanks for sharing!

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_3" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 9, 2025, 4:03pm </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

Made <a
href="https://company-named.com/dev/prototypes/2025/11-09-shade-volumetrics-sponza/"
rel="noopener nofollow ugc">a Demo</a>

<a
href="https://company-named.com/dev/prototypes/2025/11-09-shade-volumetrics-sponza/"
rel="noopener nofollow ugc"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/8/7/87db7add1654b1ef21f685cfc07ee4a44a4087f6.jpeg"
data-base62-sha1="jnQGUrXVNBhnK6fHjUql5KJz9tk" width="500" height="500"
alt="Screenshot 2025-11-09 154956" /><br />
<img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/0/c09773957d0b856f73d5d6f27d20bdb2f4aa53bf.jpeg"
data-base62-sha1="rtK9M4GJI0odwVxJ1iOgRa8zecT" width="501" height="500"
alt="image" /></a>

It’s quite dark, because atmosphere density is cranked way up to
exaggerate scattering effects. It’s still physically based, just a
different type of atmosphere, think something like Venus, or Jupiter
perhaps. So transmittance is quite low, similar to something like a very
foggy day, a snow storm or a dust storm here on earth.

I integrated better noise into the sampling part, so there are fewer
aliasing artifacts. The integration part is still a bit noisy though,
haven’t touched that.

What we have here:

- directional light integration
- Mie scattering + absorption
- Rayleigh scattering ( pretty much no absorption according to physical
  model )
- Ozone absorption ( no scattering )
- Multiple scattering integration for the sun (see Hillaire 2020)
- Visibility taken into account (shadowmaps)

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">3 Likes</span>

</div>

</div>

<div id="post_4" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 9, 2025, 5:07pm </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

As a separate point. I notices that three.js
<a href="https://github.com/mrdoob/three.js/pull/30530"
rel="noopener nofollow ugc">recently merged</a> volumetric lighting with
<a href="https://threejs.org/examples/webgpu_volume_lighting.html"
rel="noopener nofollow ugc">an example</a>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/8/7/8759d4dd6b2aecd381d16068adaba336ed25839c.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/jjmV8HI62NLm9KOXKu8rLvds6Kg.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/7/8759d4dd6b2aecd381d16068adaba336ed25839c_2_615x500.jpeg"
data-base62-sha1="jjmV8HI62NLm9KOXKu8rLvds6Kg"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/7/8759d4dd6b2aecd381d16068adaba336ed25839c_2_615x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/7/8759d4dd6b2aecd381d16068adaba336ed25839c_2_922x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/7/8759d4dd6b2aecd381d16068adaba336ed25839c_2_1230x1000.jpeg 2x"
data-dominant-color="3C3C23" width="615" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1339×1087
97.3 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The effect is done using post-process as far as I can understand, you
can see that by aliasing of the effect along the edges\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/4/44cc4b446cff0c27da40904812f8c9ce42a127c3.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/9OCahHhASjBqMUeOD3j2oIEbeEP.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/4/44cc4b446cff0c27da40904812f8c9ce42a127c3_2_611x500.jpeg"
data-base62-sha1="9OCahHhASjBqMUeOD3j2oIEbeEP"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/4/44cc4b446cff0c27da40904812f8c9ce42a127c3_2_611x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/4/44cc4b446cff0c27da40904812f8c9ce42a127c3_2_916x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/4/44cc4b446cff0c27da40904812f8c9ce42a127c3_2_1222x1000.jpeg 2x"
data-dominant-color="4A441D" width="611" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1290×1054
254 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/6/d6b49c5f747168c4dec636be3007b7e34263e4a5.png"
class="lightbox"
data-download-href="/uploads/short-url/uDn8peNP4hNWJ00He8s3GWWywo5.png?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/6/d6b49c5f747168c4dec636be3007b7e34263e4a5.png"
data-base62-sha1="uDn8peNP4hNWJ00He8s3GWWywo5" width="138" height="207"
alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">138×207
24.1 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The problem with this approach is 3 fold:

1.  Raymarching is expensive, and you’re doing it per pixel of your
    post-process pass. In this case it’s 1/4 of the original resolution,
    so for 1024x1024 resolution your pass resolution would be 256x256
    and you have to march every one of those for a total of 12 steps
    each\
    <div class="lightbox-wrapper">

    <a
    href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/f/d/fd58e68819c5fcad5d3f9d33abf5f8814807c0d7.png"
    class="lightbox"
    data-download-href="/uploads/short-url/A9dgE6kHVzD1uLqwxB0UQ8kUBfx.png?dl=1"
    rel="noopener nofollow ugc" title="image"><img
    src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/f/d/fd58e68819c5fcad5d3f9d33abf5f8814807c0d7.png"
    data-base62-sha1="A9dgE6kHVzD1uLqwxB0UQ8kUBfx"
    data-dominant-color="22262E" width="656" height="500" alt="image" /></a>
    <div class="meta">

    <img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
    class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">730×556
    25.2 KB</span><img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
    class="fa d-icon d-icon-discourse-expand svg-icon" />

    </div>

    </div>

    \
    That’s 786,432 evaluations in total. The fact that you are taking 12
    steps also means that your Z resolution is going to be incredibly
    low.
2.  Aliasing. Resolution mismatch means you have to upscale the result
    somehow. The most basic ray would be to just stretch the image,
    basically what happens here. You end up with some jaggies and
    there’s noise in the image. So let’s slap some blur on it\
    <div class="lightbox-wrapper">

    <a
    href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/d/7d517cd700ca66786fb69af35128a1a7c43d8fe3.png"
    class="lightbox"
    data-download-href="/uploads/short-url/hSCgL2PJDjSN0IvBsCgES1bmpl9.png?dl=1"
    rel="noopener nofollow ugc" title="image"><img
    src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/d/7d517cd700ca66786fb69af35128a1a7c43d8fe3.png"
    data-base62-sha1="hSCgL2PJDjSN0IvBsCgES1bmpl9" width="340" height="265"
    alt="image" /></a>
    <div class="meta">

    <img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
    class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">340×265
    18.6 KB</span><img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
    class="fa d-icon d-icon-discourse-expand svg-icon" />

    </div>

    </div>

    \
    Looks pretty, even if it destroys the edges.
3.  Bandwidth. You have to do a separate compositing pass, this is a
    standard cost of doing post-processing passes though and resolution
    is relatively low, but the cost is still there.

The reason AAA industry doesn’t use this approach is pretty much those
first two points. The modern approach is to build a 3d lookup table
separately, and then just sample it during draw.

The demo I posted used 128x128\*64 resolution, which amounts to slightly
more samples 1,048,576, about 30% more to be exact. But we’re getting
530% more resolution in Z axis.

Using a 3d texture you don’t have to worry about edges either, here’s an
example:

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/a/0a487057951f796b9cfcd2e4bce8562de88e10cc.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/1sXYoO7ajg1kr9MpbxYv7oqF80k.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 161510"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/a/0a487057951f796b9cfcd2e4bce8562de88e10cc_2_498x500.jpeg"
data-base62-sha1="1sXYoO7ajg1kr9MpbxYv7oqF80k"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/a/0a487057951f796b9cfcd2e4bce8562de88e10cc_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/a/0a487057951f796b9cfcd2e4bce8562de88e10cc_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/a/0a487057951f796b9cfcd2e4bce8562de88e10cc_2_996x1000.jpeg 2x"
data-dominant-color="858FA1" width="498" height="500"
alt="Screenshot 2025-11-09 161510" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 161510</span><span class="informations">1075×1079 165
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/d/bdf3d77b563f0fcbda4002cde84e38b0d4fd400d.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/r6oFz1LfVAxL6Q7hLbSmwKq8d0V.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/d/bdf3d77b563f0fcbda4002cde84e38b0d4fd400d_2_438x500.jpeg"
data-base62-sha1="r6oFz1LfVAxL6Q7hLbSmwKq8d0V"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/d/bdf3d77b563f0fcbda4002cde84e38b0d4fd400d_2_438x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/d/bdf3d77b563f0fcbda4002cde84e38b0d4fd400d.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/d/bdf3d77b563f0fcbda4002cde84e38b0d4fd400d.jpeg 2x"
data-dominant-color="8A8888" width="438" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">526×600
32.3 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/f/df6626dee6128ffa804f7dc7f466b431df5df884.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/vShkMz95rfwxkGLuL1wgPO0dh8U.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/f/df6626dee6128ffa804f7dc7f466b431df5df884.jpeg"
data-base62-sha1="vShkMz95rfwxkGLuL1wgPO0dh8U" width="433" height="483"
alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">433×483
18.2 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/5/d56d0da16e37a15c6ff60ff9155afb958c298510.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/us3luJmD6klW4O2y2nGIVASkYDK.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/5/d56d0da16e37a15c6ff60ff9155afb958c298510_2_489x500.jpeg"
data-base62-sha1="us3luJmD6klW4O2y2nGIVASkYDK"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/5/d56d0da16e37a15c6ff60ff9155afb958c298510_2_489x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/5/d56d0da16e37a15c6ff60ff9155afb958c298510.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/5/d56d0da16e37a15c6ff60ff9155afb958c298510.jpeg 2x"
data-dominant-color="858D9C" width="489" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">723×738
44.2 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

By contrast, even if you crank up resolution of post process to 1/2 of
the original (which is already 4x the pixels), and push the blur radius
to the max on the slider, you still have aliasing\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/f/0fe8b939ea47400fdeedfbb7fdbd7171d39ed9de.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/2gJLJED8cw2ivZkJbdcputjh43c.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/f/0fe8b939ea47400fdeedfbb7fdbd7171d39ed9de_2_672x500.jpeg"
data-base62-sha1="2gJLJED8cw2ivZkJbdcputjh43c"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/f/0fe8b939ea47400fdeedfbb7fdbd7171d39ed9de_2_672x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/f/0fe8b939ea47400fdeedfbb7fdbd7171d39ed9de.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/f/0fe8b939ea47400fdeedfbb7fdbd7171d39ed9de.jpeg 2x"
data-dominant-color="37361C" width="672" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">771×573
30.5 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\
When I say “aliasing”, I mean that the edges of the “fog” do not align
with the edges of the geometry, you can see that the silhouette has been
completely destroyed.

It might sound harsh, and it is, but I’m still blown away by the work
that <a href="/u/sunag" class="mention">@sunag</a> and
<a href="/u/mugen87" class="mention">@Mugen87</a> did here. Very
impressive, even despite the limitations. I especially like the density
injection part via a TSL function, very elegant.

I’m guessing that the volumetrics here are a bit of stretch, the system
was designed for post-processing volumes, like blurring parts of an
image, or applying toon shaders etc, so the architecture was not
designed specifically for volumetric lighting.

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">3 Likes</span>

</div>

</div>

<div id="post_5" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 10, 2025, 1:12pm </span>

<span itemprop="position">5</span>

</div>

<div class="post" itemprop="text">

Added support for local lights.

Also played around with different phase functions for Mie scattering.

If anyone is interested, there’s a paper by NVIDIA from 2023:

<div class="source">

<a
href="https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf"
target="_blank" rel="noopener nofollow ugc">research.nvidia.com</a>

</div>

<a
href="https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf"
target="_blank" rel="noopener nofollow ugc"><span
class="pdf-onebox-logo"></span></a>

### <a
href="https://research.nvidia.com/labs/rtr/approximate-mie/publications/approximate-mie.pdf"
target="_blank" rel="noopener nofollow ugc">approximate-mie.pdf</a>

<div class="onebox-metadata">

</div>

<div style="clear: both">

</div>

It offers a very different parametrization, instead of anisotropy
parameter `G` it offers a physical parameter of particle size, which, I
thought, was quite neat. It also appears to have a much better fit to
the ground truth Mie function shape. The authors boast 95% fit.

HG seem to the be standard (Henyey and Greenstein from 1941), as it’s
relatively simple and it’s all over the existing code bases.

I discovered Cornette-Shanks approximation (CS) a while ago, which
offers a better fit than HG in a way, as it provides a stronger
back-scattering component.

Here’s a plot from the NVIDIA paper to show what I mean\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/4/c40714ff803aff976bf5fb2c02fec0387b2cbde8.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/rY8KXllRYkx4ljJic1iq2aqdfG8.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/4/c40714ff803aff976bf5fb2c02fec0387b2cbde8_2_690x378.jpeg"
data-base62-sha1="rY8KXllRYkx4ljJic1iq2aqdfG8"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/4/c40714ff803aff976bf5fb2c02fec0387b2cbde8_2_690x378.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/4/c40714ff803aff976bf5fb2c02fec0387b2cbde8.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/4/c40714ff803aff976bf5fb2c02fec0387b2cbde8.jpeg 2x"
data-dominant-color="F1F1F1" width="690" height="378" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">915×502
133 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The **HG+D** is the function from that paper. The “Mie” is a plot from
the simulator (ground truth).

I found that if your media is largely homogenous and there is little
density variation, it’s hard to tell much of a difference between these
functions. But still - maybe someone will find this useful.

Here is what I got with local lights (all lights supported that is)\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/8/d86791bde10818875579031c67c7fb40a3c7a18f.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/uSp1QEuO27avtfT1Dkm0BtjeIXR.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 181136"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/8/d86791bde10818875579031c67c7fb40a3c7a18f_2_500x500.jpeg"
data-base62-sha1="uSp1QEuO27avtfT1Dkm0BtjeIXR"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/8/d86791bde10818875579031c67c7fb40a3c7a18f_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/8/d86791bde10818875579031c67c7fb40a3c7a18f_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/8/d86791bde10818875579031c67c7fb40a3c7a18f_2_1000x1000.jpeg 2x"
data-dominant-color="3F4244" width="500" height="500"
alt="Screenshot 2025-11-09 181136" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 181136</span><span class="informations">1076×1076 171
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\
and without the volumetrics\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/3/33a96c23d076e30eb41904d34cb661e9f6ba799b.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/7n1kSSq5L8to2jhD66jHaCEv9Qn.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 181315"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/33a96c23d076e30eb41904d34cb661e9f6ba799b_2_499x500.jpeg"
data-base62-sha1="7n1kSSq5L8to2jhD66jHaCEv9Qn"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/33a96c23d076e30eb41904d34cb661e9f6ba799b_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/33a96c23d076e30eb41904d34cb661e9f6ba799b_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/33a96c23d076e30eb41904d34cb661e9f6ba799b_2_998x1000.jpeg 2x"
data-dominant-color="424242" width="499" height="500"
alt="Screenshot 2025-11-09 181315" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 181315</span><span class="informations">1077×1079 192
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

------------------------------------------------------------------------

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/b/1bd46564edb0ec262f2fc29c6b4b719ece950fbf.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/3YbWMPjzpHCrJ5jrMWPZCBG9M19.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 181813"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/b/1bd46564edb0ec262f2fc29c6b4b719ece950fbf_2_500x500.jpeg"
data-base62-sha1="3YbWMPjzpHCrJ5jrMWPZCBG9M19"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/b/1bd46564edb0ec262f2fc29c6b4b719ece950fbf_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/b/1bd46564edb0ec262f2fc29c6b4b719ece950fbf_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/b/1bd46564edb0ec262f2fc29c6b4b719ece950fbf_2_1000x1000.jpeg 2x"
data-dominant-color="6B91BB" width="500" height="500"
alt="Screenshot 2025-11-09 181813" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 181813</span><span class="informations">1077×1077 114
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/5/358cdd02aea1157190f1128640ada3ee5e4c73ad.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/7DJ6sA5iJHrGAqVrqjEWKM9SuV7.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 181906"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/358cdd02aea1157190f1128640ada3ee5e4c73ad_2_499x500.jpeg"
data-base62-sha1="7DJ6sA5iJHrGAqVrqjEWKM9SuV7"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/358cdd02aea1157190f1128640ada3ee5e4c73ad_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/358cdd02aea1157190f1128640ada3ee5e4c73ad_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/5/358cdd02aea1157190f1128640ada3ee5e4c73ad_2_998x1000.jpeg 2x"
data-dominant-color="494C48" width="499" height="500"
alt="Screenshot 2025-11-09 181906" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 181906</span><span class="informations">1078×1080 292
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

------------------------------------------------------------------------

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/1/b1bb86d48b19085b1fafb3aa42514ca1c90bbc81.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/pmihKEpEx8NAp1sCPk4P4isQ50d.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 202723"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/1/b1bb86d48b19085b1fafb3aa42514ca1c90bbc81_2_499x500.jpeg"
data-base62-sha1="pmihKEpEx8NAp1sCPk4P4isQ50d"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/1/b1bb86d48b19085b1fafb3aa42514ca1c90bbc81_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/1/b1bb86d48b19085b1fafb3aa42514ca1c90bbc81_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/1/b1bb86d48b19085b1fafb3aa42514ca1c90bbc81_2_998x1000.jpeg 2x"
data-dominant-color="4A6484" width="499" height="500"
alt="Screenshot 2025-11-09 202723" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 202723</span><span class="informations">1076×1077 117
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/4/d48fd2f0a6fab01d82648d96286630b417453756.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/ukpmDPCxxblkFj3aLeROraC9iaa.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 181954"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/4/d48fd2f0a6fab01d82648d96286630b417453756_2_499x500.jpeg"
data-base62-sha1="ukpmDPCxxblkFj3aLeROraC9iaa"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/4/d48fd2f0a6fab01d82648d96286630b417453756_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/4/d48fd2f0a6fab01d82648d96286630b417453756_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/4/d48fd2f0a6fab01d82648d96286630b417453756_2_998x1000.jpeg 2x"
data-dominant-color="595650" width="499" height="500"
alt="Screenshot 2025-11-09 181954" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 181954</span><span class="informations">1077×1078 256
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/d/9/d987fd9f28d4e4f7a8f66a567f3058eebebc01be.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/v2mY83UHgIpa0KM839xhhoNGMmG.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/9/d987fd9f28d4e4f7a8f66a567f3058eebebc01be_2_496x500.jpeg"
data-base62-sha1="v2mY83UHgIpa0KM839xhhoNGMmG"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/9/d987fd9f28d4e4f7a8f66a567f3058eebebc01be_2_496x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/9/d987fd9f28d4e4f7a8f66a567f3058eebebc01be_2_744x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/d/9/d987fd9f28d4e4f7a8f66a567f3058eebebc01be_2_992x1000.jpeg 2x"
data-dominant-color="4C6382" width="496" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1075×1083
139 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

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
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 10, 2025, 1:21pm </span>

<span itemprop="position">6</span>

</div>

<div class="post" itemprop="text">

One more thing, on the post-processing approach versus 3d texture
(froxels).

The post-processign approach doesn’t support transparencies. Here’s a
shot with a glowing crystal\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/3/3344d406687898fa0aa54f92d126842d8d42ccde.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/7jxOw0UH0L7mbX4sSeEHuhWNLWu.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-09 180957"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/3344d406687898fa0aa54f92d126842d8d42ccde_2_497x500.jpeg"
data-base62-sha1="7jxOw0UH0L7mbX4sSeEHuhWNLWu"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/3344d406687898fa0aa54f92d126842d8d42ccde_2_497x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/3344d406687898fa0aa54f92d126842d8d42ccde_2_745x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/3/3344d406687898fa0aa54f92d126842d8d42ccde_2_994x1000.jpeg 2x"
data-dominant-color="638CB5" width="497" height="500"
alt="Screenshot 2025-11-09 180957" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-09 180957</span><span class="informations">1077×1083 72.7
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

There is a large spherical light source in the crystal\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/2/b/2b441f39bc9365839b93492db95fd914d58c50b9.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/6aKtSnbklscqITXFoLNVi2m9ASZ.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/b/2b441f39bc9365839b93492db95fd914d58c50b9_2_497x500.jpeg"
data-base62-sha1="6aKtSnbklscqITXFoLNVi2m9ASZ"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/b/2b441f39bc9365839b93492db95fd914d58c50b9_2_497x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/b/2b441f39bc9365839b93492db95fd914d58c50b9_2_745x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/2/b/2b441f39bc9365839b93492db95fd914d58c50b9_2_994x1000.jpeg 2x"
data-dominant-color="638CB5" width="497" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1077×1083
75.1 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

And the crystal itself is barely transparent, you can see through it a
little.

Here it is close up to prove\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/c/9/c91e0ab6b66fffa711b6bd549e7c5b6f993b224b.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/sHakPj3NKpSFPvlYiiK9DXTZJ91.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/9/c91e0ab6b66fffa711b6bd549e7c5b6f993b224b_2_498x500.jpeg"
data-base62-sha1="sHakPj3NKpSFPvlYiiK9DXTZJ91"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/9/c91e0ab6b66fffa711b6bd549e7c5b6f993b224b_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/9/c91e0ab6b66fffa711b6bd549e7c5b6f993b224b_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/c/9/c91e0ab6b66fffa711b6bd549e7c5b6f993b224b_2_996x1000.jpeg 2x"
data-dominant-color="486368" width="498" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1078×1081
160 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

You can see a bit of the background through it\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/0/9087556542f022c80100d06f9f77f2428b1cd95d.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/kCyHO9knx8OT6d9UtYrWMXpcDwN.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/0/9087556542f022c80100d06f9f77f2428b1cd95d_2_498x500.jpeg"
data-base62-sha1="kCyHO9knx8OT6d9UtYrWMXpcDwN"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/0/9087556542f022c80100d06f9f77f2428b1cd95d_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/0/9087556542f022c80100d06f9f77f2428b1cd95d_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/0/9087556542f022c80100d06f9f77f2428b1cd95d_2_996x1000.jpeg 2x"
data-dominant-color="4A6166" width="498" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1078×1081
178 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Why is this important? Post processing does not support this, you’re
running a post-process on top of everything, so transparencies can’t be
used, they don’t write depth so there is no ray length to integrate to.

You *could* make it work, by running a separate post process for every
triangle, but that’s not a realistic option.

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
<a href="https://discourse.threejs.org/u/Mio_Veken" rel="nofollow"><span
itemprop="name">Mio_Veken</span></a> </span>

<span class="crawler-post-infos"> November 10, 2025, 5:35pm </span>

<span itemprop="position">7</span>

</div>

<div class="post" itemprop="text">

demo seems to be broken

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_8" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 10, 2025, 7:45pm </span>

<span itemprop="position">8</span>

</div>

<div class="post" itemprop="text">

<div class="title">

<div class="quote-controls">

</div>

<img
src="https://yyz1.discourse-cdn.com/flex035/user_avatar/discourse.threejs.org/mio_veken/48/60304_2.png"
class="avatar" width="24" height="24" /> Mio_Veken:

</div>

> demo seems to be broken

Probably takes a while to load. Sponza scene is about 80 Mb, the server
I host it on is a bit slow as well
<img src="https://emoji.discourse-cdn.com/twitter/sweat_smile.png?v=15"
title=":sweat_smile:" class="emoji" loading="lazy" width="20"
height="20" alt=":sweat_smile:" />

Anything in the console by any chance?

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">1 Like</span>

</div>

</div>

<div id="post_9" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Mio_Veken" rel="nofollow"><span
itemprop="name">Mio_Veken</span></a> </span>

<span class="crawler-post-infos"> November 11, 2025, 8:33am </span>

<span itemprop="position">9</span>

</div>

<div class="post" itemprop="text">

Warning (once):\
ID3D12Device::GetDeviceRemovedReason failed with DXGI_ERROR_DEVICE_HUNG
(0x887A0006)

- While handling unexpected error type Internal when allowed errors are
  (Validation\|DeviceLost).\
  at CheckHRESULTImpl
  (…\third_party\dawn\src\dawn\native\d3d\D3DError.cpp:121)

Backend messages:

- Device removed reason: DXGI_ERROR_DEVICE_HUNG (0x887A0006)

sounds like a device specific issue? <img
src="https://emoji.discourse-cdn.com/twitter/stuck_out_tongue.png?v=15"
title=":stuck_out_tongue:" class="emoji" loading="lazy" width="20"
height="20" alt=":stuck_out_tongue:" />

Error:\
installHook.js:1 AbortError: Failed to execute ‘mapAsync’ on
‘GPUBuffer’: \[Device\] is lost.

<div class="md-table">

|     | overrideMethod | @   | installHook.js:1 |
|-----|----------------|-----|------------------|
|     |                |     |                  |

</div>

<div class="md-table">

|     | **Promise.then**                     |     |                         |
|-----|--------------------------------------|-----|-------------------------|
|     | release                              | @   | index-BUHqecGP.js:10366 |
|     | <span class="hashtag-raw">\#a</span> | @   | index-BUHqecGP.js:445   |
|     | finish                               | @   | index-BUHqecGP.js:445   |
|     | render                               | @   | index-BUHqecGP.js:13808 |
|     | (anonymous)                          | @   | index-BUHqecGP.js:16934 |
|     | a                                    | @   | index-BUHqecGP.js:432   |

</div>

<div class="md-table">

|     | **requestAnimationFrame** |     |                       |
|-----|---------------------------|-----|-----------------------|
|     | a                         | @   | index-BUHqecGP.js:432 |

</div>

repeated a lot of times

trying to reload/restart chrome, sometimes it works…

I am using Intel Iris Xe Graphics

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_10" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 11, 2025, 12:55pm </span>

<span itemprop="position">10</span>

</div>

<div class="post" itemprop="text">

<div class="title">

<div class="quote-controls">

</div>

<img
src="https://yyz1.discourse-cdn.com/flex035/user_avatar/discourse.threejs.org/mio_veken/48/60304_2.png"
class="avatar" width="24" height="24" /> Mio_Veken:

</div>

> sounds like a device specific issue? <img
> src="https://emoji.discourse-cdn.com/twitter/stuck_out_tongue.png?v=15"
> title=":stuck_out_tongue:" class="emoji" loading="lazy" width="20"
> height="20" alt=":stuck_out_tongue:" />

It does, thanks a lot for that, will be looking into it

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes"></span>

</div>

</div>

<div id="post_11" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 25, 2025, 10:54am </span>

<span itemprop="position">11</span>

</div>

<div class="post" itemprop="text">

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/e7LebVK3AkSxvDYWvkchuLzUYvv.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-25 101118"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_499x500.jpeg"
data-base62-sha1="e7LebVK3AkSxvDYWvkchuLzUYvv"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_998x1000.jpeg 2x"
data-dominant-color="5A5953" width="499" height="500"
alt="Screenshot 2025-11-25 101118" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-25 101118</span><span class="informations">1077×1078 184
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/5/959b934a5d5efb69918c542caf23c8951ee2514b.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/llusCZ13bMcB5iiukx7DsBMxAwz.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-24 125411"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/5/959b934a5d5efb69918c542caf23c8951ee2514b_2_498x500.jpeg"
data-base62-sha1="llusCZ13bMcB5iiukx7DsBMxAwz"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/5/959b934a5d5efb69918c542caf23c8951ee2514b_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/5/959b934a5d5efb69918c542caf23c8951ee2514b_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/5/959b934a5d5efb69918c542caf23c8951ee2514b_2_996x1000.jpeg 2x"
data-dominant-color="444A43" width="498" height="500"
alt="Screenshot 2025-11-24 125411" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-24 125411</span><span class="informations">1075×1079 255
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Spent more time on the problem, learned a lot more about optics and
participating media.

The most interesting thing is - I split the code into 3 distinct passes:

1.  Participating Media integration
2.  Light integration
3.  Final gather

It’s the same as what guys from Frostbite proposed\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/5/0/50c209e56b7870624fc45c0344ab5e2ea82dc40a.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/bwpVg5H534Iun4e43B1ps7QATea.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/5/0/50c209e56b7870624fc45c0344ab5e2ea82dc40a_2_690x365.jpeg"
data-base62-sha1="bwpVg5H534Iun4e43B1ps7QATea"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/5/0/50c209e56b7870624fc45c0344ab5e2ea82dc40a_2_690x365.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/5/0/50c209e56b7870624fc45c0344ab5e2ea82dc40a_2_1035x547.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/5/0/50c209e56b7870624fc45c0344ab5e2ea82dc40a_2_1380x730.jpeg 2x"
data-dominant-color="2E3641" width="690" height="365" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1422×753
137 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

In the first pass we take user-defined volumes and resample them into a
froxel grid. This allows us to defined 100s or 1000s of distinct
particle volumes on the scene without a significant performance
overhead.

The second pass calculates in-scattering of all lights in the scene.
I’ve added a multiscattering approximation using Sony’s Magnus Wrenninge
approximation (see “Oz: The Great and Volumetric”). Another important
piece here is - I integrate optical depth for each light, meaning that
lights correctly dim with distance. You can see it on the screenshot
where the torch on the left of the screen gets sharply attenuated down
the further the light has to travel through the volume\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/5/b5904fb61eb601cc971296700dd96cb2e8113410.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/pUbBGxBeuG3ZQWbxQYaZgVxDZok.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/5/b5904fb61eb601cc971296700dd96cb2e8113410_2_504x500.jpeg"
data-base62-sha1="pUbBGxBeuG3ZQWbxQYaZgVxDZok"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/5/b5904fb61eb601cc971296700dd96cb2e8113410_2_504x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/5/b5904fb61eb601cc971296700dd96cb2e8113410_2_756x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/5/b5904fb61eb601cc971296700dd96cb2e8113410_2_1008x1000.jpeg 2x"
data-dominant-color="5B5953" width="504" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1088×1078
220 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The final gather is fairly simple, we just march through the volume back
to front and accumulate visible light and extinction. The only
complicated thing I do here is using polynomial curve approximation for
integration, instead of doing the standard Riemann sum. This is
something Frostbite presentation also highlights:\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/d/9dd7bc72762f5d1948e20ec515d29971f8d231f3.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/mwlaS7opQ0kvYCad7vrjrLaL05R.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/d/9dd7bc72762f5d1948e20ec515d29971f8d231f3_2_690x393.jpeg"
data-base62-sha1="mwlaS7opQ0kvYCad7vrjrLaL05R"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/d/9dd7bc72762f5d1948e20ec515d29971f8d231f3_2_690x393.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/d/9dd7bc72762f5d1948e20ec515d29971f8d231f3_2_1035x589.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/d/9dd7bc72762f5d1948e20ec515d29971f8d231f3.jpeg 2x"
data-dominant-color="3E4C4F" width="690" height="393" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1282×732
150 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

> You can see here multiple volumes with increasing scattering
> properties. It is easy to understand that integrating scattering and
> then transmittance is not energy conservative.\
> We could reverse the order of operations. You can see that we get
> somewhat get back the correct albedo one would expect but it is
> overall too dark and temporally integrating that is definitely not
> helping here.
>
> So how to improve this? We know we have one light and one extinction
> sample.
>
> We can keep the light sample: it is expensive to evaluate and good
> enough to assume it constant on along the view ray inside each depth
> slice.
>
> But the single transmittance is completely wrong. The transmittance
> should in fact be 0 at the near interface of the depth layer and
> exp(-mu_t d) at the far interface of the depth slice of width d.
>
> What we do to solve this is integrate scattered light analytically
> according to the transmittance in each point on the view ray range
> within the slice. One can easily find that the analytical integration
> of constant scattered light over a definite range according to one
> extinction sample can be reduced this equation.\
> Using this, we finally get consistent lighting result for scattering
> and this with respect to our single extinction sample (as you can see
> on the bottom picture).

------------------------------------------------------------------------

While I was trying to wrap my head around the physics part of this, I
ended up writing a Mie simulator in JS based on SIGGRAPH paper from 2007
“Computing the Scattering Properties of Participating Media Using
Lorenz-Mie Theory”. I wanted a system that doesn’t just work for smoke,
or just for fog, or just for clouds, but for all types of participating
media. Incidentally, here’s a table I generated, feel free to use it, I
would appreciate attribution:

```
/**
 * 📚 Precomputed standard atmospheric particle library for rendering.
 *
 * This file is GENERATED. Do not edit by hand.
 * Generation settings: 380–780 nm, step_size=1nm, xyz CMFs, medium=air. Integrated to sRGB for D65 illuminant
 *
 * Each entry contains:
 * - radius: Particle radius in meters.
 * - cross_section_scattering: [R, G, B] scattering coefficients (m²).
 * - cross_section_extinction: [R, G, B] extinction coefficients (m²).
 * - g: Asymmetry parameter (average cosine of the scattering angle).
 */
export const MIE_PARTICLES_STANDARD_PRECOMPUTED = {

  // --- 💧 Water-Based (Haze, Fog, Clouds) ---

  /**
   * Continental haze (ammonium sulfate surrogate)
   * SMALL — faint land/city haze: distant skyline slightly washed out on a sunny day.
   * Diameter: 100 nm
   */
  CONTINENTAL_HAZE_SMALL: {
    radius: 5.0e-8,
    cross_section_scattering: [1.0372407599145680e-16, 2.1697944076390811e-16, 4.9834805745060257e-16],
    cross_section_extinction: [1.0390516205855430e-16, 2.1717567420831002e-16, 4.9879159253139388e-16],
    g: 0.06687111747972882,
  },
  /**
   * MEDIUM — typical daytime urban/valley haze with gentle desaturation.
   * Diameter: 500 nm
   */
  CONTINENTAL_HAZE_MEDIUM: {
    radius: 2.5e-7,
    cross_section_scattering: [5.4565579877961842e-13, 6.8621977746322113e-13, 8.2869951608010304e-13],
    cross_section_extinction: [5.4570905150853122e-13, 6.8627271753511908e-13, 8.2881953884176050e-13],
    g: 0.72195208606467531,
  },
  /**
   * LARGE — thicker land haze; think post‑inversion murk softening hills.
   * Diameter: 1.0 µm
   */
  CONTINENTAL_HAZE_LARGE: {
    radius: 5.0e-7,
    cross_section_scattering: [3.0366185612989802e-12, 2.1644690526988712e-12, 1.3935109366522711e-12],
    cross_section_extinction: [3.0370652035911430e-12, 2.1649491115406566e-12, 1.3945337813123169e-12],
    g: 0.6137288243405209,
  },

  /**
   * Maritime haze (sea‑salt/brine)
   * SMALL — light coastal humidity haze over the ocean.
   * Diameter: 100 nm
   */
  MARITIME_HAZE_SMALL: {
    radius: 5.0e-8,
    cross_section_scattering: [5.5914464124496594e-17, 1.1568131266404890e-16, 2.6209632958954776e-16],
    cross_section_extinction: [5.5915758040155253e-17, 1.1568241782228503e-16, 2.6209808791233174e-16],
    g: 0.062667411576877274,
  },
  /**
   * MEDIUM — bright, milky air on a breezy beach or around harbors.
   * Diameter: 500 nm
   */
  MARITIME_HAZE_MEDIUM: {
    radius: 2.5e-7,
    cross_section_scattering: [2.7132966283888992e-13, 4.0042270998895428e-13, 5.5420120025016184e-13],
    cross_section_extinction: [2.7132992896636519e-13, 4.0042294960829909e-13, 5.5420156922320274e-13],
    g: 0.75572608442123446,
  },
  /**
   * LARGE — thick marine layer look before it becomes fog.
   * Diameter: 1.0 µm
   */
  MARITIME_HAZE_LARGE: {
    radius: 5.0e-7,
    cross_section_scattering: [3.0886970942611371e-12, 3.1506283070098210e-12, 2.6753836337037947e-12],
    cross_section_extinction: [3.0886995489983882e-12, 3.1506303784552175e-12, 2.6753868296970645e-12],
    g: 0.82009537287886958,
  },

  /**
   * Fog & Cloud Droplets
   * SMALL — light mist: dawn over a lake, waterfall spray, breath fog.
   * Diameter: 2.0 µm
   */
  FOG_DROPLET_SMALL: {
    radius: 1.0e-6,
    cross_section_scattering: [6.6872146821004324e-12, 5.4309369486615811e-12, 7.5571588161013023e-12],
    cross_section_extinction: [6.6872171928267207e-12, 5.4309373592604994e-12, 7.5571591319672130e-12],
    g: 0.66286908969703728,
  },
  /**
   * MEDIUM — typical road fog reducing visibility to a few hundred meters.
   * Diameter: 10.0 µm
   */
  FOG_DROPLET_MEDIUM: {
    radius: 5.0e-6,
    cross_section_scattering: [1.7036472789376784e-10, 1.6665060947239930e-10, 1.6466175909414485e-10],
    cross_section_extinction: [1.7036520771027743e-10, 1.6665065143578210e-10, 1.6466177643977473e-10],
    g: 0.85263072331984047,
  },
  /**
   * LARGE — bright, thick cloud core or dense sea fog.
   * Diameter: 20.0 µm
   */
  CLOUD_DROPLET_LARGE: {
    radius: 1.0e-5,
    cross_section_scattering: [6.5315742448115536e-10, 6.5618165104565060e-10, 6.5250478893917499e-10],
    cross_section_extinction: [6.5315858886811270e-10, 6.5618181350359152e-10, 6.5250489005400894e-10],
    g: 0.86080713114012297,
  },


  // --- 🔥 Combustion (Smoke & Soot) ---

  /**
   * Biomass Smoke (e.g., Wood, Wildfire) — "Brown Carbon"
   * SMALL — fresh wood‑smoke right above the flames.
   * Diameter: 400 nm
   */
  SMOKE_PARTICLE_SMALL: {
    radius: 2.0e-7,
    cross_section_scattering: [2.5095238381331490e-13, 3.2817527241713552e-13, 4.7184181688431561e-13],
    cross_section_extinction: [2.5244957121744367e-13, 3.3073489397071378e-13, 4.7766204956433065e-13],
    g: 0.64153537730937171,
  },
  /**
   * MEDIUM — typical wildfire/chimney smoke drifting across a valley.
   * Diameter: 800 nm
   */
  SMOKE_PARTICLE_MEDIUM: {
    radius: 4.0e-7,
    cross_section_scattering: [2.2186086454447846e-12, 1.8611290477348588e-12, 1.2017961650839806e-12],
    cross_section_extinction: [2.2347400788139265e-12, 1.8849701372888018e-12, 1.2529531542589939e-12],
    g: 0.68088789083915369,
  },
  /**
   * LARGE — aged regional smoke layers that turn the sun orange.
   * Diameter: 2.0 µm
   */
  SMOKE_PARTICLE_LARGE: {
    radius: 1.0e-6,
    cross_section_scattering: [9.7154096631596466e-12, 6.5695017319655712e-12, 6.5950874641241054e-12],
    cross_section_extinction: [9.9744536671262377e-12, 6.9383549994562171e-12, 7.2416530016257137e-12],
    g: 0.73891619526845487,
  },

  /**
   * Soot (e.g., Diesel Exhaust) — "Black Carbon"
   * SMALL — very dark sooty exhaust: candle wick zone or fresh tailpipe soot.
   * Diameter: 50 nm
   */
  SOOT_PARTICLE_SMALL: {
    radius: 2.5e-8,
    cross_section_scattering: [4.9471331742851396e-18, 1.1425655543629920e-17, 3.3950349242847612e-17],
    cross_section_extinction: [4.9469989827650098e-16, 6.4148352307268963e-16, 9.4380272697116261e-16],
    g: 0.018039326863221513,
  },
  /**
   * MEDIUM — traffic/industrial pollution haze mixing into city air.
   * Diameter: 200 nm
   */
  SOOT_AGGREGATE_MEDIUM: {
    radius: 1.0e-7,
    cross_section_scattering: [1.6352855504532771e-14, 2.6526196915106281e-14, 3.7046081158626368e-14],
    cross_section_extinction: [5.6514531230912217e-14, 7.3826992547192368e-14, 8.8338524712659901e-14],
    g: 0.31674236124633798,
  },
  /**
   * LARGE — heavy dirty smoke near source: burning oil/tires.
   * Diameter: 400 nm
   */
  SOOT_AGGREGATE_LARGE: {
    radius: 2.0e-7,
    cross_section_scattering: [1.6063607357301153e-13, 1.6542541029497725e-13, 1.6709682614452953e-13],
    cross_section_extinction: [3.6165255982805808e-13, 3.6212311121035904e-13, 3.5517926834511851e-13],
    g: 0.69133198032115784,
  },


  // --- 💨 Solid Particulates (Dust & Pollen) ---

  /**
   * Mineral Dust (e.g., Desert, Sand)
   * SMALL — far‑range dusty air softening distant mountains.
   * Diameter: 1.5 µm
   */
  FINE_DUST_SMALL: {
    radius: 7.5e-7,
    cross_section_scattering: [2.6570379687422880e-12, 3.6996919661206611e-12, 4.5471939176491137e-12],
    cross_section_extinction: [2.8819492220384537e-12, 4.1008076519912007e-12, 5.1659038204372376e-12],
    g: 0.63886827482281139,
  },
  /**
   * MEDIUM — moving dust clouds from vehicles or field winds.
   * Diameter: 5.0 µm
   */
  COARSE_DUST_MEDIUM: {
    radius: 2.5e-6,
    cross_section_scattering: [3.5472196264524937e-11, 3.3430210987054714e-11, 3.2075451113920786e-11],
    cross_section_extinction: [4.2441528450403185e-11, 4.3597399152097500e-11, 4.3350184971955535e-11],
    g: 0.84075100028702532,
  },
  /**
   * LARGE — sandstorm wall: near‑camera blowing sand/tan curtains.
   * Diameter: 15.0 µm
   */
  COARSE_DUST_LARGE: {
    radius: 7.5e-6,
    cross_section_scattering: [3.1816278385853973e-10, 2.9406557017587955e-10, 2.6643041098315311e-10],
    cross_section_extinction: [3.7355130308305938e-10, 3.7144494812949936e-10, 3.6814067045857220e-10],
    g: 0.85247658559411998,
  },

  /**
   * Pollen (Organic)
   * MEDIUM — seasonal pollen haze; yellow‑green tint in spring air.
   * Diameter: 20.0 µm
   */
  POLLEN_PARTICLE_MEDIUM: {
    radius: 1.0e-5,
    cross_section_scattering: [6.3652345959538284e-10, 6.2647624730458445e-10, 5.8718713214140584e-10],
    cross_section_extinction: [6.5918545142090177e-10, 6.5700023143709686e-10, 6.5127465699910976e-10],
    g: 0.81082270359712194,
  },
  /**
   * LARGE — visible puffs from trees (e.g., pine) or catkins in forests.
   * Diameter: 30.0 µm
   */
  POLLEN_PARTICLE_LARGE: {
    radius: 1.5e-5,
    cross_section_scattering: [1.3961132818036018e-9, 1.3739693858138355e-9, 1.2750015299393954e-9],
    cross_section_extinction: [1.4562652589727905e-9, 1.4596101004954230e-9, 1.4523332353409636e-9],
    g: 0.81884345812519288,
  },
};
```

The table is generated for D65 luminant, in linear sRGB using 1nm
spectral sweep from 380nm to 780nm, so it’s radiometrically 100%
accurate. The refraction index for each type of media was pulled from
published tables from Applied Optics mostly.

What this means in practice, is we can create volumes like so:

```
const fog = new ParticipatingMediaVolume();

fog.transform.position.set(-55, 4, -5.116);
fog.transform.scale.set(10, 3, 20); // 10m by 3m by 20m
fog.transform.rotation.fromAxisAngle(Vector3.up, 83 * (Math.PI / 180));
fog.fade_distance = 0.1; // fade density of the volume to 0 over the distance of 10cm at the edge of the volume

fog.particle_spec = VolumetricsParticleSpec.fromMeep(MIE_PARTICLES_STANDARD_PRECOMPUTED.CLOUD_DROPLET_LARGE);

fog.density = 1527046979; // N, number of particles per cubic meter. Yes there are a LOT of water droplets in dense fog :D

scene.volumetrics.add(fog);
```

And you get a result like this:\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/e7LebVK3AkSxvDYWvkchuLzUYvv.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-25 101118"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_499x500.jpeg"
data-base62-sha1="e7LebVK3AkSxvDYWvkchuLzUYvv"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/2/62ff0c2ab9be55bdf7a630126864a2e686afc221_2_998x1000.jpeg 2x"
data-dominant-color="5A5953" width="499" height="500"
alt="Screenshot 2025-11-25 101118" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-25 101118</span><span class="informations">1077×1078 184
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

If we set the particle specification to something else, visual
appearance changes quite obviously:\
`COARSE_DUST_MEDIUM`\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/9/19c5f45f0e9649237f33d19cb203b00d80d5a4ec.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/3G03fKcsEiaNwqUx8jBFWynzUoA.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-25 103709"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/9/19c5f45f0e9649237f33d19cb203b00d80d5a4ec_2_498x500.jpeg"
data-base62-sha1="3G03fKcsEiaNwqUx8jBFWynzUoA"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/9/19c5f45f0e9649237f33d19cb203b00d80d5a4ec_2_498x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/9/19c5f45f0e9649237f33d19cb203b00d80d5a4ec_2_747x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/9/19c5f45f0e9649237f33d19cb203b00d80d5a4ec_2_996x1000.jpeg 2x"
data-dominant-color="46413A" width="498" height="500"
alt="Screenshot 2025-11-25 103709" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-25 103709</span><span class="informations">1074×1077 189
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

`MARITIME_HAZE_MEDIUM`\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/0/102925cd542f728a6f4e945fb325ef7e604f5c6b.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/2iXNttH9HyLYcR2drjT5kY6jPo7.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-25 103600"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/0/102925cd542f728a6f4e945fb325ef7e604f5c6b_2_499x500.jpeg"
data-base62-sha1="2iXNttH9HyLYcR2drjT5kY6jPo7"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/0/102925cd542f728a6f4e945fb325ef7e604f5c6b_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/0/102925cd542f728a6f4e945fb325ef7e604f5c6b_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/0/102925cd542f728a6f4e945fb325ef7e604f5c6b_2_998x1000.jpeg 2x"
data-dominant-color="585B57" width="499" height="500"
alt="Screenshot 2025-11-25 103600" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-25 103600</span><span class="informations">1077×1079 186
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

`SMOKE_PARTICLE_LARGE`\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/9/6/96eefcfbcf2c0c6e314723ee2ae30e86e21ba894.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/lxdEknbkkfxJKaBFMC0snBaOZPm.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/6/96eefcfbcf2c0c6e314723ee2ae30e86e21ba894_2_500x500.jpeg"
data-base62-sha1="lxdEknbkkfxJKaBFMC0snBaOZPm"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/6/96eefcfbcf2c0c6e314723ee2ae30e86e21ba894_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/6/96eefcfbcf2c0c6e314723ee2ae30e86e21ba894_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/9/6/96eefcfbcf2c0c6e314723ee2ae30e86e21ba894_2_1000x1000.jpeg 2x"
data-dominant-color="5A544A" width="500" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1078×1077
187 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

`SOOT_AGGREGATE_MEDIUM`\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/7/1/710a8ef062d223ed92210bb538a36ab18e5902fd.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/g80zFzYNymK2cqCYjbMNWKpKpKl.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/7/1/710a8ef062d223ed92210bb538a36ab18e5902fd_2_499x500.jpeg"
data-base62-sha1="g80zFzYNymK2cqCYjbMNWKpKpKl"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/7/1/710a8ef062d223ed92210bb538a36ab18e5902fd_2_499x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/7/1/710a8ef062d223ed92210bb538a36ab18e5902fd_2_748x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/7/1/710a8ef062d223ed92210bb538a36ab18e5902fd_2_998x1000.jpeg 2x"
data-dominant-color="2D3331" width="499" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1075×1077
192 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

You’ll notice difference absorption/scattering behavior. Some types of
media scatter more light, some absorb more, some scatter more light
forward, some scatter light uniformly. These behaviors are also
spectrum-dependent, meaning light changes color. If you look over the
screenshots above, you’ll notice that the same yellow torch shifts color
quite drastically in different types of volume, and at different depth.

And if we get up close, we can see that the light shafts are still
there\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/f/a/fa0673192ea9fd96ca2c5cb8145d52fff5af34df.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/zFPbwiOyrZPX6JSf0l4ojahTjEb.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/a/fa0673192ea9fd96ca2c5cb8145d52fff5af34df_2_500x500.jpeg"
data-base62-sha1="zFPbwiOyrZPX6JSf0l4ojahTjEb"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/a/fa0673192ea9fd96ca2c5cb8145d52fff5af34df_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/a/fa0673192ea9fd96ca2c5cb8145d52fff5af34df_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/a/fa0673192ea9fd96ca2c5cb8145d52fff5af34df_2_1000x1000.jpeg 2x"
data-dominant-color="6C665D" width="500" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1077×1077
75.5 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

And you can mix volumes quite naturally as well

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/e/a/ead5247e8cb927d083ba834a4f7fdff22d33c95c.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/xvqnNJmA5tAqOtbiOVg85TEOtre.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ead5247e8cb927d083ba834a4f7fdff22d33c95c_2_501x500.jpeg"
data-base62-sha1="xvqnNJmA5tAqOtbiOVg85TEOtre"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ead5247e8cb927d083ba834a4f7fdff22d33c95c_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ead5247e8cb927d083ba834a4f7fdff22d33c95c_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ead5247e8cb927d083ba834a4f7fdff22d33c95c_2_1002x1000.jpeg 2x"
data-dominant-color="646057" width="501" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1077×1074
208 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

We have a volume of dense smoke cross over a light volume of fog\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/8/0/806d784ab55c6d0b80be0da42206721553d10ac5.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/ik7EzpTsZu7WQ8HEWF45UCutHi5.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/0/806d784ab55c6d0b80be0da42206721553d10ac5_2_501x500.jpeg"
data-base62-sha1="ik7EzpTsZu7WQ8HEWF45UCutHi5"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/0/806d784ab55c6d0b80be0da42206721553d10ac5_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/0/806d784ab55c6d0b80be0da42206721553d10ac5_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/8/0/806d784ab55c6d0b80be0da42206721553d10ac5_2_1002x1000.jpeg 2x"
data-dominant-color="665F56" width="501" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1077×1074
235 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

here’s what that looks like inside\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/7/67031b3a236142e8aefa580235911fc1171c9a7f.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/eHhPKWxXqYeglpvacKuKum6vtbV.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/7/67031b3a236142e8aefa580235911fc1171c9a7f_2_500x500.jpeg"
data-base62-sha1="eHhPKWxXqYeglpvacKuKum6vtbV"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/7/67031b3a236142e8aefa580235911fc1171c9a7f_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/7/67031b3a236142e8aefa580235911fc1171c9a7f_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/7/67031b3a236142e8aefa580235911fc1171c9a7f_2_1000x1000.jpeg 2x"
data-dominant-color="A1987F" width="500" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1075×1075
46.7 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/1/4/14ff0ea4031715649a105f58ad0bf8780cb1efc8.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/2ZK0qATpAMw4G5DwrIapRZE0yeY.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14ff0ea4031715649a105f58ad0bf8780cb1efc8_2_501x500.jpeg"
data-base62-sha1="2ZK0qATpAMw4G5DwrIapRZE0yeY"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14ff0ea4031715649a105f58ad0bf8780cb1efc8_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14ff0ea4031715649a105f58ad0bf8780cb1efc8_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/1/4/14ff0ea4031715649a105f58ad0bf8780cb1efc8_2_1002x1000.jpeg 2x"
data-dominant-color="646057" width="501" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1077×1074
214 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">4 Likes</span>

</div>

</div>

<div id="post_12" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 28, 2025, 9:47am </span>

<span itemprop="position">12</span>

</div>

<div class="post" itemprop="text">

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/e/c/ec11c0de4e283ee8c8c7d0ed2e94b28a0ad1c4a7.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/xGmIBJmwonq8GWHtDrdR7i86Lzx.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-26 150026"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/c/ec11c0de4e283ee8c8c7d0ed2e94b28a0ad1c4a7_2_690x417.jpeg"
data-base62-sha1="xGmIBJmwonq8GWHtDrdR7i86Lzx"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/c/ec11c0de4e283ee8c8c7d0ed2e94b28a0ad1c4a7_2_690x417.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/c/ec11c0de4e283ee8c8c7d0ed2e94b28a0ad1c4a7_2_1035x625.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/c/ec11c0de4e283ee8c8c7d0ed2e94b28a0ad1c4a7_2_1380x834.jpeg 2x"
data-dominant-color="806B56" width="690" height="417"
alt="Screenshot 2025-11-26 150026" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-26 150026</span><span class="informations">1849×1119 110
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Working on TAA for the volumetrics, still got a few snags to sort out.
In the screenshot above we have the entire scene submerged in a giant
volume of fog, note that the fog is *NOT* global, it’s still local, we
just choose to give it huge size.

You can still see another smaller volume of smoke in the background, but
still inside the larger volume, showing off the seamless “fog in the
fog” support

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/0/2/0204ac2025683736ff37a3910dac81201c7e0d6b.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/hQXR8RRYh9KFWH7qEJhXxaiSCL.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/2/0204ac2025683736ff37a3910dac81201c7e0d6b_2_690x417.jpeg"
data-base62-sha1="hQXR8RRYh9KFWH7qEJhXxaiSCL"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/2/0204ac2025683736ff37a3910dac81201c7e0d6b_2_690x417.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/2/0204ac2025683736ff37a3910dac81201c7e0d6b_2_1035x625.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/0/2/0204ac2025683736ff37a3910dac81201c7e0d6b_2_1380x834.jpeg 2x"
data-dominant-color="806B56" width="690" height="417" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1849×1119
114 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

Here is another shot from a different part of the scene\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/6/8/685e091f1d3d7fcb8eca48c177b6a193406bfae8.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/eTh7TtY0kENKWjgAejuJVpe8Gco.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-26 145722"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/8/685e091f1d3d7fcb8eca48c177b6a193406bfae8_2_690x416.jpeg"
data-base62-sha1="eTh7TtY0kENKWjgAejuJVpe8Gco"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/8/685e091f1d3d7fcb8eca48c177b6a193406bfae8_2_690x416.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/8/685e091f1d3d7fcb8eca48c177b6a193406bfae8_2_1035x624.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/6/8/685e091f1d3d7fcb8eca48c177b6a193406bfae8_2_1380x832.jpeg 2x"
data-dominant-color="6D5B4E" width="690" height="416"
alt="Screenshot 2025-11-26 145722" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-26 145722</span><span class="informations">1850×1117 130
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">3 Likes</span>

</div>

</div>

<div id="post_13" class="topic-body crawler-post" itemprop="comment"
itemscope="itemscope" itemtype="http://schema.org/Comment">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Usnul" rel="nofollow"><span
itemprop="name">Usnul</span></a> </span>

<span class="crawler-post-infos"> November 28, 2025, 9:29pm </span>

<span itemprop="position">13</span>

</div>

<div class="post" itemprop="text">

Finished TAA for the volumetrics, it’s stable under motion and reduces
the noise significantly. Now, I added a large number of volumetrics to a
test scene for tuning

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/9/b9270f878aec346d573e41e2fa0d385dd78f4998.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/qpW1btJfFgsGya0JRlN5HgaLmEE.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-28 211325"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/9/b9270f878aec346d573e41e2fa0d385dd78f4998_2_500x500.jpeg"
data-base62-sha1="qpW1btJfFgsGya0JRlN5HgaLmEE"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/9/b9270f878aec346d573e41e2fa0d385dd78f4998_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/9/b9270f878aec346d573e41e2fa0d385dd78f4998_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/9/b9270f878aec346d573e41e2fa0d385dd78f4998_2_1000x1000.jpeg 2x"
data-dominant-color="525355" width="500" height="500"
alt="Screenshot 2025-11-28 211325" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-28 211325</span><span class="informations">1077×1076 232
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The whole scene is submerged in a large thin volume with a bit of haze,
so the distant objects grow a bit dim, and there’s an extra glow around
light sources.

There’s a dense cloud underneath the scene\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/3/0/30d14febde172e7ffd06e97d74a5c041ac545d9a.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/6XRmO9DbOxf8dA7luOk2KsIoLIS.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-28 211612"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/0/30d14febde172e7ffd06e97d74a5c041ac545d9a_2_497x500.jpeg"
data-base62-sha1="6XRmO9DbOxf8dA7luOk2KsIoLIS"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/0/30d14febde172e7ffd06e97d74a5c041ac545d9a_2_497x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/0/30d14febde172e7ffd06e97d74a5c041ac545d9a_2_745x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/3/0/30d14febde172e7ffd06e97d74a5c041ac545d9a_2_994x1000.jpeg 2x"
data-dominant-color="797B80" width="497" height="500"
alt="Screenshot 2025-11-28 211612" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-28 211612</span><span class="informations">1077×1082 135
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/4/7/47edd152058a2450599bcede8c800ff9d356c4b0.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/agjqbDTphxpcHambQ5lW4hA6ZfG.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-28 211443"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/7/47edd152058a2450599bcede8c800ff9d356c4b0_2_501x500.jpeg"
data-base62-sha1="agjqbDTphxpcHambQ5lW4hA6ZfG"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/7/47edd152058a2450599bcede8c800ff9d356c4b0_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/7/47edd152058a2450599bcede8c800ff9d356c4b0_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/4/7/47edd152058a2450599bcede8c800ff9d356c4b0_2_1002x1000.jpeg 2x"
data-dominant-color="3D4046" width="501" height="500"
alt="Screenshot 2025-11-28 211443" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-28 211443</span><span class="informations">1077×1074 165
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

And to test for scalability, I added a small cloud of soot to each
torch\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/e/a/ea7d27b301005d8de0964cba98680c7be73f2772.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/xsnS2pWrB7c2rHpn7pd1rJSdSZY.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-28 211823"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ea7d27b301005d8de0964cba98680c7be73f2772_2_501x500.jpeg"
data-base62-sha1="xsnS2pWrB7c2rHpn7pd1rJSdSZY"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ea7d27b301005d8de0964cba98680c7be73f2772_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ea7d27b301005d8de0964cba98680c7be73f2772_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/e/a/ea7d27b301005d8de0964cba98680c7be73f2772_2_1002x1000.jpeg 2x"
data-dominant-color="4E5B45" width="501" height="500"
alt="Screenshot 2025-11-28 211823" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-28 211823</span><span class="informations">1077×1074 151
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

I’m pretty happy with the results, but there are still a few things I
want to reduce noise in the distance

A few more shots from the same scene\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/f/2/f2ca1c6cc7bc918da6c751e8f58d1af57e5e5dea.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/yDOzgfz7JTXbpjxGVtQzRRhgGvg.jpeg?dl=1"
rel="noopener nofollow ugc" title="image"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/2/f2ca1c6cc7bc918da6c751e8f58d1af57e5e5dea_2_501x500.jpeg"
data-base62-sha1="yDOzgfz7JTXbpjxGVtQzRRhgGvg"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/2/f2ca1c6cc7bc918da6c751e8f58d1af57e5e5dea_2_501x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/2/f2ca1c6cc7bc918da6c751e8f58d1af57e5e5dea_2_751x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/f/2/f2ca1c6cc7bc918da6c751e8f58d1af57e5e5dea_2_1002x1000.jpeg 2x"
data-dominant-color="586566" width="501" height="500" alt="image" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">1078×1075
121 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/3X/b/3/b33f267aa20ba6d1a8a99f291f5eb80b279e0072.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/pzGLuYwzhcW94asjX3IUmBe6T4e.jpeg?dl=1"
rel="noopener nofollow ugc" title="Screenshot 2025-11-28 212711"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/3/b33f267aa20ba6d1a8a99f291f5eb80b279e0072_2_500x500.jpeg"
data-base62-sha1="pzGLuYwzhcW94asjX3IUmBe6T4e"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/3/b33f267aa20ba6d1a8a99f291f5eb80b279e0072_2_500x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/3/b33f267aa20ba6d1a8a99f291f5eb80b279e0072_2_750x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/3X/b/3/b33f267aa20ba6d1a8a99f291f5eb80b279e0072_2_1000x1000.jpeg 2x"
data-dominant-color="4F4C46" width="500" height="500"
alt="Screenshot 2025-11-28 212711" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIGhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot
2025-11-28 212711</span><span class="informations">1076×1074 182
KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSBocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

</div>

<div itemprop="interactionStatistic" itemscope="itemscope"
itemtype="http://schema.org/InteractionCounter">

<span class="post-likes">2 Likes</span>

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
<tr id="topic-list-item-86598" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/volumetric-clouds-game-ready/86598"
class="title raw-link raw-topic-link" itemprop="url">⛅ volumetric
clouds - game ready</a> </span>
<div class="link-bottom-line">
<a href="/c/resources/8" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #ED207B"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Resources</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/clouds/1080"
class="discourse-tag">clouds</a> ,  <a
href="https://discourse.threejs.org/tag/volumetric-clouds/1773"
class="discourse-tag">volumetric-clouds</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">14</span></td>
<td class="views"><span class="views" title="views">2932</span></td>
<td>September 11, 2025</td>
<td></td>
</tr>
<tr id="topic-list-item-1473" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/tesseract-open-world-planetary-engine/1473"
class="title raw-link raw-topic-link" itemprop="url">Tesseract - Open
World Planetary Engine</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/performance/71"
class="discourse-tag">performance</a> ,  <a
href="https://discourse.threejs.org/tag/planetary-rendering/353"
class="discourse-tag">planetary-rendering</a> ,  <a
href="https://discourse.threejs.org/tag/open-world/354"
class="discourse-tag">open-world</a> ,  <a
href="https://discourse.threejs.org/tag/dual-contouring/355"
class="discourse-tag">dual-contouring</a> ,  <a
href="https://discourse.threejs.org/tag/volumetric-terrain/356"
class="discourse-tag">volumetric-terrain</a> ,  <a
href="https://discourse.threejs.org/tag/engine/357"
class="discourse-tag">engine</a> ,  <a
href="https://discourse.threejs.org/tag/terrain/419"
class="discourse-tag">terrain</a> ,  <a
href="https://discourse.threejs.org/tag/auto-instancing/643"
class="discourse-tag">auto-instancing</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">51</span></td>
<td class="views"><span class="views" title="views">25130</span></td>
<td>June 20, 2024</td>
<td></td>
</tr>
<tr id="topic-list-item-2934" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/volumes-with-space-dependent-light-intensity/2934"
class="title raw-link raw-topic-link" itemprop="url">Volumes with
space-dependent light intensity</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/lighting/76"
class="discourse-tag">lighting</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">25</span></td>
<td class="views"><span class="views" title="views">5445</span></td>
<td>June 9, 2018</td>
<td></td>
</tr>
<tr id="topic-list-item-66969" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/shade-webgpu-graphics/66969"
class="title raw-link raw-topic-link" itemprop="url">Shade - WebGPU
graphics</a> </span>
<div class="link-bottom-line">
<a href="/c/showcase/7" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #BF1E2E"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Showcase</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a> ,  <a
href="https://discourse.threejs.org/tag/rendering/698"
class="discourse-tag">rendering</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">178</span></td>
<td class="views"><span class="views" title="views">21183</span></td>
<td>May 12, 2026</td>
<td></td>
</tr>
<tr id="topic-list-item-70319" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/r168-webgpu-chasing-shadows-fixed-in-r169/70319"
class="title raw-link raw-topic-link" itemprop="url">R168 WebGPU -
Chasing Shadows - fixed in r169</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/shadows/102"
class="discourse-tag">shadows</a> ,  <a
href="https://discourse.threejs.org/tag/webgpu/619"
class="discourse-tag">webgpu</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">37</span></td>
<td class="views"><span class="views" title="views">1051</span></td>
<td>September 17, 2024</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
