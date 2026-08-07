---
source_pdf: /home/cristian/prototipos/three.js/research/sources/manuals/dualcontour-ju-2002.pdf
sha256: 54727ae903c6b3b21abefeb8a3e47a6266b542e8ebc8b814187c4be4dedcdca4
pages_total: 8
page_range: all
method: pymupdf
reliability: text-layer
---

<!-- ===== p.1 ===== -->



<!-- Start of picture text -->
ct [~~ ATA ivan OF ; | RTA RAR Tr?<br>ee age<br>mad = a - a<br><!-- End of picture text -->

<!-- ===== p.2 ===== -->

In preparation for the next version of the gaming class, the instructor and three members of the class (the authors) decided to pursue a yearlong project to rewrite the game engine to address these deficiencies. In particular, we focused on adapting three pieces of recently developed modeling technology for our program. Each of these pieces addresses one of the problems: 

- First, we use an octree in place of a 3D uniform grid. In particular, our octree is inspired by those used in Adaptive Distance Fields [Frisken et al. 2000; Perry and Frisken 2001] in which signs are maintained at corners of cubes in the octree. 

- At the leaves of the octree, we tag those edges with sign changes by exact intersection points and their normals from the contour. This choice is inspired by the Extended Marching Cubes method of [Kobbelt et al. 2001]. Adding normals allows this method to exactly reproduce a wide class of polyhedral shapes as well as curve or sharp edges on the contour. 

- Third, we use these normals to de£ne a quadratic error function (QEF) for each leaf of the octree. These QEFs are then used in an octree-based polyhedral simplification method similar to that of [Lindstrom 2000]. Our method uses the added information specified by the signs attached to the corners of cubes in the octree to preserve the topology of this contour during simplification. 

The resulting representation is an octree whose leaf cubes have signs at their corners with exact intersections and normals tagging edges that exhibit sign changes. (See the upper left portion of figure 2 for an example). Interior nodes in the octree contain QEFs used during simplification. This representation can accurately approximate implicit shapes as well as parametric shapes such as subdivision surfaces. (These parametric shapes are imported as polygonal approximations and scan converted into a signed octree.) The adaptive structure of the octree allows for real-time approximate CSG operations and simplification of the resulting shapes. 

Given that we are building on several pieces of previous work, we should make clear our original contributions in this paper. First, we propose a new method for contouring a 3D grid of Hermite data that avoids the need to explicitly identify and process ”features” as done in the Extended Marching Cubes method. After extending this contouring method to the case of multiple materials, we demonstrate how to model textured contours. We also introduce a new, numerically stable representation for quadratic error functions that we use in a standard octree-based method for simplifying these contours and their textured regions. We then develop a version of our contouring method for simplified octrees that imposes no constraints on the octree (such as being a restricted octree) and requires no ”crack patching”. We conclude with a simple new test for preserving the topology of both the contour and its textured regions during simplification. 

# 2 Dual contouring on uniform grids 

Although our ultimate goal is to develop a simple contouring method that is suitable for octrees, we first consider various methods for contouring signed uniform grids. The upper left portion of figure 2 shows a typical example of a signed uniform grid. Those edges of the grid that exhibit a sign change are tagged by Hermite data consisting of exact intersection points and normals from the contour. This Hermite data can be computed directly from the implicit definition of the contour or by scan converting a closed polygonal mesh. 





Figure 2: A signed grid with edges tagged by Hermite data (upper left), its Marching Cubes contour (upper right), its Extended Marching Cubes contour (lower left), and its dual contour (lower right). 

## 2.1 Previous contouring methods 

_Cube-based methods_ such as the Marching Cubes (MC) algorithm and its variants generate one or more polygons for each cube in the grid that intersects the contour. Typically, these methods generate one polygon for each portion of the contour that interest a particular cube with the vertices of these polygons being positioned at the intersection of the contour with the edges of the cube. The upper right portion of figure 2 shows a 2D example of the MC contour generated from the signed grid to its left. The left-hand side of figure 3 shows a 3D example of a sphere generated as the zero contour of the function _f_ [ _x_ , _y_ , _z_ ] = 1 − _x_<sup>2</sup> − _y_<sup>2</sup> − _z_<sup>2</sup> . This contour consists of a collection of polygons that approximate the restriction of the contour to individual cubes in the grid. 

_Dual_ methods such as the _SurfaceNets_ algorithm of [Gibson 1998] generate one vertex lying on or near the contour for each cube that intersects the contour. For each edge in the grid that exhibits a sign change, the vertices associated with the four cubes that contain the edge are joined to form a quad. The result is a continuous polygonal surface that approximates the contour. The right-hand side of figure 3 shows an example of the same sphere contoured using the SurfaceNets method. Note that the polygonal mesh produced by the SurfaceNets method is dual to the mesh produced by MC in the standard topological sense: vertices of the SurfaceNets mesh correspond to faces of the MC mesh and vice versa. Dual methods typically deliver polygonal meshes with better aspect ratios since the vertices of the mesh are free to move inside the cube as opposed to being restricted to edges of the grid as in cube-based methods.<sup>1</sup> 

> 1Note that other methods such as [Wood et al. 2000] contour without respect to the underlying fine grid. We focus our attention on grid-based 

340

<!-- ===== p.3 ===== -->



<!-- Start of picture text -->
ZS<br>AYA<br>Ay<br><!-- End of picture text -->



<!-- Start of picture text -->
CS<br>Fae<br>ys<br><!-- End of picture text -->

<!-- ===== p.4 ===== -->

SO rape

<!-- ===== p.5 ===== -->



<!-- Start of picture text -->
ae<br>PsaHeeLET er) TEERED foeTHSOTEH = Be. aSS.<br><!-- End of picture text -->

<!-- ===== p.6 ===== -->



<!-- Start of picture text -->
yt<br><!-- End of picture text -->

~~<mark>> mae</mark>~~ yt <mark>_ha</mark> ~~<u>e</u>~~

<!-- ===== p.7 ===== -->

Speci£cally, given an interior node in the octree whose eight children are leaves, we desire a test based on the signs (or indices) at the corners of these leaves that guarantees that the topological connectivity of the dual contour and its textured regions is preserved during collapse of the node. 

## 4.1 The two-signed case 

Consider a coarse cube consisting of eight leaf cubes. The signs at the corners of the eight leaf cubes define a 3 × 3 × 3 grid whose corners defined a 2 × 2 × 2 coarse grid. Our goal is to develop a test for determining whether the dual contour generated by this fine grid is topologically equivalent to the dual contour generated by the coarse grid<sup>3</sup> . 

Before presenting the test, we recall that a _d_ -dimensional contour is locally a _manifold_ if it is topologically equivalent to a _d_ - dimensional disc. Since a cube has twelve edges, dual contouring can generate up to twelve polygons that meet at the central vertex associated with the cube. For most common sign configurations on the cube, these polygons define a manifold at this vertex. However, there exist sign con£gurations for which the dual contour is non-manifold. (These configurations correspond to the ”ambiguous” sign con£gurations in standard cube-based methods.) Given this de£nition, the safety test has three checks: 

1. Test whether the dual contour for the coarse cube is a manifold. If not, stop. 

2. Test whether the dual contour for each individual fine cube is a manifold. If not, stop. 

3. Test whether the fine contour is topologically equivalent to the coarse contour on each of the sub-faces of the coarse cube. If not, stop; otherwise safely collapse. 

The first two checks restrict the simplification process to manifold dual contours. (Note that the second check can be dropped if the fine leaf cubes are themselves the results of a previous collapse.) In practice, this restriction is acceptable since most fine resolution contours are manifold with non-manifold contours usually arising due to unsafe simplification. For the first two checks, [Gerstner and Pajarola 2000] describe a simple test for determining whether the contour associated with a single cube is a manifold. The idea is to repeatedly collapse the edges of the cube whose corners have the same sign to a single vertex. Now, the contour associated with the cube is manifold if and only if the result of this reduction is a single edge. The result of this test can be pre-computed for all possible sign configurations associated with a single cube and stored in a table of size 2<sup>8</sup> . 

The third check tests topological equivalence of the coarse and fine contours as follows: First, the method checks for topological equivalence on the edges of the coarse cube. Next, the method checks for topological equivalence on the faces of the coarse cube. Finally, the method checks for equivalence on the interior of the coarse cube. These checks can be implemented as a sequence of sign comparisons on the 3 × 3 × 3 grid of signs. 

   - The sign in the middle of a coarse edge must agree with the sign of at least one of the edge’s two endpoints. 

   - The sign in the middle of a coarse face must agree with the sign of at least one of the face’s four corners. 

   - The sign in the middle of a coarse cube must agree with the sign of at least one of the cube’s eight corners. 

- 3Two shapes are _topologically equivalent_ if they can be deformed into 

- each other by a continuous, invertible mapping. 



Figure 10: Three signed quadtrees and their dual contours. 

Figure 10 shows three signed quadtrees that are candidates for simplification. The dual contour for the left quadtree has two distinct connected components. In this case, the first check rejects the simplification as unsafe since the contour for the collapsed quadtree is non-manifold. The dual contour for the middle quadtree also has two distinct components. In this case, the third check rejects the simplification since the left edge of the quadtree cannot be safely simplified. The signs for the rightmost quadtree satisfy all three checks and therefore the quadtree can be safely simplified. 

The proof of correctness for these sign checks is based on establishing topological equivalence for subfaces of the coarse cube in order of increasing dimension. The right mesh in figure 8 shows an example of a simplified version of the mechanical part that has undergone a topology change that disconnects the mesh. The middle mesh in figure 8 shows an example of the part after safe simplification with the topology checks preventing further unsafe simplification. 

## 4.2 The multi-material case 

One nice feature of the contouring and simplification methods discussed in the previous sections is that these methods handle the case of multiple materials without any extra difficulty. Luckily, the safety test described in the previous subsection also generalizes to the contours of multi-material regions with one small change. An apparent difficulty is that the contours of multi-material regions are inherently non-manifold in the two-material sense. For example, figure 11 shows three examples of dual contours separating the three materials. Two of the contours have a vertex where three materials meet. Note that if we consider the boundary of each material’s region separately, we can still classify whether this portion of the dual contour is a manifold. Specifically, a multi-material dual contour is a _quasi-manifold_ if the boundary of each material’s region is a manifold. In the two-material case, being a quasi-manifold is equivalent to being a manifold. 

Now, the multi-material safety test determines whether it is topologically safe to simplify dual contours that are quasi-manifolds. As before, this restriction is not particularly problematic since most portions of a multi-material contour are quasi-manifold. This new test again consists of three phases and is identical to the twomaterial test with the exception that we replace the first and second checks for whether the contour inside a single cube is a manifold by an equivalent test for whether the contour is a quasi-manifold. The index tests in phase three remain unchanged. 

In analogy with the manifold case, the quasi-manifold test for a multi-material cube involves collapsing each edge of the cube whose endpoints have the same index. Now, the dual contour associated with the cube is a quasi-manifold if and only if the collapsed edge graph is a simplex (i.e; a point, a segment, a triangle or a tetrahedron). As in the two-sign case, the values of this function can be pre-computed and stored in a lookup table of size 4<sup>8</sup> . (If a cube has 5 or more distinct indices, its edge graph cannot collapse to a simplex.) The correctness of this test can be verified by selecting an index on the cube and treating all of the remaining indices as being equivalent. Since the resulting edge graph collapses to a segment, 

345

<!-- ===== p.8 ===== -->



<!-- Start of picture text -->
cd a<br>ai<br><!-- End of picture text -->



<!-- Start of picture text -->
ee<br><!-- End of picture text -->
