# Snapshot — THREE.LOD auto-update & API  [CERT-web]

- **Source**: context7 MCP, library `/mrdoob/three.js` (three.js docs, dev branch)
- **Query**: "Does WebGLRenderer automatically call LOD.update(camera) each frame,
  or must I call it manually? How does THREE.LOD autoUpdate and addLevel work?"
- **Accessed**: 2026-07-06
- **Cited by**: [Block 40]

---

## LOD > Properties > .autoUpdate
> The `.autoUpdate` property controls whether the LOD object is automatically updated
> by the renderer each frame. If set to `false`, you must manually call `LOD#update`
> in your render loop. The default value for `.autoUpdate` is `true`.

Source: https://github.com/mrdoob/three.js/blob/dev/docs/pages/LOD.html

## LOD > Methods > .update
> The `.update()` method manually computes and sets the visible LOD level based on the
> current distance of the provided camera. This method must be called in the render
> loop if `.autoUpdate` is set to `false`.

Source: https://github.com/mrdoob/three.js/blob/dev/docs/pages/LOD.html

## Migration Guide r105 → r106
> Objects of type `LOD` are now automatically updated by `WebGLRenderer`. To manually
> control updates, set `LOD.autoUpdate` to `false`.

Source: https://github.com/mrdoob/three.js/wiki/Migration-Guide

## Usage pattern (examples/webgl_lod.html)
> const lod = new THREE.LOD();
> for ( let i = 0; i < geometry.length; i ++ ) {
>   const mesh = new THREE.Mesh( geometry[ i ][ 0 ], material );
>   lod.addLevel( mesh, geometry[ i ][ 1 ] );   // (object, distance) — distance 0 = nearest/most-detailed
> }
> scene.add( lod );

Source: https://github.com/mrdoob/three.js/blob/dev/examples/webgl_lod.html

---

**Load-bearing fact for B40**: with `LOD.autoUpdate = true` (the default, since r106),
`WebGLRenderer` calls `lod.update(camera)` every frame during render — so a `THREE.LOD`
switches levels by camera distance WITHOUT any manual call in the animation loop.
Forcing a level for measurement requires `autoUpdate = false` + toggling each level
object's `.visible`.
