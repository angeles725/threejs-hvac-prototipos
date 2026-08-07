<span style="display:none">\\ \newcommand{\E}{\mathrm{E}} \\ \\
\newcommand{\A}{\mathrm{A}} \\ \\ \newcommand{\R}{\mathrm{R}} \\ \\
\newcommand{\N}{\mathrm{N}} \\ \\ \newcommand{\Q}{\mathrm{Q}} \\ \\
\newcommand{\Z}{\mathrm{Z}} \\ \\ \def\ccSum \#1#2#3{
\sum\_{#1}^{#2}{#3} } \def\ccProd \#1#2#3{ \sum\_{#1}^{#2}{#3} }\\
</span>

<div id="top">

<div id="back-nav">

- [cgal.org](https://www.cgal.org/)
- [Top](../Manual/index.html)
- [Getting Started](../Manual/general_intro.html)
- [Tutorials](../Manual/tutorials.html)
- [Package Overview](../Manual/packages.html)
- [Acknowledging CGAL](../Manual/how_to_cite_cgal.html)

<div id="MSearchBox" class="MSearchBoxInactive">

<span class="left">
<img src="../Manual/search/mag_sel.png" id="MSearchSelect"
onmouseover="return searchBox.OnSearchSelectShow()"
onmouseout="return searchBox.OnSearchSelectHide()" />
</span><span class="right">
<a href="javascript:searchBox.CloseResultsWindow()"
id="MSearchClose"><img src="../Manual/search/close.png"
id="MSearchCloseImg" data-border="0" /></a> </span>

</div>

</div>

<div id="titlearea">

<table data-cellspacing="0" data-cellpadding="0">
<colgroup>
<col style="width: 100%" />
</colgroup>
<tbody>
<tr style="height: 56px;">
<td id="projectalign" style="padding-left: 0.5em"><div id="projectname">
CGAL 4.12.1 - Polygon Mesh Processing
</div></td>
</tr>
</tbody>
</table>

</div>

<div id="MSearchSelectWindow"
onmouseover="return searchBox.OnSearchSelectShow()"
onmouseout="return searchBox.OnSearchSelectHide()"
onkeydown="return searchBox.OnSearchSelectKey(event)">

</div>

<div id="MSearchResultsWindow">

</div>

</div>

<div id="side-nav" class="ui-resizable side-nav-resizable">

<div id="nav-tree">

<div id="nav-tree-contents">

<div id="nav-sync" class="sync" style="display: none">

</div>

</div>

</div>

<div id="splitbar" class="ui-resizable-handle"
style="-moz-user-select:none;">

</div>

</div>

<div id="doc-content">

<div class="header">

<div class="headertitle">

<div class="title">

User Manual

</div>

</div>

</div>

<div class="contents">

<div class="textblock">

<span id="Chapter_PolygonMeshProcessing" class="anchor"></span>

<div id="autotoc" class="toc">

</div>

Authors  
Sébastien Loriot, Jane Tournois, Ilker O. Yaz

<div class="image">

![](neptun_head.jpg)

</div>

\

# <span id="PMPIntroduction" class="anchor"></span> Introduction

This package implements a collection of methods and classes for polygon
mesh processing, ranging from basic operations on simplices, to complex
geometry processing algorithms. The implementation of this package
mainly follows algorithms and references given in Botsch et al.'s book
on polygon mesh processing
<a href="citelist.html#CITEREF_botsch2010PMP" class="el">[4]</a>.

## <span id="PMPDef" class="anchor"></span> Polygon Mesh

A *polygon* *mesh* is a consistent and orientable surface mesh, that can
have one or more boundaries. The *faces* are simple polygons. The
*edges* are segments. Each edge connects two *vertices*, and is shared
by two faces (including the *null* *face* for boundary edges). A polygon
mesh can have any number of connected components, and also some
self-intersections. In this package, a polygon mesh is considered to
have the topology of a 2-manifold.

## <span id="PMPAPI" class="anchor"></span> API

This package follows the BGL API described in
<a href="../Manual/packages.html#PkgBGLSummary" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Manual.tag:../Manual/">CGAL
and the Boost Graph Library</a>. It can thus be used either with
<a href="../Polyhedron/classCGAL_1_1Polyhedron__3.html" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Polyhedron.tag:../Polyhedron/"><code>Polyhedron_3</code></a>,
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/"><code>Surface_mesh</code></a>,
or any class model of the concept
<a href="../BGL/classFaceGraph.html" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/"><code>FaceGraph</code></a>.
Each function or class of this package details the requirements on the
input polygon mesh.

<a href="../BGL/index.html#BGLNamedParameters" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">Named
Parameters</a> are used to deal with optional parameters. The page
<a href="group__pmp__namedparameters.html" class="el">Named Parameters
for Polygon Mesh Processing</a> describes their usage and provides a
list of the parameters that are used in this package.

## <span id="PMPOutline" class="anchor"></span> Outline

The algorithms described in this manual are organized in sections:

- <a href="index.html#PMPMeshing" class="el">Meshing</a> : meshing
  algorithms, including triangulation of non-triangulated meshes,
  refinement, optimization by fairing, and isotropic remeshing of
  triangulated surface meshes.
- <a href="index.html#Coref_section" class="el">Corefinement and Boolean
  Operations</a> : methods to corefine triangle meshes and to compute
  boolean operations out of corefined closed triangle meshes.
- <a href="index.html#PMPHoleFilling" class="el">Hole Filling</a> :
  available hole filling algorithms, which can possibly be combined with
  refinement and fairing.
- <a href="index.html#PMPPredicates" class="el">Predicates</a> :
  predicates that can be evaluated on the processed polygon mesh, which
  includes point location and self intersection tests.
- <a href="index.html#PMPOrientation" class="el">Orientation</a> :
  checking or fixing the
  <a href="index.html#PMPOrientation" class="el">Orientation</a> of a
  polygon soup.
- <a href="index.html#PMPRepairing" class="el">Combinatorial Repairing</a>
  : reparation of polygon meshes and polygon soups.
- <a
  href="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/Polygon_mesh_processing/Polygon_mesh_processing.txt.html#PMPNormalComp"
  class="el">Computing Normals</a> : normal computation at vertices and
  on faces of a polygon mesh.
- <a
  href="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/Polygon_mesh_processing/Polygon_mesh_processing.txt.html#PMPSlicer"
  class="el">Slicer</a> : functor able to compute the intersections of a
  polygon mesh with arbitrary planes (slicer).
- <a
  href="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/Polygon_mesh_processing/Polygon_mesh_processing.txt.html#PMPConnectedComponents"
  class="el">Connected Components</a> : methods to deal with connected
  components of a polygon mesh (extraction, marks, removal, ...)

# <span id="PMPMeshing" class="anchor"></span> Meshing

A surface patch can be refined by inserting new vertices and flipping
edges to get a triangulation. Using a criterion presented in
<a href="citelist.html#CITEREF_liepa2003filling" class="el">[6]</a>, the
density of triangles near the boundary of the patch is approximated by
the refinement function. The validity of the mesh is enforced by
flipping edges. An edge is flipped only if the opposite edge does not
exist in the original mesh and if no degenerate triangles are generated.

A region of the surface mesh (*e*.*g*. the refined region), can be
faired to obtain a tangentially continuous and smooth surface patch. The
region to be faired is defined as a range of vertices that are
relocated. The fairing step minimizes a linear bi-Laplacian system with
boundary constraints, described in
<a href="citelist.html#CITEREF_Botsch2008OnLinearVariational"
class="el">[3]</a>. The visual results of aforementioned steps are
depicted by
<a href="index.html#fig__Mech_steps" class="el">Figure 60.5</a> (c and
d).

## <span id="MeshingAPI" class="anchor"></span> API

### <span id="Meshing" class="anchor"></span> Meshing

Refinement and fairing functions can be applied to an arbitrary region
on a triangle mesh, using :

- <a
  href="group__PMP__meshing__grp.html#gad0449d8e1021fc46507074cd6db65ef4"
  class="el"
  title="refines a region of a triangle mesh "><code>CGAL::Polygon_mesh_processing::refine()</code></a>
  : given a set of facets on a mesh, refines the region.
- <a
  href="group__PMP__meshing__grp.html#gaa091c8368920920eed87784107d68ecf"
  class="el"
  title="fairs a region on a triangle mesh. "><code>CGAL::Polygon_mesh_processing::fair()</code></a>
  : given a set of vertices on a mesh, fairs the region.

Fairing needs a sparse linear solver and we recommend the use of
<a href="../Manual/installation.html#thirdpartyEigen" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Manual.tag:../Manual/">Eigen</a>
3.2 or later. Note that fairing might fail if fixed vertices, which are
used as boundary conditions, do not suffice to solve the constructed
linear system.

Many algorithms require as input meshes in which all the faces have the
same degree, or even are triangles. Hence, one may want to triangulate
all polygon faces of a mesh.

This package provides the function <a
href="group__PMP__meshing__grp.html#gacaaff4d520500c530d9c3d5ebe2a0760"
class="el"
title="triangulates given faces of a polygon mesh. "><code>CGAL::Polygon_mesh_processing::triangulate_faces()</code></a>
that triangulates all faces of the input polygon mesh. An approximated
support plane is chosen for each face, orthogonal to the normal vector
computed by <a
href="group__PMP__normal__grp.html#gaa76c6d307b9d3e48cafacd7b77b2c043"
class="el"
title="computes the outward unit vector normal to face f. "><code>CGAL::Polygon_mesh_processing::compute_face_normal()</code></a>.
Then, the triangulation of each face is the one obtained by building a
<a
href="../Triangulation_2/classCGAL_1_1Constrained__Delaunay__triangulation__2.html"
class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Triangulation_2.tag:../Triangulation_2/"><code>CGAL::Constrained_Delaunay_triangulation_2</code></a>
in this plane. This choice is made because the constrained Delaunay
triangulation is the triangulation that, given the edges of the face to
be triangulated, maximizes the minimum angle of all the angles of the
triangles in the triangulation.

### <span id="Remeshing" class="anchor"></span> Remeshing

The incremental triangle-based isotropic remeshing algorithm introduced
by Botsch et al
<a href="citelist.html#CITEREF_botsch2004remeshing" class="el">[2]</a>,
<a href="citelist.html#CITEREF_botsch2010PMP" class="el">[4]</a> is
implemented in this package. This algorithm incrementally performs
simple operations such as edge splits, edge collapses, edge flips, and
Laplacian smoothing. All the vertices of the remeshed patch are
reprojected to the original surface to keep a good approximation of the
input.

A triangulated region of a polygon mesh can be remeshed using the
function <a
href="group__PMP__meshing__grp.html#gad3d03890515ae8103bd32a30a3486412"
class="el"
title="remeshes a triangulated region of a polygon mesh. "><code>CGAL::Polygon_mesh_processing::isotropic_remeshing()</code></a>,
as illustrated by
<a href="index.html#fig__iso_remeshing" class="el">Figure 60.1</a>. The
algorithm has only two parameters : the target edge length for the
remeshed surface patch, and the number of iterations of the
abovementioned sequence of operations. The bigger this number, the
smoother and closer to target edge length the mesh will be.

An additional option has been added to *protect* (*i*.*e*. not modify)
some given polylines. In some cases, those polylines are too long, and
reaching the desired target edge length while protecting them is not
possible and leads to an infinite loop of edge splits in the incident
faces. To avoid that pitfall, the function <a
href="group__PMP__meshing__grp.html#gaafd017f4424c3942bfdcc93874c8f596"
class="el"
title="splits the edges listed in edges into sub-edges that are not longer than the given threshold max_leng..."><code>CGAL::Polygon_mesh_processing::split_long_edges()</code></a>
should be called on the list of constrained edges before remeshing.

<span id="fig__iso_remeshing" class="anchor"></span>

<div class="image">

![](iso_remeshing.png)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__iso_remeshing" class="el">Figure 60.1</a>
Isotropic remeshing. (a) Triangulated input surface mesh. (b) Surface
uniformly and entirely remeshed. (c) Selection of a range of faces to be
remeshed. (d) Surface mesh with the selection uniformly remeshed.

</div>

\

## <span id="MeshingExamples" class="anchor"></span> Meshing Examples

### <span id="MeshingExample_1" class="anchor"></span> Refine and Fair a Region on a Triangle Mesh

The following example calls the functions <a
href="group__PMP__meshing__grp.html#gad0449d8e1021fc46507074cd6db65ef4"
class="el"
title="refines a region of a triangle mesh "><code>CGAL::Polygon_mesh_processing::refine()</code></a>
and <a
href="group__PMP__meshing__grp.html#gaa091c8368920920eed87784107d68ecf"
class="el"
title="fairs a region on a triangle mesh. "><code>CGAL::Polygon_mesh_processing::fair()</code></a>
for some selected regions on the input triangle mesh.

\
**File**
<a href="Polygon_mesh_processing_2refine_fair_example_8cpp-example.html"
class="el">Polygon_mesh_processing/refine_fair_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Polyhedron_3.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/refine.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/fair.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<map\></span>

</div>

<div class="line">

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
<a href="../Kernel_23/namespaceKernel.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">Kernel</a>;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Polyhedron/classCGAL_1_1Polyhedron__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Polyhedron.tag:../Polyhedron/">CGAL::Polyhedron_3&lt;Kernel&gt;</a>
Polyhedron;

</div>

<div class="line">

<span class="keyword">typedef</span> Polyhedron::Vertex_handle
Vertex_handle;

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// extract vertices which are at most k
(inclusive)</span>

</div>

<div class="line">

<span class="comment">// far from vertex v in the graph of edges</span>

</div>

<div class="line">

<span class="keywordtype">void</span> extract_k_ring(Vertex_handle v,

</div>

<div class="line">

<span class="keywordtype">int</span> k,

</div>

<div class="line">

std::vector\<Vertex_handle\>& qv)

</div>

<div class="line">

{

</div>

<div class="line">

std::map\<Vertex_handle, int\> D;

</div>

<div class="line">

qv.push_back(v);

</div>

<div class="line">

D\[v\] = 0;

</div>

<div class="line">

std::size_t current_index = 0;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span> dist_v;

</div>

<div class="line">

<span class="keywordflow">while</span> (current_index \< qv.size() &&
(dist_v = D\[qv\[current_index\]\]) \< k)

</div>

<div class="line">

{

</div>

<div class="line">

v = qv\[current_index++\];

</div>

<div class="line">

</div>

<div class="line">

Polyhedron::Halfedge_around_vertex_circulator e(v-\>vertex_begin()),
e_end(e);

</div>

<div class="line">

<span class="keywordflow">do</span> {

</div>

<div class="line">

Vertex_handle new_v = e-\>opposite()-\>vertex();

</div>

<div class="line">

<span class="keywordflow">if</span> (D.insert(std::make_pair(new_v,
dist_v + 1)).second) {

</div>

<div class="line">

qv.push_back(new_v);

</div>

<div class="line">

}

</div>

<div class="line">

} <span class="keywordflow">while</span> (++e != e_end);

</div>

<div class="line">

}

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/blobby.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Polyhedron poly;

</div>

<div class="line">

<span class="keywordflow">if</span> ( !input \|\| !(input \>\> poly)
\|\| poly.empty()

</div>

<div class="line">

\|\| \!<a
href="../BGL/group__PkgBGLHelperFct.html#ga11883d231eec1b58f37efe4acedd9588"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">CGAL::is_triangle_mesh</a>(poly))
{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid input
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

std::vector\<Polyhedron::Facet_handle\> new_facets;

</div>

<div class="line">

std::vector\<Vertex_handle\> new_vertices;

</div>

<div class="line">

</div>

<div class="line">

<a
href="group__PMP__meshing__grp.html#gad0449d8e1021fc46507074cd6db65ef4"
class="code">CGAL::Polygon_mesh_processing::refine</a>(poly,

</div>

<div class="line">

faces(poly),

</div>

<div class="line">

std::back_inserter(new_facets),

</div>

<div class="line">

std::back_inserter(new_vertices),

</div>

<div class="line">

CGAL::Polygon_mesh_processing::parameters::density_control_factor(2.));

</div>

<div class="line">

</div>

<div class="line">

std::ofstream
refined_off(<span class="stringliteral">"refined.off"</span>);

</div>

<div class="line">

refined_off \<\< poly;

</div>

<div class="line">

refined_off.close();

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Refinement added "</span>
\<\< new_vertices.size() \<\< <span class="stringliteral">"
vertices."</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

Polyhedron::Vertex_iterator v = poly.vertices_begin();

</div>

<div class="line">

std::advance(v, 82<span class="comment">/\*e.g.\*/</span>);

</div>

<div class="line">

std::vector\<Vertex_handle\> region;

</div>

<div class="line">

extract_k_ring(v, 12<span class="comment">/\*e.g.\*/</span>, region);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">bool</span> success = <a
href="group__PMP__meshing__grp.html#gaa091c8368920920eed87784107d68ecf"
class="code">CGAL::Polygon_mesh_processing::fair</a>(poly, region);

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Fairing : "</span> \<\<
(success ? <span class="stringliteral">"succeeded"</span> :
<span class="stringliteral">"failed"</span>) \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::ofstream
faired_off(<span class="stringliteral">"faired.off"</span>);

</div>

<div class="line">

faired_off \<\< poly;

</div>

<div class="line">

faired_off.close();

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

### <span id="MeshingExample_2" class="anchor"></span> Triangulate a Polygon Mesh

Triangulating a polygon mesh can be achieved through the function <a
href="group__PMP__meshing__grp.html#gacaaff4d520500c530d9c3d5ebe2a0760"
class="el"
title="triangulates given faces of a polygon mesh. "><code>CGAL::Polygon_mesh_processing::triangulate_faces()</code></a>
as shown in the following example.

\
**File** <a
href="Polygon_mesh_processing_2triangulate_faces_example_8cpp-example.html"
class="el">Polygon_mesh_processing/triangulate_faces_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/triangulate_faces.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<boost/foreach.hpp\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
Kernel;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Kernel_23/classKernel_1_1Point__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">Kernel::Point_3</a>
Point;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;Point&gt;</a>
Surface_mesh;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/P.off"</span>;

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* outfilename = (argc \> 2) ?
argv\[2\] : <span class="stringliteral">"P_tri.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Surface_mesh mesh;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh) \|\|
mesh.is_empty())

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid off
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<a
href="group__PMP__meshing__grp.html#gacaaff4d520500c530d9c3d5ebe2a0760"
class="code">CGAL::Polygon_mesh_processing::triangulate_faces</a>(mesh);

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// Confirm that all faces are triangles.</span>

</div>

<div class="line">

BOOST_FOREACH(boost::graph_traits\<Surface_mesh\>::face_descriptor fit,
faces(mesh))

</div>

<div class="line">

<span class="keywordflow">if</span> (<a
href="../STL_Extension/group__STLAlgos.html#gad4dbc8daf3c0e2201f4972eb9eea404d"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/STL_Extension.tag:../STL_Extension/">next</a>(<a
href="../STL_Extension/group__STLAlgos.html#gad4dbc8daf3c0e2201f4972eb9eea404d"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/STL_Extension.tag:../STL_Extension/">next</a>(halfedge(fit,
mesh), mesh), mesh)

</div>

<div class="line">

!= <a
href="../STL_Extension/group__STLAlgos.html#ga6c3790809028471b1eacccb0d714d040"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/STL_Extension.tag:../STL_Extension/">prev</a>(halfedge(fit,
mesh), mesh))

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Error: non-triangular face
left in mesh."</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::ofstream cube_off(outfilename);

</div>

<div class="line">

cube_off \<\< mesh;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

### <span id="RemeshingExample_1" class="anchor"></span> Isotropic Remeshing of a Region on a Polygon Mesh

The following example shows a complete example of how the isotropic
remeshing function can be used. First, the border of the polygon mesh is
collected. Since the boundary edges will be considered as constrained
and protected in this example, the function <a
href="group__PMP__meshing__grp.html#gaafd017f4424c3942bfdcc93874c8f596"
class="el"
title="splits the edges listed in edges into sub-edges that are not longer than the given threshold max_leng..."><code>split_long_edges()</code></a>
is called first on these edges.

Once this is done, remeshing is run on all the surface, with protection
of constraints activated, for 3 iterations.

\
**File** <a
href="Polygon_mesh_processing_2isotropic_remeshing_example_8cpp-example.html"
class="el">Polygon_mesh_processing/isotropic_remeshing_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/remesh.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/border.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<boost/function_output_iterator.hpp\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<vector\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;K::Point_3&gt;</a>
Mesh;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::halfedge_descriptor halfedge_descriptor;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::edge_descriptor edge_descriptor;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">namespace </span>PMP =
<a href="namespaceCGAL_1_1Polygon__mesh__processing.html"
class="code">CGAL::Polygon_mesh_processing</a>;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">struct </span>halfedge2edge

</div>

<div class="line">

{

</div>

<div class="line">

halfedge2edge(<span class="keyword">const</span> Mesh& m,
std::vector\<edge_descriptor\>& edges)

</div>

<div class="line">

: m_mesh(m), m_edges(edges)

</div>

<div class="line">

{}

</div>

<div class="line">

<span class="keywordtype">void</span>
operator()(<span class="keyword">const</span> halfedge_descriptor&
h)<span class="keyword"> const</span>

</div>

<div class="line">

<span class="keyword"> </span>{

</div>

<div class="line">

m_edges.push_back(edge(h, m_mesh));

</div>

<div class="line">

}

</div>

<div class="line">

<span class="keyword">const</span> Mesh& m_mesh;

</div>

<div class="line">

std::vector\<edge_descriptor\>& m_edges;

</div>

<div class="line">

};

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/pig.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Mesh mesh;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh) \|\|
\!<a
href="../BGL/group__PkgBGLHelperFct.html#ga11883d231eec1b58f37efe4acedd9588"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">CGAL::is_triangle_mesh</a>(mesh))
{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid input
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">double</span> target_edge_length = 0.04;

</div>

<div class="line">

<span class="keywordtype">unsigned</span>
<span class="keywordtype">int</span> nb_iter = 3;

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Split border..."</span>;

</div>

<div class="line">

</div>

<div class="line">

std::vector\<edge_descriptor\> border;

</div>

<div class="line">

<a
href="group__PkgPolygonMeshProcessing.html#gaf5f5eb322811f24573aa9158e6df8070"
class="code">PMP::border_halfedges</a>(faces(mesh),

</div>

<div class="line">

mesh,

</div>

<div class="line">

boost::make_function_output_iterator(halfedge2edge(mesh, border)));

</div>

<div class="line">

<a
href="group__PMP__meshing__grp.html#gaafd017f4424c3942bfdcc93874c8f596"
class="code">PMP::split_long_edges</a>(border, target_edge_length,
mesh);

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"done."</span> \<\<
std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Start remeshing of "</span>
\<\< filename

</div>

<div class="line">

\<\< <span class="stringliteral">" ("</span> \<\< num_faces(mesh) \<\<
<span class="stringliteral">" faces)..."</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

<a
href="group__PMP__meshing__grp.html#gad3d03890515ae8103bd32a30a3486412"
class="code">PMP::isotropic_remeshing</a>(

</div>

<div class="line">

faces(mesh),

</div>

<div class="line">

target_edge_length,

</div>

<div class="line">

mesh,

</div>

<div class="line">

PMP::parameters::number_of_iterations(nb_iter)

</div>

<div class="line">

.protect_constraints(<span class="keyword">true</span>)<span class="comment">//i.e.
protect border, here</span>

</div>

<div class="line">

);

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Remeshing done."</span> \<\<
std::endl;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

# <span id="Coref_section" class="anchor"></span> Corefinement and Boolean Operations

## <span id="coref_def_subsec" class="anchor"></span> Definitions

**Corefinement** Given two triangulated surface meshes, the
*corefinement* operation consists in refining both meshes so that their
intersection polylines are a subset of edges in both refined meshes.

<span id="fig__coref_fig" class="anchor"></span>

<div class="image">

![](corefine.png)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__coref_fig" class="el">Figure 60.2</a>
Corefinement of two triangulated surface meshes. (Left) Input meshes;
(Right) The two input meshes corefined. The common edges of the two
meshes are drawn in green.

</div>

\

**Volume bounded by a triangulated surface mesh** Given a closed
triangulated surface mesh, each connected component splits the 3D space
into two subspaces. The vertex sequence of each face of a component is
seen either clockwise or counterclockwise from these two subspaces. The
subspace that sees the sequence clockwise (resp. counterclockwise) is on
the negative (resp. positive) side of the component. Given a closed
triangulated surface mesh `tm` with no self-intersections, the connected
components of `tm` divide the 3D space into subspaces. We say that `tm`
bounds a volume if each subspace lies exclusively on the positive (or
negative) side of all the incident connected components of `tm`. The
volume bounded by `tm` is the union of all subspaces that are on
negative sides of their incident connected components of `tm`.

<span id="fig__boundedvol_fig" class="anchor"></span>

<div class="image">

![](bounded_vols.jpg)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__boundedvol_fig" class="el">Figure 60.3</a>
Volumes bounded by a triangulated surface mesh: The figure shows meshes
representing three nested spheres (three connected components). The left
side of the picture shows a clipped triangulated surface mesh, with the
two possible orientations of the faces for which a volume is bounded by
the mesh. The positive and negative sides of each connected component is
displayed in light and dark blue, respectively. The right part of the
picture shows clipped tetrahedral meshes of the corresponding bounded
volumes.

</div>

\

## <span id="coref_coref_subsec" class="anchor"></span> Corefinement

The corefinement of two triangulated surface meshes can be done using
the function <a
href="group__PMP__corefinement__grp.html#ga697ccb186c6e2cc3216306f9b87392bb"
class="el"
title="corefines  tm1 and tm2. "><code>CGAL::Polygon_mesh_processing::corefine()</code></a>.
It takes as input the two triangulated surface meshes to corefine. If
constrained edge maps are provided, edges belonging to the intersection
of the input meshes will be marked as constrained. In addition, if an
edge that was marked as constrained is split during the corefinement,
sub-edges will be marked as constrained as well.

## <span id="coref_bolop_subsec" class="anchor"></span> Boolean Operations

<span id="fig__boolop_fig" class="anchor"></span>

<div class="image">

![](bool_op.png)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__boolop_fig" class="el">Figure 60.4</a> Let `C`
and `S` be the volumes bounded by the triangulated surface meshes of a
cube and a sphere, respectively. From left to right, the picture shows
the triangulated surface meshes bounding the union of `C` and `S`, `C`
minus `S`, the intersection of `C` and `S` and `S` minus `C`.

</div>

\

The corefinement of two triangulated surface meshes can naturally be
used for computing Boolean operations on volumes. Considering two
triangulated surface meshes, each bounding a volume, the functions <a
href="group__PMP__corefinement__grp.html#gad7e1741a7ce41a5846cf86494982ca8b"
class="el"
title="corefines  tm1 and tm2 and puts in tm_out a triangulated surface mesh bounding  the union of the volu..."><code>CGAL::Polygon_mesh_processing::corefine_and_compute_union()</code></a>,
<a
href="group__PMP__corefinement__grp.html#ga240e5df984c7d44741a7031e38203dc3"
class="el"
title="corefines  tm1 and tm2 and puts in tm_out a triangulated surface mesh bounding  the intersection of t..."><code>CGAL::Polygon_mesh_processing::corefine_and_compute_intersection()</code></a>
and <a
href="group__PMP__corefinement__grp.html#gac5a853c33c4b0a9da9403c9b191caa44"
class="el"
title="corefines  tm1 and tm2 and puts in tm_out a triangulated surface mesh bounding  the volume bounded by..."><code>CGAL::Polygon_mesh_processing::corefine_and_compute_difference()</code></a>
respectively compute the union, the intersection and the difference of
the two volumes. Note that there is no restriction on the topology of
the input volumes.

However, there are some requirements on the input to guarantee that the
operation is possible. First, the input meshes must not self-intersect.
Second, the operation is possible only if the output can be bounded by a
manifold triangulated surface mesh. In particular this means that the
output volume has no part with zero thickness. Mathematically speaking,
the intersection with an infinitesimally small ball centered in the
output volume is a topological ball. At the surface level this means
that no non-manifold vertex or edge is allowed in the output. For
example, it is not possible to compute the union of two cubes that are
disjoint but sharing an edge. In case you have to deal with such
scenarios, you should consider using the package
<a href="../Manual/packages.html#PkgNef3Summary" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Manual.tag:../Manual/">3D
Boolean Operations on Nef Polyhedra</a>.

It is possible to update the input so that it contains the result
(in-place operation). In that case the whole mesh will not be copied and
only the region around the intersection polyline will be modified. In
case the Boolean operation is not possible, the input mesh will
nevertheless be corefined.

## <span id="coref_valid_subsec" class="anchor"></span> Kernel and Validity of the Output

The corefinement operation (which is also internally used in the three
Boolean operations) will correctly change the topology of the input
surface mesh if the point type used in the point property maps of the
input meshes is from a <span class="smallcaps">CGAL</span>
<a href="../Kernel_23/classKernel.html" class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">Kernel</a>
with exact predicates. If that kernel does not have exact constructions,
the embedding of the output surface mesh might have self-intersections.
In case of consecutive operations, it is thus recommended to use a point
property map with points from a kernel with exact predicates and exact
constructions (such as <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__exact__constructions__kernel.html"
class="elRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/"><code>CGAL::Exact_predicates_exact_constructions_kernel</code></a>).

In practice, this means that with exact predicates and inexact
constructions, edges will be split at each intersection with a triangle
but the position of the intersection point might create
self-intersections due to the limited precision of floating point
numbers.

## <span id="coref_ex_subsec" class="anchor"></span> Examples

### <span id="coref_ex_union_subsec" class="anchor"></span> Computing the Union of Two Volumes

\
**File** <a
href="Polygon_mesh_processing_2corefinement_mesh_union_8cpp-example.html"
class="el">Polygon_mesh_processing/corefinement_mesh_union.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/corefinement.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;K::Point_3&gt;</a>
Mesh;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">namespace </span>PMP =
<a href="namespaceCGAL_1_1Polygon__mesh__processing.html"
class="code">CGAL::Polygon_mesh_processing</a>;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename1 = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/blobby.off"</span>;

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename2 = (argc \> 2) ?
argv\[2\] : <span class="stringliteral">"data/eight.off"</span>;

</div>

<div class="line">

std::ifstream input(filename1);

</div>

<div class="line">

</div>

<div class="line">

Mesh mesh1, mesh2;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh1))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"First mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

input.close();

</div>

<div class="line">

input.open(filename2);

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh2))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Second mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

Mesh out;

</div>

<div class="line">

<span class="keywordtype">bool</span> valid_union = <a
href="group__PMP__corefinement__grp.html#gad7e1741a7ce41a5846cf86494982ca8b"
class="code">PMP::corefine_and_compute_union</a>(mesh1,mesh2, out);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">if</span> (valid_union)

</div>

<div class="line">

{

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Union was successfully
computed\n"</span>;

</div>

<div class="line">

std::ofstream output(<span class="stringliteral">"union.off"</span>);

</div>

<div class="line">

output \<\< out;

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Union could not be
computed\n"</span>;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

</div>

### <span id="coref_ex_refine_subsec" class="anchor"></span> Boolean Operation and Local Remeshing

This example is similar to the previous one, but here we substract a
volume and update the first input triangulated surface mesh (in-place
operation). The edges that are on the intersection of the input meshes
are marked and the region around them is remeshed isotropically while
preserving the intersection polyline.\
**File** <a
href="Polygon_mesh_processing_2corefinement_difference_remeshed_8cpp-example.html"
class="el">Polygon_mesh_processing/corefinement_difference_remeshed.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/corefinement.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/remesh.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/boost/graph/selection.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;K::Point_3&gt;</a>
Mesh;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::edge_descriptor edge_descriptor;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::face_descriptor face_descriptor;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::halfedge_descriptor halfedge_descriptor;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">namespace </span>PMP =
<a href="namespaceCGAL_1_1Polygon__mesh__processing.html"
class="code">CGAL::Polygon_mesh_processing</a>;

</div>

<div class="line">

<span class="keyword">namespace </span>params = PMP::parameters;

</div>

<div class="line">

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">struct </span>Vector_pmap_wrapper{

</div>

<div class="line">

std::vector\<bool\>& vect;

</div>

<div class="line">

Vector_pmap_wrapper(std::vector\<bool\>& v) : vect(v) {}

</div>

<div class="line">

<span class="keyword">friend</span>
<span class="keywordtype">bool</span>
<span class="keyword">get</span>(<span class="keyword">const</span>
Vector_pmap_wrapper& m, face_descriptor f)

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keywordflow">return</span> m.vect\[f\];

</div>

<div class="line">

}

</div>

<div class="line">

<span class="keyword">friend</span>
<span class="keywordtype">void</span>
put(<span class="keyword">const</span> Vector_pmap_wrapper& m,
face_descriptor f, <span class="keywordtype">bool</span> b)

</div>

<div class="line">

{

</div>

<div class="line">

m.vect\[f\]=b;

</div>

<div class="line">

}

</div>

<div class="line">

};

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename1 = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/blobby.off"</span>;

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename2 = (argc \> 2) ?
argv\[2\] : <span class="stringliteral">"data/eight.off"</span>;

</div>

<div class="line">

std::ifstream input(filename1);

</div>

<div class="line">

</div>

<div class="line">

Mesh mesh1, mesh2;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh1))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"First mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

input.close();

</div>

<div class="line">

input.open(filename2);

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh2))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Second mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">//create a property on edges to indicate whether
they are constrained</span>

</div>

<div class="line">

Mesh::Property_map\<edge_descriptor,bool\> is_constrained_map =

</div>

<div class="line">

mesh1.add_property_map\<edge_descriptor,<span class="keywordtype">bool</span>\>(<span class="stringliteral">"e:is_constrained"</span>,
<span class="keyword">false</span>).first;

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// update mesh1 to contain the mesh bounding the
difference</span>

</div>

<div class="line">

<span class="comment">// of the two input volumes.</span>

</div>

<div class="line">

<span class="keywordtype">bool</span> valid_difference =

</div>

<div class="line">

<a
href="group__PMP__corefinement__grp.html#gac5a853c33c4b0a9da9403c9b191caa44"
class="code">PMP::corefine_and_compute_difference</a>(mesh1,

</div>

<div class="line">

mesh2,

</div>

<div class="line">

mesh1,

</div>

<div class="line">

params::all_default(), <span class="comment">// default parameters for
mesh1</span>

</div>

<div class="line">

params::all_default(), <span class="comment">// default parameters for
mesh2</span>

</div>

<div class="line">

params::edge_is_constrained_map(is_constrained_map));

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">if</span> (valid_difference)

</div>

<div class="line">

{

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Difference was successfully
computed\n"</span>;

</div>

<div class="line">

std::ofstream
output(<span class="stringliteral">"difference.off"</span>);

</div>

<div class="line">

output \<\< mesh1;

</div>

<div class="line">

}

</div>

<div class="line">

<span class="keywordflow">else</span>{

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Difference could not be
computed\n"</span>;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// collect faces incident to a constrained
edge</span>

</div>

<div class="line">

std::vector\<face_descriptor\> selected_faces;

</div>

<div class="line">

std::vector\<bool\> is_selected(num_faces(mesh1),
<span class="keyword">false</span>);

</div>

<div class="line">

BOOST_FOREACH(edge_descriptor e, edges(mesh1))

</div>

<div class="line">

<span class="keywordflow">if</span> (is_constrained_map\[e\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="comment">// insert all faces incident to the target
vertex</span>

</div>

<div class="line">

BOOST_FOREACH(halfedge_descriptor h,

</div>

<div class="line">

<a
href="../BGL/group__PkgBGLIterators.html#ga2be4fd4d24b1e48e00a92f90f0f2923c"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">halfedges_around_target</a>(halfedge(e,mesh1),mesh1))

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keywordflow">if</span> (\!<a
href="../BGL/group__PkgBGLHelperFct.html#gad93e429ad24efeaddeb836c437e719ab"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">is_border</a>(h,
mesh1) )

</div>

<div class="line">

{

</div>

<div class="line">

face_descriptor f=face(h, mesh1);

</div>

<div class="line">

<span class="keywordflow">if</span> ( !is_selected\[f\] )

</div>

<div class="line">

{

</div>

<div class="line">

selected_faces.push_back(f);

</div>

<div class="line">

is_selected\[f\]=<span class="keyword">true</span>;

</div>

<div class="line">

}

</div>

<div class="line">

}

</div>

<div class="line">

}

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// increase the face selection</span>

</div>

<div class="line">

<a
href="../BGL/group__PkgBGLSelectionFct.html#ga569fe26f889e5e4eed27746ac921651b"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">CGAL::expand_face_selection</a>(selected_faces,
mesh1, 2,

</div>

<div class="line">

Vector_pmap_wrapper(is_selected), std::back_inserter(selected_faces));

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< selected_faces.size()

</div>

<div class="line">

\<\< <span class="stringliteral">" faces were selected for the remeshing
step\n"</span>;

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// remesh the region around the intersection
polylines</span>

</div>

<div class="line">

<a
href="group__PMP__meshing__grp.html#gad3d03890515ae8103bd32a30a3486412"
class="code">PMP::isotropic_remeshing</a>(

</div>

<div class="line">

selected_faces,

</div>

<div class="line">

0.02,

</div>

<div class="line">

mesh1,

</div>

<div class="line">

params::edge_is_constrained_map(is_constrained_map) );

</div>

<div class="line">

</div>

<div class="line">

std::ofstream
output(<span class="stringliteral">"difference_remeshed.off"</span>);

</div>

<div class="line">

output \<\< mesh1;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

### <span id="coref_ex_consq_subsec" class="anchor"></span> Robustness of Consecutive Operations

This example computes the intersection of two volumes and then does the
union of the result with one of the input volumes. This operation is in
general not possible when using inexact constructions. Instead of using
a mesh with a point from a kernel with exact constructions, the exact
points are a property of the mesh vertices that we can reuse in a later
operations. With that property, we can manipulate a mesh with points
having floating point coordinates but benefit from the robustness
provided by the exact constructions.\
**File** <a
href="Polygon_mesh_processing_2corefinement_consecutive_bool_op_8cpp-example.html"
class="el">Polygon_mesh_processing/corefinement_consecutive_bool_op.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_exact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/corefinement.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__exact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_exact_constructions_kernel</a>
EK;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;K::Point_3&gt;</a>
Mesh;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::vertex_descriptor vertex_descriptor;

</div>

<div class="line">

<span class="keyword">typedef</span>
Mesh::Property_map\<vertex_descriptor,EK::Point_3\> Exact_point_map;

</div>

<div class="line">

<span class="keyword">typedef</span>
Mesh::Property_map\<vertex_descriptor,bool\> Exact_point_computed;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">namespace </span>PMP =
<a href="namespaceCGAL_1_1Polygon__mesh__processing.html"
class="code">CGAL::Polygon_mesh_processing</a>;

</div>

<div class="line">

<span class="keyword">namespace </span>params = PMP::parameters;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">struct </span>Coref_point_map

</div>

<div class="line">

{

</div>

<div class="line">

<span class="comment">// typedef for the property map</span>

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::property_traits\<Exact_point_map\>::value_type value_type;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::property_traits\<Exact_point_map\>::reference reference;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::property_traits\<Exact_point_map\>::category category;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::property_traits\<Exact_point_map\>::key_type key_type;

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// exterior references</span>

</div>

<div class="line">

Exact_point_computed\* exact_point_computed_ptr;

</div>

<div class="line">

Exact_point_map\* exact_point_ptr;

</div>

<div class="line">

Mesh\* mesh_ptr;

</div>

<div class="line">

</div>

<div class="line">

Exact_point_computed& exact_point_computed()<span class="keyword">
const</span>

</div>

<div class="line">

<span class="keyword"> </span>{

</div>

<div class="line">

CGAL_assertion(exact_point_computed_ptr!=NULL);

</div>

<div class="line">

<span class="keywordflow">return</span> \*exact_point_computed_ptr;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

Exact_point_map& exact_point()<span class="keyword"> const</span>

</div>

<div class="line">

<span class="keyword"> </span>{

</div>

<div class="line">

CGAL_assertion(exact_point_ptr!=NULL);

</div>

<div class="line">

<span class="keywordflow">return</span> \*exact_point_ptr;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

Mesh& mesh()<span class="keyword"> const</span>

</div>

<div class="line">

<span class="keyword"> </span>{

</div>

<div class="line">

CGAL_assertion(mesh_ptr!=NULL);

</div>

<div class="line">

<span class="keywordflow">return</span> \*mesh_ptr;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// Converters</span>

</div>

<div class="line">

<a href="../Kernel_23/classCGAL_1_1Cartesian__converter.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Cartesian_converter&lt;K,
EK&gt;</a> to_exact;

</div>

<div class="line">

<a href="../Kernel_23/classCGAL_1_1Cartesian__converter.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Cartesian_converter&lt;EK,
K&gt;</a> to_input;

</div>

<div class="line">

</div>

<div class="line">

Coref_point_map()

</div>

<div class="line">

: exact_point_computed_ptr(NULL)

</div>

<div class="line">

, exact_point_ptr(NULL)

</div>

<div class="line">

, mesh_ptr(NULL)

</div>

<div class="line">

{}

</div>

<div class="line">

</div>

<div class="line">

Coref_point_map(Exact_point_map& ep,

</div>

<div class="line">

Exact_point_computed& epc,

</div>

<div class="line">

Mesh& m)

</div>

<div class="line">

: exact_point_computed_ptr(&epc)

</div>

<div class="line">

, exact_point_ptr(&ep)

</div>

<div class="line">

, mesh_ptr(&m)

</div>

<div class="line">

{}

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">friend</span>

</div>

<div class="line">

reference
<span class="keyword">get</span>(<span class="keyword">const</span>
Coref_point_map& map, key_type k)

</div>

<div class="line">

{

</div>

<div class="line">

<span class="comment">// create exact point if it does not exist</span>

</div>

<div class="line">

<span class="keywordflow">if</span> (!map.exact_point_computed()\[k\]){

</div>

<div class="line">

map.exact_point()\[k\]=map.to_exact(map.mesh().point(k));

</div>

<div class="line">

map.exact_point_computed()\[k\]=<span class="keyword">true</span>;

</div>

<div class="line">

}

</div>

<div class="line">

<span class="keywordflow">return</span> map.exact_point()\[k\];

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">friend</span>

</div>

<div class="line">

<span class="keywordtype">void</span>
put(<span class="keyword">const</span> Coref_point_map& map, key_type k,
<span class="keyword">const</span> EK::Point_3& p)

</div>

<div class="line">

{

</div>

<div class="line">

map.exact_point_computed()\[k\]=<span class="keyword">true</span>;

</div>

<div class="line">

map.exact_point()\[k\]=p;

</div>

<div class="line">

<span class="comment">// create the input point from the exact
one</span>

</div>

<div class="line">

map.mesh().point(k)=map.to_input(p);

</div>

<div class="line">

}

</div>

<div class="line">

};

</div>

<div class="line">

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename1 = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/blobby.off"</span>;

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename2 = (argc \> 2) ?
argv\[2\] : <span class="stringliteral">"data/eight.off"</span>;

</div>

<div class="line">

std::ifstream input(filename1);

</div>

<div class="line">

</div>

<div class="line">

Mesh mesh1, mesh2;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh1))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"First mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

input.close();

</div>

<div class="line">

input.open(filename2);

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh2))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Second mesh is not a valid
off file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

Exact_point_map mesh1_exact_points =

</div>

<div class="line">

mesh1.add_property_map\<vertex_descriptor,EK::Point_3\>(<span class="stringliteral">"e:exact_point"</span>).first;

</div>

<div class="line">

Exact_point_computed mesh1_exact_points_computed =

</div>

<div class="line">

mesh1.add_property_map\<vertex_descriptor,<span class="keywordtype">bool</span>\>(<span class="stringliteral">"e:exact_points_computed"</span>).first;

</div>

<div class="line">

</div>

<div class="line">

Exact_point_map mesh2_exact_points =

</div>

<div class="line">

mesh2.add_property_map\<vertex_descriptor,EK::Point_3\>(<span class="stringliteral">"e:exact_point"</span>).first;

</div>

<div class="line">

Exact_point_computed mesh2_exact_points_computed =

</div>

<div class="line">

mesh2.add_property_map\<vertex_descriptor,<span class="keywordtype">bool</span>\>(<span class="stringliteral">"e:exact_points_computed"</span>).first;

</div>

<div class="line">

</div>

<div class="line">

Coref_point_map mesh1_pm(mesh1_exact_points,
mesh1_exact_points_computed, mesh1);

</div>

<div class="line">

Coref_point_map mesh2_pm(mesh2_exact_points,
mesh2_exact_points_computed, mesh2);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">if</span> ( <a
href="group__PMP__corefinement__grp.html#ga240e5df984c7d44741a7031e38203dc3"
class="code">PMP::corefine_and_compute_intersection</a>(mesh1,

</div>

<div class="line">

mesh2,

</div>

<div class="line">

mesh1,

</div>

<div class="line">

params::vertex_point_map(mesh1_pm),

</div>

<div class="line">

params::vertex_point_map(mesh2_pm),

</div>

<div class="line">

params::vertex_point_map(mesh1_pm) ) )

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keywordflow">if</span> ( <a
href="group__PMP__corefinement__grp.html#gad7e1741a7ce41a5846cf86494982ca8b"
class="code">PMP::corefine_and_compute_union</a>(mesh1,

</div>

<div class="line">

mesh2,

</div>

<div class="line">

mesh2,

</div>

<div class="line">

params::vertex_point_map(mesh1_pm),

</div>

<div class="line">

params::vertex_point_map(mesh2_pm),

</div>

<div class="line">

params::vertex_point_map(mesh2_pm) ) )

</div>

<div class="line">

{

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Intersection and union were
successfully computed\n"</span>;

</div>

<div class="line">

std::ofstream
output(<span class="stringliteral">"inter_union.off"</span>);

</div>

<div class="line">

output \<\< mesh2;

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Union could not be
computed\n"</span>;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Intersection could not be
computed\n"</span>;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

</div>

# <span id="PMPHoleFilling" class="anchor"></span> Hole Filling

This package provides an algorithm for filling one closed hole that is
either in a triangulated surface mesh or defined by a sequence of points
that describe a polyline. The main steps of the algorithm are described
in <a href="citelist.html#CITEREF_liepa2003filling" class="el">[6]</a>
and can be summarized as follows.

First, the largest patch triangulating the boundary of the hole is
generated without introducing any new vertex. The patch is selected so
as to minimize a quality function evaluated for all possible triangular
patches. The quality function first minimizes the worst dihedral angle
between patch triangles, then the total surface area of the patch as a
tiebreaker. Following the suggestions in
<a href="citelist.html#CITEREF_zou2013algorithm" class="el">[7]</a>, the
performance of the algorithm is significantly improved by narrowing the
search space to faces of a 3D Delaunay triangulation of the hole
boundary vertices, from all possible patches, while searching for the
best patch with respect to the aforementioned quality criteria.

For some complicated input hole boundary, the generated patch may have
self-intersections. After hole filling, the generated patch can be
refined and faired using the meshing functions <a
href="group__PMP__meshing__grp.html#gad0449d8e1021fc46507074cd6db65ef4"
class="el"
title="refines a region of a triangle mesh "><code>CGAL::Polygon_mesh_processing::refine()</code></a>
and <a
href="group__PMP__meshing__grp.html#gaa091c8368920920eed87784107d68ecf"
class="el"
title="fairs a region on a triangle mesh. "><code>CGAL::Polygon_mesh_processing::fair()</code></a>
described in Section
<a href="index.html#PMPMeshing" class="el">Meshing</a>.

<span id="fig__Mech_steps" class="anchor"></span>

<div class="image">

![](mech_hole_horz.jpg)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__Mech_steps" class="el">Figure 60.5</a> Results
of the main steps of the algorithm. From left to right: (a) the hole,
(b) the hole after its triangulation, (c) after triangulation and
refinement, (d) after triangulation, refinement and fairing.

</div>

\

## <span id="HoleFillingAPI" class="anchor"></span> API

This package provides four functions for hole filling:

- <a
  href="group__hole__filling__grp.html#ga8508fd49a2482ec7dcb3e1799234696a"
  class="el"
  title="creates triangles to fill the hole defined by points in the range points. "><code>triangulate_hole_polyline()</code></a>
  : given a sequence of points defining the hole, triangulates the hole.
- <a
  href="group__hole__filling__grp.html#ga4aacaa46c800a53ca0a0e5fd518a7b20"
  class="el"
  title="triangulates a hole in a polygon mesh. "><code>triangulate_hole()</code></a>
  : given a border halfedge on the boundary of the hole on a mesh,
  triangulates the hole.
- <a
  href="group__hole__filling__grp.html#gaaa1bfaf9a57dea8b6c71168a18f9b6eb"
  class="el"
  title="triangulates and refines a hole in a polygon mesh. "><code>triangulate_and_refine_hole()</code></a>
  : in addition to <a
  href="group__hole__filling__grp.html#ga4aacaa46c800a53ca0a0e5fd518a7b20"
  class="el"
  title="triangulates a hole in a polygon mesh. "><code>triangulate_hole()</code></a>
  the generated patch is refined.
- <a
  href="group__hole__filling__grp.html#ga87655fb8d54a8d85e7eec7a21e5c0058"
  class="el"
  title="triangulates, refines and fairs a hole in a polygon mesh. "><code>triangulate_refine_and_fair_hole()</code></a>
  : in addition to <a
  href="group__hole__filling__grp.html#gaaa1bfaf9a57dea8b6c71168a18f9b6eb"
  class="el"
  title="triangulates and refines a hole in a polygon mesh. "><code>triangulate_and_refine_hole()</code></a>
  the generated patch is also faired.

## <span id="HFExamples" class="anchor"></span> Examples

### <span id="HFExample_1" class="anchor"></span> Triangulate a Polyline

The following example triangulates a hole described by an input
polyline.

\
**File** <a
href="Polygon_mesh_processing_2triangulate_polyline_example_8cpp-example.html"
class="el">Polygon_mesh_processing/triangulate_polyline_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/triangulate_hole.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/utility.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<vector\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<iterator\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
Kernel;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Kernel_23/classKernel_1_1Point__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">Kernel::Point_3</a>
Point;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span> main()

</div>

<div class="line">

{

</div>

<div class="line">

std::vector\<Point\> polyline;

</div>

<div class="line">

polyline.push_back(Point( 1.,0.,0.));

</div>

<div class="line">

polyline.push_back(Point( 0.,1.,0.));

</div>

<div class="line">

polyline.push_back(Point(-1.,0.,0.));

</div>

<div class="line">

polyline.push_back(Point( 1.,1.,0.));

</div>

<div class="line">

<span class="comment">// repeating first point (i.e.
polyline.push_back(Point(1.,0.,0.)) ) is optional</span>

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// any type, having Type(int, int, int)
constructor available, can be used to hold output triangles</span>

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../STL_Extension/classCGAL_1_1Triple.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/STL_Extension.tag:../STL_Extension/">CGAL::Triple&lt;int,
int, int&gt;</a> Triangle_int;

</div>

<div class="line">

std::vector\<Triangle_int\> patch;

</div>

<div class="line">

patch.reserve(polyline.size() -2); <span class="comment">// there will
be exactly n-2 triangles in the patch</span>

</div>

<div class="line">

</div>

<div class="line">

<a
href="group__hole__filling__grp.html#ga8508fd49a2482ec7dcb3e1799234696a"
class="code">CGAL::Polygon_mesh_processing::triangulate_hole_polyline</a>(

</div>

<div class="line">

polyline,

</div>

<div class="line">

std::back_inserter(patch));

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">for</span>(std::size_t i = 0; i \<
patch.size(); ++i)

</div>

<div class="line">

{

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Triangle "</span> \<\< i
\<\< <span class="stringliteral">": "</span>

</div>

<div class="line">

\<\< patch\[i\].first \<\< <span class="stringliteral">" "</span> \<\<
patch\[i\].second \<\< <span class="stringliteral">" "</span> \<\<
patch\[i\].third

</div>

<div class="line">

\<\< std::endl;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// note that no degenerate triangles are generated
in the patch</span>

</div>

<div class="line">

std::vector\<Point\> polyline_collinear;

</div>

<div class="line">

polyline_collinear.push_back(Point(1.,0.,0.));

</div>

<div class="line">

polyline_collinear.push_back(Point(2.,0.,0.));

</div>

<div class="line">

polyline_collinear.push_back(Point(3.,0.,0.));

</div>

<div class="line">

polyline_collinear.push_back(Point(4.,0.,0.));

</div>

<div class="line">

</div>

<div class="line">

std::vector\<Triangle_int\> patch_will_be_empty;

</div>

<div class="line">

<a
href="group__hole__filling__grp.html#ga8508fd49a2482ec7dcb3e1799234696a"
class="code">CGAL::Polygon_mesh_processing::triangulate_hole_polyline</a>(

</div>

<div class="line">

polyline_collinear,

</div>

<div class="line">

back_inserter(patch_will_be_empty));

</div>

<div class="line">

CGAL_assertion(patch_will_be_empty.empty());

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

### <span id="HFExample_2" class="anchor"></span> Hole Filling From the Border of the Hole

If the input polygon mesh has a hole or more than one hole, it is
possible to iteratively fill them by detecting border edges (i.e. with
only one incident non-null face) after each hole filling step.

Holes are filled one after the other, and the process stops when there
is no border edge left.

This process is illustrated by the example below, where holes are
iteratively filled, refined and faired to get a faired mesh with no
hole.

\
**File** <a
href="Polygon_mesh_processing_2hole_filling_example_8cpp-example.html"
class="el">Polygon_mesh_processing/hole_filling_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Polyhedron_3.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/triangulate_hole.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<iostream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<vector\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<boost/foreach.hpp\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
Kernel;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Polyhedron/classCGAL_1_1Polyhedron__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Polyhedron.tag:../Polyhedron/">CGAL::Polyhedron_3&lt;Kernel&gt;</a>
Polyhedron;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> Polyhedron::Halfedge_handle
Halfedge_handle;

</div>

<div class="line">

<span class="keyword">typedef</span> Polyhedron::Facet_handle
Facet_handle;

</div>

<div class="line">

<span class="keyword">typedef</span> Polyhedron::Vertex_handle
Vertex_handle;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] :
<span class="stringliteral">"data/mech-holes-shark.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Polyhedron poly;

</div>

<div class="line">

<span class="keywordflow">if</span> ( !input \|\| !(input \>\> poly)
\|\| poly.empty() ) {

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid off
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="comment">// Incrementally fill the holes</span>

</div>

<div class="line">

<span class="keywordtype">unsigned</span>
<span class="keywordtype">int</span> nb_holes = 0;

</div>

<div class="line">

BOOST_FOREACH(Halfedge_handle h, halfedges(poly))

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keywordflow">if</span>(h-\>is_border())

</div>

<div class="line">

{

</div>

<div class="line">

std::vector\<Facet_handle\> patch_facets;

</div>

<div class="line">

std::vector\<Vertex_handle\> patch_vertices;

</div>

<div class="line">

<span class="keywordtype">bool</span> success = CGAL::cpp11::get\<0\>(

</div>

<div class="line">

<a
href="group__hole__filling__grp.html#ga87655fb8d54a8d85e7eec7a21e5c0058"
class="code">CGAL::Polygon_mesh_processing::triangulate_refine_and_fair_hole</a>(

</div>

<div class="line">

poly,

</div>

<div class="line">

h,

</div>

<div class="line">

std::back_inserter(patch_facets),

</div>

<div class="line">

std::back_inserter(patch_vertices),

</div>

<div class="line">

CGAL::Polygon_mesh_processing::parameters::vertex_point_map(<span class="keyword">get</span>(CGAL::vertex_point,
poly)).

</div>

<div class="line">

geom_traits(Kernel())) );

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">" Number of facets in
constructed patch: "</span> \<\< patch_facets.size() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">" Number of vertices in
constructed patch: "</span> \<\< patch_vertices.size() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">" Fairing : "</span> \<\<
(success ? <span class="stringliteral">"succeeded"</span> :
<span class="stringliteral">"failed"</span>) \<\< std::endl;

</div>

<div class="line">

++nb_holes;

</div>

<div class="line">

}

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< std::endl;

</div>

<div class="line">

std::cout \<\< nb_holes \<\< <span class="stringliteral">" holes have
been filled"</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::ofstream out(<span class="stringliteral">"filled.off"</span>);

</div>

<div class="line">

out.precision(17);

</div>

<div class="line">

out \<\< poly \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

<span id="fig__Triangulated_fork" class="anchor"></span>

<div class="image">

![](fork.jpg)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__Triangulated_fork" class="el">Figure 60.6</a>
Holes in the fork model are filled with triangle patches.

</div>

\

## <span id="HFPerformance" class="anchor"></span> Performance

The hole filling algorithm has a complexity which depends on the number
of vertices. While
<a href="citelist.html#CITEREF_liepa2003filling" class="el">[6]</a> has
a running time of \\ O(n^3)\\ ,
<a href="citelist.html#CITEREF_zou2013algorithm" class="el">[7]</a> in
most cases has running time of \\ O(n \log n)\\. We were running <a
href="group__hole__filling__grp.html#ga87655fb8d54a8d85e7eec7a21e5c0058"
class="el"
title="triangulates, refines and fairs a hole in a polygon mesh. "><code>triangulate_refine_and_fair_hole()</code></a>
for the below meshes (and two more meshes with smaller holes). The
machine used is a PC running Windows 10 with an Intel Core i7 CPU
clocked at 2.70 GHz. The program has been compiled with Visual C++ 2013
compiler with the O2 option which maximizes speed.

<span id="fig__Elephants" class="anchor"></span>

<div class="image">

![](elephants-with-holes.png)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__Elephants" class="el">Figure 60.7</a> The
elephant on the left/right has a hole with 963/7657 vertices.

</div>

\

This takes time

| \# vertices | without Delaunay (sec.) | with Delaunay (sec.) |
|------------:|------------------------:|---------------------:|
|         565 |                     8.5 |                 0.03 |
|         774 |                      21 |                0.035 |
|         967 |                      43 |                 0.06 |
|        7657 |                      na |                  0.4 |

# <span id="PMPPredicates" class="anchor"></span> Predicates

This packages provides several predicates to be evaluated with respect
to a triangle mesh.

## <span id="PMPSelIntersections" class="anchor"></span> Self Intersections

Self intersections can be detected from a triangle mesh, by calling the
predicate <a
href="group__PMP__intersection__grp.html#ga0beba25d03a16010b20e2c9b6771cd12"
class="el"
title="tests if a triangulated surface mesh self-intersects. "><code>CGAL::Polygon_mesh_processing::does_self_intersect()</code></a>.
Additionally, the function <a
href="group__PMP__intersection__grp.html#ga0afb9e365a2f16f0591255b8df468885"
class="el"
title="detects and records self-intersections of a triangulated surface mesh. "><code>CGAL::Polygon_mesh_processing::self_intersections()</code></a>
reports all pairs of intersecting triangles.

<span id="fig__SelfIntersections" class="anchor"></span>

<div class="image">

![](selfintersections.jpg)

</div>

<div class="cgal_figure_caption">

<a href="index.html#fig__SelfIntersections" class="el">Figure 60.8</a>
Detecting self-intersections on a triangle mesh. The intersecting
triangles are displayed in dark grey on the right image.

</div>

\

### <span id="SIExample" class="anchor"></span> Self Intersections Example

\
**File** <a
href="Polygon_mesh_processing_2self_intersections_example_8cpp-example.html"
class="el">Polygon_mesh_processing/self_intersections_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Surface_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/self_intersections.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Surface_mesh/classCGAL_1_1Surface__mesh.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Surface_mesh.tag:../Surface_mesh/">CGAL::Surface_mesh&lt;K::Point_3&gt;</a>
Mesh;

</div>

<div class="line">

<span class="keyword">typedef</span>
boost::graph_traits\<Mesh\>::face_descriptor face_descriptor;

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">namespace </span>PMP =
<a href="namespaceCGAL_1_1Polygon__mesh__processing.html"
class="code">CGAL::Polygon_mesh_processing</a>;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/pig.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Mesh mesh;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh) \|\|
\!<a
href="../BGL/group__PkgBGLHelperFct.html#ga11883d231eec1b58f37efe4acedd9588"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">CGAL::is_triangle_mesh</a>(mesh))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid input
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">bool</span> intersecting = <a
href="group__PMP__intersection__grp.html#ga0beba25d03a16010b20e2c9b6771cd12"
class="code">PMP::does_self_intersect</a>(mesh,

</div>

<div class="line">

PMP::parameters::vertex_point_map(<span class="keyword">get</span>(CGAL::vertex_point,
mesh)));

</div>

<div class="line">

</div>

<div class="line">

std::cout

</div>

<div class="line">

\<\< (intersecting ? <span class="stringliteral">"There are
self-intersections."</span> : <span class="stringliteral">"There is no
self-intersection."</span>)

</div>

<div class="line">

\<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::vector\<std::pair\<face_descriptor, face_descriptor\> \>
intersected_tris;

</div>

<div class="line">

<a
href="group__PMP__intersection__grp.html#ga0afb9e365a2f16f0591255b8df468885"
class="code">PMP::self_intersections</a>(mesh,
std::back_inserter(intersected_tris));

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< intersected_tris.size() \<\<
<span class="stringliteral">" pairs of triangles intersect."</span> \<\<
std::endl;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

## <span id="PMPInsideTest" class="anchor"></span> Side of Triangle Mesh

The class
<a href="classCGAL_1_1Side__of__triangle__mesh.html" class="el"
title="This class provides an efficient point location functionality with respect to a domain bounded by one..."><code>CGAL::Side_of_triangle_mesh</code></a>
provides a functor that tests whether a query point is inside, outside,
or on the boundary of the domain bounded by a given closed triangle
mesh.

A point is said to be on the bounded side of the domain bounded by the
input triangle mesh if an odd number of surfaces is crossed when walking
from the point to infinity. The input triangle mesh is expected to
contain no self-intersections and to be free from self-inclusions.

The algorithm can handle the case of a triangle mesh with several
connected components, and returns correct results. In case of
self-inclusions, the ray intersections parity test is performed, and the
execution will not fail. However, the user should be aware that the
predicate alternately considers sub-volumes to be on the bounded and
unbounded sides of the input triangle mesh.

### <span id="InsideExample" class="anchor"></span> Inside Test Example

\
**File** <a
href="Polygon_mesh_processing_2point_inside_example_8cpp-example.html"
class="el">Polygon_mesh_processing/point_inside_example.cpp</a>

<div class="fragment">

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Polyhedron_3.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/point_generators_3.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Side_of_triangle_mesh.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<vector\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<limits\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<boost/foreach.hpp\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span> K::Point_3 Point;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Polyhedron/classCGAL_1_1Polyhedron__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Polyhedron.tag:../Polyhedron/">CGAL::Polyhedron_3&lt;K&gt;</a>
Polyhedron;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">double</span>
max_coordinate(<span class="keyword">const</span> Polyhedron& poly)

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keywordtype">double</span> max_coord =
-std::numeric_limits\<double\>::infinity();

</div>

<div class="line">

BOOST_FOREACH(Polyhedron::Vertex_handle v, vertices(poly))

</div>

<div class="line">

{

</div>

<div class="line">

Point p = v-\>point();

</div>

<div class="line">

max_coord = (std::max)(max_coord, p.x());

</div>

<div class="line">

max_coord = (std::max)(max_coord, p.y());

</div>

<div class="line">

max_coord = (std::max)(max_coord, p.z());

</div>

<div class="line">

}

</div>

<div class="line">

<span class="keywordflow">return</span> max_coord;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] : <span class="stringliteral">"data/eight.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Polyhedron poly;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> poly) \|\|
poly.empty()

</div>

<div class="line">

\|\| \!<a
href="../BGL/group__PkgBGLHelperFct.html#ga11883d231eec1b58f37efe4acedd9588"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/BGL.tag:../BGL/">CGAL::is_triangle_mesh</a>(poly))

</div>

<div class="line">

{

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid input
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

<a href="classCGAL_1_1Side__of__triangle__mesh.html"
class="code">CGAL::Side_of_triangle_mesh&lt;Polyhedron, K&gt;</a>
inside(poly);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">double</span> size = max_coordinate(poly);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">unsigned</span>
<span class="keywordtype">int</span> nb_points = 100;

</div>

<div class="line">

std::vector\<Point\> points;

</div>

<div class="line">

points.reserve(nb_points);

</div>

<div class="line">

CGAL::Random_points_in_cube_3\<Point\> gen(size);

</div>

<div class="line">

<span class="keywordflow">for</span>
(<span class="keywordtype">unsigned</span>
<span class="keywordtype">int</span> i = 0; i \< nb_points; ++i)

</div>

<div class="line">

points.push_back(\*gen++);

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Test "</span> \<\< nb_points
\<\< <span class="stringliteral">" random points in cube "</span>

</div>

<div class="line">

\<\< <span class="stringliteral">"\[-"</span> \<\< size \<\<
<span class="stringliteral">"; "</span> \<\< size
\<\<<span class="stringliteral">"\]"</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span> nb_inside = 0;

</div>

<div class="line">

<span class="keywordtype">int</span> nb_boundary = 0;

</div>

<div class="line">

<span class="keywordflow">for</span> (std::size_t i = 0; i \< nb_points;
++i)

</div>

<div class="line">

{

</div>

<div class="line">

<a
href="../Kernel_23/group__kernel__enums.html#gaf6030e89dadcc1f45369b0cdc5d9e111"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Bounded_side</a>
res = inside(points\[i\]);

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">if</span> (res == <a
href="../Kernel_23/group__kernel__enums.html#ggaf6030e89dadcc1f45369b0cdc5d9e111ad8333d35d4801c08b3a5ae9e94d7cabe"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::ON_BOUNDED_SIDE</a>)
{ ++nb_inside; }

</div>

<div class="line">

<span class="keywordflow">if</span> (res == <a
href="../Kernel_23/group__kernel__enums.html#ggaf6030e89dadcc1f45369b0cdc5d9e111a060193157c0875fb2e6445a648f3ac1f"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::ON_BOUNDARY</a>)
{ ++nb_boundary; }

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Total query size: "</span>
\<\< points.size() \<\< std::endl;

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">" "</span> \<\< nb_inside
\<\< <span class="stringliteral">" points inside "</span> \<\<
std::endl;

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">" "</span> \<\< nb_boundary
\<\< <span class="stringliteral">" points on boundary "</span> \<\<
std::endl;

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">" "</span> \<\<
points.size() - nb_inside - nb_boundary \<\<
<span class="stringliteral">" points outside "</span> \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

## <span id="PMPDoIntersect" class="anchor"></span> Intersections Detection

Intersection tests between triangle meshes and/or polylines can be done
using <a href="group__PMP__predicates__grp.html"
class="el"><code>CGAL::Polygon_mesh_processing::do_intersect()</code></a>
. Additionally, the function <a
href="group__PMP__predicates__grp.html#ga1ff63ec6e762d45ea5775bf7b49f9270"
class="el"
title="detects and reports all the pairs of meshes intersecting in a range of triangulated surface meshes..."><code>CGAL::Polygon_mesh_processing::intersecting_meshes()</code></a>
records all pairs of intersecting meshes in a range.

# <span id="PMPOrientation" class="anchor"></span> Orientation

This package provides functions dealing with the orientation of faces in
a closed polygon mesh.

The function <a
href="group__PMP__orientation__grp.html#gad71360b56f0d5340bf3006febd49286c"
class="el"
title="tests whether a closed polygon mesh has a positive orientation. "><code>CGAL::Polygon_mesh_processing::is_outward_oriented()</code></a>
checks whether an oriented polygon mesh is oriented such that the
normals to all faces are oriented towards the outside of the domain
bounded by the input polygon mesh.

The function <a
href="group__PMP__orientation__grp.html#gad8a3439883e3e76651f96d15ba58b2bc"
class="el"
title="reverses for each face the order of the vertices along the face boundary. "><code>CGAL::Polygon_mesh_processing::reverse_face_orientations()</code></a>
reverses the orientation of halfedges around faces. As a consequence,
the normal computed for each face (see Section <a
href="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/Polygon_mesh_processing/Polygon_mesh_processing.txt.html#PMPNormalComp"
class="el">Computing Normals</a>) is also reversed.

The <a
href="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/Polygon_mesh_processing/Polygon_mesh_processing.txt.html#PolygonSoupExample"
class="el">Polygon Soup Example</a> puts these functions at work on a
polygon soup.

The function <a
href="group__PMP__orientation__grp.html#gafe035adcc4ff061b4438cc9dae591d00"
class="el"
title="makes each connected component of a closed triangulated surface mesh inward or outward oriented..."><code>CGAL::Polygon_mesh_processing::orient()</code></a>
makes each connected component of a closed polygon mesh outward or
inward oriented.

The function <a
href="group__PMP__orientation__grp.html#gafdbc256d06536f6aca2558bc1a0156e2"
class="el"
title="orients the connected components of tm to make it bound a volume. "><code>CGAL::Polygon_mesh_processing::orient_to_bound_a_volume()</code></a>
orients the connected components of a closed polygon mesh so that it
bounds a volume (see
<a href="index.html#coref_def_subsec" class="el">Definitions</a> for the
precise definition).

# <span id="PMPRepairing" class="anchor"></span> Combinatorial Repairing

## <span id="Stitching" class="anchor"></span> Stitching

It happens that a polygon mesh has several edges and vertices that are
duplicated. For those edges and vertices, the connectivity of the mesh
is incomplete, if not considered incorrect.

Stitching the borders of such a polygon mesh consists in two main steps.
First, border edges that are similar but duplicated are detected and
paired. Then, they are "stitched" together so that the edges and
vertices duplicates are removed from the mesh, and each of these
remaining edges is incident to exactly two faces.

The function <a href="group__PMP__repairing__grp.html"
class="el"><code>CGAL::Polygon_mesh_processing::stitch_borders()</code></a>
performs such repairing operation. The input mesh should be manifold.
Otherwise, stitching is not guaranteed to succeed.

### <span id="StitchingExample" class="anchor"></span> Stitching Example

The following example applies the stitching operation to a simple quad
mesh with duplicated border edges.

\
**File** <a
href="Polygon_mesh_processing_2stitch_borders_example_8cpp-example.html"
class="el">Polygon_mesh_processing/stitch_borders_example.cpp</a>

<div class="fragment">

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Exact_predicates_inexact_constructions_kernel.h\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<CGAL/Polyhedron_3.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include
\<CGAL/Polygon_mesh_processing/stitch_borders.h\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="preprocessor">\#include \<iostream\></span>

</div>

<div class="line">

<span class="preprocessor">\#include \<fstream\></span>

</div>

<div class="line">

</div>

<div class="line">

<span class="keyword">typedef</span> <a
href="../Kernel_23/classCGAL_1_1Exact__predicates__inexact__constructions__kernel.html"
class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Kernel_23.tag:../Kernel_23/">CGAL::Exact_predicates_inexact_constructions_kernel</a>
K;

</div>

<div class="line">

<span class="keyword">typedef</span>
<a href="../Polyhedron/classCGAL_1_1Polyhedron__3.html" class="codeRef"
data-doxygen="/home/cgal-testsuite/cgal_doc_build/CGAL-4.12.1-I-247/doc/scripts/doc_1_8_13/doc_tags/Polyhedron.tag:../Polyhedron/">CGAL::Polyhedron_3&lt;K&gt;</a>
Polyhedron;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordtype">int</span>
main(<span class="keywordtype">int</span> argc,
<span class="keywordtype">char</span>\* argv\[\])

</div>

<div class="line">

{

</div>

<div class="line">

<span class="keyword">const</span>
<span class="keywordtype">char</span>\* filename = (argc \> 1) ?
argv\[1\] :
<span class="stringliteral">"data/full_border_quads.off"</span>;

</div>

<div class="line">

std::ifstream input(filename);

</div>

<div class="line">

</div>

<div class="line">

Polyhedron mesh;

</div>

<div class="line">

<span class="keywordflow">if</span> (!input \|\| !(input \>\> mesh) \|\|
mesh.is_empty()) {

</div>

<div class="line">

std::cerr \<\< <span class="stringliteral">"Not a valid off
file."</span> \<\< std::endl;

</div>

<div class="line">

<span class="keywordflow">return</span> 1;

</div>

<div class="line">

}

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Before stitching : "</span>
\<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of vertices
:\t"</span> \<\< mesh.size_of_vertices() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of halfedges
:\t"</span> \<\< mesh.size_of_halfedges() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of facets
:\t"</span> \<\< mesh.size_of_facets() \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

<a
href="group__PMP__repairing__grp.html#gabdf5abc4d0f51055bf12afb00a128abc"
class="code">CGAL::Polygon_mesh_processing::stitch_borders</a>(mesh);

</div>

<div class="line">

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"Stitching done : "</span>
\<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of vertices
:\t"</span> \<\< mesh.size_of_vertices() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of halfedges
:\t"</span> \<\< mesh.size_of_halfedges() \<\< std::endl;

</div>

<div class="line">

std::cout \<\< <span class="stringliteral">"\t Number of facets
:\t"</span> \<\< mesh.size_of_facets() \<\< std::endl;

</div>

<div class="line">

</div>

<div class="line">

std::ofstream
output(<span class="stringliteral">"mesh_stitched.off"</span>);

</div>

<div class="line">

output \<\< std::setprecision(17) \<\< mesh;

</div>

<div class="line">

</div>

<div class="line">

<span class="keywordflow">return</span> 0;

</div>

<div class="line">

}

</div>

</div>

</div>

</div>

</div>

<div id="footer">

<div id="nav-path" class="navpath">

- Generated on Sat Sep 1 2018 21:30:28 for CGAL 4.12.1 - Polygon Mesh
  Processing by
  [<img src="doxygen.png" class="footer" alt="doxygen" />](http://www.doxygen.org/index.html)
  1.8.13

</div>

</div>
