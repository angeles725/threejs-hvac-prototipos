<div id="content" class="layout__content" role="main">

<div class="layout__header reference-layout__header">

# WebGL best practices

<div class="section content-section">

WebGL is a complicated API, and it's often not obvious what the
recommended ways to use it are. This page tackles recommendations across
the spectrum of expertise, and not only highlights dos and don'ts, but
also details *why*. You can rely on this document to guide your choice
of approach, and ensure you're on the right track no matter what browser
or hardware your users run.

</div>

</div>

## In this article

- <a href="#address_and_eliminate_webgl_errors"
  data-glean-id="toc_click: #address_and_eliminate_webgl_errors">Address
  and eliminate WebGL errors</a>
- <a href="#understand_extension_availability"
  data-glean-id="toc_click: #understand_extension_availability">Understand
  extension availability</a>
- <a href="#understand_system_limits"
  data-glean-id="toc_click: #understand_system_limits">Understand system
  limits</a>
- <a href="#avoid_invalidating_fbo_attachment_bindings"
  data-glean-id="toc_click: #avoid_invalidating_fbo_attachment_bindings">Avoid
  invalidating FBO attachment bindings</a>
- <a href="#delete_objects_eagerly"
  data-glean-id="toc_click: #delete_objects_eagerly">Delete objects
  eagerly</a>
- <a href="#lose_contexts_eagerly"
  data-glean-id="toc_click: #lose_contexts_eagerly">Lose contexts
  eagerly</a>
- <a href="#flush_when_expecting_results"
  data-glean-id="toc_click: #flush_when_expecting_results">Flush when
  expecting results</a>
- <a href="#avoid_blocking_api_calls_in_production"
  data-glean-id="toc_click: #avoid_blocking_api_calls_in_production">Avoid
  blocking API calls in production</a>
- <a href="#always_enable_vertex_attrib_0_as_an_array"
  data-glean-id="toc_click: #always_enable_vertex_attrib_0_as_an_array">Always
  enable vertex attrib 0 as an array</a>
- <a href="#estimate_a_per-pixel_vram_budget"
  data-glean-id="toc_click: #estimate_a_per-pixel_vram_budget">Estimate a
  per-pixel VRAM Budget</a>
- <a href="#consider_rendering_to_a_smaller_back_buffer"
  data-glean-id="toc_click: #consider_rendering_to_a_smaller_back_buffer">Consider
  rendering to a smaller back buffer</a>
- <a href="#batch_draw_calls"
  data-glean-id="toc_click: #batch_draw_calls">Batch draw calls</a>
- <a href="#avoid_ifdef_gl_es"
  data-glean-id="toc_click: #avoid_ifdef_gl_es">Avoid "#ifdef GL_ES"</a>
- <a href="#prefer_doing_work_in_the_vertex_shader"
  data-glean-id="toc_click: #prefer_doing_work_in_the_vertex_shader">Prefer
  doing work in the vertex shader</a>
- <a href="#compile_shaders_and_link_programs_in_parallel"
  data-glean-id="toc_click: #compile_shaders_and_link_programs_in_parallel">Compile
  Shaders and Link Programs in parallel</a>
- <a href="#prefer_khr_parallel_shader_compile"
  data-glean-id="toc_click: #prefer_khr_parallel_shader_compile">Prefer
  KHR_parallel_shader_compile</a>
- <a href="#dont_check_shader_compile_status_unless_linking_fails"
  data-glean-id="toc_click: #dont_check_shader_compile_status_unless_linking_fails">Don't
  check shader compile status unless linking fails</a>
- <a href="#be_precise_with_glsl_precision_annotations"
  data-glean-id="toc_click: #be_precise_with_glsl_precision_annotations">Be
  precise with GLSL precision annotations</a>
- <a href="#prefer_builtins_instead_of_building_your_own"
  data-glean-id="toc_click: #prefer_builtins_instead_of_building_your_own">Prefer
  builtins instead of building your own</a>
- <a href="#use_mipmaps_for_any_texture_youll_see_in_3d"
  data-glean-id="toc_click: #use_mipmaps_for_any_texture_youll_see_in_3d">Use
  mipmaps for any texture you'll see in 3d</a>
- <a href="#dont_assume_you_can_render_into_float_textures"
  data-glean-id="toc_click: #dont_assume_you_can_render_into_float_textures">Don't
  assume you can render into float textures</a>
- <a href="#some_formats_e.g._rgb_may_be_emulated"
  data-glean-id="toc_click: #some_formats_e.g._rgb_may_be_emulated">Some
  formats (e.g., RGB) may be emulated</a>
- <a href="#avoid_alphafalse_which_can_be_expensive"
  data-glean-id="toc_click: #avoid_alphafalse_which_can_be_expensive">Avoid
  alpha:false, which can be expensive</a>
- <a href="#consider_compressed_texture_formats"
  data-glean-id="toc_click: #consider_compressed_texture_formats">Consider
  compressed texture formats</a>
- <a href="#memory_usage_of_depth_and_stencil_formats"
  data-glean-id="toc_click: #memory_usage_of_depth_and_stencil_formats">Memory
  usage of depth and stencil formats</a>
- <a
  href="#teximagetexsubimage_uploads_esp._videos_can_cause_pipeline_flushes"
  data-glean-id="toc_click: #teximagetexsubimage_uploads_esp._videos_can_cause_pipeline_flushes">texImage/texSubImage
  uploads (esp. videos) can cause pipeline flushes</a>
- <a href="#use_texstorage_to_create_textures"
  data-glean-id="toc_click: #use_texstorage_to_create_textures">Use
  texStorage to create textures</a>
- <a href="#use_invalidateframebuffer"
  data-glean-id="toc_click: #use_invalidateframebuffer">Use
  invalidateFramebuffer</a>
- <a href="#use_non-blocking_async_data_readback"
  data-glean-id="toc_click: #use_non-blocking_async_data_readback">Use
  non-blocking async data readback</a>
- <a href="#devicepixelratio_and_high-dpi_rendering"
  data-glean-id="toc_click: #devicepixelratio_and_high-dpi_rendering"><code>devicePixelRatio</code>
  and high-dpi rendering</a>
- <a href="#resizeobserver_and_device-pixel-content-box"
  data-glean-id="toc_click: #resizeobserver_and_device-pixel-content-box">ResizeObserver
  and 'device-pixel-content-box'</a>
- <a href="#use_webgl_provoking_vertex_when_its_available"
  data-glean-id="toc_click: #use_webgl_provoking_vertex_when_its_available">Use
  <code>WEBGL_provoking_vertex</code> when it's available</a>

<div class="layout__body reference-layout__body">

<div class="section content-section"
aria-labelledby="address_and_eliminate_webgl_errors">

## <a href="#address_and_eliminate_webgl_errors"
class="heading-anchor">Address and eliminate WebGL errors</a>

Your application should run without generating any WebGL errors (as
returned by `getError`). Every WebGL error is reported in the Web
Console as a JavaScript warning with a descriptive message. After too
many errors (32 in Firefox), WebGL stops generating descriptive
messages, which really hinders debugging.

The *only* errors a well-formed page generates are `OUT_OF_MEMORY` and
`CONTEXT_LOST`.

</div>

<div class="section content-section"
aria-labelledby="understand_extension_availability">

## <a href="#understand_extension_availability"
class="heading-anchor">Understand extension availability</a>

The availability of most WebGL extensions depends on the client system.
When using WebGL extensions, if possible, try to make them optional by
gracefully adapting to the case there they are not supported.

These WebGL 1 extensions are universally supported, and can be relied
upon to be present:

- ANGLE_instanced_arrays
- EXT_blend_minmax
- OES_element_index_uint
- OES_standard_derivatives
- OES_vertex_array_object
- WEBGL_debug_renderer_info
- WEBGL_lose_context

*(see also:
<a href="https://kdashg.github.io/misc/webgl/webgl-feature-levels.html"
class="external" target="_blank"
title="External link (opens in new tab)">WebGL feature levels and %
support</a>)*

Consider polyfilling these into WebGLRenderingContext, like:
<a href="https://github.com/kdashg/misc/blob/tip/webgl/webgl-v1.1.js"
class="external" target="_blank"
title="External link (opens in new tab)">https://github.com/kdashg/misc/blob/tip/webgl/webgl-v1.1.js</a>

</div>

<div class="section content-section"
aria-labelledby="understand_system_limits">

## <a href="#understand_system_limits" class="heading-anchor">Understand
system limits</a>

Similarly to extensions, the limits of your system will be different
than your clients' systems! Don't assume you can use thirty texture
samplers per shader just because it works on your machine!

The minimum requirements for WebGL are quite low. In practice,
effectively all systems support at least the following:

``` brush:
MAX_CUBE_MAP_TEXTURE_SIZE: 4096
MAX_RENDERBUFFER_SIZE: 4096
MAX_TEXTURE_SIZE: 4096
MAX_VIEWPORT_DIMS: [4096,4096]
MAX_VERTEX_TEXTURE_IMAGE_UNITS: 4
MAX_TEXTURE_IMAGE_UNITS: 8
MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8
MAX_VERTEX_ATTRIBS: 16
MAX_VARYING_VECTORS: 8
MAX_VERTEX_UNIFORM_VECTORS: 128
MAX_FRAGMENT_UNIFORM_VECTORS: 64
ALIASED_POINT_SIZE_RANGE: [1,100]
```

Your desktop may support 16k textures, or maybe 16 texture units in the
vertex shader, but most other systems don't, and content that works for
you will not work for them!

</div>

<div class="section content-section"
aria-labelledby="avoid_invalidating_fbo_attachment_bindings">

## <a href="#avoid_invalidating_fbo_attachment_bindings"
class="heading-anchor">Avoid invalidating FBO attachment bindings</a>

Almost any change to an FBO's attachment bindings will invalidate its
framebuffer completeness. Set up your hot framebuffers ahead of time.

In Firefox, setting the pref `webgl.perf.max-warnings` to `-1` in
about:config will enable performance warnings that include warnings
about FB completeness invalidations.

</div>

<div class="section content-section"
aria-labelledby="avoid_changing_vao_attachments_vertexattribpointer_disableenablevertexattribarray">

### <a
href="#avoid_changing_vao_attachments_vertexattribpointer_disableenablevertexattribarray"
class="heading-anchor">Avoid changing VAO attachments
(vertexAttribPointer, disable/enableVertexAttribArray)</a>

Drawing from static, unchanging VAOs is faster than mutating the same
VAO for every draw call. For unchanged VAOs, browsers can cache the
fetch limits, whereas when VAOs change, browsers must revalidate and
recalculate limits. The overhead for this is relatively low, but
re-using VAOs means fewer `vertexAttribPointer` calls too, so it's worth
doing wherever it's easy.

</div>

<div class="section content-section"
aria-labelledby="delete_objects_eagerly">

## <a href="#delete_objects_eagerly" class="heading-anchor">Delete objects
eagerly</a>

Don't wait for the garbage collector/cycle collector to realize objects
are orphaned and destroy them. Implementations track the liveness of
objects, so 'deleting' them at the API level only releases the handle
that refers to the actual object. (conceptually releasing the handle's
ref-pointer to the object) Only once the object is unused in the
implementation is it actually freed. For example, if you never want to
access your shader objects directly again, just delete their handles
after attaching them to a program object.

</div>

<div class="section content-section"
aria-labelledby="lose_contexts_eagerly">

## <a href="#lose_contexts_eagerly" class="heading-anchor">Lose contexts
eagerly</a>

Consider also eagerly losing WebGL contexts via the `WEBGL_lose_context`
extension when you're definitely done with them and no longer need the
target canvas's rendering results. Note that this is not necessary to do
when navigating away from a page - don't add an unload event handler
just for this purpose.

</div>

<div class="section content-section"
aria-labelledby="flush_when_expecting_results">

## <a href="#flush_when_expecting_results" class="heading-anchor">Flush
when expecting results</a>

Call `flush()` when expecting results such as queries, or at completion
of a rendering frame.

Flush tells the implementation to push all pending commands out for
execution, flushing them out of the queue, instead of waiting for more
commands to enqueue before sending for execution.

For example, it is possible for the following to never complete without
context loss:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
sync = glFenceSync(GL_SYNC_GPU_COMMANDS_COMPLETE, 0);
glClientWaitSync(sync, 0, GL_TIMEOUT_IGNORED);
```

</div>

WebGL doesn't have a SwapBuffers call by default, so a flush can help
fill the gap, as well.

</div>

<div class="section content-section"
aria-labelledby="use_webgl.flush_when_not_using_requestanimationframe">

### <a href="#use_webgl.flush_when_not_using_requestanimationframe"
class="heading-anchor">Use <code>webgl.flush()</code> when not using
requestAnimationFrame</a>

When not using RAF, use `webgl.flush()` to encourage eager execution of
enqueued commands.

Because RAF is directly followed by the frame boundary, an explicit
`webgl.flush()` isn't really needed with RAF.

</div>

<div class="section content-section"
aria-labelledby="avoid_blocking_api_calls_in_production">

## <a href="#avoid_blocking_api_calls_in_production"
class="heading-anchor">Avoid blocking API calls in production</a>

Certain WebGL entry points - including `getError` and `getParameter` -
cause synchronous stalls on the calling thread. Even basic requests can
take as long as 1ms, but they can take even longer if they need to wait
for all graphics work to be completed (with an effect similar to
`glFinish()` in native OpenGL).

In production code, avoid such entry points, especially on the browser
main thread where they can cause the entire page to jank (often
including scrolling or even the whole browser).

- `getError()`: causes a flush + round-trip to fetch errors from the GPU
  process).

  For example, within Firefox, the only time glGetError is checked is
  after allocations (`bufferData`, `*texImage*`, `texStorage*`) to pick
  up any GL_OUT_OF_MEMORY errors.

- `getShader/ProgramParameter()`, `getShader/ProgramInfoLog()`, other
  `get`s on shaders/programs: flush + shader compile + round-trip, if
  not done after shader compilation is complete. (See also [parallel
  shader compilation](#compile_shaders_and_link_programs_in_parallel)
  below.)

- `get*Parameter()` in general: possible flush + round-trip. In some
  cases, these will be cached to avoid the round-trip, but try to avoid
  relying on this.

- `checkFramebufferStatus()`: possible flush + round-trip.

- `getBufferSubData()`: usual finish + round-trip. (This is okay for
  READ buffers in conjunction with fences - see [async data
  readback](#use_non-blocking_async_data_readback) below.)

- `readPixels()` to the CPU (i.e., without an UNPACK buffer bound):
  finish + round-trip. Instead, use GPU-GPU `readPixels` in conjunction
  with async data readback.

</div>

<div class="section content-section"
aria-labelledby="always_enable_vertex_attrib_0_as_an_array">

## <a href="#always_enable_vertex_attrib_0_as_an_array"
class="heading-anchor">Always enable vertex attrib 0 as an array</a>

If you draw without vertex attrib 0 enabled as an array, you will force
the browser to do complicated emulation when running on desktop OpenGL
(such as on macOS). This is because in desktop OpenGL, nothing gets
drawn if vertex attrib 0 is not array-enabled. You can use
`bindAttribLocation` to force a vertex attribute to use location 0, and
use `enableVertexAttribArray(0)` to make it array-enabled.

</div>

<div class="section content-section"
aria-labelledby="estimate_a_per-pixel_vram_budget">

## <a href="#estimate_a_per-pixel_vram_budget"
class="heading-anchor">Estimate a per-pixel VRAM Budget</a>

WebGL doesn't offer APIs to query the maximum amount of video memory on
the system because such queries are not portable. Still, applications
must be conscious of VRAM usage and not just allocate as much as
possible.

One technique pioneered by the Google Maps team is the notion of a
*per-pixel VRAM budget*:

1\) For one system (e.g., a particular desktop / laptop), decide the
maximum amount of VRAM your application should use. 2) Compute the
number of pixels covered by a maximized browser window. E.g.
`(window.innerWidth * devicePixelRatio) * (window.innerHeight * window.devicePixelRatio)`
3) The per-pixel VRAM budget is (1) divided by (2), and is a constant.

This constant should *generally* be portable among systems. Mobile
devices typically have smaller screens than powerful desktop machines
with large monitors. Re-compute this constant on a few target systems to
get a reliable estimate.

Now adjust all internal caching in the application (WebGLBuffers,
WebGLTextures, etc.) to obey a maximum size, computed by this constant
multiplied by the number of pixels covered by the *current* browser
window. This requires estimating the number of bytes consumed by each
texture, for example. The cap also must typically be updated as the
browser window resizes, and older resources above the limit must be
purged.

Keeping the application's VRAM usage under this cap will help to avoid
out-of-memory errors and associated instability.

</div>

<div class="section content-section"
aria-labelledby="consider_rendering_to_a_smaller_back_buffer">

## <a href="#consider_rendering_to_a_smaller_back_buffer"
class="heading-anchor">Consider rendering to a smaller back buffer</a>

A common (and easy) way to trade off quality for speed is rendering into
a smaller back buffer, and upscaling the result. Consider reducing
canvas.width and height and keeping canvas.style.width and height at a
constant size.

</div>

<div class="section content-section" aria-labelledby="batch_draw_calls">

## <a href="#batch_draw_calls" class="heading-anchor">Batch draw calls</a>

"Batching" draw calls into fewer, larger draw calls will generally
improve performance. If you have 1000 sprites to paint, try to do it as
a single drawArrays() or drawElements() call.

It's common to use "degenerate triangles" if you need to draw
discontinuous objects as a single drawArrays(TRIANGLE_STRIP) call.
Degenerate triangles are triangles with no area, therefore any triangle
where more than one point is in the same exact location. These triangles
are effectively skipped, which lets you start a new triangle strip
unattached to your previous one, without having to split into multiple
draw calls.

Another important method for batching is texture atlasing, where
multiple images are placed into a single texture, often like a
checkerboard. Since you need to split draw call batches to change
textures, texture atlasing lets you combine more draw calls into fewer,
bigger batches. See
<a href="https://webglsamples.org/sprites/readme.html" class="external"
target="_blank" title="External link (opens in new tab)">this
example</a> demonstrating how to combine even sprites referencing
multiple texture atlases into a single draw call.

</div>

<div class="section content-section"
aria-labelledby="avoid_ifdef_gl_es">

## <a href="#avoid_ifdef_gl_es" class="heading-anchor">Avoid "#ifdef
GL_ES"</a>

You should never use `#ifdef GL_ES` in your WebGL shaders; this
condition is always true in WebGL. Although some early examples used
this, it's not necessary.

</div>

<div class="section content-section"
aria-labelledby="prefer_doing_work_in_the_vertex_shader">

## <a href="#prefer_doing_work_in_the_vertex_shader"
class="heading-anchor">Prefer doing work in the vertex shader</a>

Do as much work as you can in the vertex shader, rather than in the
fragment shader. This is because per draw call, fragment shaders
generally run many more times than vertex shaders. Any calculation that
can be done on the vertices and then just interpolated among fragments
(via `varying`s) is a performance boon. (The interpolation of varyings
is very cheap, and is done automatically for you through the fixed
functionality rasterization phase of the graphics pipeline.)

For example, a simple animation of a textured surface can be achieved
through a time-dependent transformation of texture coordinates. (The
simplest case being adding a uniform vector to the texture coordinates
attribute vector) If visually acceptable, one can transform the texture
coordinates in the vertex shader rather than in the fragment shader, to
get better performance.

One common trade-off is to some lighting calculations per-vertex instead
of per-fragment (pixel). In some cases, especially with simple models or
dense vertices, this looks good enough.

The inversion of this is if a model has more vertices than pixels in the
rendered output. However, LOD meshes is usually the answer to this
problem, rarely moving work from the vertex *to* the fragment shader.

</div>

<div class="section content-section"
aria-labelledby="compile_shaders_and_link_programs_in_parallel">

## <a href="#compile_shaders_and_link_programs_in_parallel"
class="heading-anchor">Compile Shaders and Link Programs in parallel</a>

It's tempting to compile shaders and link programs serially, but many
browsers can compile and link in parallel on background threads.

Instead of:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
function compileOnce(gl, shader) {
  if (shader.compiled) return;
  gl.compileShader(shader);
  shader.compiled = true;
}
for (const [vs, fs, prog] of programs) {
  compileOnce(gl, vs);
  compileOnce(gl, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(`Link failed: ${gl.getProgramInfoLog(prog)}`);
    console.error(`vs info-log: ${gl.getShaderInfoLog(vs)}`);
    console.error(`fs info-log: ${gl.getShaderInfoLog(fs)}`);
  }
}
```

</div>

Consider:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
function compileOnce(gl, shader) {
  if (shader.compiled) return;
  gl.compileShader(shader);
  shader.compiled = true;
}
for (const [vs, fs, prog] of programs) {
  compileOnce(gl, vs);
  compileOnce(gl, fs);
}
for (const [vs, fs, prog] of programs) {
  gl.linkProgram(prog);
}
for (const [vs, fs, prog] of programs) {
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(`Link failed: ${gl.getProgramInfoLog(prog)}`);
    console.error(`vs info-log: ${gl.getShaderInfoLog(vs)}`);
    console.error(`fs info-log: ${gl.getShaderInfoLog(fs)}`);
  }
}
```

</div>

</div>

<div class="section content-section"
aria-labelledby="prefer_khr_parallel_shader_compile">

## <a href="#prefer_khr_parallel_shader_compile"
class="heading-anchor">Prefer KHR_parallel_shader_compile</a>

While we've described a pattern to allow browsers to compile and link in
parallel, normally checking `COMPILE_STATUS` or `LINK_STATUS` blocks
until the compile or link completes. In browsers where it's available,
the <a
href="https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/"
class="external" target="_blank"
title="External link (opens in new tab)">KHR_parallel_shader_compile</a>
extension provides a *non-blocking* `COMPLETION_STATUS` query. Prefer to
enable and use this extension.

Example usage:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
ext = gl.getExtension("KHR_parallel_shader_compile");
gl.compileProgram(vs);
gl.compileProgram(fs);
gl.attachShader(prog, vs);
gl.attachShader(prog, fs);
gl.linkProgram(prog);

// Store program in your data structure.
// Later, for example the next frame:

if (ext) {
  if (gl.getProgramParameter(prog, ext.COMPLETION_STATUS_KHR)) {
    // Check program link status; if OK, use and draw with it.
  }
} else {
  // Program linking is synchronous.
  // Check program link status; if OK, use and draw with it.
}
```

</div>

This technique may not work in all applications, for example those which
require programs to be immediately available for rendering. Still,
consider how variations may work.

</div>

<div class="section content-section"
aria-labelledby="dont_check_shader_compile_status_unless_linking_fails">

## <a href="#dont_check_shader_compile_status_unless_linking_fails"
class="heading-anchor">Don't check shader compile status unless linking
fails</a>

There are very few errors that are guaranteed to cause shader
compilation failure, but cannot be deferred to link time. The <a
href="https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf"
class="external" target="_blank"
title="External link (opens in new tab)">ESSL3 spec</a> says this under
"Error Handling":

> The implementation should report errors as early a possible but in any
> case must satisfy the following:
>
> - All lexical, grammatical and semantic errors must have been detected
>   following a call to glLinkProgram
> - Errors due to mismatch between the vertex and fragment shader (link
>   errors) must have been detected following a call to glLinkProgram
> - Errors due to exceeding resource limits must have been detected
>   following any draw call or a call to glValidateProgram
> - A call to glValidateProgram must report all errors associated with a
>   program object given the current GL state.
>
> The allocation of tasks between the compiler and linker is
> implementation dependent. Consequently there are many errors which may
> be detected either at compile or link time, depending on the
> implementation.

Additionally, querying compile status is a synchronous call, which
breaks pipelining.

Instead of:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
gl.compileShader(vs);
if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
  console.error(`vs compile failed: ${gl.getShaderInfoLog(vs)}`);
}

gl.compileShader(fs);
if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
  console.error(`fs compile failed: ${gl.getShaderInfoLog(fs)}`);
}

gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error(`Link failed: ${gl.getProgramInfoLog(prog)}`);
}
```

</div>

Consider:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
gl.compileShader(vs);
gl.compileShader(fs);
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
  console.error(`Link failed: ${gl.getProgramInfoLog(prog)}`);
  console.error(`vs info-log: ${gl.getShaderInfoLog(vs)}`);
  console.error(`fs info-log: ${gl.getShaderInfoLog(fs)}`);
}
```

</div>

</div>

<div class="section content-section"
aria-labelledby="be_precise_with_glsl_precision_annotations">

## <a href="#be_precise_with_glsl_precision_annotations"
class="heading-anchor">Be precise with GLSL precision annotations</a>

If you expect to pass an essl300 `int` between shaders, and you need it
to have 32-bits, you *must* use `highp` or you will have portability
problems. (Works on Desktop, not on Android)

If you have a float texture, iOS requires that you use
`highp sampler2D foo;`, or it will very painfully give you `lowp`
texture samples! (+/-2.0 max is probably not good enough for you)

</div>

<div class="section content-section"
aria-labelledby="implicit_defaults">

### <a href="#implicit_defaults" class="heading-anchor">Implicit
defaults</a>

The vertex language has the following predeclared globally scoped
default precision statements:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
precision highp float;
precision highp int;
precision lowp sampler2D;
precision lowp samplerCube;
```

</div>

The fragment language has the following predeclared globally scoped
default precision statements:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
precision mediump int;
precision lowp sampler2D;
precision lowp samplerCube;
```

</div>

</div>

<div class="section content-section"
aria-labelledby="in_webgl_1_highp_float_support_is_optional_in_fragment_shaders">

### <a
href="#in_webgl_1_highp_float_support_is_optional_in_fragment_shaders"
class="heading-anchor">In WebGL 1, "highp float" support is optional in
fragment shaders</a>

Using `highp` precision unconditionally in fragment shaders will prevent
your content from working on some older mobile hardware.

While you can use `mediump float` instead, but be aware that this often
results in corrupted rendering due to lack of precision (particularly
mobile systems) though the corruption is not going to be visible on a
typical desktop computer.

If you know your precision requirements, `getShaderPrecisionFormat()`
will tell you what the system supports.

If `highp float` is available, `GL_FRAGMENT_PRECISION_HIGH` will be
defined as `1`.

A good pattern for "always give me the highest precision":

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
```

</div>

</div>

<div class="section content-section"
aria-labelledby="essl100_minimum_requirements_webgl_1">

### <a href="#essl100_minimum_requirements_webgl_1"
class="heading-anchor">ESSL100 minimum requirements (WebGL 1)</a>

<figure class="table-container">
<table>
<thead>
<tr>
<th><code>float</code></th>
<th>think</th>
<th>range</th>
<th>min above zero</th>
<th>precision</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>highp</code></td>
<td>float24*</td>
<td>(-2^62, 2^62)</td>
<td>2^-62</td>
<td>2^-16 relative</td>
</tr>
<tr>
<td><code>mediump</code></td>
<td>IEEE float16</td>
<td>(-2^14, 2^14)</td>
<td>2^-14</td>
<td>2^-10 relative</td>
</tr>
<tr>
<td><code>lowp</code></td>
<td>10-bit signed fixed</td>
<td>(-2, 2)</td>
<td>2^-8</td>
<td>2^-8 absolute</td>
</tr>
</tbody>
</table>
</figure>

<figure class="table-container">
<table>
<thead>
<tr>
<th><code>int</code></th>
<th>think</th>
<th>range</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>highp</code></td>
<td>int17</td>
<td>(-2^16, 2^16)</td>
</tr>
<tr>
<td><code>mediump</code></td>
<td>int11</td>
<td>(-2^10, 2^10)</td>
</tr>
<tr>
<td><code>lowp</code></td>
<td>int9</td>
<td>(-2^8, 2^8)</td>
</tr>
</tbody>
</table>
</figure>

*\*float24: sign bit, 7-bit for exponent, 16-bit for mantissa.*

</div>

<div class="section content-section"
aria-labelledby="essl300_minimum_requirements_webgl_2">

### <a href="#essl300_minimum_requirements_webgl_2"
class="heading-anchor">ESSL300 minimum requirements (WebGL 2)</a>

<figure class="table-container">
<table>
<thead>
<tr>
<th><code>float</code></th>
<th>think</th>
<th>range</th>
<th>min above zero</th>
<th>precision</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>highp</code></td>
<td>IEEE float32</td>
<td>(-2^126, 2^127)</td>
<td>2^-126</td>
<td>2^-24 relative</td>
</tr>
<tr>
<td><code>mediump</code></td>
<td>IEEE float16</td>
<td>(-2^14, 2^14)</td>
<td>2^-14</td>
<td>2^-10 relative</td>
</tr>
<tr>
<td><code>lowp</code></td>
<td>10-bit signed fixed</td>
<td>(-2, 2)</td>
<td>2^-8</td>
<td>2^-8 absolute</td>
</tr>
</tbody>
</table>
</figure>

<figure class="table-container">
<table>
<thead>
<tr>
<th><code>(u)int</code></th>
<th>think</th>
<th><code>int</code> range</th>
<th><code>unsigned int</code> range</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>highp</code></td>
<td>(u)int32</td>
<td>[-2^31, 2^31]</td>
<td>[0, 2^32]</td>
</tr>
<tr>
<td><code>mediump</code></td>
<td>(u)int16</td>
<td>[-2^15, 2^15]</td>
<td>[0, 2^16]</td>
</tr>
<tr>
<td><code>lowp</code></td>
<td>(u)int9</td>
<td>[-2^8, 2^8]</td>
<td>[0, 2^9]</td>
</tr>
</tbody>
</table>
</figure>

</div>

<div class="section content-section"
aria-labelledby="prefer_builtins_instead_of_building_your_own">

## <a href="#prefer_builtins_instead_of_building_your_own"
class="heading-anchor">Prefer builtins instead of building your own</a>

Prefer builtins like `dot`, `mix`, and `normalize`. At best, custom
implementations might run as fast as the builtins they replace, but
don't expect them to. Hardware often has hyper-optimized or even
specialized instructions for builtins, and the compiler can't reliably
replace your custom builtin-replacements with the special builtin
codepaths.

</div>

<div class="section content-section"
aria-labelledby="use_mipmaps_for_any_texture_youll_see_in_3d">

## <a href="#use_mipmaps_for_any_texture_youll_see_in_3d"
class="heading-anchor">Use mipmaps for any texture you'll see in 3d</a>

When in doubt, call `generateMipmaps()` after texture uploads. Mipmaps
are cheap on memory (only 30% overhead) while providing often-large
performance advantages when textures are "zoomed out" or generally
downscaled in the distance in 3d, or even for cube-maps!

It's quicker to sample from smaller texture images due to better
inherent texture fetch cache locality: Zooming out on a non-mipmapped
texture ruins texture fetch cache locality, because neighboring pixels
no longer sample from neighboring texels!

However, for 2d resources that are never "zoomed out", don't pay the 30%
memory surcharge for mipmaps:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Defaults to NEAREST_MIPMAP_LINEAR, for mipmapping!
```

</div>

(In WebGL 2, you should just use `texStorage` with `levels=1`)

One caveat: `generateMipmaps` only works if you would be able to render
into the texture if you attached it to a framebuffer. (The spec calls
this "color-renderable formats") For example, if a system supports
float-textures but not render-to-float, `generateMipmaps` will fail for
float formats.

</div>

<div class="section content-section"
aria-labelledby="dont_assume_you_can_render_into_float_textures">

## <a href="#dont_assume_you_can_render_into_float_textures"
class="heading-anchor">Don't assume you can render into float
textures</a>

There are many, many systems that support RGBA32F textures, but if you
attach one to a framebuffer you'll get
`FRAMEBUFFER_INCOMPLETE_ATTACHMENT` from `checkFramebufferStatus()`. It
may work on your system, but *most* mobile systems will not support it!

On WebGL 1, use the `EXT_color_buffer_half_float` and
`WEBGL_color_buffer_float` extensions to check for
render-to-float-texture support for float16 and float32 respectively.

On WebGL 2, `EXT_color_buffer_float` checks for render-to-float-texture
support for both float32 and float16. `EXT_color_buffer_half_float` is
present on systems which only support rendering to float16 textures.

</div>

<div class="section content-section"
aria-labelledby="render-to-float32_doesnt_imply_float32-blending!">

### <a href="#render-to-float32_doesnt_imply_float32-blending!"
class="heading-anchor">Render-to-float32 doesn't imply
float32-blending!</a>

It may work on your system, but on many others it won't. Avoid it if you
can. Check for the `EXT_float_blend` extension to check for support.

Float16-blending is always supported.

</div>

<div class="section content-section"
aria-labelledby="some_formats_e.g._rgb_may_be_emulated">

## <a href="#some_formats_e.g._rgb_may_be_emulated"
class="heading-anchor">Some formats (e.g., RGB) may be emulated</a>

A number of formats (particularly three-channel formats) are emulated.
For example, RGB32F is often actually RGBA32F, and Luminance8 may
actually be RGBA8. RGB8 in particular is often surprisingly slow, as
masking out the alpha channel and/or patching blend functions has fairly
high overhead. Prefer to use RGBA8 and ignore the alpha yourself for
better performance.

</div>

<div class="section content-section"
aria-labelledby="avoid_alphafalse_which_can_be_expensive">

## <a href="#avoid_alphafalse_which_can_be_expensive"
class="heading-anchor">Avoid alpha:false, which can be expensive</a>

Specifying `alpha:false` during context creation causes the browser to
composite the WebGL-rendered canvas as though it were opaque, ignoring
any alpha values the application writes in its fragment shader. On some
platforms, this capability unfortunately comes at a significant
performance cost. The RGB back buffer may have to be emulated on top of
an RGBA surface, and there are relatively few techniques available in
the OpenGL API for making it appear to the application that an RGBA
surface has no alpha channel.
<a href="https://crbug.com/1045643" class="external" target="_blank"
title="External link (opens in new tab)">It has been found</a> that all
of these techniques have approximately equal performance impact on
affected platforms.

Most applications, even those requiring alpha blending, can be
structured to produce `1.0` for the alpha channel. The primary exception
is any application requiring destination alpha in the blending function.
If feasible, it is recommended to do this rather than using
`alpha:false`.

</div>

<div class="section content-section"
aria-labelledby="consider_compressed_texture_formats">

## <a href="#consider_compressed_texture_formats"
class="heading-anchor">Consider compressed texture formats</a>

While JPG and PNG are generally smaller over-the-wire, GPU compressed
texture formats are smaller on in GPU memory, and are faster to sample
from. (This reduces texture memory bandwidth, which is precious on
mobile) However, compressed texture formats have worse quality than JPG,
and are generally only acceptable for colors (not e.g., normals or
coordinates).

Unfortunately, there's no single universally supported format. Every
system has at least one of the following though:

- WEBGL_compressed_texture_s3tc (desktop)
- WEBGL_compressed_texture_etc1 (Android)
- WEBGL_compressed_texture_pvrtc (iOS)

WebGL 2 has universal support by combining:

- WEBGL_compressed_texture_s3tc (desktop)
- WEBGL_compressed_texture_etc (mobile)

WEBGL_compressed_texture_astc has both higher quality and/or higher
compression, but is only supported on newer hardware.

</div>

<div class="section content-section"
aria-labelledby="basis_universal_texture_compression_formatlibrary">

### <a href="#basis_universal_texture_compression_formatlibrary"
class="heading-anchor">Basis Universal texture compression
format/library</a>

Basis Universal solves several of the issues mentioned above. It offers
a way to support all common compressed texture formats with a single
compressed texture file, through a JavaScript library that efficiently
converts formats at load time. It also adds additional compression that
makes Basis Universal compressed texture files much smaller than regular
compressed textures over-the-wire, more comparable to JPEG.

<a
href="https://github.com/BinomialLLC/basis_universal/blob/master/webgl/README.md"
class="external" target="_blank"
title="External link (opens in new tab)">https://github.com/BinomialLLC/basis_universal/blob/master/webgl/README.md</a>

</div>

<div class="section content-section"
aria-labelledby="memory_usage_of_depth_and_stencil_formats">

## <a href="#memory_usage_of_depth_and_stencil_formats"
class="heading-anchor">Memory usage of depth and stencil formats</a>

Depth and stencil attachments and formats are actually inseparable on
many devices. You may ask for DEPTH_COMPONENT24 or STENCIL_INDEX8, but
you're often getting D24X8 and X24S8 32bpp formats behind the scenes.
Assume that the memory usage of depth and stencil formats is rounded up
to the nearest four bytes.

</div>

<div class="section content-section"
aria-labelledby="teximagetexsubimage_uploads_esp._videos_can_cause_pipeline_flushes">

## <a
href="#teximagetexsubimage_uploads_esp._videos_can_cause_pipeline_flushes"
class="heading-anchor">texImage/texSubImage uploads (esp. videos) can
cause pipeline flushes</a>

Most texture uploads from DOM elements will incur a processing pass that
will temporarily switch GL Programs internally, causing a pipeline
flush. (Pipelines are formalized explicitly in
<a href="https://docs.vulkan.org/spec/latest/chapters/pipelines.html"
class="external" target="_blank"
title="External link (opens in new tab)">Vulkan</a> et al, but are
implicit behind-the-scenes in OpenGL and WebGL. Pipelines are more or
less the tuple of shader program,
depth/stencil/multisample/blend/rasterization state)

In WebGL:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
    …
    useProgram(prog1)
<pipeline flush>
    bindFramebuffer(target)
    drawArrays()
    bindTexture(webgl_texture)
    texImage2D(HTMLVideoElement)
    drawArrays()
    …
```

</div>

Behind the scenes in the browser:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
    …
    useProgram(prog1)
<pipeline flush>
    bindFramebuffer(target)
    drawArrays()
    bindTexture(webgl_texture)
    -texImage2D(HTMLVideoElement):
        +useProgram(_internal_tex_transform_prog)
<pipeline flush>
        +bindFramebuffer(webgl_texture._internal_framebuffer)
        +bindTexture(HTMLVideoElement._internal_video_tex)
        +drawArrays() // y-flip/colorspace-transform/alpha-(un)premultiply
        +bindTexture(webgl_texture)
        +bindFramebuffer(target)
        +useProgram(prog1)
<pipeline flush>
    drawArrays()
    …
```

</div>

Prefer doing uploads before starting drawing, or at least between
pipelines:

In WebGL:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
    …
    bindTexture(webgl_texture)
    texImage2D(HTMLVideoElement)
    useProgram(prog1)
<pipeline flush>
    bindFramebuffer(target)
    drawArrays()
    bindTexture(webgl_texture)
    drawArrays()
    …
```

</div>

Behind the scenes in the browser:

<div class="code-example">

<div class="example-header">

<span class="language-name">glsl</span>

</div>

``` brush:
    …
    bindTexture(webgl_texture)
    -texImage2D(HTMLVideoElement):
        +useProgram(_internal_tex_transform_prog)
<pipeline flush>
        +bindFramebuffer(webgl_texture._internal_framebuffer)
        +bindTexture(HTMLVideoElement._internal_video_tex)
        +drawArrays() // y-flip/colorspace-transform/alpha-(un)premultiply
        +bindTexture(webgl_texture)
        +bindFramebuffer(target)
    useProgram(prog1)
<pipeline flush>
    bindFramebuffer(target)
    drawArrays()
    bindTexture(webgl_texture)
    drawArrays()
    …
```

</div>

</div>

<div class="section content-section"
aria-labelledby="use_texstorage_to_create_textures">

## <a href="#use_texstorage_to_create_textures" class="heading-anchor">Use
texStorage to create textures</a>

The WebGL 2.0 `texImage*` API lets you define each mip level
independently and at any size, even the mis-matching mips sizes are not
an error until draw time which means there is no way the driver can
actually prepare the texture in GPU memory until the first time the
texture is drawn.

Further, some drivers might unconditionally allocate the whole mip-chain
(+30% memory!) even if you only want a single level.

So, prefer `texStorage` + `texSubImage` for textures in WebGL 2.

</div>

<div class="section content-section"
aria-labelledby="use_invalidateframebuffer">

## <a href="#use_invalidateframebuffer" class="heading-anchor">Use
invalidateFramebuffer</a>

Storing data that you won't use again can have high cost, particularly
on tiled-rendering GPUs common on mobile. When you're done with the
contents of a framebuffer attachment, use WebGL 2.0's
`invalidateFramebuffer` to discard the data, instead of leaving the
driver to waste time storing the data for later use. DEPTH/STENCIL
and/or multisampled attachments in particular are great candidates for
`invalidateFramebuffer`.

</div>

<div class="section content-section"
aria-labelledby="use_non-blocking_async_data_readback">

## <a href="#use_non-blocking_async_data_readback"
class="heading-anchor">Use non-blocking async data readback</a>

Operations like `readPixels` and `getBufferSubData` are typically
synchronous, but using the same APIs, non-blocking, asynchronous data
readback can be achieved. The approach in WebGL 2 is analogous to the
approach in OpenGL:
<a href="https://kdashg.github.io/misc/async-gpu-downloads.html"
class="external" target="_blank"
title="External link (opens in new tab)">Async downloads in blocking
APIs</a>

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
function clientWaitAsync(gl, sync, flags, intervalMs) {
  return new Promise((resolve, reject) => {
    function test() {
      const res = gl.clientWaitSync(sync, flags, 0);
      if (res === gl.WAIT_FAILED) {
        reject(new Error("clientWaitSync failed"));
        return;
      }
      if (res === gl.TIMEOUT_EXPIRED) {
        setTimeout(test, intervalMs);
        return;
      }
      resolve();
    }
    test();
  });
}

async function getBufferSubDataAsync(
  gl,
  target,
  buffer,
  srcByteOffset,
  dstBuffer,
  /* optional */ dstOffset,
  /* optional */ length,
) {
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();

  await clientWaitAsync(gl, sync, 0, 10);
  gl.deleteSync(sync);

  gl.bindBuffer(target, buffer);
  gl.getBufferSubData(target, srcByteOffset, dstBuffer, dstOffset, length);
  gl.bindBuffer(target, null);

  return dstBuffer;
}

async function readPixelsAsync(gl, x, y, w, h, format, type, dest) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, buf);
  gl.bufferData(gl.PIXEL_PACK_BUFFER, dest.byteLength, gl.STREAM_READ);
  gl.readPixels(x, y, w, h, format, type, 0);
  gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);

  await getBufferSubDataAsync(gl, gl.PIXEL_PACK_BUFFER, buf, 0, dest);

  gl.deleteBuffer(buf);
  return dest;
}
```

</div>

</div>

<div class="section content-section"
aria-labelledby="devicepixelratio_and_high-dpi_rendering">

## <a href="#devicepixelratio_and_high-dpi_rendering"
class="heading-anchor"><code>devicePixelRatio</code> and high-dpi
rendering</a>

Handling `devicePixelRatio !== 1.0` is tricky. While the common approach
is to set `canvas.width = width * devicePixelRatio`, this will cause
moire artifacts with non-integer values of `devicePixelRatio`, as is
common with UI scaling on Windows, as well as zooming on all platforms.

Instead, we can use non-integer values for CSS's
`top`/`bottom`/`left`/`right` to fairly reliably 'pre-snap' our canvas
to whole integer device coordinates.

Demo:
<a href="https://kdashg.github.io/misc/webgl/device-pixel-presnap.html"
class="external" target="_blank"
title="External link (opens in new tab)">Device pixel presnap</a>

</div>

<div class="section content-section"
aria-labelledby="resizeobserver_and_device-pixel-content-box">

## <a href="#resizeobserver_and_device-pixel-content-box"
class="heading-anchor">ResizeObserver and 'device-pixel-content-box'</a>

On [supporting
browsers](/en-US/docs/Web/API/ResizeObserverEntry/devicePixelContentBoxSize#browser_compatibility),
`ResizeObserver` can be used with `'device-pixel-content-box'` to
request a callback that includes the true [device
pixel](/en-US/docs/Glossary/Device_pixel) size of an element. This can
be used to build an async-but-accurate function:

<div class="code-example">

<div class="example-header">

<span class="language-name">js</span>

</div>

``` brush:
function getDevicePixelSize(elem) {
  return new Promise((resolve) => {
    const observer = new ResizeObserver(([cur]) => {
      if (!cur) {
        throw new Error(
          `device-pixel-content-box not observed for elem ${elem}`,
        );
      }
      const devSize = cur.devicePixelContentBoxSize;
      const ret = {
        width: devSize[0].inlineSize,
        height: devSize[0].blockSize,
      };
      resolve(ret);
      observer.disconnect();
    });
    observer.observe(elem, { box: "device-pixel-content-box" });
  });
}
```

</div>

</div>

<div class="section content-section"
aria-labelledby="use_webgl_provoking_vertex_when_its_available">

## <a href="#use_webgl_provoking_vertex_when_its_available"
class="heading-anchor">Use <code>WEBGL_provoking_vertex</code> when it's
available</a>

When assembling vertices into primitives such as triangles and lines, in
OpenGL's convention, the last vertex of the primitive is considered the
"provoking vertex". This is relevant when using `flat` vertex attribute
interpolation in ESSL300 (WebGL 2); the attribute value from the
provoking vertex is used for all of the vertices of the primitive.

Nowadays, many browsers' WebGL implementations are hosted on top of
different graphics APIs than OpenGL, and some of these APIs use the
first vertex as the provoking vertex for drawing commands. Emulating
OpenGL's provoking vertex convention can be computationally expensive on
some of these APIs.

For this reason, the <a
href="https://registry.khronos.org/webgl/extensions/WEBGL_provoking_vertex/"
class="external" target="_blank"
title="External link (opens in new tab)">WEBGL_provoking_vertex</a>
extension has been introduced. If a WebGL implementation exposes this
extension, this is a hint to the application that changing the
convention to `FIRST_VERTEX_CONVENTION_WEBGL` will improve performance.
It is strongly recommended that applications using flat shading check
for the presence of this extension, and use it to do so if it's
available. Note that this may require changes to the application's
vertex buffers or shaders.

</div>

<div class="section content-section article-footer"
aria-labelledby="feedback">

<div class="article-footer__inner">

<div class="article-footer__svg-container">

![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjIiIGhlaWdodD0iMTYyIiBmaWxsPSJub25lIiB2aWV3Ym94PSIwIDAgMTYyIDE2MiI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjxwYXRoIGQ9Ik05Ny4yMDMgNDcuMDRjOC4xMTMtNy44ODYgMTguMDA0LTEzLjg3MSAyOC45MDYtMTcuNDkyYTc4IDc4IDAgMCAxIDMzLjk2OS0zLjM5YzExLjQ0MyAxLjM5IDIyLjQwMSA1LjI5NSAzMi4wMjQgMTEuNDExczE3LjY1NiAxNC4yOCAyMy40NzYgMjMuODZjNS44MTkgOS41NzkgOS4yNjkgMjAuMzE4IDEwLjA4MyAzMS4zODVhNjkuODUgNjkuODUgMCAwIDEtNS4zODcgMzIuNDRjLTQuMzU4IDEwLjI3Mi0xMS4xMTUgMTkuNDQzLTE5Ljc0NyAyNi44MDEtOC42MzIgNy4zNTktMTguOTA4IDEyLjcwOS0zMC4wMzQgMTUuNjM3bC02LjE3LTIxLjY5OGM3LjY2Ni0yLjAxNyAxNC43NDYtNS43MDMgMjAuNjk0LTEwLjc3MyA1Ljk0OC01LjA3MSAxMC42MDMtMTEuMzg5IDEzLjYwNi0xOC40NjdhNDguMTQgNDguMTQgMCAwIDAgMy43MTItMjIuMzUyYy0uNTYxLTcuNjI1LTIuOTM4LTE1LjAyNS02Ljk0OC0yMS42MjVzLTkuNTQ0LTEyLjIyNi0xNi4xNzUtMTYuNDQtMTQuMTgxLTYuOTA0LTIyLjA2NS03Ljg2M2E1My43NSA1My43NSAwIDAgMC0yMy40MDUgMi4zMzZjLTcuNTEzIDIuNDk1LTE0LjMyNyA2LjYyLTE5LjkxOCAxMi4wNTN6IiAvPjwvbWFzaz48cGF0aCBzdHJva2U9InVybCgjYSkiIHN0cm9rZS1kYXNoYXJyYXk9IjYsIDYiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTk3LjIwMyA0Ny4wNGM4LjExMy03Ljg4NiAxOC4wMDQtMTMuODcxIDI4LjkwNi0xNy40OTJhNzggNzggMCAwIDEgMzMuOTY5LTMuMzljMTEuNDQzIDEuMzkgMjIuNDAxIDUuMjk1IDMyLjAyNCAxMS40MTFzMTcuNjU2IDE0LjI4IDIzLjQ3NiAyMy44NmM1LjgxOSA5LjU3OSA5LjI2OSAyMC4zMTggMTAuMDgzIDMxLjM4NWE2OS44NSA2OS44NSAwIDAgMS01LjM4NyAzMi40NGMtNC4zNTggMTAuMjcyLTExLjExNSAxOS40NDMtMTkuNzQ3IDI2LjgwMS04LjYzMiA3LjM1OS0xOC45MDggMTIuNzA5LTMwLjAzNCAxNS42MzdsLTYuMTctMjEuNjk4YzcuNjY2LTIuMDE3IDE0Ljc0Ni01LjcwMyAyMC42OTQtMTAuNzczIDUuOTQ4LTUuMDcxIDEwLjYwMy0xMS4zODkgMTMuNjA2LTE4LjQ2N2E0OC4xNCA0OC4xNCAwIDAgMCAzLjcxMi0yMi4zNTJjLS41NjEtNy42MjUtMi45MzgtMTUuMDI1LTYuOTQ4LTIxLjYyNXMtOS41NDQtMTIuMjI2LTE2LjE3NS0xNi40NC0xNC4xODEtNi45MDQtMjIuMDY1LTcuODYzYTUzLjc1IDUzLjc1IDAgMCAwLTIzLjQwNSAyLjMzNmMtNy41MTMgMi40OTUtMTQuMzI3IDYuNjItMTkuOTE4IDEyLjA1M3oiIG1hc2s9InVybCgjYikiIHN0eWxlPSJzdHJva2U6dXJsKCNhKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTYzLjk5MiAtMjUuNTg3KSIgLz48ZWxsaXBzZSBjeD0iOC4wNjYiIGN5PSIxMTEuNTk3IiBmaWxsPSJjdXJyZW50Q29sb3IiIHJ4PSI1My42NzciIHJ5PSI1My42OTkiIHRyYW5zZm9ybT0ibWF0cml4KC43MTcwNyAtLjY5NyAuNzI0MyAuNjg5NSAwIDApIj48L2VsbGlwc2U+PGcgY2xpcC1wYXRoPSJ1cmwoI2MpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjMuOTkyIC0yNS41ODcpIj48cGF0aCBmaWxsPSIjOWFiZmY1IiBkPSJtMTQ0LjI1NiAxMzcuMzc5IDMyLjkwNiAxMi40MzRhNC40MSA0LjQxIDAgMCAxIDIuNTU5IDUuNjY3bC05LjMyNiAyNC42NzlhNC40MSA0LjQxIDAgMCAxLTUuNjY3IDIuNTU5bC04LjIyNi0zLjEwOC0yLjMzMiA2LjE3Yy0uNDY2IDEuMjMzLS4zNzUgMS44ODMtMS42MDkgMS40MTdsLTIuMjUzLS41MjdjLS40MTEtLjE1NS0uOTUtLjU5NC0xLjIwNi0xLjE2MWwtNC43MzQtMTAuNDg0LTEyLjU0NS00Ljc0MWE0LjQxIDQuNDEgMCAwIDEtMi41NTktNS42NjdsOS4zMjUtMjQuNjc5YTQuNDEgNC40MSAwIDAgMSA1LjY2Ny0yLjU1OW05Ljk2MSAyOS42MTcgOC4yMjcgMy4xMDggMy4yNjQtOC42MzgtLjQ5OC02Ljc2OC00LjExMy0xLjU1NS41NDggNy4yNTgtNC4zMTktMS42MzJ6bS0xMi4zMzktNC42NjMgOC4yMjYgMy4xMDggMy4yNjQtOC42MzctLjQ5OC02Ljc2OS00LjExMy0xLjU1NC41NDggNy4yNTctNC4zMTktMS42MzJ6IiAvPjwvZz48ZyBjbGlwLXBhdGg9InVybCgjZCkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02My45OTIgLTI1LjU4NykiPjxwYXRoIGZpbGw9IiM4MWIwZjMiIGQ9Ik0xMzUuMzUgNjAuMTM2IDg2LjY3IDQxLjY1NGMtMy4zNDYtMS4yNy03LjEyNC40MjgtOC4zOTQgMy43NzVMNjQuNDE0IDgxLjkzOGMtMS4yNyAzLjM0Ny40MjggNy4xMjUgMy43NzQgOC4zOTVsMTIuMTcgNC42Mi0zLjQ2NSA5LjEyOGMtLjY5MyAxLjgyNi0xLjQzMiAyLjQ1Ny4zOTQgMy4xNWwzLjAxNCAxLjYyNWMuNjA5LjIzMSAxLjYzNy4yNzQgMi40NzctLjEwNGwxNS41My02Ljk4MyAxOC41NiA3LjA0N2MzLjM0NiAxLjI3IDcuMTI0LS40MjggOC4zOTUtMy43NzVsMTMuODYyLTM2LjUxYzEuMjctMy4zNDYtLjQyOC03LjEyNC0zLjc3NS04LjM5NU05NS4yNjEgODMuMjA3bC0xMi4xNy00LjYyIDQuODUyLTEyLjc3OSA3LjE5LTcuMDE3IDYuMDg1IDIuMzEtNy43MjUgNy41MSA2LjM4OSAyLjQyNnptMTguMjU1IDYuOTMtMTIuMTctNC42MiA0Ljg1Mi0xMi43NzggNy4xODktNy4wMTcgNi4wODUgMi4zMS03LjcyNSA3LjUxIDYuMzkgMi40MjZ6IiAvPjwvZz48ZGVmcz48Y2xpcHBhdGggaWQ9ImMiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im0xOTguNjM4IDE0Ni41ODYtNjUuMDU2LTI0LjU4My0yNC41ODMgNjUuMDU3IDY1LjA1NiAyNC41ODJ6IiAvPjwvY2xpcHBhdGg+PGNsaXBwYXRoIGlkPSJkIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJtNjYuNDM4IDE0LjA1NSA5Ni4yNDIgMzYuNTQtMzYuNTQgOTYuMjQzLTk2LjI0My0zNi41NHoiIC8+PC9jbGlwcGF0aD48bGluZWFyZ3JhZGllbnQgaWQ9ImEiIHgxPSI5Ny4yMDMiIHgyPSIxOTkuOTk1IiB5MT0iNDcuMDQiIHkyPSIxNTIuNzkzIiBncmFkaWVudHVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzA4NmRmYyI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjI0NiIgc3RvcC1jb2xvcj0iIzJjODFmYSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjUxNiIgc3RvcC1jb2xvcj0iIzU0OTdmOCI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjgyMSIgc3RvcC1jb2xvcj0iIzgwYjBmNiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhYmZmNSI+PC9zdG9wPjwvbGluZWFyZ3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==)

</div>

## Help improve MDN

<style>.content-feedback{border:none;margin:0 0 .25rem;padding:0}.content-feedback>label{display:block;margin-bottom:.25rem}.content-feedback .thank-you{display:block;margin-bottom:calc(2.75rem + 2px)}.content-feedback mdn-button{flex:1;min-width:0}.content-feedback--buttons{display:inline-flex;gap:.75rem;margin:.25rem 0}.content-feedback--radios{align-items:center;display:flex;gap:.25rem;margin:.25rem 0}</style>

Was this page helpful to you?

<div class="content-feedback--buttons">

<style>.button{align-items:center;background-color:initial;border:1px solid #0000;border-radius:.25rem;color:var(--color-text-primary);column-gap:.3125em;cursor:pointer;display:inline-flex;font-family:var(--font-family-text);font-size:.875em;font-weight:450;justify-content:center;line-height:var(--font-line-ui);margin:0;padding:.5em;-webkit-text-decoration:none;text-decoration:none;vertical-align:middle}.button[data-variant=primary]{--csstools-light-dark-toggle-33eaa513-0:var(--csstools-color-scheme--light) var(--color-black);color:var(--csstools-light-dark-toggle-33eaa513-0,var(--color-white));--csstools-light-dark-toggle-33eaa513-1:var(--csstools-color-scheme--light) var(--color-white);background-color:var(--csstools-light-dark-toggle-33eaa513-1,var(--color-black))}@supports (color:light-dark(red,red)){.button[data-variant=primary]{background-color:light-dark(var(--color-black),var(--color-white));color:light-dark(var(--color-white),var(--color-black))}}.button[data-variant=primary]:hover{--csstools-light-dark-toggle-33eaa513-2:var(--csstools-color-scheme--light) var(--color-gray-60);background-color:var(--csstools-light-dark-toggle-33eaa513-2,var(--color-gray-40))}@supports (color:light-dark(red,red)){.button[data-variant=primary]:hover{background-color:light-dark(var(--color-gray-40),var(--color-gray-60))}}.button[data-variant=primary][data-action=positive]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-3:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-3,var(--color-green-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]{background-color:light-dark(var(--color-green-50),var(--color-green-20))}}.button[data-variant=primary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-4:var(--csstools-color-scheme--light) var(--color-green-50);background-color:var(--csstools-light-dark-toggle-33eaa513-4,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]:hover{background-color:light-dark(var(--color-green-20),var(--color-green-50))}}.button[data-variant=primary][data-action=negative]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-5:var(--csstools-color-scheme--light) var(--color-red-20);background-color:var(--csstools-light-dark-toggle-33eaa513-5,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]{background-color:light-dark(var(--color-red-50),var(--color-red-20))}}.button[data-variant=primary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-6:var(--csstools-color-scheme--light) var(--color-red-50);background-color:var(--csstools-light-dark-toggle-33eaa513-6,var(--color-red-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]:hover{background-color:light-dark(var(--color-red-20),var(--color-red-50))}}.button[data-variant=secondary]{border-color:currentcolor}.button[data-variant=secondary]:hover{--csstools-light-dark-toggle-33eaa513-7:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-7,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=secondary]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=secondary][data-action=positive]{--csstools-light-dark-toggle-33eaa513-8:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-8,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=secondary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-9:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-9,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=secondary][data-action=negative]{--csstools-light-dark-toggle-33eaa513-10:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-10,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=secondary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-11:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-11,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-12:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-12,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[data-variant=plain]:hover{--csstools-light-dark-toggle-33eaa513-13:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-13,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=plain]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=plain][data-action=positive]{--csstools-light-dark-toggle-33eaa513-14:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-14,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=plain][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-15:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-15,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=plain][data-action=negative]{--csstools-light-dark-toggle-33eaa513-16:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-16,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=plain][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-17:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-17,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-18:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-18,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[disabled]{--csstools-light-dark-toggle-33eaa513-19:var(--csstools-color-scheme--light) var(--color-gray-60)!important;color:var(--csstools-light-dark-toggle-33eaa513-19,var(--color-gray-40))!important;cursor:default;--csstools-light-dark-toggle-33eaa513-20:var(--csstools-color-scheme--light) var(--color-gray-20)!important;background-color:var(--csstools-light-dark-toggle-33eaa513-20,var(--color-gray-80))!important;border-color:#0000}@supports (color:light-dark(red,red)){.button[disabled]{background-color:light-dark(var(--color-gray-80),var(--color-gray-20))!important;color:light-dark(var(--color-gray-40),var(--color-gray-60))!important}}.button .icon{display:flex}.button svg{height:1.25em;width:1.25em}.button .label{padding-block:.125em;padding-inline:.0625em}:host{display:inline-flex;vertical-align:middle}.button{box-sizing:border-box;height:100%;width:100%}</style>

<span class="icon"
part="icon">![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Ym94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik03IDEwdjEybTgtMTYuMTJMMTQgMTBoNS44M2EyIDIgMCAwIDEgMS45MiAyLjU2bC0yLjMzIDhBMiAyIDAgMCAxIDE3LjUgMjJINGEyIDIgMCAwIDEtMi0ydi04YTIgMiAwIDAgMSAyLTJoMi43NmEyIDIgMCAwIDAgMS43OS0xLjExTDEyIDJhMy4xMyAzLjEzIDAgMCAxIDMgMy44OCIgLz48L3N2Zz4=)</span>
<span id="label-h1plw0afi9" class="label" part="label"></span>

Yes
<style>.button{align-items:center;background-color:initial;border:1px solid #0000;border-radius:.25rem;color:var(--color-text-primary);column-gap:.3125em;cursor:pointer;display:inline-flex;font-family:var(--font-family-text);font-size:.875em;font-weight:450;justify-content:center;line-height:var(--font-line-ui);margin:0;padding:.5em;-webkit-text-decoration:none;text-decoration:none;vertical-align:middle}.button[data-variant=primary]{--csstools-light-dark-toggle-33eaa513-0:var(--csstools-color-scheme--light) var(--color-black);color:var(--csstools-light-dark-toggle-33eaa513-0,var(--color-white));--csstools-light-dark-toggle-33eaa513-1:var(--csstools-color-scheme--light) var(--color-white);background-color:var(--csstools-light-dark-toggle-33eaa513-1,var(--color-black))}@supports (color:light-dark(red,red)){.button[data-variant=primary]{background-color:light-dark(var(--color-black),var(--color-white));color:light-dark(var(--color-white),var(--color-black))}}.button[data-variant=primary]:hover{--csstools-light-dark-toggle-33eaa513-2:var(--csstools-color-scheme--light) var(--color-gray-60);background-color:var(--csstools-light-dark-toggle-33eaa513-2,var(--color-gray-40))}@supports (color:light-dark(red,red)){.button[data-variant=primary]:hover{background-color:light-dark(var(--color-gray-40),var(--color-gray-60))}}.button[data-variant=primary][data-action=positive]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-3:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-3,var(--color-green-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]{background-color:light-dark(var(--color-green-50),var(--color-green-20))}}.button[data-variant=primary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-4:var(--csstools-color-scheme--light) var(--color-green-50);background-color:var(--csstools-light-dark-toggle-33eaa513-4,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]:hover{background-color:light-dark(var(--color-green-20),var(--color-green-50))}}.button[data-variant=primary][data-action=negative]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-5:var(--csstools-color-scheme--light) var(--color-red-20);background-color:var(--csstools-light-dark-toggle-33eaa513-5,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]{background-color:light-dark(var(--color-red-50),var(--color-red-20))}}.button[data-variant=primary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-6:var(--csstools-color-scheme--light) var(--color-red-50);background-color:var(--csstools-light-dark-toggle-33eaa513-6,var(--color-red-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]:hover{background-color:light-dark(var(--color-red-20),var(--color-red-50))}}.button[data-variant=secondary]{border-color:currentcolor}.button[data-variant=secondary]:hover{--csstools-light-dark-toggle-33eaa513-7:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-7,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=secondary]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=secondary][data-action=positive]{--csstools-light-dark-toggle-33eaa513-8:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-8,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=secondary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-9:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-9,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=secondary][data-action=negative]{--csstools-light-dark-toggle-33eaa513-10:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-10,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=secondary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-11:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-11,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-12:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-12,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[data-variant=plain]:hover{--csstools-light-dark-toggle-33eaa513-13:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-13,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=plain]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=plain][data-action=positive]{--csstools-light-dark-toggle-33eaa513-14:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-14,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=plain][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-15:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-15,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=plain][data-action=negative]{--csstools-light-dark-toggle-33eaa513-16:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-16,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=plain][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-17:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-17,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-18:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-18,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[disabled]{--csstools-light-dark-toggle-33eaa513-19:var(--csstools-color-scheme--light) var(--color-gray-60)!important;color:var(--csstools-light-dark-toggle-33eaa513-19,var(--color-gray-40))!important;cursor:default;--csstools-light-dark-toggle-33eaa513-20:var(--csstools-color-scheme--light) var(--color-gray-20)!important;background-color:var(--csstools-light-dark-toggle-33eaa513-20,var(--color-gray-80))!important;border-color:#0000}@supports (color:light-dark(red,red)){.button[disabled]{background-color:light-dark(var(--color-gray-80),var(--color-gray-20))!important;color:light-dark(var(--color-gray-40),var(--color-gray-60))!important}}.button .icon{display:flex}.button svg{height:1.25em;width:1.25em}.button .label{padding-block:.125em;padding-inline:.0625em}:host{display:inline-flex;vertical-align:middle}.button{box-sizing:border-box;height:100%;width:100%}</style>

<span class="icon"
part="icon">![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Ym94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0xNyAxNFYyTTkgMTguMTIgMTAgMTRINC4xN2EyIDIgMCAwIDEtMS45Mi0yLjU2bDIuMzMtOEEyIDIgMCAwIDEgNi41IDJIMjBhMiAyIDAgMCAxIDIgMnY4YTIgMiAwIDAgMS0yIDJoLTIuNzZhMiAyIDAgMCAwLTEuNzkgMS4xMUwxMiAyMmEzLjEzIDMuMTMgMCAwIDEtMy0zLjg4IiAvPjwvc3ZnPg==)</span>
<span id="label-xm2wtg2gqc" class="label" part="label"></span>

No

</div>

<a href="/en-US/docs/MDN/Community/Getting_started"
class="article-footer__contribute">Learn how to contribute</a>

This page was last modified on Nov 3, 2025 by [MDN
contributors](/en-US/docs/Web/API/WebGL_API/WebGL_best_practices/contributors.txt).

<div class="article-footer__links">

<a
href="https://github.com/mdn/content/blob/main/files/en-us/web/api/webgl_api/webgl_best_practices/index.md?plain=1"
class="external" target="_blank" rel="noopener"
title="Folder: en-us/web/api/webgl_api/webgl_best_practices (Opens in a new tab)">View
this page on GitHub</a> • <a
href="https://github.com/mdn/content/issues/new?template=page-report.yml&amp;mdn-url=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FWebGL_API%2FWebGL_best_practices&amp;metadata=%3C%21--+Do+not+make+changes+below+this+line+--%3E%0A%3Cdetails%3E%0A%3Csummary%3EPage+report+details%3C%2Fsummary%3E%0A%0A*+Folder%3A+%60en-us%2Fweb%2Fapi%2Fwebgl_api%2Fwebgl_best_practices%60%0A*+MDN+URL%3A+https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FWebGL_API%2FWebGL_best_practices%0A*+GitHub+URL%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fblob%2Fmain%2Ffiles%2Fen-us%2Fweb%2Fapi%2Fwebgl_api%2Fwebgl_best_practices%2Findex.md%0A*+Last+commit%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fcommit%2Ff336c5b6795a562c64fe859aa9ee2becf223ad8a%0A*+Document+last+modified%3A+2025-11-03T18%3A29%3A25.000Z%0A%0A%3C%2Fdetails%3E"
class="external" target="_blank" rel="noopener"
title="This will take you to GitHub to file a new issue.">Report a
problem with this content</a>

</div>

</div>

</div>

</div>

</div>
