<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img
  src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+"
  class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">👩🏻‍🏫 Tutorials</span>
- <a href="/Tutorials/Components/" class="breadcrumbs__link"
  itemprop="item"><span itemprop="name">Components</span></a>
- <span class="breadcrumbs__link">Core</span>
- <span class="breadcrumbs__link" itemprop="name">IfcLoader</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# IfcLoader

</div>

<div style="position:relative">

<div class="iframe">

<div id="container" class="full-screen">

</div>

</div>

Go Full Screen

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Source

</div>

<div class="admonitionContent_BuS1">

Copying and pasting? We've got you covered! You can find the full source
code of this tutorial <a
href="https://github.com/ThatOpen/engine_components/blob/main/packages/core/src/fragments/IfcLoader/example.ts"
target="_blank" rel="noopener noreferrer">here</a>.

</div>

</div>

## 📄 Loading IFC Models<a href="/Tutorials/Components/Core/IfcLoader#-loading-ifc-models"
class="hash-link" aria-label="Direct link to 📄 Loading IFC Models"
title="Direct link to 📄 Loading IFC Models">​</a>

------------------------------------------------------------------------

Loading IFC models at runtime is too slow for production — the engine
must parse and convert it to Fragments before anything can render. The
recommended workflow is to do that conversion once, save the resulting
`.frag` file, and load that on every subsequent session. This tutorial
covers configuring the IFC loader with the web-ifc WASM binary, wiring
the FragmentsManager to receive the converted result, loading an IFC
file with a progress callback, and downloading the generated Fragments
file so it can be reused directly. By the end, you'll have a complete
IFC import pipeline that produces a reusable Fragment asset.

### 🖖 Importing our Libraries<a href="/Tutorials/Components/Core/IfcLoader#-importing-our-libraries"
class="hash-link" aria-label="Direct link to 🖖 Importing our Libraries"
title="Direct link to 🖖 Importing our Libraries">​</a>

First things first, let's install all necessary dependencies to make
this example work:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
import Stats from "stats.js";
import * as BUI from "@thatopen/ui";
// You have to import * as OBC from "@thatopen/components"
import * as OBC from "../..";
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

### 🌎 Setting up a Simple Scene<a
href="/Tutorials/Components/Core/IfcLoader#-setting-up-a-simple-scene"
class="hash-link"
aria-label="Direct link to 🌎 Setting up a Simple Scene"
title="Direct link to 🌎 Setting up a Simple Scene">​</a>

To get started, let's set up a basic ThreeJS scene. This will serve as
the foundation for our application and allow us to visualize the 3D
models effectively:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);
const world = worlds.create<
  OBC.SimpleScene,
  OBC.OrthoPerspectiveCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.scene.setup();
world.scene.three.background = null;

const container = document.getElementById("container")!;
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.OrthoPerspectiveCamera(components);
await world.camera.controls.setLookAt(78, 20, -2.2, 26, -4, 25);

components.init();

components.get(OBC.Grids).create(world);
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

### ✨ Using The IfcLoader Component<a
href="/Tutorials/Components/Core/IfcLoader#-using-the-ifcloader-component"
class="hash-link"
aria-label="Direct link to ✨ Using The IfcLoader Component"
title="Direct link to ✨ Using The IfcLoader Component">​</a>

With the basic world already set up, it's now time to bring it to life
by loading some IFC files. That Open Engine does not directly load IFC
files. When an IFC file is "loaded", the engine first converts it into
something called Fragments and then loads it into the scene. The model
you see is the result of this process.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Fragments?

</div>

<div class="admonitionContent_BuS1">

Fragments are That Open Company's open-source binary format for storing
BIM models. They are built on top of Flatbuffers from Google, making
them lightweight and highly efficient for storing vast amounts of BIM
data.

</div>

</div>

All That Open Engine works on top of Fragments, and that's why the
conversion process must take place. So, let's start by getting the
component instance:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const ifcLoader = components.get(OBC.IfcLoader);
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>What
elements of IFC get converted to Fragments?

</div>

<div class="admonitionContent_BuS1">

For memory efficiency reasons, we don't convert each an every element to
fragments by default. You can see the list in IfcImporter.classes and
check out the full list <a
href="https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/src/Importers/IfcImporter/src/classes.ts"
target="_blank" rel="noopener noreferrer">here</a>. If you convert an
IFC to fragments and miss some elements, you probably need to add their
IFC classes to the list. You can access the importer instance in the
onIfcImporterInitialized event.

</div>

</div>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
ifcLoader.onIfcImporterInitialized.add((importer) => {
  console.log(importer.classes);
});
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

With the loader in place, it needs to be properly configured. This
involves setting up web-ifc (the core library responsible for reading
IFC files) to ensure it is ready to convert IFC files into Fragments:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
await ifcLoader.setup({
  autoSetWasm: false,
  wasm: {
    path: "https://unpkg.com/web-ifc@0.0.77/",
    absolute: true,
  },
});
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

When an IFC file is converted to Fragments, another component handles
the converted file: the FragmentsManager. Therefore, it is essential to
configure this component first before attempting to "load" any IFC file:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
// `FragmentsManager.getWorker()` fetches the matching worker for this library version from unpkg and returns a blob URL.
// You can also pass your own URL to `fragments.init(...)` if you'd rather host the worker yourself.
const workerUrl = await OBC.FragmentsManager.getWorker();
const fragments = components.get(OBC.FragmentsManager);
fragments.init(workerUrl);

world.camera.controls.addEventListener("update", () => fragments.core.update());

// Ensures that once the Fragments model is loaded
// (converted from the IFC in this case),
// it utilizes the world camera for updates
// and is added to the scene.
fragments.list.onItemSet.add(({ value: model }) => {
  model.useCamera(world.camera.three);
  world.scene.three.add(model.object);
  fragments.core.update(true);
});

// Remove z fighting
fragments.core.models.materials.list.onItemSet.add(({ value: material }) => {
  if (!("isLodMaterial" in material && material.isLodMaterial)) {
    material.polygonOffset = true;
    material.polygonOffsetUnits = 1;
    material.polygonOffsetFactor = Math.random();
  }
});
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Need
more details?

</div>

<div class="admonitionContent_BuS1">

For additional information about the FragmentsManager, refer to the
corresponding component tutorial available in the documentation.

</div>

</div>

Great! With everything configured, let's proceed to create a function
that will load an IFC model into the viewer:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const loadIfc = async (path: string) => {
  const file = await fetch(path);
  const data = await file.arrayBuffer();
  const buffer = new Uint8Array(data);
  await ifcLoader.load(buffer, false, "example", {
    processData: {
      progressCallback: (progress) => console.log(progress),
    },
  });
};
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Personalized
Conversion

</div>

<div class="admonitionContent_BuS1">

The IfcLoader component provides a quick and convenient way to convert
IFC files into Fragments and load them into the engine. However, for
greater control over the conversion process, it is recommended to use
the Fragments library directly. The conversion mechanism is the same,
but the core library offers a less abstracted approach.

</div>

</div>

Once the file is loaded, you can leverage any of the engine's components
to interact with it. Each component is a specialized tool designed for
specific tasks with Fragment Models. There are components for
measurements, model classification, visibility operations, plan
generation, and much more. Check out the full documentation to learn
more!

### 🎁 Exporting the Fragments Model<a
href="/Tutorials/Components/Core/IfcLoader#-exporting-the-fragments-model"
class="hash-link"
aria-label="Direct link to 🎁 Exporting the Fragments Model"
title="Direct link to 🎁 Exporting the Fragments Model">​</a>

The primary goal of this process is to load the Fragments Model instead
of the IFC file. This approach is more efficient because the
time-consuming part is the conversion process, not the actual loading of
the model into the scene. So, how can you obtain the Fragments Model
resulting from the conversion? It's simple! Here's how:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const downloadFragments = async () => {
  // fragments.list holds all the fragments loaded
  const [model] = fragments.list.values();
  if (!model) return;
  const fragsBuffer = await model.getBuffer(false);
  const file = new File([fragsBuffer], "school_str.frag");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
};
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

Now that you can download the Fragments Model, what's next? You should
continue loading this file instead of the original IFC file. To learn
how to consistently load Fragments Models instead of the original IFC
file, refer to the FragmentsManager tutorial.

### 🧩 Adding some UI (optional but recommended)<a
href="/Tutorials/Components/Core/IfcLoader#-adding-some-ui-optional-but-recommended"
class="hash-link"
aria-label="Direct link to 🧩 Adding some UI (optional but recommended)"
title="Direct link to 🧩 Adding some UI (optional but recommended)">​</a>

We will use the `@thatopen/ui` library to add some simple and cool UI
elements to our app. First, we need to call the `init` method of the
`BUI.Manager` class to initialize the library:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
BUI.Manager.init();
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

Now we will add some UI to play around with the actions in this
tutorial. For more information about the UI library, you can check the
specific documentation for it!

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const [panel, updatePanel] = BUI.Component.create<BUI.PanelSection, {}>((_) => {
  let downloadBtn: BUI.TemplateResult | undefined;
  if (fragments.list.size > 0) {
    downloadBtn = BUI.html`
      <bim-button label="Download Fragments" @click=${downloadFragments}></bim-button>
    `;
  }

  let loadBtn: BUI.TemplateResult | undefined;
  if (fragments.list.size === 0) {
    const onLoadIfc = async ({ target }: { target: BUI.Button }) => {
      target.label = "Conversion in progress...";
      target.loading = true;
      await loadIfc(
        "https://thatopen.github.io/engine_components/resources/ifc/school_str.ifc",
      );
      target.loading = false;
      target.label = "Load IFC";
    };

    loadBtn = BUI.html`
      <bim-button label="Load IFC" @click=${onLoadIfc}></bim-button>
      <bim-label>Open the console to see the progress!</bim-label>
    `;
  }

  return BUI.html`
    <bim-panel active label="IfcLoader Tutorial" class="options-menu">
      <bim-panel-section label="Controls">
        ${loadBtn}
        ${downloadBtn}
      </bim-panel-section>
    </bim-panel>
  `;
}, {});

document.body.append(panel);
fragments.list.onItemSet.add(() => updatePanel());
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

And we will make some logic that adds a button to the screen when the
user is visiting our app from their phone, allowing to show or hide the
menu. Otherwise, the menu would make the app unusable.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const button = BUI.Component.create<BUI.PanelSection>(() => {
  return BUI.html`
      <bim-button class="phone-menu-toggler" icon="solar:settings-bold"
        @click="${() => {
          if (panel.classList.contains("options-menu-visible")) {
            panel.classList.remove("options-menu-visible");
          } else {
            panel.classList.add("options-menu-visible");
          }
        }}">
      </bim-button>
    `;
});

document.body.append(button);
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

### ⏱️ Measuring the performance (optional)<a
href="/Tutorials/Components/Core/IfcLoader#️-measuring-the-performance-optional"
class="hash-link"
aria-label="Direct link to ⏱️ Measuring the performance (optional)"
title="Direct link to ⏱️ Measuring the performance (optional)">​</a>

We'll use the
<a href="https://github.com/mrdoob/stats.js" target="_blank"
rel="noopener noreferrer">Stats.js</a> to measure the performance of our
app. We will add it to the top left corner of the viewport. This way,
we'll make sure that the memory consumption and the FPS of our app are
under control.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block"
style="--prism-color:#F8F8F2;--prism-background-color:#282A36">

<div class="codeBlockContent_biex">

``` js
const stats = new Stats();
stats.showPanel(2);
document.body.append(stats.dom);
stats.dom.style.left = "0px";
stats.dom.style.zIndex = "unset";
world.renderer.onBeforeUpdate.add(() => stats.begin());
world.renderer.onAfterUpdate.add(() => stats.end());
```

<div class="buttonGroup__atx">

<span class="copyButtonIcons_eSgA" aria-hidden="true"><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uSWNvbl95OTdOIj48cGF0aCBmaWxsPSJjdXJyZW50Q29sb3IiIGQ9Ik0xOSwyMUg4VjdIMTlNMTksNUg4QTIsMiAwIDAsMCA2LDdWMjFBMiwyIDAgMCwwIDgsMjNIMTlBMiwyIDAgMCwwIDIxLDIxVjdBMiwyIDAgMCwwIDE5LDVNMTYsMUg0QTIsMiAwIDAsMCAyLDNWMTdINFYzSDE2VjFaIiAvPjwvc3ZnPg=="
class="copyButtonIcon_y97N" /><img
src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJjb3B5QnV0dG9uU3VjY2Vzc0ljb25fTGpkUyI+PHBhdGggZmlsbD0iY3VycmVudENvbG9yIiBkPSJNMjEsN0w5LDE5TDMuNSwxMy41TDQuOTEsMTIuMDlMOSwxNi4xN0wxOS41OSw1LjU5TDIxLDdaIiAvPjwvc3ZnPg=="
class="copyButtonSuccessIcon_LjdS" /></span>

</div>

</div>

</div>

### 🎉 Wrap up<a href="/Tutorials/Components/Core/IfcLoader#-wrap-up"
class="hash-link" aria-label="Direct link to 🎉 Wrap up"
title="Direct link to 🎉 Wrap up">​</a>

That's it! Now you're able to load IFC models, convert them to
Fragments, and interact with them in a 3D scene. Congratulations! Keep
going with more tutorials in the documentation.

</div>

<a href="/Tutorials/Components/Core/IDSSpecifications"
class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

IDSSpecifications

</div>

<a href="/Tutorials/Components/Core/ItemsFinder"
class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

ItemsFinder

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="/Tutorials/Components/Core/IfcLoader#-loading-ifc-models"
  class="table-of-contents__link toc-highlight">📄 Loading IFC Models</a>
  - <a href="/Tutorials/Components/Core/IfcLoader#-importing-our-libraries"
    class="table-of-contents__link toc-highlight">🖖 Importing our
    Libraries</a>
  - <a
    href="/Tutorials/Components/Core/IfcLoader#-setting-up-a-simple-scene"
    class="table-of-contents__link toc-highlight">🌎 Setting up a Simple
    Scene</a>
  - <a
    href="/Tutorials/Components/Core/IfcLoader#-using-the-ifcloader-component"
    class="table-of-contents__link toc-highlight">✨ Using The IfcLoader
    Component</a>
  - <a
    href="/Tutorials/Components/Core/IfcLoader#-exporting-the-fragments-model"
    class="table-of-contents__link toc-highlight">🎁 Exporting the Fragments
    Model</a>
  - <a
    href="/Tutorials/Components/Core/IfcLoader#-adding-some-ui-optional-but-recommended"
    class="table-of-contents__link toc-highlight">🧩 Adding some UI
    (optional but recommended)</a>
  - <a
    href="/Tutorials/Components/Core/IfcLoader#️-measuring-the-performance-optional"
    class="table-of-contents__link toc-highlight">⏱️ Measuring the
    performance (optional)</a>
  - <a href="/Tutorials/Components/Core/IfcLoader#-wrap-up"
    class="table-of-contents__link toc-highlight">🎉 Wrap up</a>

</div>

</div>

</div>

</div>

</div>
