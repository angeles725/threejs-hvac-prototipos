# Adaptive Precision Floating-Point Arithmetic and Fast Robust Predicates for Computational Geometry

------------------------------------------------------------------------

[Jonathan Richard Shewchuk](http://www.cs.berkeley.edu/~jrs)\
Computer Science Division\
University of California at Berkeley\
Berkeley, California 94720-1776\
<img src="sig.gif" width="151" height="21" />

------------------------------------------------------------------------

Created as part of the [Archimedes](archimedes.html) project (tools for
parallel finite element methods).\
Supported in part by [NSF Grant CMS-9318163](grant.html) and an
[NSERC](http://www.nserc.ca) 1967 Scholarship.

------------------------------------------------------------------------

------------------------------------------------------------------------

Many computational geometry applications use numerical tests known as
the *orientation* and *incircle* tests. The orientation test determines
whether a point lies to the left of, to the right of, or on a line or
plane defined by other points. The incircle test determines whether a
point lies inside, outside, or on a circle defined by other points.

Each of these tests is performed by evaluating the sign of a determinant
(see the figure below). The determinant is expressed in terms of the
coordinates of the points. If these coordinates are expressed as single
or double precision floating-point numbers, roundoff error may lead to
an incorrect result when the true determinant is near zero. In turn,
this misinformation can lead an application to fail or produce incorrect
results.

<img src="preds.gif" data-align="middle" />

One way to solve this problem is to use exact arithmetic. Unfortunately,
traditional libraries for arbitrary precision floating-point arithmetic
are quite slow, and can reduce the speed of an application by one or two
orders of magnitude.

To minimize this problem, I've produced algorithms and implementations
for performing the 2D and 3D orientation and incircle tests correctly
and reasonably quickly. From this page, you may access papers describing
the approach (short and long versions), and the code itself. My hope is
that working computational geometers will be able to simply plug the
code into their applications with little effort, and forget about
robustness problems (for those algorithms that only require orientation
and incircle tests).

My algorithms are faster than traditional arbitrary precision libraries
for two reasons. First, I use an unusual approach to exact arithmetic,
pioneered by Douglas Priest and sped by me, that has its greatest
advantage over traditional techniques when manipulating numbers of
relatively small complexity (a few hundred or thousand bits). Second,
the algorithms are *adaptive* in the sense that they do only as much
work as necessary to guarantee a correct result. The sign of a small
determinant can typically be determined quickly unless the determinant
is close to zero. See the papers for details.

### Papers

The long version.

- Jonathan Richard Shewchuk, *Adaptive Precision Floating-Point
  Arithmetic and Fast Robust Geometric Predicates*, Discrete &
  Computational Geometry **18**:305-363, 1997. Also Technical Report
  CMU-CS-96-140, School of Computer Science, Carnegie Mellon University,
  Pittsburgh, Pennsylvania, May 1996.
  [**Abstract**](/afs/cs/project/quake/public/papers/robust-arithmetic.abstract)
  (with BibTeX citation), [**PostScript (676k, 53
  pages)**](/afs/cs/project/quake/public/papers/robust-arithmetic.ps).

The short version. Covers the most important points, but leaves out all
the proofs and many details. Presents a slower version of the addition
algorithm because there wasn't room to explain the fastest one.

- *Robust Adaptive Floating-Point Geometric Predicates*, Proceedings of
  the Twelfth Annual Symposium on Computational Geometry, ACM, May 1996.
  [**Abstract**](/afs/cs/project/quake/public/papers/robust-predicates.abstract)
  (with BibTeX citation), [**PostScript (310k, 10
  pages)**](/afs/cs/project/quake/public/papers/robust-predicates.ps).

### Software

- Here's [C code for the 2D and 3D orientation and incircle
  tests](/afs/cs/project/quake/public/code/predicates.c), and for
  arbitrary precision floating-point addition and multiplication. Last
  revised May 18, 1996. This code is in the public domain. I'm planning
  to add subtraction routines when I have a day free, but haven't gotten
  around to it yet.

  **Warning:** This code will not work correctly on a processor that
  uses extended precision internal floating-point registers, such as the
  Intel 80486 and Pentium, unless the processor is configured to round
  internally to double precision. See the [Predicates on PCs
  page](robust.pc.html) for details.

- Triangle is a 2D Delaunay triangulator and quality mesh generator that
  uses the 2D orientation and incircle tests for robustness. Triangle is
  copyrighted; it is **not** in the public domain. However, it is freely
  available from the [Triangle page](triangle.html).

### Inspiration

- Douglas M. Priest, *Algorithms for Arbitrary Precision Floating Point
  Arithmetic*, Tenth Symposium on Computer Arithmetic, pp. 132-143, IEEE
  Computer Society Press, 1991.
  [**Abstract**](/afs/cs/project/quake/public/papers/related/Priest.abstract)
  (with BibTeX citation), [**Copyright
  notice**](/afs/cs/project/quake/public/papers/related/Priest.copy)
  (please read), [**PostScript
  (240k)**](/afs/cs/project/quake/public/papers/related/Priest.ps).
- Steven Fortune and Christopher J. Van Wyk, *Efficient Exact Arithmetic
  for Computational Geometry*, Proceedings of the Ninth Annual Symposium
  on Computational Geometry, pp. 163-172, Association for Computing
  Machinery, May 1993.
- Steven Fortune, *Numerical Stability of Algorithms for 2D Delaunay
  Triangulations*, International Journal of Computational Geometry &
  Applications **5**(1-2):193-213, March-June 1995.

------------------------------------------------------------------------

Also check out the corresponding papers and software offered by [Avnaim,
Boissonnat, Devillers, Preparata, and
Yvinec](http://www-sop.inria.fr/prisme/logiciel/determinant.html). Their
technique may be faster than mine (I haven't timed theirs), but is meant
for points whose coordinates are integers.

------------------------------------------------------------------------

[Jonathan Shewchuk](http://www.cs.berkeley.edu/~jrs)\
<img src="sig.gif" width="151" height="21" />
