<div class="container page" role="main">

<div class="featured-banner">

<div class="section article-header">

# Annotate & hotspot models faster using Threejs and Blender

<div style="display:flex;flex-direction:row;justify-content:center;align-items:center">

<div class="author-image gatsby-image-wrapper"
style="position:relative;overflow:hidden;max-width:202px;max-height:203px">

<div aria-hidden="true" style="width:100%;padding-bottom:100.5%">

</div>

<img
src="data:image/jpeg;base64,/9j/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wgARCAAUABQDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAMEBf/EABQBAQAAAAAAAAAAAAAAAAAAAAL/2gAMAwEAAhADEAAAAZQ3QD2Kkc+QK6IR/8QAGhAAAwADAQAAAAAAAAAAAAAAAAEDERIyIf/aAAgBAQABBQK3r0cjBVISTZbmfR//xAAXEQEBAQEAAAAAAAAAAAAAAAABECEx/9oACAEDAQE/AQyHJ//EABYRAQEBAAAAAAAAAAAAAAAAABABEf/aAAgBAgEBPwHSn//EABsQAAIDAAMAAAAAAAAAAAAAAAERAAIQITGB/9oACAEBAAY/AhRqMW8xnqJc6M//xAAcEAEAAgIDAQAAAAAAAAAAAAABABEQMSFBUWH/2gAIAQEAAT8hKNQlrLIx99Y3gr0gv4MazpYOa3cGf//aAAwDAQACAAMAAAAQXAd8/8QAFhEBAQEAAAAAAAAAAAAAAAAAAREg/9oACAEDAQE/EAaxf//EABcRAAMBAAAAAAAAAAAAAAAAAAEQETH/2gAIAQIBAT8QJVaX/8QAHRABAAICAgMAAAAAAAAAAAAAAQARITEQQVFhkf/aAAgBAQABPxBITBuzQRBosu0L4uw8v67IGqqh4o3wlu4I/GXsdMFdYiJbP//Z"
style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:1;transition-delay:500ms"
aria-hidden="true" alt="Randika Perera- author" />

<img src="/static/326280cba18372cf659060ea2c7913e0/01785/randikap.jpg"
style="position:absolute;top:0;left:0;opacity:1;width:100%;height:100%;object-fit:cover;object-position:center"
loading="lazy" sizes="(max-width: 202px) 100vw, 202px"
srcset="/static/326280cba18372cf659060ea2c7913e0/3dcee/randikap.jpg 200w,
/static/326280cba18372cf659060ea2c7913e0/01785/randikap.jpg 202w"
alt="Randika Perera- author" />

</div>

<div style="display:flex;flex-direction:column;text-align:left;margin:10px">

<span class="author">Randika Perera</span>December 28, 2022

</div>

</div>

</div>

<div class="featured-image gatsby-image-wrapper"
style="position:relative;overflow:hidden;max-width:unset;max-height:unset">

<div aria-hidden="true"
style="width:100%;padding-bottom:38.857142857142854%">

</div>

<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAICAIAAAB2/0i6AAAACXBIWXMAAAsTAAALEwEAmpwYAAABsklEQVQY02OQV1FXVNNS0dRR1dJT09bX0DXU1DfW0DNUVNdW0dIDCmoZmGjqGwERUEpNRx8oAlSspK6loKrBoKyhraqtp6ZjoKFnpAXSZqyibaBpYJZbULJy1VoP3wBlTT0dIzN1PZAUWIGRuo4ByAgNHQYVbT11XQOgbdqGppr6JtZOroFBfjmZCWdP7L168dT6lQsDgoN1TCy9fXxsHV20DM3ByoxBrtDWZ4Do1DI00TUy0zIwi3Q1qsgMmNCcMau3eFpn0fSe2r7WirrijLLUyFgfB0N9Ay0jM4h+dV1DBk2gaw1MgA4DIj0L20RLmXgv48qStNyMpKaq/L6GvJwE//ZEj644hywDEVsVeX1LO6BmUEDoGTFowDUbm+sbm9upiOqoyogL8TnZWORkJBUmByYHWzdE2E4vCEvRFnYx0HX08gFqAVsO06wN0WxiISslxcLE4GJv3tfVOnPqhImdTfOntNdH2HdE20Qrcllqato5OGgC1RuYaAA1A/0MCkZDEyBSBwppaqjISpmbmKQnJ+anxU1oq1wyq6sqyKo1zDxMkcdQRcVAWU4LaK0BKMwArtp6HCgyADsAAAAASUVORK5CYII="
style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:1;transition-delay:500ms"
aria-hidden="true"
alt="Annotate &amp; hotspot models faster using Threejs and Blender - Featured image" />

<img src="/static/d746bc10fa1951ca7fa0c28e0f91b41b/87308/blog-cover.png"
style="position:absolute;top:0;left:0;opacity:1;width:100%;height:100%;object-fit:cover;object-position:center"
loading="lazy" sizes="(max-width: 1455px) 100vw, 1455px"
srcset="/static/d746bc10fa1951ca7fa0c28e0f91b41b/221b3/blog-cover.png 350w,
/static/d746bc10fa1951ca7fa0c28e0f91b41b/a632b/blog-cover.png 700w,
/static/d746bc10fa1951ca7fa0c28e0f91b41b/45437/blog-cover.png 1050w,
/static/d746bc10fa1951ca7fa0c28e0f91b41b/aeb5f/blog-cover.png 1400w,
/static/d746bc10fa1951ca7fa0c28e0f91b41b/87308/blog-cover.png 1455w"
alt="Annotate &amp; hotspot models faster using Threejs and Blender - Featured image" />

</div>

</div>

<div class="blog-post-content">

Threejs provides a great deal of flexibility to visualize 3D models on
the web. It allows you as the developer to import in gltf, glb, fbx or
obj models easily exported from other 3D applications. But generally the
exported model itself is not what you would want to visualize on a web
page.

In order to provide an interactive experience, users often get hotspots
on the 3D model. These hotspots are annotations outside of the 3D space
and exist on the 2D space. Generally hotspots are added with the 3D
model to highlight certain parts of the model being rendered. If you
wanted to combine 2D HTML elements overlaid on to the 3D object hotspots
is the way to go.

To provide interactive capabilities, these hotspot elements can contain
the usual web events associated with an HTML element, such as click,
mouseover, mouseout etc. Using these events you could allow the user to
interact with the hotspots and see additional details of part of the
model, change or update the model by interacting with the click event of
the hotspot. In that sense, hotspots can be the initial facilitator for
interactivity on the web.

The cool thing about using these annotations through threejs is that
even though they exist in the 2D space, they are able to transform the
position when a camera angle is changed. This is handled by Threejs,
where Threejs itself is capable of mapping the coordinates from 3D space
to 2D space.

For this tutorial we would be using a free model imported from
Sketchfab, designed by [Robin
Vandenberghe](https://sketchfab.com/RobinVandenberghe)

[vintage-camera-asahi-pentax](https://sketchfab.com/3d-models/vintage-camera-asahi-pentax-h2-a2d73560b1a841b59875cf2581ffd8cf)

A quick demonstration of the outcome of these annotated hotspots can be
seen below. Feel free to rotate the model around and get a feel on what
we are trying to acheive once it loads.

<div class="iframe">

<div id="label" class="fullscreen">

</div>

</div>

# The Approach

The general approach to introduce hotspots would be the usage of the
CSS2DRenderer – three.js docs. This is the recommended approach in
blending HTML labeling with 3D objects. You could see the usage of the
CSS2DRenderer through this basic example on the threejs website -
<https://threejs.org/examples/#css2d_label>. In this example, you could
see that the placement of the labels are relative to the model.The label
is offsetted based on the positioning of the mesh. I feel that this
approach has both pros and cons as outlined below.

## Pros

1.  The programmatic approach makes positioning easier since its bound
    to the underlying mesh position.
2.  If the mesh position updates the annotated hotspot position is also
    updated with it.

## Cons

1.  If there are many different 3D models integrated in your application
    each label needs to be programmatically added separately.
2.  3D designers don't get visibility of hotspoting in their process.

The pros and cons outlined here could depend on what problem you're
planning to solve. The main con here would be the lack of visibility and
control for a 3D designer on the annotated hotspots during the creative
process. Mainly this could introduce challenges since model updates and
incremental changes to the models will require development effort to
introduce new hotspots.

The approach we are going to look at aims at resolving this issue. Where
the design has the ability to control the positioning and placement of
the hotspots.

# The Process

The process we are looking at is where a 3D designer can provide as much
custom information as possible attached to the meshes as custom
properties which allows the application to be generalized such that it
becomes model agnostic and wouldn’t rely on the type of model and
specific code tied to the model being rendered.

Let’s now dive in on how to get started with this approach. For this
tutorial we will be using Blender to customize the models. Blender is an
open source 3D graphics software which supports modeling, sculpting, VFX
and animation.

# Model Setup

First import the model on to Blender. We have used gltf as the format.

<figure class="gatsby-resp-image-figure" style="">
<span class="gatsby-resp-image-wrapper"
style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: 521px; ">
<span class="gatsby-resp-image-background-image"
style="padding-bottom: 121.484375%; position: relative; bottom: 0; left: 0; background-image: url(&#39;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAYCAYAAAD6S912AAAACXBIWXMAAAsTAAALEwEAmpwYAAADfElEQVQ4y5VV23LbVBTVSyYzPJDUiWXLji1blixbN0uyZUu+NdAWUhho2mlfgA7MUC4fQB8KA7++2OuEI5yQwvCw5hwdba29zr7J6HW78DwHcRIjDEI0Gg1EUYSunB8dHeH4+Ph/wXi1LvDseolwP0c+S5GmN8iyrN4TSZJgNpvV4JleD/dGVZZ4+OxHJKuP4I9dxHGM8XisDHzfRxAEcBwHVVWpDzzPw3Q6VWd8NxqN4LpubWcUyyVW5UaMM1xcXKDVasGyLNi2rQg3mw2KolDrbrfDfD5XzqhYK9d7ijGiYIpyJaQCeu73++h0OoqQSklGkjzP1ar390LeGY+e/4Su7WI4sDGZTBQhFbbbbaVwtVop0qXcRINnGuuDPWE8evEznHGoCBkLXplkzWZTOWDsaFhKrO8Dc7AtK2VHGPksUUpYKoPBoI5hr9erCf9BUlW3sBbs/loNXkd/TFLGj4RMEB2t1+v3Et0l3VdrGAwy48b0MylMBq9smuYtwn8jq0nF1mABR3Gi0O/bEjtTFHZgttqS5duE/6mUhLvtFq7TRzhxkcZTuEOpxfMTNE4+wMT3VP0dktABwfO7UAq5WT7+CuXTN1hdfY/8kx8w+/g7pE/eYJpu4blOXcCMM7uB4TkEz3R4jMVCauzyGrvPXiPfv8Ao+xT+8nME1TVsL8FFt6O6iAljWTG2uk5ZERocJoqwrEr5qI3RoAffHcKT65tnJwpWu6USxlZjWxEkplKSs6+5EqwURfjw8hIDZ6ikh2GEvj0Q7xasTrduQSZOEw6HQ6WSCjX4zDJThNv9Tkhs5Y3etRHJeA0qZPz4jmCseMZOOiSsFabzHAPxSkMe0pAxoUcaU6GeLnom8ozO7iVkn+oBGYZhDX7M7NGQV86yXGZeKI4Zv5vYMTQ6OTXh3RrT9bTf7zGV4HesFpI4wsiR2LaaaJx+iPOzU5w3TmGeN2A2G2iePUC3Y6lvDV39eqLcjKESGyENohTuNEexvkSYrjD0ZICMpaPcWJUUV6In4LtaoSar24uKywL55ik2L3/F1es/8OTr33H1zW/YvnyH+RdvBb8oFF++RXH9Dtnjb2VAlPJPec+8o3zfH6srZ5n8iGTMBTI8wmCCOArgjRyMPRdWy8TZg1Oxa/99ZRLenXt8XiwWKjlMCEd8KsmZyZ8xP/gl8Jn1ycSS8E8uYthbaeQFbgAAAABJRU5ErkJggg==&#39;); background-size: cover; display: block;"></span>
<img
src="/static/b93de0eeb22b214fa97550b796bfb793/bb9c5/1-Importing.png"
title="gltf importing within Blender" class="gatsby-resp-image-image"
style="width:100%;height:100%;margin:0;vertical-align:middle;position:absolute;top:0;left:0;"
srcset="/static/b93de0eeb22b214fa97550b796bfb793/6f3f2/1-Importing.png 256w,
/static/b93de0eeb22b214fa97550b796bfb793/01e7c/1-Importing.png 512w,
/static/b93de0eeb22b214fa97550b796bfb793/bb9c5/1-Importing.png 521w"
sizes="(max-width: 521px) 100vw, 521px" loading="lazy"
alt="gltf importing within Blender" /> </span>
<figcaption>gltf importing within Blender</figcaption>
</figure>

This should load up the model within Blender. If the model appears too
dark or is not visually visible as in the image below, you could add
additional lights, sky light, area or a point light to brighten up the
perspective view.

<figure class="gatsby-resp-image-figure" style="">
<span class="gatsby-resp-image-wrapper"
style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: 788px; ">
<span class="gatsby-resp-image-background-image"
style="padding-bottom: 72.65624999999999%; position: relative; bottom: 0; left: 0; background-image: url(&#39;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAPCAYAAADkmO9VAAAACXBIWXMAAAsTAAALEwEAmpwYAAAC70lEQVQ4y3VUa1PaQBTNl3a0WqxYozUhgkB458kjD0gIICSID6x92Ham7f//D3t6d5WWzrQf7mRzN/fsOWfPROo6bdZoNZiu66xQKDBN05iqqkxRFFHb6+3i/U1tesVikUnRKGRhGGIwGIA/oygS6+3q9/t/PXl5nve7eN91XfR6PUgEwB4/P2K1WrHZbMYuLy//W/P5fOt9/s89aXr9jaVpisViwRugDVHba160jyRJ4DoOet0uptOp6PHa/k6KxxPOjAOwzQe8+CEcdPM+Ho9JUheObYnySHYQ+HSAjWEYYPZMQJpMEgHIGXL/huRjv98jPwMMyBtVOYNlmWL4w8N73K/vcHO9wjJLEfg+bNozOy2YreYTYJSM2TNd5pCcBxpa390iGg2RpXMMiFUyjnF3e4OfP74T6xlCAvd9TxyqV8qoyG/QKJwKJRJ5wbJsidD3WbWoYTIK8fiwxmKakMwYvjfA7c0K00kCyzSE3E67DV2v0s060FQFF/l9mJVzLMgmKSWp3K/ZdMIqxweoygcwzt+hJOdBGROD375+ETIDYsUlGp0OPS2ywkKjXkdTlQXLgW1C4t5xqvxSjLKGxrs8erULtEsqipqGFnnD/fr04QFfHj8LmffrNWzbpgMVaOfn0Esa9JM8RuT9b8ArymHYc6ETQ7tcgEXgNUVGWT5EFHhYXS0RkPxPHz+KyBwd5bG3t4dc7jVO5WMYehnZcvkHcBQGzDXIG6JuX6hw9QuYJQVtkuM5JtLFHI2ajmgYQpZl7O/vY3d3F3uvXuGEAB2aXXJAQmVduvaqcsqSKEanqKKjncJr12GT0WbxDHajSqdnGBGYQ7krlUrY3dnByxcvcHh4iJquC9b8LqRlmrG+0UK3WWOr1TW6nSbq5GNotdFv6nAqGtx6BUOKSo9M55Hh/uVyORzl86CfCWU0QJZlTzlcPN8yz2FKzREN1M/eInZp2KLbJOm+ayGORhSdiWARxzEMw4BJMeLrDRjP4S/PdOd1U/zWCwAAAABJRU5ErkJggg==&#39;); background-size: cover; display: block;"></span>
<img src="/static/5e7f177b622931426aaa4c16897075ef/ea7fb/2-Model.png"
title="Loaded model on viewport" class="gatsby-resp-image-image"
style="width:100%;height:100%;margin:0;vertical-align:middle;position:absolute;top:0;left:0;"
srcset="/static/5e7f177b622931426aaa4c16897075ef/6f3f2/2-Model.png 256w,
/static/5e7f177b622931426aaa4c16897075ef/01e7c/2-Model.png 512w,
/static/5e7f177b622931426aaa4c16897075ef/ea7fb/2-Model.png 788w"
sizes="(max-width: 788px) 100vw, 788px" loading="lazy"
alt="Loaded model on viewport" /> </span>
<figcaption>Loaded model on viewport</figcaption>
</figure>

Blender provides dummy objects which we would be using as positional
markers to indicate where the models would be placed. This allows the
designer to freely place the dummy objects on the model and control the
position of them.

You can use Blender **Empty objects** to create dummy objects. As you
can see below we have used a spherical empty object. Empty objects are
not rendered out since they do not have any geometry associated with it.

<figure class="gatsby-resp-image-figure" style="">
<span class="gatsby-resp-image-wrapper"
style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: 665px; ">
<span class="gatsby-resp-image-background-image"
style="padding-bottom: 85.9375%; position: relative; bottom: 0; left: 0; background-image: url(&#39;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAARCAYAAADdRIy+AAAACXBIWXMAAAsTAAALEwEAmpwYAAADC0lEQVQ4y41U23LSUBTNs6OgQIBwh0JIwjWBQEISCE24DpVWK15m1D7Yy9gP8MFv8JuX+5xKh9ap48OanZPkrLP23msf4bXVh7/W0dK70LtddJ9Ap9P5LwhDs4+u3obWaPCN9XoduVwOmUwG2WyWP7NYrVb5t0OoqoparQZN03hUFAWCZduYTHzCBKPRCO12m6NUKiGVSt2DbRoOhxgMBg9gmuaDteC5Lqa+j81mg8ViAZfWlmXxExlROp3mYOqDIIBP//4LgmMPMHZtfL24wO3td+x2O/6B1YOlvSft9/tYrVaYz+f84MfYvyfCESbeGNvtFmdnZ1wFS+Po6OieLJlMwjAMLJdLzGYzvvkpCCfXv7D+/BOB79HPcziOQ2pMtDtdSluGJGU4mMI94SH+IvRmpxiHJ7QISfISrjNCp6VClStIiy8hxl4gFn0Gg2y1Xq/5Jka8B1sfEgueY4NhPqc6zEL4wQL+5gt6kzdQBhsowxOOVncAa0iwbOi6zmvMYhiG98ScMAiIZDq9e0GE03CJxfkN+tNz1P8QavYWFbmJulzjfhTFJBKJBK8xcwRr4vHx8R0h8x/DvksOT1lDuZBFMh6llCM8FvJZaGRkVVXI7FmkkiI1LIVioYA8GV8mmznkY8EdexgRyWJ+13rP82D0emTkBkplqmNa4qjJCnqmhVKlBilbRDZfJpQgkQvEeAzx2Ct0aCCE+WqB4zCgdGdc4Xg85iaWZdZhiXdYTMTQtiiDTz9gLq/QDC7Rmd2gNb1ALl8gdUdE1uIDItjuCJ4/5goXy7tJadBcs1HL5/P3XmS+VFSNZr6JVrvNo6Ko6PUMao5B94GO3bu3EFgxA1LI1LFuMUJ+SdCg1+sKpV1GQhTJ9Ke4vrrEig6dkgDXdWBbQ955dksZhs4tJzCSwxEKKXVnZKOaI1WZFGo5iZ4lmE0VZkOGIZehVYq8CQ3KolQs8hG16OL4+OE9hMczufeUmk+jGn+OeiqKRiaOViFFoEuinEGzlMPLaBRJUp6hOkciESpJBVeX3/AbfuQipqj3MfYAAAAASUVORK5CYII=&#39;); background-size: cover; display: block;"></span>
<img src="/static/0961ee44858af6593038dd7854eab139/5f4af/3-Dummy.png"
title="Creating Empties to represent hotspots"
class="gatsby-resp-image-image"
style="width:100%;height:100%;margin:0;vertical-align:middle;position:absolute;top:0;left:0;"
srcset="/static/0961ee44858af6593038dd7854eab139/6f3f2/3-Dummy.png 256w,
/static/0961ee44858af6593038dd7854eab139/01e7c/3-Dummy.png 512w,
/static/0961ee44858af6593038dd7854eab139/5f4af/3-Dummy.png 665w"
sizes="(max-width: 665px) 100vw, 665px" loading="lazy"
alt="Creating Empties to represent hotspots" /> </span>
<figcaption>Creating Empties to represent hotspots</figcaption>
</figure>

But how would you specify which functionality is controlled and which
underlying model would the dummy object be controlling? This is where we
would be making use of custom properties provided for each mesh.

As you can see in the image below custom properties can be added which
could be used to provide additional information to the application about
the dummy object.

<figure class="gatsby-resp-image-figure" style="">
<span class="gatsby-resp-image-wrapper"
style="position: relative; display: block; margin-left: auto; margin-right: auto; max-width: 665px; ">
<span class="gatsby-resp-image-background-image"
style="padding-bottom: 85.9375%; position: relative; bottom: 0; left: 0; background-image: url(&#39;data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAARCAYAAADdRIy+AAAACXBIWXMAAAsTAAALEwEAmpwYAAADWElEQVQ4y4VTTY/bVBT1HiHINDPNp/NhJ/G3n2PHduI435kkM5lpJs0sKk1FRRegKaXdIUQllizYIDELFrBAot2ASv/h4b4XZsSCwuLovvfsd965594r3dz8hJ9/+RWv3/yBN69/w+bBGUJTxcPExow10AsYekmCNE2RUJxOp5jNZhgMBuj1evB9H0EQoN1uo9vtQvr6m6/w480P+PPdO7x9+zuWixlCQ8HlgGHua2jpjrh4SziZTLBcLnFxcYHtdourqytcXl6K/fn5OaQXL5/h6aeP8Pz6Cb7/7hW+ffUSu0WKB6GGYyJsaMYdIVfV7/cxHo9xdnYmsNvtsNlsxPrk5ARS4LtoMwe1agV6q4nVYopnnz3G41WCmdeEQWecZLVaYbFYCDKu9N/A/5OGgxRhpwO5kIOlt2BoGvK5HIa9AMvQgqmqGA6H4nUeby++D9JoskKS9tHtRdC1FrSmCqVeQ7FQgNVUoCg1kSr3bTQa3RG+T6XU0prodT28+Pwp0vEERwcfwnVsxGGIo2wWtVpNEHGPeHX/V+G9gwwy2Q9gaUUwi1f1EJVSAbvtQ1KZQ7VSEaly/24r/Z+EmczHyBx8BJ8VseozsHoJXqkIo9FEoZBHtVoVhKenpwK8KLzfeOVv4z8hVcp5HB1mUbyfhW9WYJhNVOsVatYOCvkcKqRwOp1hvV4LQl7t+XwuFPNC8TXH8fGxaHpJLuVRzN9HVS5AN3S0LAe2wzAajlAipYqiiFQ61Al8KmzbFrAsC4wxOI4jwM84qaSSGtMw0O7E0G0LclWmrt8iDCMaJwaVCG26kKNWyuXyIsqyDIPu8FgulwkyPV7aj16320GbZpH5IUbkj+e5MC0TAalZph00VAW6rgsi7qdCfclV8/k1TQu1ep32qjjnj0jr0wX5wedzLjzy6Uef1PZpglKmi8sGWXF0eA9lsqCh1mmqZNFaPmUQ+G2x5g9zG6TJeEBV7COOI7jMQyeMxeRE1IcueVSnPrTIUzZ9An91jYDj5Brp5ktE6y8IzxES3MknsF0PUpom6CZEQIRRFO3JKMZxTOl7orFd14Xbpgf9eB8JjOBweNHfZyTAZZBCUhJFIeIkEJEXIwz3pLyKd4SuI1JzXXsfCczdQ5zRd8Zc/AWLvzLlKEY5FgAAAABJRU5ErkJggg==&#39;); background-size: cover; display: block;"></span>
<img
src="/static/159755d476772352288740d40f86a440/5f4af/4-CustomProperties.png"
title="Adding Custom Properties for the Tooltip"
class="gatsby-resp-image-image"
style="width:100%;height:100%;margin:0;vertical-align:middle;position:absolute;top:0;left:0;"
srcset="/static/159755d476772352288740d40f86a440/6f3f2/4-CustomProperties.png 256w,
/static/159755d476772352288740d40f86a440/01e7c/4-CustomProperties.png 512w,
/static/159755d476772352288740d40f86a440/5f4af/4-CustomProperties.png 665w"
sizes="(max-width: 665px) 100vw, 665px" loading="lazy"
alt="Adding Custom Properties for the Tooltip" /> </span>
<figcaption>Adding Custom Properties for the Tooltip</figcaption>
</figure>

We have added the tooltip text as a custom property alongside the
hotspot so that the tooltip could be dynamically loaded on the
application.

Finally, we would be exporting the model to the **gltf format** and make
sure to include the external data, so that the custom properties
introduced will be preserved during the export.

# Coding the Hotpots!

Let’s look at how the application can make use of the dummy objects and
the external data that gets embedded with the model at the code level.

First we would be setting up the threejs codebase. The code below
outlines the setup.

<div class="gatsby-highlight" data-language="js:">

``` js:
import * as THREE from "three"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { Color, Vector3 } from "three"
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer"
```

</div>

# Generalizing the Application

We would now read the dummy objects and then introduce the HTML
hotspots. We need to iterate through the meshes on import and we would
extract the tooltip text from the dummy object user data section.

This code snippet shows how we filter the hotspots by traversing through
the meshes and matching by part of the name.

<div class="gatsby-highlight" data-language="js:">

``` js:
const loader = new GLTFLoader();
loader.load("Camera.glb", function (gltf) {
  //Traverse through the meshes
  gltf.scene.children.forEach((child) => {
    child.traverse((n) => {
      // Find the hotspots
      if (n.name && n.name.includes("hotspot")) {
        // ...
      }
    }
  });
```

</div>

This code snippered outlines how we create the HTML 2D elements that
would be placed in-place where the hotspot is located in the 3d spae and
how the userData section is read to extract the data we embedded in the
model through Blender.

<div class="gatsby-highlight" data-language="js:">

``` js:
const hotspot = document.createElement("div")
hotspot.className = "hotspot"
hotspot.setAttribute("name", n.name)

// Add a tooltip element
const tooltip = document.createElement("div")
tooltip.className = "tooltip"

// Use the custom properties embedded from Blender through the userData section.
tooltip.innerHTML = n.userData.tooltipText
hotspot.appendChild(tooltip)

const hotspotLabel = new CSS2DObject(hotspot)
hotspotLabel.position.set(0, 0, 0)
n.add(hotspotLabel)
hotspotLabel.layers.set(0)
```

</div>

Thats all folks! If you want more insights, have questions or need to
provide a 3D virtual web experience for your ecommerce store online do
reach out to us [here](https://www.tetranyde.com/contact) and we can
have a conversation.

</div>

<div class="pagination -post">

- <a href="/blog/hospitality-tech-trends" rel="prev"></a>

  <span class="icon -left">![](data:image/svg+xml;base64,PHN2ZyBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjAiIHZpZXdib3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIxZW0iIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGc+PHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgyNHYyNEgweiIgLz48cGF0aCBkPSJNNy44MjggMTFIMjB2Mkg3LjgyOGw1LjM2NCA1LjM2NC0xLjQxNCAxLjQxNEw0IDEybDcuNzc4LTcuNzc4IDEuNDE0IDEuNDE0eiIgLz48L2c+PC9zdmc+)</span>
  Previous

  <span class="page-title">Top 7 Tech Trends Re-defining the Hospitality
  Industry</span>

- <a href="/blog/six-reasons-resource-augmentation" rel="next"></a>

  Next
  <span class="icon -right">![](data:image/svg+xml;base64,PHN2ZyBzdHJva2U9ImN1cnJlbnRDb2xvciIgZmlsbD0iY3VycmVudENvbG9yIiBzdHJva2Utd2lkdGg9IjAiIHZpZXdib3g9IjAgMCAyNCAyNCIgaGVpZ2h0PSIxZW0iIHdpZHRoPSIxZW0iIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGc+PHBhdGggZmlsbD0ibm9uZSIgZD0iTTAgMGgyNHYyNEgweiIgLz48cGF0aCBkPSJNMTYuMTcyIDExbC01LjM2NC01LjM2NCAxLjQxNC0xLjQxNEwyMCAxMmwtNy43NzggNy43NzgtMS40MTQtMS40MTRMMTYuMTcyIDEzSDR2LTJ6IiAvPjwvZz48L3N2Zz4=)</span>

  <span class="page-title">6 reasons you need Resource Augmentation
  </span>

</div>

</div>
