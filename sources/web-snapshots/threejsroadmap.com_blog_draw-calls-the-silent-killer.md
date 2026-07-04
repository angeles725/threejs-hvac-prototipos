<div class="page-module__dgei_G__container">

<div class="page-module__dgei_G__header">

# Draw Calls: The Silent Killer

<div class="page-module__dgei_G__meta">

<span class="page-module__dgei_G__author">Dan
Greenheck</span><span class="page-module__dgei_G__separator">•</span>October
29,
2025<span class="page-module__dgei_G__separator">•</span><span class="CategoryBadge-module__zj5UeW__badge">Performance</span>

</div>

</div>

<div>

<div class="BlogContent-module__V9oMQa__demoSection">

<div class="ThreeJsDemo-module__0QBSJG__container">

<img
src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdib3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1zbG90PSJpY29uIiBjbGFzcz0iVGhyZWVKc0RlbW8tbW9kdWxlX18wUUJTSkdfX3ZpZXdTb3VyY2VJY29uIj48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGQ9Ik0xNy4yNSA2Ljc1IDIyLjUgMTJsLTUuMjUgNS4yNW0tMTAuNSAwTDEuNSAxMmw1LjI1LTUuMjVtNy41LTMtNC41IDE2LjUiIC8+PC9zdmc+"
class="ThreeJsDemo-module__0QBSJG__viewSourceIcon" />View source

</div>

</div>

<div class="MarkdownPreview-module__2rwLBW__markdown">

You've built a beautiful Three.js scene. Hundreds of objects, detailed
models, smooth animations. But when you run it, the frame rate tanks.
Your first instinct might be to blame polygon counts or texture
sizes—but the real culprit is often something less obvious: **draw
calls**.

Understanding draw calls is one of the most important performance
concepts for any Three.js developer. Let's break down what they are, why
they matter, and how to minimize them.

## What is a Draw Call?

A draw call is a command from your CPU to your GPU that says: "Here's
some geometry, a material, and instructions—please render it."

Every time Three.js renders a mesh, it issues at least one draw call.
Sounds simple enough, right? Here's the problem: **the overhead of
issuing a draw call is expensive**, even if the actual rendering is
fast.

Here's what happens during each draw call:

1.  **CPU Preparation** - Gather transform matrices, shader references,
    uniforms, and vertex buffers
2.  **GPU State Changes** - Switch shader programs, bind textures,
    upload uniforms, configure rendering state
3.  **CPU-GPU Communication** - Send commands and data across the system
    bus
4.  **Actual Rendering** - Process vertices, rasterize pixels, run
    shaders (the fast part!)

The catch? Steps 1-3 take roughly the same time whether you're rendering
10 triangles or 10,000 triangles. The overhead is in the preparation and
state changes, not the rendering itself. That's where performance dies.

## Why Too Many Draw Calls Kill Performance

Modern GPUs can render millions of triangles per second. So why does a
scene with 1000 simple cubes (only 12,000 triangles total) run slower
than a scene with a single complex model containing 100,000 triangles?

**Draw call overhead.**

If you have 1000 separate mesh objects in your scene, that's potentially
1000 draw calls per frame. At 60 FPS, that's 60,000 draw calls per
second. The CPU can't keep up with preparing and issuing that many
commands, creating a bottleneck that starves the GPU.

Meanwhile, a single mesh with 100,000 triangles requires just one draw
call. The GPU processes it effortlessly.

<div class="MarkdownPreview-module__2rwLBW__infoCard">

<img
src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdib3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1zbG90PSJpY29uIiBjbGFzcz0iTWFya2Rvd25QcmV2aWV3LW1vZHVsZV9fMnJ3TEJXX19pbmZvSWNvbiI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTEuMjUgMTEuMjUuMDQxLS4wMmEuNzUuNzUgMCAwIDEgMS4wNjMuODUybC0uNzA4IDIuODM2YS43NS43NSAwIDAgMCAxLjA2My44NTNsLjA0MS0uMDIxTTIxIDEyYTkgOSAwIDEgMS0xOCAwIDkgOSAwIDAgMSAxOCAwWm0tOS0zLjc1aC4wMDh2LjAwOEgxMlY4LjI1WiIgLz48L3N2Zz4="
class="MarkdownPreview-module__2rwLBW__infoIcon" />

> **The Draw Call Bottleneck**
>
> In most Three.js scenes, you'll hit the CPU bottleneck from draw calls
> long before you hit the GPU's triangle rendering limit. A scene with
> 500+ draw calls per frame will struggle on most hardware, regardless
> of how few triangles each object has.

</div>

## 6 Tips for Minimizing Draw Calls

### 1. InstancedMesh for Repeated Objects

If you're rendering many copies of the same geometry, `InstancedMesh` is
your best friend. It renders hundreds or thousands of instances with a
single draw call.

**Instead of this:**

    javascript// Bad: 1000 draw calls
    for (let i = 0; i < 1000; i++) {
      const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(Math.random() * 50, Math.random() * 50, Math.random() * 50);
      scene.add(cube);
    }

**Do this:**

    javascript// Good: 1 draw call
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 1000);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < 1000; i++) {
      dummy.position.set(Math.random() * 50, Math.random() * 50, Math.random() * 50);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(instancedMesh);

Perfect for grass, trees, rocks, particles, or any repeated element.

### 2. Shared Materials

Three.js can batch meshes that use the same material. Creating a new
material for each object prevents this optimization.

**Instead of this:**

    javascript// Bad: Each mesh gets its own material instance
    const cube1 = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    const cube2 = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    const cube3 = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );

**Do this:**

    javascript// Good: Shared material enables potential batching
    const sharedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });

    const cube1 = new THREE.Mesh(geometry, sharedMaterial);
    const cube2 = new THREE.Mesh(geometry, sharedMaterial);
    const cube3 = new THREE.Mesh(geometry, sharedMaterial);

Even if the materials have identical properties, creating separate
instances prevents batching. Share whenever possible.

### 3. Merge Static Geometries

If objects don't need to move independently, merge them into a single
geometry. This is perfect for static environment pieces like buildings,
terrain details, or background elements.

**Instead of this:**

    javascript// Bad: Separate meshes for each building part
    const wall1 = new THREE.Mesh(wallGeometry, material);
    const wall2 = new THREE.Mesh(wallGeometry, material);
    const floor = new THREE.Mesh(floorGeometry, material);
    const roof = new THREE.Mesh(roofGeometry, material);
    scene.add(wall1, wall2, floor, roof);

**Do this:**

    javascript// Good: One merged mesh
    import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

    // Position each geometry before merging
    wall1Geometry.translate(-5, 0, 0);
    wall2Geometry.translate(5, 0, 0);
    roofGeometry.translate(0, 5, 0);

    const mergedGeometry = mergeGeometries([
      wall1Geometry,
      wall2Geometry,
      floorGeometry,
      roofGeometry
    ]);

    const building = new THREE.Mesh(mergedGeometry, material);
    scene.add(building);

This turns four draw calls into one. The tradeoff is that merged objects
can't be moved or animated individually.

### 4. Texture Atlases

Every texture switch can trigger a new draw call. Combining multiple
textures into a single atlas lets objects share textures and potentially
batch together.

**Instead of this:**

    javascript// Bad: Different textures prevent batching
    const material1 = new THREE.MeshStandardMaterial({ 
      map: texture1 
    });
    const material2 = new THREE.MeshStandardMaterial({ 
      map: texture2 
    });
    const material3 = new THREE.MeshStandardMaterial({ 
      map: texture3 
    });

**Do this:**

    javascript// Good: One atlas texture, adjust UVs for each object
    const atlasMaterial = new THREE.MeshStandardMaterial({ 
      map: atlasTexture  // Contains texture1, texture2, texture3
    });

    // Then adjust UV coordinates to point to correct atlas regions
    // This lets all objects share one material and texture

Texture atlases come with several notable drawbacks. Edge bleeding
occurs when adjacent textures in the atlas blur together during texture
filtering, especially at lower mip levels, requiring padding between
textures that wastes memory. The approach also requires complex UV
coordinate calculations to map into the correct atlas region.

Luckily, there is a more modern alternative: **data array textures**.

### 5. Data Array Textures

Data array textures offer a modern approach that solves many traditional
atlasing problems. Array textures are essentially a stack of 2D textures
that can be accessed by index in your shader—think of them as texture
layers rather than a single packed image.

#### Benefits Over Atlasing

Array textures eliminate edge bleeding between adjacent textures,
support native texture wrapping and tiling, and generate proper
per-layer mipmaps without cross-contamination. They also simplify your
code significantly—no complex UV offset calculations or atlas packing
algorithms needed. When combined with `BatchedMesh`, you can render many
objects with different textures in a single draw call using direct
hardware indexing instead of shader branching.

#### Key Trade-offs

The main limitation: **all textures must have identical dimensions**. If
you need mixed resolutions, you'll need multiple array textures or fall
back to atlases. Array textures also require WebGL2, though browser
support is excellent in 2025. Finally, they allocate memory for all
layers upfront, whereas atlases can be packed more efficiently.

    javascript// Create an array texture with multiple layers
    const arrayTexture = new THREE.DataArrayTexture(data, 512, 512, 10);
    arrayTexture.needsUpdate = true;

    // In your shader, access layers directly
    // vec4 color = texture(uTextures, vec3(vUv, textureIndex));

    // Use with BatchedMesh for optimal draw call reduction
    const batchedMesh = new THREE.BatchedMesh(maxInstances, maxVerts, maxIndices, material);

For projects targeting modern browsers with same-sized textures, array
textures combined with `BatchedMesh` often outperform traditional
atlasing. However, atlases remain valuable for WebGL1 compatibility and
variable-sized textures.

### 6. Level of Detail (LOD)

Sometimes you can't avoid multiple meshes, but you can be smarter about
when they render. LOD (Level of Detail) swaps high-poly models for
low-poly versions based on distance from the camera.

    javascriptconst lod = new THREE.LOD();

    // High detail version (close up)
    const highDetail = new THREE.Mesh(highPolyGeometry, material);
    lod.addLevel(highDetail, 0);

    // Medium detail (mid distance)
    const mediumDetail = new THREE.Mesh(mediumPolyGeometry, material);
    lod.addLevel(mediumDetail, 20);

    // Low detail (far away)
    const lowDetail = new THREE.Mesh(lowPolyGeometry, material);
    lod.addLevel(lowDetail, 50);

    scene.add(lod);

Distant objects can use extremely simple geometry (even a single plane
as an impostor). This reduces both draw calls and triangle counts for
faraway objects that don't need detail.

<div class="MarkdownPreview-module__2rwLBW__infoCard">

<img
src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdib3g9IjAgMCAyNCAyNCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBhcmlhLWhpZGRlbj0idHJ1ZSIgZGF0YS1zbG90PSJpY29uIiBjbGFzcz0iTWFya2Rvd25QcmV2aWV3LW1vZHVsZV9fMnJ3TEJXX19pbmZvSWNvbiI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBkPSJtMTEuMjUgMTEuMjUuMDQxLS4wMmEuNzUuNzUgMCAwIDEgMS4wNjMuODUybC0uNzA4IDIuODM2YS43NS43NSAwIDAgMCAxLjA2My44NTNsLjA0MS0uMDIxTTIxIDEyYTkgOSAwIDEgMS0xOCAwIDkgOSAwIDAgMSAxOCAwWm0tOS0zLjc1aC4wMDh2LjAwOEgxMlY4LjI1WiIgLz48L3N2Zz4="
class="MarkdownPreview-module__2rwLBW__infoIcon" />

> **Bonus Tip: Check Your Stats**
>
> Use Three.js stats or browser dev tools to monitor draw calls:
>
>     javascriptconsole.log(renderer.info.render.calls); // Draw calls this frame
>
> Aim for under 100 draw calls per frame for smooth performance on most
> hardware. If you're seeing 500+, it's time to optimize.

</div>

## The Mental Shift

Stop thinking about performance in terms of "how many triangles" and
start thinking about "how many draw calls." A forest scene with 100,000
trees using instancing (1 draw call) will outperform a scene with 100
unique objects (100 draw calls), even though the tree scene has 1000x
more geometry.

The GPU can handle geometry. What it can't handle efficiently is being
interrupted constantly by new commands from the CPU.

## Knowing When to Optimize

Not every project needs aggressive draw call optimization. A simple
scene with 50 objects? Don't worry about it. But if you're building:

- Large open worlds with thousands of objects
- Particle systems or procedural environments
- Mobile experiences (more limited CPU/GPU)
- VR applications (need to hit 90+ FPS)

Then draw call optimization becomes critical. Use these five techniques,
and you'll keep your scenes running smoothly no matter how complex they
become.

</div>

</div>

Find any mistakes or bugs in this article? Please let me know by sending
an email to <support@threejsroadmap.com>.

<div class="BlogNewsletter-module__GuFmyq__content">

### Enjoying the blog?

Subscribe to the Three.js Roadmap newsletter for new posts, course
releases, and exclusive discounts.

<div class="BlogNewsletter-module__GuFmyq__inputGroup">

<span class="button-module__iDa5sG__buttonContent">Subscribe</span>

</div>

Unsubscribe anytime. No spam.

</div>

</div>
