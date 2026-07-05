<div id="content" class="section entry-content" role="main">

<div id="blog-post" class="container">

<div class="row">

<div id="cms-main" class="col-md-9 col-lg-offset-1">

<div class="blog-content">

<div class="post-meta">

## [](https://priceonomics.com/how-william-cleveland-turned-data-visualization/)How William Cleveland Turned Data Visualization Into a Science

<div class="date">

#### <a href="https://recurrency.com" rel="author external"
title="Visit Priceonomics’s website">Priceonomics</a>

</div>

</div>

<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA8AAAAKAAQAAAAB7gizuAAAAAnRSTlMAAHaTzTgAAABiSURBVHja7cGBAAAAAMOg+VNf4QBVAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAfAYujwABWQsnrQAAAABJRU5ErkJggg=="
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/covercleveland.jpg?strip=all&amp;w=640"
data-eio-rwidth="960" data-eio-rheight="640" width="960" height="640"
alt="a person holding a tablet" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/covercleveland.jpg?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="a person holding a tablet" />

> <span class="s1">*This post is adapted from the blog
> of <a href="https://www.udemy.com/"
> style="box-sizing: border-box; -webkit-font-smoothing: subpixel-antialiased; color: #467db6; text-decoration: none; background-color: transparent;">Udemy</a>,
> a Priceonomics customer.***\**
> </span>

<span class="s1">Data visualization is increasingly at the center of how
we digest information. The last several decades have seen an
[<span class="s2">explosion</span>](http://www.dundas.com/blog-post/a-brief-history-of-data-visualization/)
in the use of charts, and a recognition of the
[<span class="s2">incredible
ability</span>](http://info.shiftelearning.com/blog/bid/350326/Studies-Confirm-the-Power-of-Visuals-in-eLearning)
of the human mind to process data visually. The rise of visualization
has coincided, probably not coincidentally, with a formalization and
deeper consideration of just what works best when attempting to convey
information in graphical form.</span>

<span class="s1">Perhaps no person is more responsible for giving data
visualization a scientific foundation than the statistician
[<span class="s2">William
Cleveland</span>](http://www.stat.purdue.edu/~wsc/). His studies on
[<span class="s2">graphical
perception</span>](http://www.jstor.org/stable/2288400?seq=1#page_scan_tab_contents),
the cognitive processes people use to understand a chart, are among the
earliest attempts to study visualization and develop a theory of how it
should be best done. </span>

<span class="s1">The cleaner,
[<span class="s2">minimalist</span>](https://darkhorseanalytics.com/blog/data-looks-better-naked/)
charts in vogue today owe a great debt to Cleveland’s work. His research
is also the ultimate reason most data visualizers have a fondness for
bar charts and scatter plots, and tend to avoid pie charts and stacked
bars.</span>

<span class="s1">\*\*\*</span>

[<span class="s1"><img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUMAAAFmAQAAAADfKcUvAAAAAnRSTlMAAHaTzTgAAAAlSURBVGje7cExAQAAAMKg9U9tCU+gAAAAAAAAAAAAAAAAAADgYzq8AAF9FcJuAAAAAElFTkSuQmCC"
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image03-125.png?strip=all&amp;w=640"
data-eio-rwidth="323" data-eio-rheight="358" width="323" height="358"
alt="a man with a beard" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image03-125.png?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="a man with a beard" /></span>](http://www.stat.purdue.edu/~wsc/)

> <span class="s1">*Data visualization pioneer William Cleveland*</span>

<span class="s1">As a statistician working in the early 1980s, William
Cleveland was deeply concerned about the “[<span class="s2">largely
unscientific</span>](https://www.cs.ubc.ca/~tmm/courses/cpsc533c-04-spr/readings/cleveland.pdf)”
manner in which statisticians and others were visualizing data. Although
charts had been used to represent data since the [<span class="s2">18th
Century</span>](http://www.math.yorku.ca/SCS/Gallery/milestone/milestone.pdf),
there was very little theory or research about how it *should* be done.
In Cleveland’s view, most of the contemporary ideas about “proper”
visualization were mostly [<span class="s2">unstructured
wisdom</span>](https://www.cs.ubc.ca/~tmm/courses/cpsc533c-04-spr/readings/cleveland.pdf).He
[believed](https://www.cs.ubc.ca/~tmm/courses/cpsc533c-04-spr/readings/cleveland.pdf)
the conventions and best-practices of data visualization — a tool widely
used by scientists and engineers — should be backed up by data.</span>

<span class="s1">He was not alone. Noted statisticians
[<span class="s2">David
Cox</span>](http://www.jstor.org/stable/2346220?seq=1#page_scan_tab_contents)
and [<span class="s2">William
Kruskal</span>](http://mapcontext.com/autocarto/proceedings/auto-carto-2/pdf/visions-of-maps-and-graphs.pdf),
had also called for theoretical and empirical foundations on how to best
use graphs. Cleveland would answer this call.</span>

<span class="s1">In 1984, Cleveland and his colleague Robert McGill
published the
[<span class="s2">seminal</span>](http://fellinlovewithdata.com/guides/7-classic-foundational-vis-papers)
paper *Graphical Perception: Theory, Experimentation, and Application to
the Development of Graphical Methods*. This paper, which has now been
[<span class="s2">cited</span>](https://scholar.google.com/scholar?hl=en&q=graphical+perception&btnG=&as_sdt=1%2C5&as_sdtp=)
thousands of times by academics, remains a touchstone for data
visualization researchers and practitioners.</span>

<span class="s1">In *Graphical Perception*, Cleveland and McGill
detailed the common cognitive tasks that happen when somebody reads a
chart, then they evaluated how well study subjects performed these
tasks, depending on features of the graph. </span>

<span class="s1">For example, when people look at a bar chart, they
claim that the main task is judging “position on a common scale” —
assessing which bar goes higher on the scale, how much higher, etc. When
people look at a map in which states are saturated by a certain
variable, the main task is assessing “color saturation” — assessing
which shape is more saturated, how much more saturated. The following
figure from their paper displays what they believed to be the common
“Elementary perceptual tasks” that people are asked to complete when
looking at charts. “Color saturation,” at the bottom, is not illustrated
to avoid the “nuisance” of color reproduction.</span>

<span class="s1">[<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAbwAAAHWAQAAAAAkpAFOAAAAAnRSTlMAAHaTzTgAAAAwSURBVHja7cEBDQAAAMKg909tDwcUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPBpaKYAAfEGFrgAAAAASUVORK5CYII="
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image00-123.png?strip=all&amp;w=640"
data-eio-rwidth="444" data-eio-rheight="470" width="444" height="470"
alt="shape" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image00-123.png?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="shape" />](https://www.cs.ubc.ca/~tmm/courses/cpsc533c-04-spr/readings/cleveland.pdf)</span>

> <span class="s1">*Common “perceptual tasks” for comprehending a data
> visualization;* [<span class="s2">*Cleveland and
> Mcgill*</span>](https://www.cs.ubc.ca/~tmm/courses/cpsc533c-04-spr/readings/cleveland.pdf)</span>

<span class="s1">After laying out this “task” paradigm for thinking
about charts, the remainder of *Graphical Perception* is focused on
understanding how skilled people are at each of these tasks. The authors
ran a number of randomized control trials to assess how accurately
people perceive the information on a bar chart (position on common
scale), pie chart (angle), stacked bar chart (area), colored maps and
shaded maps (color saturation and shading), and others.</span>

<span class="s1">Perhaps most famously, they had students look at a
variety of two-valued bar charts and pie charts, and asked them to
assess the percentage the lesser value was of the greater value.
Subjects consistently read the bar charts more accurately than the pie
charts. This research would mark the the [<span class="s2">beginning of
the
end</span>](https://blogs.oracle.com/experience/entry/countdown_of_top_10_reasons_to_never_ever_use_a_pie_chart)
for pie charts — an already rarely used form — in serious quantitative
research.</span>

<span class="s1">The authors provide a general hierarchy for the types
of data we most accurately understand:</span>

1.  <span class="s1">*Position along a common scale* (bar chart,
    [<span class="s2">dot
    plots</span>](https://en.wikipedia.org/wiki/Dot_plot_(statistics)))*\*
    </span>
2.  <span class="s1">*Positions along nonaligned, identical scales*
    ([<span class="s2">small
    multiples</span>](http://flowingdata.com/2014/10/15/linked-small-multiples/))*\*
    </span>
3.  <span class="s1">*Length, direction, angle* (pie chart)*\*
    </span>
4.  <span class="s1">*Area*
    ([<span class="s2">treemap</span>](https://developers.google.com/chart/interactive/docs/gallery/treemap?hl=en))*\*
    </span>
5.  <span class="s1">*Volume, curvature* (3-D bar
    charts, [<span class="s2">area
    charts</span>](https://en.wikipedia.org/wiki/Area_chart))*\*
    </span>
6.  <span class="s1">*Shading, color saturation* ([<span class="s2">heat
    maps</span>](https://en.wikipedia.org/wiki/Heat_map),
    [<span class="s2">choropleth
    maps</span>](https://en.wikipedia.org/wiki/Choropleth_map))*\*
    </span>

<span class="s1">Although research that followed Cleveland and McGill’s
would [<span class="s2">refine this
ordering</span>](http://vis.stanford.edu/papers/crowdsourcing-graphical-perception),
overall, this hierarchy has proven to be quite accurate.</span>

<span class="s1">[<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZMAAAIoAQAAAACEgjvnAAAAAnRSTlMAAHaTzTgAAAAzSURBVHja7cExAQAAAMKg9U9tCF+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNcAcCAAAaLTcGQAAAAASUVORK5CYII="
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image02-123.png?strip=all&amp;w=640"
data-eio-rwidth="403" data-eio-rheight="552" width="403" height="552"
alt="text, whiteboard" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image02-123.png?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="text, whiteboard" />](https://www.google.com/search?q=statistics+visualization+william+cleveland+award&es_sm=91&biw=969&bih=932&source=lnms&tbm=isch&sa=X&ved=0CAcQ_AUoAmoVChMIwcWlt9iIyAIVizmICh3y0gKx#imgrc=sMREU7xBi1nCjM%3A)</span>

> <span class="s1">*“The Elements of Graphing Data” is William
> Cleveland’s seminal work on scientifically sound data
> visualization.*</span>

<span class="s1">Published a little over a year after *Graphical
Perception*, Cleveland’s book-length treatise <span class="s2">*[The
Elements of Graphing
Data](http://www.amazon.com/Elements-Graphing-Data-William-Cleveland/dp/0963488414) *</span>fully
detailed his theory and beliefs about proper visualization. Modeled
after Strunk and White’s classic writing style guide,
[<span class="s2">*The Elements of
Style*</span>](http://www.amazon.com/The-Elements-Style-Fourth-Edition/dp/020530902X),
Cleveland’s book aimed to put good visualization practice on the same
level of importance for researchers as correct grammar.</span>

<span class="s1">Unlike the work of the more famous and aesthetically
focused visualization champion [<span class="s2">Edward
Tufte</span>](http://www.edwardtufte.com/tufte/), Cleveland’s work is
specifically directed at scientific researchers, who are presenting data
to others in the scientific community. The recommendations in the book
are based on the assumption that the reader of a graph is already
interested in the material, and that frills are unnecessary to draw them
in. This is in contrast to [<span class="s2">infovis
graphics</span>](http://www.stat.columbia.edu/~gelman/research/published/vis14.pdf),
which are often oriented to attracting the reader’s attention.</span>

<span class="s1">Many of the suggestions in *The Elements of Statistical
Graphing* are basic but
[<span class="s2">fundamental</span>](http://ryanwomack.com/IASSIST/DataViz/Data/Cleveland.pdf).
Cleveland stresses stripping charts of unnecessary and distracting
elements of a graph that don’t allow the data to stand out (Tufte refers
to these superfluous elements as
[<span class="s2">chartjunk</span>](http://ryanwomack.com/IASSIST/DataViz/Data/Cleveland.pdf)).
Cleveland also emphasizes that legends should be kept out of the data
region, tick marks should be kept to a minimum, and data labels
shouldn’t clutter the graph. These tips are like the writing advice of
Strunk and White, which
[<span class="s2">focus</span>](https://faculty.washington.edu/heagerty/Courses/b572/public/StrunkWhite.pdf)
on “omitting needless” words and using the active voice.</span>

<span class="s1">Cleveland also furthered his discussion of how people
perceive charts, and which visual representations are best for which
data. He recommends that data points be put as close together as
possible, because people more accurately compare elements that are
closer together. </span>

<span class="s1">Cleveland continued his assault on the
[<span class="s2">pie
chart</span>](https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf),
“Pie charts do not provide efficient detection of geometric objects that
convey information about differences of values.” Those are strong words
for the usually tempered Cleveland. The following shows two
visualizations of the country location of Udemy Users. According to
Cleveland’s research, most people will more quickly and accurately
comprehend the information if they look at the bar chart.</span>

<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA0QAAAHBAQAAAABhgEbBAAAAAnRSTlMAAHaTzTgAAABFSURBVHja7cExAQAAAMKg9U9tDB+gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAF4GueoAAfT8gUoAAAAASUVORK5CYII="
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image01a-6.png?strip=all&amp;w=640"
data-eio-rwidth="836" data-eio-rheight="449" width="836" height="449"
alt="chart, pie chart" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image01a-6.png?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="chart, pie chart" />

<span class="s1">The stacked bar chart also receives Cleveland disdain,
he demonstrates that people understand aligned bar charts substantially
better than stacked ones. His research suggests that people’s error in
estimating the relative sizes of a category within a stacked bar chart
are significantly worse than when they are aligned. </span>

<span class="s1">Below are two different charts that show the education
level of users who take Udemy’s data visualization courses versus the
users who take sports coaching classes. The chart on the left shows
Cleveland’s preferred method.</span>

<img
src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA6cAAAGhAQAAAAC1of/pAAAAAnRSTlMAAHaTzTgAAABHSURBVHja7cEBDQAAAMKg909tDjegAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADg1QDANgABlWaFZAAAAABJRU5ErkJggg=="
class="lazyload" decoding="async"
data-src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image04b.png?strip=all&amp;w=640"
data-eio-rwidth="935" data-eio-rheight="417" width="935" height="417"
alt="chart, bar chart, waterfall chart" /><img
src="https://etzq49yfnmd.exactdn.com/wp-content/uploads/2022/03/image04b.png?strip=all&amp;w=640"
decoding="async" data-eio="l" alt="chart, bar chart, waterfall chart" />

<span class="s1">\*\*\*</span>

<span class="s1">The impact of Cleveland’s work is most expressed
through the many data visualization leaders he has affected. Noted
statisticians and data visualization experts [<span class="s2">Stephen
Few</span>](https://www.perceptualedge.com/articles/b-eye/data_visualization_bookshelf.pdf),
[<span class="s2">Nathan
Yau</span>](http://flowingdata.com/2010/03/20/graphical-perception-learn-the-fundamentals-first/)
and [<span class="s2">Hadley
Wickham</span>](https://github.com/hadley/ggplot2/wiki/Recommended-Reading)
have all discussed being influenced by the ideas of Cleveland. Each of
them has written books that espouse ideas Cleveland developed.</span>

<span class="s1">Many data visualization experts see Cleveland as
creating the basic rules for chart makers to follow. But, as the saying
goes, rules were made to be broken, or at least bent. Yau, of Flowing
Data,
[<span class="s2">notes</span>](http://flowingdata.com/2010/03/20/graphical-perception-learn-the-fundamentals-first/)
that Cleveland never claimed that his ideas were “precise prescriptions
for displaying data,” but rather a “framework.” Yau believes there is a
time and place for [<span class="s2">pie charts
</span>](http://flowingdata.com/2012/05/19/good-use-of-pie-charts/)and
[<span class="s2">color
saturation</span>](http://flowingdata.com/2015/01/26/choropleth-maps-and-shapefiles-in-r/).</span>

<span class="s1">As data visualization has grown more
[<span class="s2">creative and
interactive</span>](http://www.cssdesignawards.com/articles/interactive-data-visualization-examples-tools/58/),
it remains grounded by the scientific foundation provided by William
Cleveland.</span>

------------------------------------------------------------------------

<div class="date">

#### Published January 6, 2016 by <a href="https://recurrency.com" rel="author external"
title="Visit Priceonomics’s website">Priceonomics</a>

</div>

------------------------------------------------------------------------

</div>

<div class="section">

<div id="footer">

<div class="container">

<div class="col-xs-12">

<div class="menu-footer-menu-container">

- <div id="item-id">

  </div>

- <span id="menu-item-8563">[Economics](https://priceonomics.com/category/economics/)</span>

- <span id="menu-item-8564">[Rankings](https://priceonomics.com/category/rankings/)</span>

- <span id="menu-item-8565">[Data
  Visualization](https://priceonomics.com/category/data-visualization/)</span>

- <span id="menu-item-8562">[Data
  Studio](https://priceonomics.com/the-priceonomics-data-studio-2/)</span>

- <span id="menu-item-59">[About
  Us](https://priceonomics.com/about-us/)</span>

- <span id="menu-item-60"><a href="https://priceonomics.com/privacy-and-terms/"
  rel="privacy-policy">Terms</a></span>

- <span id="menu-item-64">[Contact
  Us](https://priceonomics.com/contact/)</span>

</div>

</div>

</div>

</div>

</div>

<div id="request-demo" style="display: none;">

# Request a Demo

<div class="input demo-request-name">

</div>

<div class="input demo-request-email">

</div>

<div class="input demo-request-company">

</div>

<div class="input demo-request-message">

</div>

<div class="button demo-request-submit">

Submit

</div>

</div>

</div>

</div>

</div>

</div>
