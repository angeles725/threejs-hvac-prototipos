# Preserved external sources — Three.js library research

> Registry of every document/page downloaded during the research. Research-SDD rule:
> URLs die; evidence does not. Blocks cite the **local file**,
> not the URL. This registry is maintained by `research-sdd/toolbelt/fetch-doc.sh` (automatic append).

| File | Type | Origin (URL) | Date (UTC) | sha256 | Blocks that cite it |
|---|---|---|---|---|---|

## Structure

```
sources/
  datasheets/      ← (unused for this target)
  manuals/         ← official Three.js docs/manual pages preserved
  web-snapshots/   ← pages and forums converted to markdown (pandoc)
  extracted/       ← extracted text (pdftotext) / OCR (tesseract)
```

## Note on context7

Documentation retrieved via the context7 MCP (`/mrdoob/three.js`) is treated as
**official web** (`[CERT-web]`, cite: "context7 /mrdoob/three.js + query + date").
Load-bearing claims sourced from context7 are cross-checked against, and when
possible preserved from, threejs.org (fetch-doc.sh → web-snapshots/).
| web-snapshots/skyeshark.github.io_threejs-silhouette-pom_.md | web-snapshot | https://skyeshark.github.io/threejs-silhouette-pom/ | 2026-07-04T20:38:53Z | 04adf2b071e479b2… | |
| web-snapshots/xr-need.com_web-features_threejs_pathtracer_1_dist_.md | web-snapshot | https://xr-need.com/web-features/threejs/pathtracer/1/dist/ | 2026-07-04T20:38:56Z | e744c3e4738f6e33… | |
| web-snapshots/little-landscapes.vercel.app_.md | web-snapshot | https://little-landscapes.vercel.app/ | 2026-07-04T20:38:58Z | 6ab3e0db93d66a99… | |
| web-snapshots/re-presentation.jp_tool_arachne.html.md | web-snapshot | https://re-presentation.jp/tool/arachne.html | 2026-07-04T20:39:03Z | 88d45b1a00c09828… | |
| web-snapshots/dasprinzip.com_tinker_day39_.md | web-snapshot | https://dasprinzip.com/tinker/day39/ | 2026-07-04T20:39:04Z | a7b39d3621fb3a7c… | |
| web-snapshots/dasprinzip.com_tinker_day38_.md | web-snapshot | https://dasprinzip.com/tinker/day38/ | 2026-07-04T20:39:04Z | 5b43f1e5a97cca41… | |
| web-snapshots/dasprinzip.com_tinker_day37_.md | web-snapshot | https://dasprinzip.com/tinker/day37/ | 2026-07-04T20:39:05Z | dc8570a551b3657c… | |
| web-snapshots/dasprinzip.com_tinker_day36_.md | web-snapshot | https://dasprinzip.com/tinker/day36/ | 2026-07-04T20:39:06Z | e12edaba9ec8d97b… | |
| web-snapshots/dasprinzip.com_tinker_day33_.md | web-snapshot | https://dasprinzip.com/tinker/day33/ | 2026-07-04T20:39:06Z | 6b1c9b809c0e5cd7… | |
| web-snapshots/dasprinzip.com_tinker_day30_.md | web-snapshot | https://dasprinzip.com/tinker/day30/ | 2026-07-04T20:39:06Z | 3c776c0dd8ed7f33… | |
| web-snapshots/dasprinzip.com_tinker_day27_.md | web-snapshot | https://dasprinzip.com/tinker/day27/ | 2026-07-04T20:39:07Z | 55e4f68374288cb2… | |
| web-snapshots/dasprinzip.com_tinker_day26_.md | web-snapshot | https://dasprinzip.com/tinker/day26/ | 2026-07-04T20:39:07Z | 8e6525133dd1b321… | |
| web-snapshots/dasprinzip.com_tinker_day25_.md | web-snapshot | https://dasprinzip.com/tinker/day25/ | 2026-07-04T20:39:08Z | e525c3193d2cc49b… | |
| web-snapshots/dasprinzip.com_tinker_day23_.md | web-snapshot | https://dasprinzip.com/tinker/day23/ | 2026-07-04T20:39:08Z | 23d2407ecdecb7ce… | |
| web-snapshots/gb.manzarpour.com__g__Ibg_WXgA.md | web-snapshot | https://gb.manzarpour.com/?g=_Ibg_WXgA | 2026-07-04T20:39:09Z | 70ec4efead372e5e… | |
| web-snapshots/jeonghopark.de_collectivetrajectories_.md | web-snapshot | https://jeonghopark.de/collectivetrajectories/ | 2026-07-04T20:39:17Z | 01ba4719c80b6fe9… | |
| web-snapshots/journey.prateekm.dev_.md | web-snapshot | https://journey.prateekm.dev/ | 2026-07-04T20:39:19Z | 0e5dce9e79a15946… | |
| web-snapshots/su-z2.vercel.app_.md | web-snapshot | https://su-z2.vercel.app/ | 2026-07-04T20:39:21Z | b31b1c375f00e5cb… | |
| web-snapshots/maplibre.org_maplibre-gl-js_docs_examples_add-a-3d-model-using-threejs_.md | web-snapshot | https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-using-threejs/ | 2026-07-04T20:41:14Z | 42425a45ab15620e… | |
| web-snapshots/knowtheuniverse.com_.md | web-snapshot | https://knowtheuniverse.com/ | 2026-07-04T21:34:30Z | cf5ccc1277a3877c… | |
| web-snapshots/feed-panda.vercel.app_.md | web-snapshot | https://feed-panda.vercel.app/ | 2026-07-04T21:34:31Z | f42ab12d350e4aa1… | |
| web-snapshots/madebyevan.com_webgl-water_.md | web-snapshot | https://madebyevan.com/webgl-water/ | 2026-07-04T21:34:31Z | 21af04f4f83f1e99… | |
| web-snapshots/heartbeat-solana.vercel.app_.md | web-snapshot | https://heartbeat-solana.vercel.app/ | 2026-07-04T21:34:31Z | f179f9c9097c83e5… | |
| web-snapshots/atlas3d.space_model_9.md | web-snapshot | https://atlas3d.space/model/9 | 2026-07-04T21:34:32Z | c9e48ef6eb5c3694… | |
| web-snapshots/atlas3d.space_model_12.md | web-snapshot | https://atlas3d.space/model/12 | 2026-07-04T21:34:33Z | c9e48ef6eb5c3694… | |
| web-snapshots/shader-studio-teal.vercel.app_.md | web-snapshot | https://shader-studio-teal.vercel.app/ | 2026-07-04T21:34:33Z | 747556ca8c18afcb… | |
| web-snapshots/laubsauger.github.io_mesh-test_.md | web-snapshot | https://laubsauger.github.io/mesh-test/ | 2026-07-04T21:34:33Z | 5e4b71813d803c1d… | |
| web-snapshots/fractalworlds.io__formula_Straebathan.md | web-snapshot | https://fractalworlds.io/?formula=Straebathan | 2026-07-04T21:34:34Z | 2de9d8e7db6eb220… | |
| web-snapshots/lazykitty.itch.io_ex-nihilo.md | web-snapshot | https://lazykitty.itch.io/ex-nihilo | 2026-07-04T21:34:34Z | 388df577fc2b4e87… | |
| web-snapshots/www.reddit.com_r_threejs_comments_1ujp6bb_threejs_animation_laggy_on_iphone_17_p.md | web-snapshot | https://www.reddit.com/r/threejs/comments/1ujp6bb/threejs_animation_laggy_on_iphone_17_pro_and/ | 2026-07-04T21:34:35Z | 8995fa95e78bd539… | |
| web-snapshots/discourse.threejs.org_t_three-slugtext-gpu-text-renderer_90599.md | web-snapshot | https://discourse.threejs.org/t/three-slugtext-gpu-text-renderer/90599 | 2026-07-04T21:34:37Z | c425de710783abbf… | |
| web-snapshots/discourse.threejs.org_t_sacred-pearl-underwater-warmness_91641.md | web-snapshot | https://discourse.threejs.org/t/sacred-pearl-underwater-warmness/91641 | 2026-07-04T21:34:38Z | 3b4031a92a8876d6… | |
| web-snapshots/discourse.threejs.org_t_volumetric-lighting-in-webgpu_87959.md | web-snapshot | https://discourse.threejs.org/t/volumetric-lighting-in-webgpu/87959 | 2026-07-04T21:34:40Z | f8d70ca8cb4448ab… | |
| web-snapshots/discourse.threejs.org_t_browser-based-3d-texture-painter-pbr-material-editor-bui.md | web-snapshot | https://discourse.threejs.org/t/browser-based-3d-texture-painter-pbr-material-editor-built-with-three-js/92552 | 2026-07-04T21:34:41Z | ce06db44b37a1fd5… | |
| web-snapshots/raw.githubusercontent.com_matsuoka-601_Splash_main_README.md.md | web-snapshot | https://raw.githubusercontent.com/matsuoka-601/Splash/main/README.md | 2026-07-04T21:34:41Z | 9c6e09cb809f6376… | |
| web-snapshots/raw.githubusercontent.com_void032_shader-studio_main_README.md.md | web-snapshot | https://raw.githubusercontent.com/void032/shader-studio/main/README.md | 2026-07-04T21:34:41Z | 38713a00c33183d4… | |
| web-snapshots/raw.githubusercontent.com_laubsauger_mesh-test_main_README.md.md | web-snapshot | https://raw.githubusercontent.com/laubsauger/mesh-test/main/README.md | 2026-07-04T21:34:41Z | 500f365f1cb1e8f6… | |
| web-snapshots/discourse.threejs.org_t_houdini-vertex-animation-textures-vat-3-0-for-wgsl_92245.md | web-snapshot | https://discourse.threejs.org/t/houdini-vertex-animation-textures-vat-3-0-for-wgsl/92245 | 2026-07-04T21:34:42Z | 8950f2c1ba2e7456… | |
| web-snapshots/discourse.threejs.org_.md | web-snapshot | https://discourse.threejs.org/ | 2026-07-04T21:34:43Z | cf463118f76885ba… | |
| old.reddit.com_r_threejs_comments_1ujp6bb_threejs_animation_laggy_on_iphone_17_p.md | web-snapshot | https://old.reddit.com/r/threejs/comments/1ujp6bb/threejs_animation_laggy_on_iphone_17_pro_and/ | 2026-07-04T21:35:19Z | 9592426d5207cf00… | (fallback: www.reddit.com blocked by bot-protection, got only SVG shell; old.reddit.com succeeded) |
| web-snapshots/codepen.io_prisoner849_pen_qEqOoPB.md | web-snapshot | https://codepen.io/prisoner849/pen/qEqOoPB | 2026-07-04T21:41:46Z | a28c3b9af49270fc… | |
| web-snapshots/fractalworlds.io_runtime_screenshot.png | runtime-screenshot | https://fractalworlds.io/?formula=Straebathan | 2026-07-04T21:55:31Z | e2b055acfdcebabb… | [Block 21] §21.2 (browser-MCP probe: raw WebGPU, no three.js) |
| web-snapshots/google.github.io_filament_Filament.md.html.md | web-snapshot | https://google.github.io/filament/Filament.md.html | 2026-07-04T23:05:30Z | cd4374d13fe3b6d9… | |
| web-snapshots/github.com_KhronosGroup_glTF_blob_main_specification_2.0_Specification.adoc.md | web-snapshot | https://github.com/KhronosGroup/glTF/blob/main/specification/2.0/Specification.adoc | 2026-07-04T23:06:13Z | 8101e4fea1861dcf… | |
| web-snapshots/theslantedlens.com_lighting-techniques-for-product-photography-with-shiny-metal_.md | web-snapshot | https://theslantedlens.com/lighting-techniques-for-product-photography-with-shiny-metal/ | 2026-07-04T23:12:11Z | ec55842f84e4daa0… | |
| web-snapshots/wolfcrow.com_what-is-three-point-lighting-and-why-do-we-use-it_.md | web-snapshot | https://wolfcrow.com/what-is-three-point-lighting-and-why-do-we-use-it/ | 2026-07-04T23:12:14Z | a0c32ab05d5052a6… | |
| web-snapshots/gltf-transform.dev_cli.html.md | web-snapshot | https://gltf-transform.dev/cli.html | 2026-07-04T23:24:21Z | e6639ffd015f0a2c… | |
| web-snapshots/raw.githubusercontent.com_zeux_meshoptimizer_master_gltf_README.md.md | web-snapshot | https://raw.githubusercontent.com/zeux/meshoptimizer/master/gltf/README.md | 2026-07-04T23:24:30Z | b93bd29b2adffd8e… | |
| web-snapshots/developer.mozilla.org_en-US_docs_Web_API_WebGL_API_WebGL_best_practices.md | web-snapshot | https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices | 2026-07-04T23:34:59Z | 23d38584ef1d3e1d… | |
| web-snapshots/docs.unity3d.com_Manual_webgl-performance.html.md | web-snapshot | https://docs.unity3d.com/Manual/webgl-performance.html | 2026-07-04T23:35:00Z | c967ab354e8e0e72… | |
| web-snapshots/threejsroadmap.com_blog_draw-calls-the-silent-killer.md | web-snapshot | https://threejsroadmap.com/blog/draw-calls-the-silent-killer | 2026-07-04T23:35:17Z | 35e3b2cf3337b80d… | |
