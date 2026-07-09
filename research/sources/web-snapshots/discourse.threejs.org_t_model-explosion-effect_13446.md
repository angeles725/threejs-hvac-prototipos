<div id="main-outlet" class="wrap" role="main">

<div id="topic-title">

# [Model Explosion Effect](/t/model-explosion-effect/13446)

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

<a href="https://discourse.threejs.org/tag/transform"
class="discourse-tag" rel="tag">transform</a>

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
<a href="https://discourse.threejs.org/u/gaojunxiao"
rel="nofollow"><span itemprop="name">gaojunxiao</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 3:11am </span>

<span itemprop="position">1</span>

</div>

<div class="post" itemprop="text">

The three of multiple mesh combined to achieve the explosion effect as
shown in the diagram\

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689.jpeg"
class="lightbox"
data-download-href="/uploads/short-url/nMbmNQ2sjsgGoPzzm1oa2IL2MAN.jpeg?dl=1"
rel="nofollow noopener" title="微信图片_20200312111054"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689_2_577x500.jpeg"
data-base62-sha1="nMbmNQ2sjsgGoPzzm1oa2IL2MAN"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689_2_577x500.jpeg, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689_2_865x750.jpeg 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689.jpeg 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a6a45857270c1ad59de72cc8074e6ba02235f689_2_10x10.png"
width="577" height="500" alt="微信图片_20200312111054" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">微信图片_20200312111054</span><span class="informations">979×848
195 KB</span><img
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
<a href="https://discourse.threejs.org/u/looeee" rel="nofollow"><span
itemprop="name">looeee</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 7:05am </span>

<span itemprop="position">2</span>

</div>

<div class="post" itemprop="text">

You can explode a mesh into triangles pretty easily. But it looks like
you want to explode and still keep identifiable pieces. Maybe you could
break the model up based on face angle - for an architectural model with
lots of flat walls that’s probably possible. Otherwise, I’d say this is
something that needs to be done in a modelling program.

Can you share the model you want to explode here? Maybe it’s already
split up into pieces.

</div>

</div>

<div id="post_3" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/gaojunxiao"
rel="nofollow"><span itemprop="name">gaojunxiao</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 7:10am </span>

<span itemprop="position">3</span>

</div>

<div class="post" itemprop="text">

Hello, this is my own effect, there is a triangle, this is not the
effect I want, as shown in the picture

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832.png"
class="lightbox"
data-download-href="/uploads/short-url/kUxNHszEZ8J5JvwJDoDcHPLfXmq.png?dl=1"
rel="nofollow noopener" title="QQ截图20200312150848"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832_2_690x338.png"
data-base62-sha1="kUxNHszEZ8J5JvwJDoDcHPLfXmq"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832_2_690x338.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832_2_1035x507.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832.png 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/9/928fcce73b24927dbfc83b4b743a7ceb413c4832_2_10x10.png"
width="690" height="338" alt="QQ截图20200312150848" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">QQ截图20200312150848</span><span class="informations">1230×603
110 KB</span><img
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
<a href="https://discourse.threejs.org/u/gaojunxiao"
rel="nofollow"><span itemprop="name">gaojunxiao</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 7:12am </span>

<span itemprop="position">4</span>

</div>

<div class="post" itemprop="text">

This is how I THREE.BufferGeometryUtils.mergeBufferGeometries
(geometries) the component merge

</div>

</div>

<div id="post_5" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/looeee" rel="nofollow"><span
itemprop="name">looeee</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 7:28am </span>

<span itemprop="position">5</span>

</div>

<div class="post" itemprop="text">

Can you share your code and model here please?

</div>

</div>

<div id="post_6" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/Click_Clock_Boom"
rel="nofollow"><span itemprop="name">Click_Clock_Boom</span></a> </span>

<span class="crawler-post-infos"> March 12, 2020, 2:05pm </span>

<span itemprop="position">6</span>

</div>

<div class="post" itemprop="text">

I would move the vertices along their **face normal** to achieve
something like this. Take a look at this viewer’s explode mechanism:
<a href="http://glb-viewer.blogspot.com/"
rel="nofollow noopener">http://glb-viewer.blogspot.com/</a>

</div>

</div>

<div id="post_7" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/looeee" rel="nofollow"><span
itemprop="name">looeee</span></a> </span>

<span class="crawler-post-infos"> March 17, 2020, 1:05pm </span>

<span itemprop="position">7</span>

</div>

<div class="post" itemprop="text">

<div class="title">

<div class="quote-controls">

</div>

<img
src="https://yyz1.discourse-cdn.com/flex035/user_avatar/discourse.threejs.org/click_clock_boom/48/9687_2.png"
class="avatar" loading="lazy" width="24" height="24" />
Click_Clock_Boom:

</div>

> Take a look at this viewer’s explode mechanism:
> <http://glb-viewer.blogspot.com/>

That works well, but only if the model is already split up into separate
pieces. In any case, there’s no source code available so it’s not
especially helpful.

</div>

</div>

<div id="post_8" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/gaojunxiao"
rel="nofollow"><span itemprop="name">gaojunxiao</span></a> </span>

<span class="crawler-post-infos"> March 18, 2020, 1:15am </span>

<span itemprop="position">8</span>

</div>

<div class="post" itemprop="text">

Thank you very much, I have successfully solved this problem myself.
Here are a few ideas to share with you:

1.  determine the central point of the explosion
2.  save the center position of the component before merging the model
3.  exploded in the opposite direction of the explosion point with the
    center of the original component\
    <div class="lightbox-wrapper">

    <a
    href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/b/b29417cd621e027ce577386fb5b303b2613ec749.png"
    class="lightbox"
    data-download-href="/uploads/short-url/ptMhcDxU8Uv5bZVzjkEw2kRtgeZ.png?dl=1"
    rel="nofollow noopener" title="image"><img
    src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b29417cd621e027ce577386fb5b303b2613ec749_2_690x471.png"
    data-base62-sha1="ptMhcDxU8Uv5bZVzjkEw2kRtgeZ"
    srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b29417cd621e027ce577386fb5b303b2613ec749_2_690x471.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/b/b29417cd621e027ce577386fb5b303b2613ec749.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/b/b29417cd621e027ce577386fb5b303b2613ec749.png 2x"
    data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b29417cd621e027ce577386fb5b303b2613ec749_2_10x10.png"
    width="690" height="471" alt="image" /></a>
    <div class="meta">

    <img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
    class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">image</span><span class="informations">881×602
    104 KB</span><img
    src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
    class="fa d-icon d-icon-discourse-expand svg-icon" />

    </div>

    </div>

</div>

</div>

<div id="post_9" class="topic-body crawler-post"
itemprop="suggestedAnswer" itemscope="itemscope"
itemtype="https://schema.org/Answer">

<div class="crawler-post-meta">

<span class="creator" itemprop="author" itemscope="itemscope"
itemtype="http://schema.org/Person">
<a href="https://discourse.threejs.org/u/polarathene"
rel="nofollow"><span itemprop="name">polarathene</span></a> </span>

<span class="crawler-post-infos"> March 25, 2020, 12:00am </span>

<span itemprop="position">9</span>

</div>

<div class="post" itemprop="text">

I tested with a mesh I have in separate parts. It appears to explode the
parts out based on their vector(angle) from world origin(0,0,0). Note
how some parts have not moved(I think the many rings part may not have
been broken up, or all shared the same origin point in this version,
it’s an old asset).

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0.png"
class="lightbox"
data-download-href="/uploads/short-url/euPIVmS9O24xSAK9Sa2GlX5sdBC.png?dl=1"
rel="nofollow noopener" title="explode_mesh_rest"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0_2_535x500.png"
data-base62-sha1="euPIVmS9O24xSAK9Sa2GlX5sdBC"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0_2_535x500.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0.png 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/6/659ab9fea00201702b781c0614b4ebe1ce264aa0_2_10x10.png"
width="535" height="500" alt="explode_mesh_rest" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">explode_mesh_rest</span><span class="informations">586×547
49 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471.png"
class="lightbox"
data-download-href="/uploads/short-url/nbEDDidPQG64BJLPhJl3Z1Fa9Pj.png?dl=1"
rel="nofollow noopener" title="explode_mesh"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471_2_535x500.png"
data-base62-sha1="nbEDDidPQG64BJLPhJl3Z1Fa9Pj"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471_2_535x500.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471.png 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/a/a2834a6bbfdc874a8db66e8837eb6a9c329c6471_2_10x10.png"
width="535" height="500" alt="explode_mesh" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">explode_mesh</span><span class="informations">586×547
103 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

The lighting is also rather dark, I had this issue when first bringing
the model into Three JS from blender, iirc an HDRI envmap and gamma
correction fixed that. I used this asset for an explosion animation too,
but my approach was manually placing the parts to an exploded position,
and then taking those positions for each part to JS to use for handling
animation there between the rest and exploded position.

I suppose an automatic approach could achieve the same with exploding
along a single axis like I have, then taking distance between bounding
boxes, so long as meshes are grouped/detected in some way, it should
produce the same outcome.

This is a screenshot of the exploded position in blender, I don’t have
one of it in Three JS on me atm, but looked the same. For animation
between the two states I used React-Spring.

<div class="lightbox-wrapper">

<a
href="https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/b/b890748759dcb883ab45047e37efde79107c802d.png"
class="lightbox"
data-download-href="/uploads/short-url/qkJlBaOHlDURbOpSEIukqkPbNiR.png?dl=1"
rel="nofollow noopener" title="Screenshot_20200220_031740"><img
src="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b890748759dcb883ab45047e37efde79107c802d_2_690x255.png"
data-base62-sha1="qkJlBaOHlDURbOpSEIukqkPbNiR"
srcset="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b890748759dcb883ab45047e37efde79107c802d_2_690x255.png, https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b890748759dcb883ab45047e37efde79107c802d_2_1035x382.png 1.5x, https://canada1.discourse-cdn.com/flex035/uploads/threejs/original/2X/b/b890748759dcb883ab45047e37efde79107c802d.png 2x"
data-small-upload="https://canada1.discourse-cdn.com/flex035/uploads/threejs/optimized/2X/b/b890748759dcb883ab45047e37efde79107c802d_2_10x10.png"
width="690" height="255" alt="Screenshot_20200220_031740" /></a>

<div class="meta">

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1mYXItaW1hZ2Ugc3ZnLWljb24iIGFyaWEtaGlkZGVuPSJ0cnVlIj48dXNlIHhsaW5rOmhyZWY9IiNmYXItaW1hZ2UiIC8+PC9zdmc+"
class="fa d-icon d-icon-far-image svg-icon" /><span class="filename">Screenshot_20200220_031740</span><span class="informations">1046×388
303 KB</span><img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZmEgZC1pY29uIGQtaWNvbi1kaXNjb3Vyc2UtZXhwYW5kIHN2Zy1pY29uIiBhcmlhLWhpZGRlbj0idHJ1ZSI+PHVzZSB4bGluazpocmVmPSIjZGlzY291cnNlLWV4cGFuZCIgLz48L3N2Zz4="
class="fa d-icon d-icon-discourse-expand svg-icon" />

</div>

</div>

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
<tr id="topic-list-item-20787" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/model-explosion/20787"
class="title raw-link raw-topic-link" itemprop="url">Model explosion</a>
</span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
&#10;</div>
</div></td>
<td class="replies"><span class="posts" title="posts">2</span></td>
<td class="views"><span class="views" title="views">1160</span></td>
<td>November 17, 2020</td>
<td></td>
</tr>
<tr id="topic-list-item-69308" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/how-to-separate-each-face-of-a-mesh-explode-mesh/69308"
class="title raw-link raw-topic-link" itemprop="url">How to separate
each face of a mesh, (explode mesh)</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">5</span></td>
<td class="views"><span class="views" title="views">366</span></td>
<td>August 14, 2024</td>
<td></td>
</tr>
<tr id="topic-list-item-19876" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/i-want-to-shred-an-object-to-particles/19876"
class="title raw-link raw-topic-link" itemprop="url">I want to shred an
object to particles</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/models/1"
class="discourse-tag">models</a> ,  <a
href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a> ,  <a
href="https://discourse.threejs.org/tag/animation/163"
class="discourse-tag">animation</a> ,  <a
href="https://discourse.threejs.org/tag/particles/281"
class="discourse-tag">particles</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">1</span></td>
<td class="views"><span class="views" title="views">4944</span></td>
<td>October 17, 2020</td>
<td></td>
</tr>
<tr id="topic-list-item-32084" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/how-can-i-split-a-glb-model-into-all-parts-in-react-three-fiber/32084"
class="title raw-link raw-topic-link" itemprop="url">How can I split a
glb model into all parts in React Three Fiber</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/gltf/413"
class="discourse-tag">gltf</a> ,  <a
href="https://discourse.threejs.org/tag/glb/628"
class="discourse-tag">glb</a> ,  <a
href="https://discourse.threejs.org/tag/react-three-fiber/736"
class="discourse-tag">react-three-fiber</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">3</span></td>
<td class="views"><span class="views" title="views">3090</span></td>
<td>December 5, 2022</td>
<td></td>
</tr>
<tr id="topic-list-item-12624" class="topic-list-item">
<td class="main-link" itemprop="itemListElement" itemscope=""
itemtype="http://schema.org/ListItem"><span class="link-top-line"> <a
href="https://discourse.threejs.org/t/explosion-effect-in-textgeometry/12624"
class="title raw-link raw-topic-link" itemprop="url">Explosion effect in
textGeometry</a> </span>
<div class="link-bottom-line">
<a href="/c/questions/6" class="badge-wrapper bullet"><span
class="badge-category-bg" style="background-color: #B3B5B4"></span>
<span class="badge-category clear-badge"> <span
class="category-name">Questions</span> </span></a>
<div class="discourse-tags">
<a href="https://discourse.threejs.org/tag/geometry/59"
class="discourse-tag">geometry</a>
</div>
</div></td>
<td class="replies"><span class="posts" title="posts">12</span></td>
<td class="views"><span class="views" title="views">7133</span></td>
<td>August 30, 2021</td>
<td></td>
</tr>
</tbody>
</table>

</div>

</div>

</div>
