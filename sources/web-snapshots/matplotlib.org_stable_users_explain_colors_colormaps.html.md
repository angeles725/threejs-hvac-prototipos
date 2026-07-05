<div id="main-content" class="bd-main" role="main">

<div class="bd-content">

<div class="bd-article-container">

<div class="bd-header-article d-print-none">

<div class="header-article-items header-article__inner">

<div class="header-article-items__start">

<div class="header-article-item">

- <a href="../../../index.html" class="nav-link"
  aria-label="Home"><em></em></a>
- <a href="../../index.html" class="nav-link">Using Matplotlib</a>
- <a href="index.html" class="nav-link">Colors</a>
- <span class="ellipsis">Choosing Colormaps in Matplotlib</span>

</div>

</div>

</div>

</div>

<div id="searchbox">

</div>

<div class="sphx-glr-download-link-note admonition note">

Note

<a href="#sphx-glr-download-users-explain-colors-colormaps-py"
class="reference internal"><span class="std std-ref">Go to the
end</span></a> to download the full example code.

</div>

<div id="choosing-colormaps-in-matplotlib"
class="section sphx-glr-example-title">

<span id="colormaps"></span><span id="sphx-glr-users-explain-colors-colormaps-py"></span>

# Choosing Colormaps in Matplotlib<a href="#choosing-colormaps-in-matplotlib" class="headerlink"
title="Link to this heading">#</a>

Matplotlib has a number of built-in colormaps accessible via <a
href="../../../api/matplotlib_configuration_api.html#matplotlib.colormaps"
class="reference internal" title="matplotlib.colormaps"><span
class="pre"><code
class="sourceCode python xref py py-obj docutils literal notranslate">matplotlib.colormaps</code></span></a>.
There are also external libraries that have many extra colormaps, which
can be viewed in the
<a href="https://matplotlib.org/mpl-third-party/#colormaps-and-styles"
class="reference external">Third-party colormaps</a> section of the
Matplotlib documentation. Here we briefly discuss how to choose between
the many options. For help on creating your own colormaps, see
<a href="colormap-manipulation.html#colormap-manipulation"
class="reference internal"><span class="std std-ref">Creating Colormaps
in Matplotlib</span></a>.

To get a list of all registered colormaps, you can do:

<div class="highlight-default notranslate">

<div class="highlight">

    from matplotlib import colormaps
    list(colormaps)

</div>

</div>

<div id="overview" class="section">

## Overview<a href="#overview" class="headerlink"
title="Link to this heading">#</a>

The idea behind choosing a good colormap is to find a good
representation in 3D colorspace for your data set. The best colormap for
any given data set depends on many things including:

- Whether representing form or metric data (<a href="#ware" id="id1"
  class="reference internal"><span>[Ware]</span></a>)

- Your knowledge of the data set (*e.g.*, is there a critical value from
  which the other values deviate?)

- If there is an intuitive color scheme for the parameter you are
  plotting

- If there is a standard in the field the audience may be expecting

For many applications, a perceptually uniform colormap is the best
choice; i.e. a colormap in which equal steps in data are perceived as
equal steps in the color space. Researchers have found that the human
brain perceives changes in the lightness parameter as changes in the
data much better than, for example, changes in hue. Therefore, colormaps
which have monotonically increasing lightness through the colormap will
be better interpreted by the viewer. Wonderful examples of perceptually
uniform colormaps can be found in the
<a href="https://matplotlib.org/mpl-third-party/#colormaps-and-styles"
class="reference external">Third-party colormaps</a> section as well.

Color can be represented in 3D space in various ways. One way to
represent color is using CIELAB. In CIELAB, color space is represented
by lightness,
<span class="math notranslate nohighlight">\\L^\*\\</span>; red-green,
<span class="math notranslate nohighlight">\\a^\*\\</span>; and
yellow-blue, <span class="math notranslate nohighlight">\\b^\*\\</span>.
The lightness parameter
<span class="math notranslate nohighlight">\\L^\*\\</span> can then be
used to learn more about how the matplotlib colormaps will be perceived
by viewers.

An excellent starting resource for learning about human perception of
colormaps is from <a href="#ibm" id="id2"
class="reference internal"><span>[IBM]</span></a>.

</div>

<div id="classes-of-colormaps" class="section">

<span id="color-colormaps-reference"></span>

## Classes of colormaps<a href="#classes-of-colormaps" class="headerlink"
title="Link to this heading">#</a>

Colormaps are often split into several categories based on their
function (see, *e.g.*, <a href="#moreland" id="id3"
class="reference internal"><span>[Moreland]</span></a>):

1.  Sequential: change in lightness and often saturation of color
    incrementally, often using a single hue; should be used for
    representing information that has ordering.

2.  Diverging: change in lightness and possibly saturation of two
    different colors that meet in the middle at an unsaturated color;
    should be used when the information being plotted has a critical
    middle value, such as topography or when the data deviates around
    zero.

3.  Cyclic: change in lightness of two different colors that meet in the
    middle and beginning/end at an unsaturated color; should be used for
    values that wrap around at the endpoints, such as phase angle, wind
    direction, or time of day.

4.  Qualitative: often are miscellaneous colors; should be used to
    represent information which does not have ordering or relationships.

<div class="highlight-Python notranslate">

<div class="highlight">

    from colorspacious import cspace_converter

    import matplotlib.pyplot as plt
    import numpy as np

    import matplotlib as mpl

</div>

</div>

First, we'll show the range of each colormap. Note that some seem to
change more "quickly" than others.

<div class="highlight-Python notranslate">

<div class="highlight">

    cmaps = {}

    gradient = np.linspace(0, 1, 256)
    gradient = np.vstack((gradient, gradient))


    def plot_color_gradients(category, cmap_list):
        # Create figure and adjust figure height to number of colormaps
        nrows = len(cmap_list)
        figh = 0.35 + 0.15 + (nrows + (nrows - 1) * 0.1) * 0.22
        fig, axs = plt.subplots(nrows=nrows + 1, figsize=(6.4, figh))
        fig.subplots_adjust(top=1 - 0.35 / figh, bottom=0.15 / figh,
                            left=0.2, right=0.99)
        axs[0].set_title(f'{category} colormaps', fontsize=14)

        for ax, name in zip(axs, cmap_list):
            ax.imshow(gradient, aspect='auto', cmap=mpl.colormaps[name])
            ax.text(-0.01, 0.5, name, va='center', ha='right', fontsize=10,
                    transform=ax.transAxes)

        # Turn off *all* ticks & spines, not just the ones with colormaps.
        for ax in axs:
            ax.set_axis_off()

        # Save colormap list for later.
        cmaps[category] = cmap_list

</div>

</div>

<div id="sequential" class="section">

### Sequential<a href="#sequential" class="headerlink"
title="Link to this heading">#</a>

For the Sequential plots, the lightness value increases monotonically
through the colormaps. This is good. Some of the
<span class="math notranslate nohighlight">\\L^\*\\</span> values in the
colormaps span from 0 to 100 (binary and the other grayscale), and
others start around
<span class="math notranslate nohighlight">\\L^\*=20\\</span>. Those
that have a smaller range of
<span class="math notranslate nohighlight">\\L^\*\\</span> will
accordingly have a smaller perceptual range. Note also that the
<span class="math notranslate nohighlight">\\L^\*\\</span> function
varies amongst the colormaps: some are approximately linear in
<span class="math notranslate nohighlight">\\L^\*\\</span> and others
are more curved.

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Perceptually Uniform Sequential',
                         ['viridis', 'plasma', 'inferno', 'magma', 'cividis'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_001.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_001.png, ../../../_images/sphx_glr_colormaps_001_2_00x.png 2.00x"
alt="Perceptually Uniform Sequential colormaps" />

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Sequential',
                         ['Greys', 'Purples', 'Blues', 'Greens', 'Oranges', 'Reds',
                          'YlOrBr', 'YlOrRd', 'OrRd', 'PuRd', 'RdPu', 'BuPu',
                          'GnBu', 'PuBu', 'YlGnBu', 'PuBuGn', 'BuGn', 'YlGn'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_002.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_002.png, ../../../_images/sphx_glr_colormaps_002_2_00x.png 2.00x"
alt="Sequential colormaps" />

</div>

<div id="sequential2" class="section">

### Sequential2<a href="#sequential2" class="headerlink"
title="Link to this heading">#</a>

Many of the <span class="math notranslate nohighlight">\\L^\*\\</span>
values from the Sequential2 plots are monotonically increasing, but some
(autumn, cool, spring, and winter) plateau or even go both up and down
in <span class="math notranslate nohighlight">\\L^\*\\</span> space.
Others (afmhot, copper, gist_heat, and hot) have kinks in the
<span class="math notranslate nohighlight">\\L^\*\\</span> functions.
Data that is being represented in a region of the colormap that is at a
plateau or kink will lead to a perception of banding of the data in
those values in the colormap (see <a href="#mycarta-banding" id="id4"
class="reference internal"><span>[mycarta-banding]</span></a> for an
excellent example of this).

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Sequential (2)',
                         ['gray', 'bone', 'pink', 'spring', 'summer', 'autumn',
                          'winter', 'cool', 'Wistia', 'hot', 'afmhot', 'gist_heat',
                          'copper'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_003.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_003.png, ../../../_images/sphx_glr_colormaps_003_2_00x.png 2.00x"
alt="Sequential (2) colormaps" />

<div class="admonition-discouraged admonition">

Discouraged

For backward compatibility we additionally support the following
colormap names, which are identical to other builtin colormaps. Their
use is discouraged. Use the suggested replacement instead.

<div class="pst-scrollable-table-container">

| Colormap  | Use identical replacement instead |
|-----------|-----------------------------------|
| gist_gray | gray                              |
| gist_yarg | gray_r                            |
| binary    | gray_r                            |

</div>

</div>

</div>

<div id="diverging" class="section">

### Diverging<a href="#diverging" class="headerlink"
title="Link to this heading">#</a>

For the Diverging maps, we want to have monotonically increasing
<span class="math notranslate nohighlight">\\L^\*\\</span> values up to
a maximum, which should be close to
<span class="math notranslate nohighlight">\\L^\*=100\\</span>, followed
by monotonically decreasing
<span class="math notranslate nohighlight">\\L^\*\\</span> values. We
are looking for approximately equal minimum
<span class="math notranslate nohighlight">\\L^\*\\</span> values at
opposite ends of the colormap. By these measures, BrBG and RdBu are good
options. coolwarm is a good option, but it doesn't span a wide range of
<span class="math notranslate nohighlight">\\L^\*\\</span> values (see
grayscale section below).

Berlin, Managua, and Vanimo are dark-mode diverging colormaps, with
minimum lightness at the center, and maximum at the extremes. These are
taken from F. Crameri's <a href="#scientific-colour-maps" id="id5"
class="reference internal"><span>[scientific-colour-maps]</span></a>
version 8.0.1.

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Diverging',
                         ['PiYG', 'PRGn', 'BrBG', 'PuOr', 'RdGy', 'RdBu', 'RdYlBu',
                          'RdYlGn', 'Spectral', 'coolwarm', 'bwr', 'seismic',
                          'berlin', 'managua', 'vanimo'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_004.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_004.png, ../../../_images/sphx_glr_colormaps_004_2_00x.png 2.00x"
alt="Diverging colormaps" />

</div>

<div id="cyclic" class="section">

### Cyclic<a href="#cyclic" class="headerlink" title="Link to this heading">#</a>

For Cyclic maps, we want to start and end on the same color, and meet a
symmetric center point in the middle.
<span class="math notranslate nohighlight">\\L^\*\\</span> should change
monotonically from start to middle, and inversely from middle to end. It
should be symmetric on the increasing and decreasing side, and only
differ in hue. At the ends and middle,
<span class="math notranslate nohighlight">\\L^\*\\</span> will reverse
direction, which should be smoothed in
<span class="math notranslate nohighlight">\\L^\*\\</span> space to
reduce artifacts. See <a href="#kovesi-colormaps" id="id6"
class="reference internal"><span>[kovesi-colormaps]</span></a> for more
information on the design of cyclic maps.

The often-used HSV colormap is included in this set of colormaps,
although it is not symmetric to a center point. Additionally, the
<span class="math notranslate nohighlight">\\L^\*\\</span> values vary
widely throughout the colormap, making it a poor choice for representing
data for viewers to see perceptually. See an extension on this idea at
<a href="#mycarta-jet" id="id7"
class="reference internal"><span>[mycarta-jet]</span></a>.

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Cyclic', ['twilight', 'twilight_shifted', 'hsv'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_005.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_005.png, ../../../_images/sphx_glr_colormaps_005_2_00x.png 2.00x"
alt="Cyclic colormaps" />

</div>

<div id="qualitative" class="section">

### Qualitative<a href="#qualitative" class="headerlink"
title="Link to this heading">#</a>

Qualitative colormaps are not aimed at being perceptual maps, but
looking at the lightness parameter can verify that for us. The
<span class="math notranslate nohighlight">\\L^\*\\</span> values move
all over the place throughout the colormap, and are clearly not
monotonically increasing. These would not be good options for use as
perceptual colormaps.

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Qualitative',
                         ['Pastel1', 'Pastel2', 'Paired', 'Accent', 'okabe_ito',
                          'Dark2', 'Set1', 'Set2', 'Set3', 'tab10', 'tab20',
                          'tab20b', 'tab20c'])

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_006.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_006.png, ../../../_images/sphx_glr_colormaps_006_2_00x.png 2.00x"
alt="Qualitative colormaps" />

</div>

<div id="miscellaneous" class="section">

### Miscellaneous<a href="#miscellaneous" class="headerlink"
title="Link to this heading">#</a>

Some of the miscellaneous colormaps have particular uses for which they
have been created. For example, gist_earth, ocean, and terrain all seem
to be created for plotting topography (green/brown) and water depths
(blue) together. We would expect to see a divergence in these colormaps,
then, but multiple kinks may not be ideal, such as in gist_earth and
terrain. CMRmap was created to convert well to grayscale, though it does
appear to have some small kinks in
<span class="math notranslate nohighlight">\\L^\*\\</span>. cubehelix
was created to vary smoothly in both lightness and hue, but appears to
have a small hump in the green hue area. turbo was created to display
depth and disparity data.

The often-used jet colormap is included in this set of colormaps. We can
see that the <span class="math notranslate nohighlight">\\L^\*\\</span>
values vary widely throughout the colormap, making it a poor choice for
representing data for viewers to see perceptually. See an extension on
this idea at <a href="#mycarta-jet" id="id8"
class="reference internal"><span>[mycarta-jet]</span></a> and
<a href="#turbo" id="id9"
class="reference internal"><span>[turbo]</span></a>.

<div class="highlight-Python notranslate">

<div class="highlight">

    plot_color_gradients('Miscellaneous',
                         ['flag', 'prism', 'ocean', 'gist_earth', 'terrain',
                          'gist_stern', 'gnuplot', 'gnuplot2', 'CMRmap',
                          'cubehelix', 'brg', 'gist_rainbow', 'rainbow', 'jet',
                          'turbo', 'nipy_spectral', 'gist_ncar'])

    plt.show()

</div>

</div>

<img src="../../../_images/sphx_glr_colormaps_007.png"
class="sphx-glr-single-img"
srcset="../../../_images/sphx_glr_colormaps_007.png, ../../../_images/sphx_glr_colormaps_007_2_00x.png 2.00x"
alt="Miscellaneous colormaps" />

</div>

</div>

<div id="lightness-of-matplotlib-colormaps" class="section">

## Lightness of Matplotlib colormaps<a href="#lightness-of-matplotlib-colormaps" class="headerlink"
title="Link to this heading">#</a>

Here we examine the lightness values of the matplotlib colormaps. Note
that some documentation on the colormaps is available
(<a href="#list-colormaps" id="id10"
class="reference internal"><span>[list-colormaps]</span></a>).

<div class="highlight-Python notranslate">

<div class="highlight">

    mpl.rcParams.update({'font.size': 12})

    # Number of colormap per subplot for particular cmap categories
    _DSUBS = {'Perceptually Uniform Sequential': 5, 'Sequential': 6,
              'Sequential (2)': 6, 'Diverging': 6, 'Cyclic': 3,
              'Qualitative': 4, 'Miscellaneous': 6}

    # Spacing between the colormaps of a subplot
    _DC = {'Perceptually Uniform Sequential': 1.4, 'Sequential': 0.7,
           'Sequential (2)': 1.4, 'Diverging': 1.4, 'Cyclic': 1.4,
           'Qualitative': 1.4, 'Miscellaneous': 1.4}

    # Indices to step through colormap
    x = np.linspace(0.0, 1.0, 100)

    # Do plot
    for cmap_category, cmap_list in cmaps.items():

        # Do subplots so that colormaps have enough space.
        # Default is 6 colormaps per subplot.
        dsub = _DSUBS.get(cmap_category, 6)
        nsubplots = int(np.ceil(len(cmap_list) / dsub))

        # squeeze=False to handle similarly the case of a single subplot
        fig, axs = plt.subplots(nrows=nsubplots, squeeze=False,
                                figsize=(7, 2.6*nsubplots))

        for i, ax in enumerate(axs.flat):

            locs = []  # locations for text labels

            for j, cmap in enumerate(cmap_list[i*dsub:(i+1)*dsub]):

                # Get RGB values for colormap and convert the colormap in
                # CAM02-UCS colorspace.  lab[0, :, 0] is the lightness.
                rgb = mpl.colormaps[cmap](x)[np.newaxis, :, :3]
                lab = cspace_converter("sRGB1", "CAM02-UCS")(rgb)

                # Plot colormap L values.  Do separately for each category
                # so each plot can be pretty.  To make scatter markers change
                # color along plot:
                # https://stackoverflow.com/q/8202605/

                if cmap_category == 'Sequential':
                    # These colormaps all start at high lightness, but we want them
                    # reversed to look nice in the plot, so reverse the order.
                    y_ = lab[0, ::-1, 0]
                    c_ = x[::-1]
                else:
                    y_ = lab[0, :, 0]
                    c_ = x

                dc = _DC.get(cmap_category, 1.4)  # cmaps horizontal spacing
                ax.scatter(x + j*dc, y_, c=c_, cmap=cmap, s=300, linewidths=0.0)

                # Store locations for colormap labels
                if cmap_category in ('Perceptually Uniform Sequential',
                                     'Sequential'):
                    locs.append(x[-1] + j*dc)
                elif cmap_category in ('Diverging', 'Qualitative', 'Cyclic',
                                       'Miscellaneous', 'Sequential (2)'):
                    locs.append(x[int(x.size/2.)] + j*dc)

            # Set up the axis limits:
            #   * the 1st subplot is used as a reference for the x-axis limits
            #   * lightness values goes from 0 to 100 (y-axis limits)
            ax.set_xlim(axs[0, 0].get_xlim())
            ax.set_ylim(0.0, 100.0)

            # Set up labels for colormaps
            ax.xaxis.set_ticks_position('top')
            ticker = mpl.ticker.FixedLocator(locs)
            ax.xaxis.set_major_locator(ticker)
            formatter = mpl.ticker.FixedFormatter(cmap_list[i*dsub:(i+1)*dsub])
            ax.xaxis.set_major_formatter(formatter)
            ax.xaxis.set_tick_params(rotation=50)
            ax.set_ylabel('Lightness $L^*$', fontsize=12)

        ax.set_xlabel(cmap_category + ' colormaps', fontsize=14)

        fig.tight_layout(h_pad=0.0, pad=1.5)
        plt.show()

</div>

</div>

- <img src="../../../_images/sphx_glr_colormaps_008.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_008.png, ../../../_images/sphx_glr_colormaps_008_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_009.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_009.png, ../../../_images/sphx_glr_colormaps_009_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_010.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_010.png, ../../../_images/sphx_glr_colormaps_010_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_011.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_011.png, ../../../_images/sphx_glr_colormaps_011_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_012.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_012.png, ../../../_images/sphx_glr_colormaps_012_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_013.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_013.png, ../../../_images/sphx_glr_colormaps_013_2_00x.png 2.00x"
  alt="colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_014.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_014.png, ../../../_images/sphx_glr_colormaps_014_2_00x.png 2.00x"
  alt="colormaps" />

</div>

<div id="grayscale-conversion" class="section">

## Grayscale conversion<a href="#grayscale-conversion" class="headerlink"
title="Link to this heading">#</a>

It is important to pay attention to conversion to grayscale for color
plots, since they may be printed on black and white printers. If not
carefully considered, your readers may end up with indecipherable plots
because the grayscale changes unpredictably through the colormap.

Conversion to grayscale is done in many different ways
<a href="#bw" id="id11" class="reference internal"><span>[bw]</span></a>.
Some of the better ones use a linear combination of the rgb values of a
pixel, but weighted according to how we perceive color intensity. A
nonlinear method of conversion to grayscale is to use the
<span class="math notranslate nohighlight">\\L^\*\\</span> values of the
pixels. In general, similar principles apply for this question as they
do for presenting one's information perceptually; that is, if a colormap
is chosen that is monotonically increasing in
<span class="math notranslate nohighlight">\\L^\*\\</span> values, it
will print in a reasonable manner to grayscale.

With this in mind, we see that the Sequential colormaps have reasonable
representations in grayscale. Some of the Sequential2 colormaps have
decent enough grayscale representations, though some (autumn, spring,
summer, winter) have very little grayscale change. If a colormap like
this was used in a plot and then the plot was printed to grayscale, a
lot of the information may map to the same gray values. The Diverging
colormaps mostly vary from darker gray on the outer edges to white in
the middle. Some (PuOr and seismic) have noticeably darker gray on one
side than the other and therefore are not very symmetric. coolwarm has
little range of gray scale and would print to a more uniform plot,
losing a lot of detail. Note that overlaid, labeled contours could help
differentiate between one side of the colormap vs. the other since color
cannot be used once a plot is printed to grayscale. Many of the
Qualitative and Miscellaneous colormaps, such as Accent, hsv, jet and
turbo, change from darker to lighter and back to darker grey throughout
the colormap. This would make it impossible for a viewer to interpret
the information in a plot once it is printed in grayscale.

<div class="highlight-Python notranslate">

<div class="highlight">

    mpl.rcParams.update({'font.size': 14})

    # Indices to step through colormap.
    x = np.linspace(0.0, 1.0, 100)

    gradient = np.linspace(0, 1, 256)
    gradient = np.vstack((gradient, gradient))


    def plot_color_gradients(cmap_category, cmap_list):
        fig, axs = plt.subplots(nrows=len(cmap_list), ncols=2)
        fig.subplots_adjust(top=0.95, bottom=0.01, left=0.2, right=0.99,
                            wspace=0.05)
        fig.suptitle(cmap_category + ' colormaps', fontsize=14, y=1.0, x=0.6)

        for ax, name in zip(axs, cmap_list):

            # Get RGB values for colormap.
            rgb = mpl.colormaps[name](x)[np.newaxis, :, :3]

            # Get colormap in CAM02-UCS colorspace. We want the lightness.
            lab = cspace_converter("sRGB1", "CAM02-UCS")(rgb)
            L = lab[0, :, 0]
            L = np.float32(np.vstack((L, L, L)))

            ax[0].imshow(gradient, aspect='auto', cmap=mpl.colormaps[name])
            ax[1].imshow(L, aspect='auto', cmap='binary_r', vmin=0., vmax=100.)
            pos = list(ax[0].get_position().bounds)
            x_text = pos[0] - 0.01
            y_text = pos[1] + pos[3]/2.
            fig.text(x_text, y_text, name, va='center', ha='right', fontsize=10)

        # Turn off *all* ticks & spines, not just the ones with colormaps.
        for ax in axs.flat:
            ax.set_axis_off()

        plt.show()


    for cmap_category, cmap_list in cmaps.items():

        plot_color_gradients(cmap_category, cmap_list)

</div>

</div>

- <img src="../../../_images/sphx_glr_colormaps_015.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_015.png, ../../../_images/sphx_glr_colormaps_015_2_00x.png 2.00x"
  alt="Perceptually Uniform Sequential colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_016.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_016.png, ../../../_images/sphx_glr_colormaps_016_2_00x.png 2.00x"
  alt="Sequential colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_017.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_017.png, ../../../_images/sphx_glr_colormaps_017_2_00x.png 2.00x"
  alt="Sequential (2) colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_018.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_018.png, ../../../_images/sphx_glr_colormaps_018_2_00x.png 2.00x"
  alt="Diverging colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_019.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_019.png, ../../../_images/sphx_glr_colormaps_019_2_00x.png 2.00x"
  alt="Cyclic colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_020.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_020.png, ../../../_images/sphx_glr_colormaps_020_2_00x.png 2.00x"
  alt="Qualitative colormaps" />
- <img src="../../../_images/sphx_glr_colormaps_021.png"
  class="sphx-glr-multi-img"
  srcset="../../../_images/sphx_glr_colormaps_021.png, ../../../_images/sphx_glr_colormaps_021_2_00x.png 2.00x"
  alt="Miscellaneous colormaps" />

</div>

<div id="color-vision-deficiencies" class="section">

## Color vision deficiencies<a href="#color-vision-deficiencies" class="headerlink"
title="Link to this heading">#</a>

There is a lot of information available about color blindness (*e.g.*,
<a href="#colorblindness" id="id12"
class="reference internal"><span>[colorblindness]</span></a>).
Additionally, there are tools available to convert images to how they
look for different types of color vision deficiencies.

The most common form of color vision deficiency involves differentiating
between red and green. Thus, avoiding colormaps with both red and green
will avoid many problems in general.

</div>

<div id="references" class="section">

## References<a href="#references" class="headerlink"
title="Link to this heading">#</a>

<div class="citation-list" role="list">

<div id="ware" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id1" role="doc-backlink">Ware</a><span class="fn-bracket">\]</span></span>

<a href="https://dl.acm.org/doi/10.1109/38.7760"
class="reference external">https://dl.acm.org/doi/10.1109/38.7760</a>

</div>

<div id="moreland" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id3" role="doc-backlink">Moreland</a><span class="fn-bracket">\]</span></span>

<a
href="http://www.kennethmoreland.com/color-maps/ColorMapsExpanded.pdf"
class="reference external">http://www.kennethmoreland.com/color-maps/ColorMapsExpanded.pdf</a>

</div>

<div id="list-colormaps" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id10" role="doc-backlink">list-colormaps</a><span class="fn-bracket">\]</span></span>

<a href="https://gist.github.com/endolith/2719900#id7"
class="reference external">https://gist.github.com/endolith/2719900#id7</a>

</div>

<div id="mycarta-banding" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id4" role="doc-backlink">mycarta-banding</a><span class="fn-bracket">\]</span></span>

<a
href="https://mycarta.wordpress.com/2012/10/14/the-rainbow-is-deadlong-live-the-rainbow-part-4-cie-lab-heated-body/"
class="reference external">https://mycarta.wordpress.com/2012/10/14/the-rainbow-is-deadlong-live-the-rainbow-part-4-cie-lab-heated-body/</a>

</div>

<div id="mycarta-jet" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span>mycarta-jet<span class="fn-bracket">\]</span></span>
<span class="backrefs">(<a href="#id7" role="doc-backlink">1</a>,<a href="#id8" role="doc-backlink">2</a>)</span>

<a
href="https://mycarta.wordpress.com/2012/10/06/the-rainbow-is-deadlong-live-the-rainbow-part-3/"
class="reference external">https://mycarta.wordpress.com/2012/10/06/the-rainbow-is-deadlong-live-the-rainbow-part-3/</a>

</div>

<div id="kovesi-colormaps" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id6" role="doc-backlink">kovesi-colormaps</a><span class="fn-bracket">\]</span></span>

<a href="https://arxiv.org/abs/1509.03700"
class="reference external">https://arxiv.org/abs/1509.03700</a>

</div>

<div id="bw" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id11" role="doc-backlink">bw</a><span class="fn-bracket">\]</span></span>

<a href="https://tannerhelland.com/3643/grayscale-image-algorithm-vb6/"
class="reference external">https://tannerhelland.com/3643/grayscale-image-algorithm-vb6/</a>

</div>

<div id="colorblindness" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id12" role="doc-backlink">colorblindness</a><span class="fn-bracket">\]</span></span>

<a href="http://www.color-blindness.com/"
class="reference external">http://www.color-blindness.com/</a>

</div>

<div id="ibm" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id2" role="doc-backlink">IBM</a><span class="fn-bracket">\]</span></span>

<a href="https://doi.org/10.1109/VISUAL.1995.480803"
class="reference external">https://doi.org/10.1109/VISUAL.1995.480803</a>

</div>

<div id="turbo" class="citation" role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id9" role="doc-backlink">turbo</a><span class="fn-bracket">\]</span></span>

<a
href="https://ai.googleblog.com/2019/08/turbo-improved-rainbow-colormap-for.html"
class="reference external">https://ai.googleblog.com/2019/08/turbo-improved-rainbow-colormap-for.html</a>

</div>

<div id="scientific-colour-maps" class="citation"
role="doc-biblioentry">

<span class="label"><span class="fn-bracket">\[</span><a href="#id5" role="doc-backlink">scientific-colour-maps</a><span class="fn-bracket">\]</span></span>

<a href="https://doi.org/10.5281/zenodo.1243862"
class="reference external">https://doi.org/10.5281/zenodo.1243862</a>

</div>

</div>

**Total running time of the script:** (0 minutes 12.168 seconds)

<div id="sphx-glr-download-users-explain-colors-colormaps-py"
class="sphx-glr-footer sphx-glr-footer-example docutils container">

<div class="sphx-glr-download sphx-glr-download-jupyter docutils container">

<a
href="../../../_downloads/a58dec1c9a88487f9b1de45f0eb2443c/colormaps.ipynb"
class="reference download internal" download=""><span class="pre"><code
class="xref download docutils literal notranslate">Download</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">Jupyter</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">notebook:</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">colormaps.ipynb</code></span></a>

</div>

<div class="sphx-glr-download sphx-glr-download-python docutils container">

<a
href="../../../_downloads/b9d28120854d00e968560ceab43ae8e9/colormaps.py"
class="reference download internal" download=""><span class="pre"><code
class="xref download docutils literal notranslate">Download</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">Python</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">source</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">code:</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">colormaps.py</code></span></a>

</div>

<div class="sphx-glr-download sphx-glr-download-zip docutils container">

<a
href="../../../_downloads/2f54b3d6ec1d413c1311f9167151ce8d/colormaps.zip"
class="reference download internal" download=""><span class="pre"><code
class="xref download docutils literal notranslate">Download</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">zipped:</code></span><code
class="xref download docutils literal notranslate"> </code><span
class="pre"><code
class="xref download docutils literal notranslate">colormaps.zip</code></span></a>

</div>

</div>

<a href="https://sphinx-gallery.github.io"
class="reference external">Gallery generated by Sphinx-Gallery</a>

</div>

</div>

</div>

<div id="pst-secondary-sidebar" class="bd-sidebar-secondary bd-toc">

<div class="sidebar-secondary-items sidebar-secondary__inner">

<div class="sidebar-secondary-item">

<div id="pst-page-navigation-heading-2"
class="page-toc tocsection onthispage">

On this page

</div>

- <a href="#overview" class="reference internal nav-link">Overview</a>
- <a href="#classes-of-colormaps"
  class="reference internal nav-link">Classes of colormaps</a>
  - <a href="#sequential" class="reference internal nav-link">Sequential</a>
  - <a href="#sequential2"
    class="reference internal nav-link">Sequential2</a>
  - <a href="#diverging" class="reference internal nav-link">Diverging</a>
  - <a href="#cyclic" class="reference internal nav-link">Cyclic</a>
  - <a href="#qualitative"
    class="reference internal nav-link">Qualitative</a>
  - <a href="#miscellaneous"
    class="reference internal nav-link">Miscellaneous</a>
- <a href="#lightness-of-matplotlib-colormaps"
  class="reference internal nav-link">Lightness of Matplotlib
  colormaps</a>
- <a href="#grayscale-conversion"
  class="reference internal nav-link">Grayscale conversion</a>
- <a href="#color-vision-deficiencies"
  class="reference internal nav-link">Color vision deficiencies</a>
- <a href="#references" class="reference internal nav-link">References</a>

</div>

</div>

</div>

</div>

</div>
