<div id="main" role="main">

<div class="section padded">

<div class="wrapper">

<span id="gaDataLength" class="ga-data-layer"
aria-hidden="true">9</span>

<div class="article-header">

# Executing UX Animations: Duration and Motion Characteristics

<div class="article-authors">

<span id="gaDataAuthors" class="ga-data-layer" aria-hidden="true">Page
Laubheimer</span>

<div class="author-tile multiple body-small">

<div class="author-photos">

<img
src="https://media.nngroup.com/media/people/photos/2022-portrait-page-3.jpg.256x256_q75_autocrop_crop-smart_upscale.jpg"
class="author-photo fluid" width="64" height="64" />

</div>

<div class="author-meta">

<span class="authors-list"> Page Laubheimer </span>

February 9, 2020 <span id="gaDataPubDate" class="ga-data-layer"
aria-hidden="true">2020-02-09</span>

</div>

</div>

</div>

<div class="article-share">

<a href="#" class="article-share-title ga-share"><span
class="article-share-icon"></span></a>

Share

<div class="share-links tooltip">

<div class="tip-arrow">

</div>

- <a
  href="mailto:?subject=NN/g%20Article:%20Executing%20UX%20Animations:%20Duration%20and%20Motion%20Characteristics&amp;body=https://www.nngroup.com/articles/animation-duration/"
  class="ga-share-email" target="_blank" data-share-type="Email"><img
  src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIHZpZXdib3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBjbGFzcz0iaWNvbiI+CiAgICAgICAgICAgICAgICAgICAgICA8cmVjdCB4PSIyLjM3NSIgeT0iNSIgd2lkdGg9IjE5LjI1IiBoZWlnaHQ9IjE0IiByeD0iMC42NTYyNSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS4zMTI1IiAvPgogICAgICAgICAgICAgICAgICAgICAgPHBhdGggZD0iTTIxLjYyNSA2Ljc1TDEyLjQxNTYgMTQuMjg1QzEyLjE3MzggMTQuNDgyOCAxMS44MjYyIDE0LjQ4MjggMTEuNTg0NCAxNC4yODVMMi4zNzUgNi43NSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMS4zMTI1IiAvPgogICAgICAgICAgICAgICAgICAgIDwvc3ZnPg=="
  class="icon" />Email article</a>
- <a
  href="http://www.linkedin.com/shareArticle?mini=true&amp;url=http://www.nngroup.com/articles/animation-duration/&amp;title=Executing%20UX%20Animations:%20Duration%20and%20Motion%20Characteristics&amp;source=Nielsen%20Norman%20Group"
  class="ga-share-linkedin" target="_blank"
  data-share-type="LinkedIn"><img
  src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBhcmlhLWhpZGRlbj0idHJ1ZSIgd2lkdGg9IjI0IiBjbGFzcz0iaWNvbiIgdmlld2JveD0iMSAwIDIzIDIzIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgICAgICAgICAgICAgICAgICAgPHVzZSBocmVmPSIjaWNvbi1zb2NpYWwtbGlua2VkaW4iIC8+CiAgICAgICAgICAgICAgICAgICAgPC9zdmc+"
  class="icon" /> Share on LinkedIn</a>
- <a
  href="https://twitter.com/intent/tweet?url=http://www.nngroup.com/articles/animation-duration/&amp;text=Executing%20UX%20Animations:%20Duration%20and%20Motion%20Characteristics&amp;via=nngroup"
  class="ga-share-twitter" target="_blank" data-share-type="Twitter"><img
  src="data:image/svg+xml;base64,PHN2ZyBmaWxsPSJub25lIiBhcmlhLWhpZGRlbj0idHJ1ZSIgd2lkdGg9IjI0IiBjbGFzcz0iaWNvbiIgdmlld2JveD0iMCAwIDMyIDMyIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogICAgICAgICAgICAgICAgICAgICAgPHVzZSBocmVmPSIjaWNvbi1zb2NpYWwteCIgLz4KICAgICAgICAgICAgICAgICAgICA8L3N2Zz4="
  class="icon" /> Share on Twitter</a>

</div>

</div>

</div>

<div class="article-container">

<div class="article-content">

<div class="article-summary article-heading-small-light">

<span class="article-summary-label"> Summary:  </span>Define a trigger,
transformations, duration, and easing of the animation, and be mindful
of accessibility issues and annoying the user.

</div>

<div class="article-body">

[Animations in user experience can help by providing feedback and
preventing
disorientation](https://www.nngroup.com/articles/animation-purpose-ux/)
or can be distracting, annoying, and dizzying. There are two dimensions
for making animations a positive aspect of the user experience: their
purpose and their execution.

In a previous article, we reviewed the first dimension — how animations
can be used to make feedback noticeable and build the right mental
models for a system.  In this article, we explore the second dimension:
how to execute motion in a way that is natural, smooth, and visible,
without causing frustration, discomfort, or significant delays for
users.

It’s important to note that excessive use of motion and animation is an
[accessibility](https://www.nngroup.com/online-seminars/making-accessibility-happen/)
issue: animations with hard cuts between colors or
[flashing](https://accessibility.18f.gov/flashing/) can trigger seizures
in epileptic users. 
[Parallax](https://www.nngroup.com/articles/parallax-usability/),
[carousel-forwarding](https://www.nngroup.com/articles/auto-forwarding/)
animations, and [scroll
jacking](https://www.nngroup.com/articles/scroll-animations/) can make
users with [vestibular
disorders](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)
dizzy or nauseated and trigger migraines.  Restraint is important, and
you should respect those users who have set their browser or device to
“reduce motion” by removing animations.

The purpose of the animation will typically dictate the type of
animation or transition. Also, keep in mind how frequently users will
encounter the animation: the more frequent the animation, the more
subtle and shorter you’ll want it to be.

<div class="table-of-contents">

<div class="content">

<div class="header">

<div class="toc-header">

## In This Article:

<span class="expand-icon"></span>

</div>

<a href="#" class="current-element"></a>

</div>

- <a href="#toc-elements-and-trigger-1"
  class="ga-article-toc-item">Elements and Trigger</a>
- <a href="#toc-transition-properties-2"
  class="ga-article-toc-item">Transition Properties</a>
- <a href="#toc-animation-duration-3"
  class="ga-article-toc-item">Animation Duration</a>
- <a href="#toc-easing-makes-motion-feel-more-natural-4"
  class="ga-article-toc-item">Easing Makes Motion Feel More Natural</a>
- <a href="#toc-putting-it-all-together-5"
  class="ga-article-toc-item">Putting It All Together</a>
- <a href="#toc-conclusion-6" class="ga-article-toc-item">Conclusion</a>
- <a href="#toc-sources-7" class="ga-article-toc-item">Sources</a>

</div>

</div>

## Elements and Trigger

The *trigger* is the event that begins the animation. Oftentimes, the
trigger will be a user action: a click or tap on a button, for example,
might trigger a short loading animation.

<figure>
Your browser does not support the video tag.
<figcaption><p><em>YouTube: clicking on the </em>Closed
Caption<em> button shows an animation as feedback.</em></p></figcaption>
</figure>

Some more complex interactions can have subtle triggers — for instance,
hovering over a video scrubber bar might fade in a preview image of that
point in a video.  

<figure>
Your browser does not support the video tag.
<figcaption><em>YouTube: Hovering over the timeline scrubber quickly
fades in a small preview of the video at that point. In this case, the
animation trigger is a hover, not a click or gesture. This animation
needs to be slightly delayed to avoid overwhelming users with many
flashing previews as they move their mouse on the
screen.</em></figcaption>
</figure>

<figure>
Your browser does not support the video tag.
<figcaption><em>Best Made: Hovering over the </em>Add to Cart<em> button
triggers a quick, subtle animation that indicates that the button is
acquired. This type of animation must have a very fast response
time</em></figcaption>
</figure>

A gesture such as swiping might show a small animation in the direction
of the swipe as a confirmation that the swipe gesture was recognized.

<figure>
Your browser does not support the video tag.
<figcaption><em>Google Chrome: Swiping on the Mac’s trackpad causes an
animated icon to appear; the icon serves to confirm the system
recognition of the user’s action.</em></figcaption>
</figure>

Sometimes, the trigger is different than the element that will move —
for example, clicking a button might cause a modal popup to slide into
view.  Or, the trigger can be the act of scrolling down a page,
resulting in a traditional, preset animation or even in a parallax
motion that moves the page as the user continues to scroll. (Be
[cautious](https://www.nngroup.com/articles/scroll-animations/?lm=parallax-usability&pt=article)
with parallax or scroll-jacking animations, as these are frequently
frustrating, dizzying, and annoying.)

<figure>
Your browser does not support the video tag.
<figcaption><p><em>The Pixel 4 site shows multiple animations that are
triggered by scrolling.  Some animations (such as the one at 2.5 seconds
into this video) are triggered as soon as the user scrolls to the
appropriate point on the page.  Other forms of motions (such as the
black overlay box sliding on top at 11 seconds) are a parallax effect,
where the movement speed is controlled directly by the user’s scroll
speed, and will pause if the user stops scrolling part way
through.</em></p></figcaption>
</figure>

Some animations will involve only one moving item; others may consist of
several elements moving together or with slight offset timing. In some
cases, different parts of a single object will have different
animations. 

<figure>
Your browser does not support the video tag.
<figcaption><p><em>Warby Parker: An animation morphs the <a
href="http://www.nngroup.com/articles/hamburger-menus/">hamburger
icon</a> into an X. The trigger is tapping the button. The moving
elements have some subtlety: the hamburger menu’s top and bottom lines
will rotate into the X shape, while the third, middle bar will fade out
at the same time.</em></p></figcaption>
</figure>

## Transition Properties

While animations can get very complex, there are a few standard
properties that we might animate in a UX context: opacity, position,
scale, color, shape, blur, and rotation.  While these won’t cover every
possible animation, in combination, they are enough to easily
communicate clear feedback to the user.

<figure>
Your browser does not support the video tag.
<figcaption><p><em>Google’s Material Design <a
href="http://www.nngroup.com/articles/toggle-switch-guidelines/">toggle
switch</a> uses all the following animations to form a short (100ms) bit
of feedback for a <a
href="http://www.nngroup.com/articles/microinteractions/">microinteraction</a>:
button moves from one side to the other, the button color changes from
gray to purple, and near the end of the animation, a purple halo fades
in: it starts as a small, translucent purple circle around the button,
quickly enlarges, blurs, and finally fades out.</em></p></figcaption>
</figure>

When an object moves from one place to another around the screen, we
need to decide its start and end positions, as well as its movement path
—  an arc path often looks more natural than a diagonal path, which
ignores the regularity of the layout. More than a century’s experience
with animated cartoons has concluded that an object’s movements look
right in an animation if they *don’t* follow the laws of physics. It’s
beyond this article to discuss this topic in depth, but watch any movie
of Wile E. Coyote chasing the Road Runner and you’ll get the basics.

<figure>
Your browser does not support the video tag.
<figcaption><p><em>When <a
href="http://www.nngroup.com/articles/cart-feedback/">adding an item to
the cart</a> in Seamless, a small animated checkmark moves from
the </em>Add to Bag <em>to the cart in the bottom right. In this case,
the movement path is an arc rather than a perfectly straight diagonal
line. However, this animation is long and very likely to be annoying
with repetition, as it is an exaggerated motion across the entire
screen.</em></p></figcaption>
</figure>

An object might change color or fade in over time to either suggest a
change in state or be replaced by something new.  Changing the opacity
is another common transition, but on a lot of platforms it will be
computationally expensive (resulting in suboptimal performance and
smoothness), especially when many elements change all at once.  

Another common transition involves an object growing or shrinking.
 Sometimes, we might transition a shape to another shape — for example,
a circular button might expand to become a rounded rectangle card or a
modal. In that case, we might use a transparent mask that expands in
size and fades out in one motion.

<figure>
Your browser does not support the video tag.
<figcaption><p><em>iOS App Store: tapping on a card opens it to a
full-screen element with additional details — an example of a growing
animation.</em></p></figcaption>
</figure>

## Animation Duration

The speed of an animation is hugely important for the usability  — too
fast, and it’s hard to see or dizzying; too slow, and it becomes
intrusive and feels like a delay to the user. In general, the duration
of most animations should be in the range of 100–500 ms, depending on
complexity and on how far the element is traveling. As a rule of thumb,
look for the shortest time that an animation can take without being
jarring. It is far more common for animations to be too long than too
short.

Simple feedback animations, such as showing a checkbox or toggle switch,
should be roughly 100 ms (0.10 seconds) in total duration.  This
duration [feels **immediate** to
user](https://www.nngroup.com/articles/response-times-3-important-limits/)s
and creates the illusion of physically manipulating the object. 100 ms
is at the lower end of perceivable motion, where it *almost* feels like
an instantaneous jump from one place to another, but is enough to make
the feedback noticeable.

When animation involves substantial screen changes, such as when a modal
window moves into view, a duration of 200–300 ms can be appropriate. The
further an element has to move, the more important it is that it does so
smoothly and non-jarringly (especially for people that are sensitive to
motion, such as users with epilepsy or vestibular disorders).

At 500ms, animations start to feel like a real drag for users — they
become cumbersome and annoying. In most cases, a range of 100–400 ms is
appropriate, with 400ms being a very slow animation, to be used only for
big movements across large screens.  Experiment with these values, as
small changes like moving from 250 to 300 ms can feel very different.
Note that **animating objects appearing or entering the screen usually
need a subtly longer duration than objects disappearing or exiting the
screen**: a popup window may take 300ms to appear, but only 200 or 250ms
to disappear. (Remember, however, that [popup
windows](https://www.nngroup.com/articles/popups/) are problematic in
many cases, and we discourage overusing them.)

## Easing Makes Motion Feel More Natural

Completely linear motion looks weird and unnatural to users.  An object
that moves across the screen at the exact same speed the entire time
feels less natural than one that subtly speeds up or down over time. 
This impression has a lot to do with how objects move in the physical
world, where we don’t often see things moving at a perfectly steady
speed — they tend to accelerate and decelerate when they start and,
respectively, stop moving. In order to make animations feel natural, we
want to borrow from the real world (a principle known as
[skeuomorphism](https://www.nngroup.com/videos/skeuomorphic-design-tog/))
and use slightly varied timing.

**Easing** is how we can specify how an animation feels. The most common
varieties of easing are ease-in (where an object starts moving slowly,
then speeds up), ease-out (where it slows down at the end), or the
combination of both, ease-in-out (where the animation is fastest in the
middle, but ramps up and down at the beginning and end). 

Most frequently, you’ll want to use an ease-out animation, that starts
quickly but slows down. This type of easing, which makes the animation
feel responsive, but allows the eye time to focus on the element as it
comes to rest.  Ease-in and ease-in-out are sometimes used for elements
leaving the screen, but that sort of easing curve can feel unresponsive
if the initial motion takes a little while to get going.

<figure>
Your browser does not support the video tag.
<figcaption><p><em>Linear motion is usually perceived as unnatural or
awkward as compared to eased motion. The eased example uses ease-out
when the box <strong>enters</strong> the frame, and ease-in when the
box <strong>leaves</strong> the frame. While the terminology may seem
confusing and contradictory (ease-out is used when
something <strong>enters</strong> the frame, and ease-in is used when
something <strong>leaves</strong> the visible area), ease-out on
entrance means that the object slows down before it comes to rest,
allowing the eye to predict where it will stop, while ease-in on exit
means that the object speeds up as it moves out of frame, feeling like
it’s accelerating away.</em></p></figcaption>
</figure>

Note that easing is one of the most challenging aspects to
[communicate](https://www.nngroup.com/courses/ux-deliverables/) to an
engineering team, as every platform has different ways of specifying an
easing curve (e.g. [cubic-Bezier](https://cubic-bezier.com/) format is
used in CSS, iOS and Android use named easing curves, Adobe After
Effects uses incoming and outgoing percentage values). Speak with your
development team so that you can specify these values in a way that they
can be most easily translated into code.

## Putting It All Together

If the engineering team doesn’t get meaningful, clear specs from the
design team, there’s very little chance that it will build exactly what
the designer had in mind. It’s not good enough to hand over a compiled
video file from some video software and expect the developer to go frame
by frame, trying to figure out all the subtleties of the easing curves.

Especially for complex animations with multiple movements happening all
at once, a timeline is the most effective way to share animation
characteristics with the engineering team (along with a noninteractive
exported video of the animation, known as *motion comp*). Show all the
different elements that will move, with the type of properties that will
change, and note the easing curves for each particular one.

<figure class="caption">
<img
src="https://media.nngroup.com/media/editor/2020/01/06/ux-animations-timeline.png"
loading="lazy" width="3271" height="2542"
alt="A timeline of ux animation properties, shown as several parallel line graphs with details on each element shown in ms durations." />
<figcaption><em>Unlike an exported video where developers have to go
frame by frame and guess what is happening, an animation timeline with
all the elements, triggers, transition types, durations (in
milliseconds, not frames), and easing curves makes for an unambiguous
specification.  It is highly recommended that you talk to your
development team before getting to this level of polish, as technical
realities may make some choices difficult or impossible. Also ensure
that you use the format that is easiest for them (e.g., easing in
cubic-Bezier format vs. named curves like EaseInOut).</em></figcaption>
</figure>

## Conclusion

We often say that **details matter** for UX quality. In animation, this
saying is even more accurate than for other design elements. In fact,
tiny details matter, because animation is an area of user-interface
design where a tenth of a second will make a big difference to the user
experience. Get it all right, and users may appreciate your animation as
it enhances the learnability of the UI and adds a luxurious and
put-together feel to the design. Get it half a second wrong (or even a
tenth of a second too long), and the animation will feel jarring and
annoying.

That’s why it’s worth paying detailed attention to the design of any
animation to get it right and to get the specification communicated with
sufficient clarity that it’s also implemented correctly.

## Sources

Head, V. (2016) [*Designing Interface
Animation*](https://www.amazon.com/Designing-Interface-Animation-Meaningful-Experience/dp/1933820322/?tag=useitcomusablein).
Rosenfeld Media. 

Saffer, D.
(2014). [*Microinteractions*](https://www.amazon.com/dp/1491945923?tag=useitcomusablein)*.* O’Reilly
Media.

Pratt, J., Radulescu, P., Guo, R.M., & Abrams, R.A. (2010). [It's Alive!
Animate motion captures visual
attention](http://abrams.wustl.edu/artsci/reprints/PrattRadulescuGuoAbrams2010.pdf).
*Psychological Science*, 21, 1724–1730

</div>

</div>

<div class="article-sidebar">

<div class="sidebar-wrapper">

<div class="sidebar-item related-courses">

## Related Courses

- <a href="/courses/ux-deliverables/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-course"
  data-course-title="UX Deliverables"></a>

  #### UX Deliverables

  Effectively communicate ideas and findings to managers, collaborators,
  and other stakeholders

  <div class="ux-specialties">

  <div class="ux-specialty-item">

  ![](data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdib3g9IjAgMCAyMSAyMSIgYXJpYS1oaWRkZW49InRydWUiPgogICAgICAgICAgICAgICAgICAgIDx1c2UgaHJlZj0iI2ljb24taW50ZXJhY3Rpb24iIC8+CiAgICAgICAgICAgICAgICA8L3N2Zz4=)
  Interaction

  </div>

  </div>

</div>

<span id="gaDataAllTopics" class="ga-data-layer"
aria-hidden="true">animation,Design
Patterns,Accessibility,deliverables,timing</span>

<div class="sidebar-item related-topics">

## Related Topics

- <span id="gaDataTopic" class="ga-data-layer" aria-hidden="true">Design
  Patterns</span> <a href="/topic/design-patterns/"
  class="ga-article-related-topic">Design Patterns</a>
- <a href="/topic/accessibility/"
  class="ga-article-related-topic">Accessibility</a>

</div>

</div>

</div>

</div>

</div>

</div>

<div class="section learn-more">

<div class="wrapper">

<div class="related-content-container padded">

## Learn More:

<div class="article-videos">

<div class="cookieyes-consent-optin" cookieyes-category="advertisement">

<div class="youtube-embed video-youtube">

</div>

</div>

<div class="cookieyes-consent-optout"
cookieyes-category="advertisement">

<a href="https://www.youtube.com/watch?v=nV0ahPAxSbI"
class="video-placeholder" target="_blank"
title="UX Animations on YouTube (new window)"></a>

<div class="play">

</div>

<img
src="https://media.nngroup.com/media/videos/thumbnails/UX_Animations_Thumbnail.jpg.1300x728_q75_autocrop_crop-smart_upscale.jpg"
srcset="https://media.nngroup.com/media/videos/thumbnails/UX_Animations_Thumbnail.jpg.650x364_q75_autocrop_crop-smart_upscale.jpg, https://media.nngroup.com/media/videos/thumbnails/UX_Animations_Thumbnail.jpg.1300x728_q75_autocrop_crop-smart_upscale.jpg x2"
loading="lazy" alt="UX Animations" />

Enable cookies  to watch NN/g videos

</div>

<div class="article-video-details">

UX Animations

<span class="article-video-authors body-small"> Page Laubheimer</span> ·
<span class="article-video-duration body-small">4 min</span>

</div>

<div class="related-content related-videos">

- <div class="tile video">

  <div class="media">

  <a href="/videos/status-trackers/?lm=animation-duration&amp;pt=article"
  class="ga-article-related-video"
  data-video-title="Status Trackers: 6 Guidelines for Discoverability and Clarity"
  tabindex="-1" aria-hidden="true"></a>
  <div class="thumbnail-image">

  <img
  src="https://media.nngroup.com/media/videos/thumbnails/Megan_B_Status_Trackers.png.650x364_q75_autocrop_crop-smart_upscale.png"
  loading="lazy"
  srcset="https://media.nngroup.com/media/videos/thumbnails/Megan_B_Status_Trackers.png.650x364_q75_autocrop_crop-smart_upscale.png, https://media.nngroup.com/media/videos/thumbnails/Megan_B_Status_Trackers.png.1300x728_q75_autocrop_crop-smart_upscale.png 2x" />
  <div class="overlay">

  <span class="color icon fab fa-youtube"></span>

  </div>

  </div>

  <div class="content">

  Status Trackers: 6 Guidelines for Discoverability and Clarity

  <span class="related-content-authors body-small"> Megan Brown </span>
  · <span class="related-content-duration body-small">5 min</span>

  </div>

  </div>

  </div>

- <div class="tile video">

  <div class="media">

  <a
  href="/videos/why-disabled-buttons-hurt-ux-and-how-to-fix-them/?lm=animation-duration&amp;pt=article"
  class="ga-article-related-video"
  data-video-title="Why Disabled Buttons Hurt UX (and How to Fix Them)"
  tabindex="-1" aria-hidden="true"></a>
  <div class="thumbnail-image">

  <img
  src="https://media.nngroup.com/media/videos/thumbnails/Why_Disabled_Buttons_Hurt_UX_and_How_to_Fix_Them_Thumbnail.jpg.650x364_q75_autocrop_crop-smart_upscale.jpg"
  loading="lazy"
  srcset="https://media.nngroup.com/media/videos/thumbnails/Why_Disabled_Buttons_Hurt_UX_and_How_to_Fix_Them_Thumbnail.jpg.650x364_q75_autocrop_crop-smart_upscale.jpg, https://media.nngroup.com/media/videos/thumbnails/Why_Disabled_Buttons_Hurt_UX_and_How_to_Fix_Them_Thumbnail.jpg.1300x728_q75_autocrop_crop-smart_upscale.jpg 2x" />
  <div class="overlay">

  <span class="color icon fab fa-youtube"></span>

  </div>

  </div>

  <div class="content">

  Why Disabled Buttons Hurt UX (and How to Fix Them)

  <span class="related-content-authors body-small"> Huei-Hsin Wang
  </span> · <span class="related-content-duration body-small">5
  min</span>

  </div>

  </div>

  </div>

- <div class="tile video">

  <div class="media">

  <a
  href="/videos/experience-maps-vs-journey-maps/?lm=animation-duration&amp;pt=article"
  class="ga-article-related-video"
  data-video-title="Experience Maps vs. Journey Maps" tabindex="-1"
  aria-hidden="true"></a>
  <div class="thumbnail-image">

  <img
  src="https://media.nngroup.com/media/videos/thumbnails/Experience_Maps_vs._Journey_Maps_Thumbnail.jpg.650x364_q75_autocrop_crop-smart_upscale.jpg"
  loading="lazy"
  srcset="https://media.nngroup.com/media/videos/thumbnails/Experience_Maps_vs._Journey_Maps_Thumbnail.jpg.650x364_q75_autocrop_crop-smart_upscale.jpg, https://media.nngroup.com/media/videos/thumbnails/Experience_Maps_vs._Journey_Maps_Thumbnail.jpg.1300x728_q75_autocrop_crop-smart_upscale.jpg 2x" />
  <div class="overlay">

  <span class="color icon fab fa-youtube"></span>

  </div>

  </div>

  <div class="content">

  Experience Maps vs. Journey Maps

  <span class="related-content-authors body-small"> Megan Brown </span>
  · <span class="related-content-duration body-small">5 min</span>

  </div>

  </div>

  </div>

</div>

</div>

<div class="related-content related-articles">

## Related Articles:

- <a
  href="/articles/animation-purpose-ux/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="The Role of Animation and Motion in UX"></a>

  The Role of Animation and Motion in UX

  <span class="related-content-authors body-small"> Page Laubheimer
  </span> · <span class="related-content-duration body-small">9
  min</span>

- <a
  href="/articles/ai-powered-tools-limitations/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="AI-Powered Tools for UX Research in 2023: Issues and Limitations"></a>

  AI-Powered Tools for UX Research in 2023: Issues and Limitations

  <span class="related-content-authors body-small"> Feifei Liu and Kate
  Moran </span> · <span class="related-content-duration body-small">10
  min</span>

- <a
  href="/articles/risks-imitating-designs/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="The Risks of Imitating Designs (Even from Successful Companies)"></a>

  The Risks of Imitating Designs (Even from Successful Companies)

  <span class="related-content-authors body-small"> Kathryn Whitenton
  </span> · <span class="related-content-duration body-small">5
  min</span>

- <a
  href="/articles/parallax-usability/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="What Parallax Lacks"></a>

  What Parallax Lacks

  <span class="related-content-authors body-small"> Katie Sherwin
  </span> · <span class="related-content-duration body-small">7
  min</span>

- <a
  href="/articles/change-blindness-definition/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="Change Blindness in UX: Definition"></a>

  Change Blindness in UX: Definition

  <span class="related-content-authors body-small"> Raluca Budiu </span>
  · <span class="related-content-duration body-small">8 min</span>

- <a
  href="/articles/animation-usability/?lm=animation-duration&amp;pt=article"
  class="tile ga-article-related-article"
  data-article-title="Animation for Attention and Comprehension"></a>

  Animation for Attention and Comprehension

  <span class="related-content-authors body-small"> Aurora Harley
  </span> · <span class="related-content-duration body-small">8
  min</span>

</div>

</div>

</div>

</div>

</div>
