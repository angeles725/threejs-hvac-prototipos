# blender.org/lab/mcp-server — text extract (fetched 2026-07-12)

MCP Server — Blender
Toggle navigation
Features
Download
Support
Get Involved
About
Jobs
Store
Donate
Blender Lab
MCP Server
Features
Download
Support
Get Involved
About
Jobs
Store
Donate
Blender Lab
MCP Server
MCP Server
A lightweight MCP (Model Context Protocol) server for Blender. It offers a natural language interface with Blender’s Python API, improving access to documentation, and allowing users to explore and understand complex setups.
For technical details and documentation about the architecture check the
source code
.
Security Warning
The MCP server will execute LLM generated code in Blender without any guards in place to protect your data from removal or being sent to a remote location. To keep your data safe it is recommended to use a virtual machine, or a system without access to sensitive information.
Installation
Blender does not have any built-in functionality for connecting to LLMs.
In order for Blender to connect with LLMs,
three external tools must be manually downloaded, installed, and run
.
Requirements:
Blender 5.1
or newer
Add-on
LLM Client
MCP Server
Add-on
In order to interact with your Blender session you need to install a specific add-on for the MCP Server integration.
Drag and Drop into Blender
…or
download
and
Install from Disk
If you drag & drop into Blender
you will need to do it twice
. First to add the Blender Lab repository, secondly to install the add-on itself. This method allows you to receive update notifications whenever a new version of this add-on is available.
LLM Client
MCP Servers follow a well defined standard and are compatible with a myriad of clients. Please follow the
LLama.cpp
documentation, or install a LLM client of your preference.
MCP Server
There are different ways to install the MCP Server depending on your LLM client capabilities.
MCP Bundle
: For newer clients that support
.mcpb
files, download the
latest package
from the release page.
Llama.cpp doesn’t support this yet.
MCP Server
: To install from the source code check the
Llama.cpp documentation
or the
setup instructions
.
Running
Once if you have your MCP Server setup within your LLM Client, you can start to explore your Blender scenes.
llama.cpp web interface running the blender-mcp server.
Example 1: Scene Analysis
MCP can be used to programatically analyze the scene for performance bottomnecks. Take for instance the
Classroom demo file
:
Classroom demo file.
This scene is one of the
Blender benchmark
files. The reason those files are in the benchmark is because they are a good representation of real production files created by artists. And it is no surprise that it can contain objects prone to be optimized.
While checking for polygon count is often enough, even more interesting is to plot the number of polygons based on how big they show on the final render. This can be obtained with the following prompt.
Analyze the scene and list the outliers: objects with highest polygon count but smaller size from the camera point of view.
The plotted resulting data shows clearly two objects which stand out from the rest:
alphabet
and
coat 1
:
Graph analysis of the polycount per screen area for the classroom demo scene.
The
alphabet
object has 20k polygons. Because of its flat disposition it could be replaced by a texture with little downside to the final result. The
coat 1
object has 37k polygons due to its Subsurf modifier. Lowering the subdivision level could alleviate the scene, if memory was the bottleneck in your system.
The alphabet sits at the back of the scene and could easily be replaced by a texture. The coat is also far enough that could have its mesh simplified.
How reliable are those results?
The initial analysis returned by the LLM only considered the modifiers which influenced the viewport. The
coat 1
object has a Solidify modifier which doubles its poly count, making it an even more outlier. And although this scene had no Simplify enabled, this settings would have also affected the final analysis.
Example 2: Various Prompts
Those are some of the other tested use cases. You will need to paste the entire “Prompt” content for them to work. As a start point you should use the corresponding demo file. The sucess of the operation will depend on the model used.
Use Case
Prompt
Demo File
Result
Data-block renaming: fix typos
With the current open Blender file fix the name of all the data-blocks to remove typos. Report back which data-blocks got fixed.
Scattering Pebbles
GRP-rocks → GRP-pebble, LGT-Lights → LGT-lights, Compositing Nodetree → Compositing Node Tree
Data-block renaming: better names
With the current open Blender file suggest descriptive names for all data-blocks, and apply if approved.
Scattering Pebbles
Camera → CAM-main, Area → LGT-sun-key, Area.001 → LGT-sun-fill, Area.002 → LGT-area-rim, GEO-pebble.001 → GEO-pebble-B, …
Querying data relations using natural language
Which objects are using the following material: pebbles
Scattering Pebbles
7 objects: GEO-pebble, GEO-pebble.001, GEO-pebble.002, GEO-pebble.003, GEO-pebble.004, GEO-pebble.005, GEO-pebble.006
Scene debugging
What is the object with the highest poly-count on this file? Ignore objects which are not linked to any scene.
Scattering Pebbles
GEO-ground with 4,096 faces.
Geometry Nodes Documentation
With the current open Blender file explain what the main geometry nodes setup is doing. Add inline documentation for it with frame elements. Create a Text data-block with the result of analysis.
Scattering Pebbles
4 major color-coded frames + text file with explanation.
Other prompts yet to be explored:
Translate all the data-blocks from French to English.
My mesh is not being deformed by my armature, how can I fix that?
Blender is running out of memory rendering this scene, how can I optimize it?
This mesh has strange shading artifacts, how can I you fix that?
Find objects that have meshes with bad normals.
Check my scene for non-uniformally transformed mesh objects.
The video I exported doesn’t play in my web browsers, which settings should I change?
Which sculpt brushes should I use for creating and detailing tree branches?
Set up compositing nodes to save my image both as SDR and HDR.
Verify this checklist:: meshes must be manifold, all objects must have materials, naming must follow convention, no absolute paths, …
Data-block renaming: fix typos
GRP-rocks
→
GRP-pebbles
(the scene contains only pebble objects, not rocks).
LGT-Lights
→
LGT-lights
(inconsistent casing).
Compositing Nodetree
→
Compositing Node Tree
(Nodetree is a compound word error).
Data-block renaming: better names
Objects
:
Camera
→
CAM-main
Area
→
LGT-sun-key
Area.001
→
LGT-sun-fill
Area.002
→
LGT-area-rim
GEO-pebble.001
→
GEO-pebble-B
GEO-pebble.002
→
GEO-pebble-C
GEO-pebble.003
→
GEO-pebble-D
GEO-pebble.004
→
GEO-pebble-E
GEO-pebble.005
→
GEO-pebble-F
GEO-pebble.006
→
GEO-pebble-G
Light Data-Blocks
:
Area
→
LGT-sun-key
Area.001
→
LGT-sun-fill
Area.002
→
LGT-area-rim
Camera Data-Block
:
Camera
→
CAM-main
Textures
:
Texture
→
TEX-ground-clouds
Texture.001
→
TEX-ground-image
Scene & World
:
World
→
WLD-environment
Scene
→
SCN-main
Geometry Nodes Documentation
New Frames created
:
Documentation frames added to the geometry nodes setup.
Text Data-block
:
GEOMETRY NODES ANALYSIS -- "Pebble Scattering Nodes"
Applied to object: GEO-ground   |   Modifier: Pebbles
========================================================

OVERVIEW
--------
This node group scatters three size categories of pebble meshes across
the faces of a ground mesh.  Each category uses its own density mask
and a global Factor multiplier so that coverage can be art-directed
per-layer without touching the raw mask textures.  The three resulting
instance layers are merged with the original ground geometry and sent
to the Group Output.

INPUTS (Group Interface)
------------------------
  Geometry           -- The ground mesh to scatter pebbles on.
  Large Pebbles Mask -- Float mask (e.g. vertex colour / texture) that
                       defines WHERE large pebbles may appear.
  Medium Pebbles Mask-- Float mask for medium pebble placement regions.
  Small Pebbles Mask -- Float mask for small pebble placement regions.
  Factor             -- Global density multiplier shared by all three
                       lanes (appears three times in the interface,
                       one per lane).

NODE GRAPH -- LANE BY LANE
--------------------------

+- LARGE PEBBLES LANE -----------------------------------------------------+
|  Source object : GEO-pebble                                              |
|  Group Input.001                                                         |
|    +- Geometry ------------------------> Distribute Points on Faces      |
|    +- Large Pebbles Mask ------------> Distribute Points on Faces        |
|    |                                     (Density Factor socket)         |
|    +- Factor --> Math.003 (x)  -------> Distribute Points on Faces       |
|                                          (Density Max socket)            |
|  Distribute Points on Faces ----------> Instance on Points               |
|  Object Info (GEO-pebble) -----------> Instance on Points (Instance)     |
|  Random Rotation.001 [-pi, +pi] -----> Instance on Points (Rotation)     |
|  Random Value [0.25 - 0.60]   -------> Instance on Points (Scale)        |
|  Instance on Points ------------------> Join Geometry.003                |
+--------------------------------------------------------------------------+

+- MEDIUM PEBBLES LANE ----------------------------------------------------+
|  Source object : GEO-pebble.004                                          |
|  Group Input.002                                                         |
|    +- Geometry ------------------------> Distribute Points on Faces.001  |
|    +- Medium Pebbles Mask -----------> Math.004 (x) --> Math.005 (x)     |
|    +- Factor ------------------------> Math.005 (x)                      |
|         Math.005 output --------------> Distribute Points on Faces.001   |
|                                          (Density socket)                |
|  Distribute Points on Faces.001 -----> Instance on Points.001            |
|  Object Info.001 (GEO-pebble.004) --> Instance on Points.001             |
|  Random Rotation.002 [-pi, +pi]  ----> Instance on Points.001            |
|  Random Value.002 [0.25 - 0.45] -----> Instance on Points.001            |
|  Instance on Points.001 -------------> Join Geometry.003                 |
+--------------------------------------------------------------------------+

+- SMALL PEBBLES LANE -----------------------------------------------------+
|  Source object : GEO-pebble.002                                          |
|  Group Input.003                                                         |
|    +- Geometry ------------------------> Distribute Points on Faces.002  |
|    +- Small Pebbles Mask -----------> Math.006 (x) --> Math.007 (x)      |
|    +- Factor ------------------------> Math.006 (x)                      |
|         Math.007 output --------------> Distribute Points on Faces.002   |
|                                          (Density socket)                |
|  Distribute Points on Faces.002 -----> Instance on Points.002            |
|  Object Info.002 (GEO-pebble.002) --> Instance on Points.002             |
|  Random Rotation [-pi, +pi]      ----> Instance on Points.002            |
|  Random Value.003 [0.10 - 0.35] -----> Instance on Points.002            |
|  Instance on Points.002 -------------> Join Geometry.003                 |
+--------------------------------------------------------------------------+

+- MERGE & OUTPUT ---------------------------------------------------------+
|  Group Input.004                                                         |
|    +- Geometry (pass-through) --------> Join Geometry.003                |
|  Join Geometry.003                                                       |
|    (inputs: large instances + medium instances +                         |
|             small instances  + original ground geo)                      |
|    +- Geometry -----------------------> Group Output                     |
+--------------------------------------------------------------------------+

SCALE RANGES (uniform, per lane)
---------------------------------
  Large  pebbles : 0.25 - 0.60
  Medium pebbles : 0.25 - 0.45
  Small  pebbles : 0.10 - 0.35

ROTATION (all lanes)
---------------------
  All three axes randomised independently over [-pi, +pi],
  giving each pebble instance a fully random orientation.

DENSITY CONTROL PATTERN (Medium & Small lanes)
-----------------------------------------------
  The mask value and the Factor are first multiplied together
  (Math.004 / Math.006), then that product is multiplied again
  by a second value (Math.005 / Math.007) before being fed into
  the Density socket.  This two-stage multiply gives a non-linear
  response curve, making the density fall off more aggressively
  near the mask edges.

  The Large lane uses a different (single-stage) approach:
  the Density Factor socket receives the mask directly, and the
  Factor is only used to scale Density Max via Math.003.

NOTES & SUGGESTIONS
--------------------
  * The node group has no Seed input exposed; adding one would allow
    re-randomising all three layers simultaneously without touching
    individual nodes.
  * The Factor input currently appears three times (once per lane).
    Merging them into a single shared socket would simplify the
    modifier panel.
  * Consider labelling the unlabelled Math nodes (Math.003-.007)
    and Random Value nodes to aid future maintenance.
About
Blender Foundation
Blender Institute
Blender Studio
License
Logo & Trademark
Credits
Privacy Policy
Code of Conduct
Organization
People
Jobs
Blender Network
Download
Latest Blender
Blender LTS
Previous Versions
Experimental Builds
Source Code
Requirements
Benchmark
Flamenco
Extensions
Add-ons
Themes
Developers
Get Started
Roadmap
Projects
Docs
Blog
Forum
YouTube
Python API
Blender Studio
Films
Training
Tools & Pipeline
Support
Manual
Community
FAQ
Get Involved
Documentation
Education
News
Press Releases
User Stories
Blender Conference
Follow Blender
Support Blender
Donate
One-time Donation
Artistic freedom starts with Blender
The Free and Open
    Source 3D Creation Suite
Close
Previous
Next