<div id="DocsAnalyticsData" area="none" pagetype="manual">

</div>

<div class="header-wrapper">

<div id="header" class="header">

<div class="content">

<div class="spacer">

<div class="menu">

<div id="nav-open" for="nav-input">

</div>

<div class="logo">

<a href="https://docs.unity3d.com" aria-label="go to the homepage"></a>

</div>

<div class="search-form">

</div>

- <a href="index.html" class="selected">Manual</a>
- [Scripting API](../ScriptReference/index.html)

</div>

</div>

<div class="more">

<div class="filler">

</div>

- [unity.com](https://unity.com/)

</div>

</div>

</div>

<div class="toolbar">

<div class="content">

<div id="VersionNumber" class="toggle version-number"
data-target=".otherversionscontent">

Version: **Unity 6.5** (6000.5)

<div id="OtherVersionsContent" class="otherversionscontent"
style="display: none;">

<div id="otherVersionsLegend">

- <div id="supportedColour" class="legendBox">

  </div>

  Supported

- <div id="notFoundColour" class="legendBox">

  </div>

  Legacy

</div>

</div>

<div id="VersionSwitcherArrow" class="arrow versionSwitcherArrow">

</div>

</div>

<div class="lang-switcher">

<div class="current toggle" data-target=".lang-list">

<div class="lbl">

Language : <span class="b">English</span>

</div>

<div class="arrow">

</div>

<div class="lang-list" style="display:none;">

- [English](/Manual/webgl-performance.html)
- [中文](/cn/current/Manual/webgl-performance.html)
- [日本語](/ja/current/Manual/webgl-performance.html)
- [한국어](/kr/current/Manual/webgl-performance.html)

</div>

</div>

</div>

</div>

</div>

<div class="mobileLogo">

<a href="https://docs.unity3d.com" aria-label="go to the homepage"></a>

</div>

</div>

<div id="master-wrapper" class="master-wrapper clear">

<div id="sidebar" class="sidebar">

<div class="sidebar-wrap">

<div class="content">

<div class="sidebar-menu">

<div id="customScrollbar" class="toc">

## Unity Manual

<div class="search-form sidebar-search-form">

</div>

<div id="VersionNumber"
class="toggle version-number sidebar-version-switcher"
data-target=".otherversionscontent">

<div class="ui-field-contain">

Version: Unity 6.5Select a different version

</div>

</div>

<div class="lang-switcher">

<div class="current toggle" data-target=".lang-list">

<div class="lbl">

Language : <span class="b">English</span>

</div>

<div class="arrow">

</div>

<div class="lang-list" style="display:none;">

- [English](/Manual/webgl-performance.html)
- [中文](/cn/current/Manual/webgl-performance.html)
- [日本語](/ja/current/Manual/webgl-performance.html)
- [한국어](/kr/current/Manual/webgl-performance.html)

</div>

</div>

</div>

</div>

</div>

</div>

</div>

</div>

<div id="content-wrap" class="content-wrap">

<div class="content-block">

<div class="content">

<div class="section">

<div class="breadcrumbs clear">

- [Platform development](PlatformSpecific.html)
- [Web](webgl.html)
- [Web development](webgl-develop.html)
- Web performance considerations

</div>

<div class="mb20">

<div class="nextprev clear">

<div class="icon tt left mr1" distance="-40|-30|top">

<span class="prev"><a href="wasm-2023-enable.html"
aria-label="go to the previous page"></a></span>

<div class="tip">

Enable WebAssembly 2023

</div>

</div>

<div class="icon tt right" distance="-40|-30|top">

<span class="next"><a href="webgl-debugging.html" aria-label="go to the next page"></a></span>

<div class="tip">

Debug and troubleshoot Web builds

</div>

</div>

</div>

</div>

<div id="_leavefeedback">

</div>

# Web performance considerations

<div class="clear">

</div>

In general, Web performance is close to native apps on the GPU, because
the <span class="tooltip"
tabindex="0">**WebGL**<span class="tooltiptext">A JavaScript API that
renders 2D and 3D graphics in a web browser. The Unity Web build option
allows Unity to publish content as JavaScript programs which use HTML5
technologies and the WebGL rendering API to run Unity content in a web
browser. <a href="webgl.html" class="tooltipMoreInfoLink"
aria-label="Navigate to more info about webgl.html">More info</a>\
<span class="tooltipGlossaryLink">See in <a href="Glossary.html#WebGL"
aria-label="Go to glossary anchor for WebGL">Glossary</a></span></span></span>
graphics API uses your GPU for hardware-accelerated rendering. The only
exception is the slight overhead for translating WebGL API calls and
<span class="tooltip"
tabindex="0">**shaders**<span class="tooltiptext">A program that runs on
the GPU. <a href="Shaders.html" class="tooltipMoreInfoLink"
aria-label="Navigate to more info about Shaders.html">More info</a>\
<span class="tooltipGlossaryLink">See in <a href="Glossary.html#shader"
aria-label="Go to glossary anchor for shader">Glossary</a></span></span></span>
to your OS graphics API (typically DirectX on Windows, OpenGL on Mac,
and Linux).

On the CPU, Emscripten translates your code into WebAssembly, the
performance of which depends on the web browser you’re using.

Be aware of the following considerations:

- Unity supports multithreading for native C/C++ code and for C#
  Burst-compiled code. However, standard C# jobs are limited to the main
  thread. For more information, refer to [Multithreading in Unity
  Web](web-multithreading.html).
- When using WebGL API for rendering, the CPU side dispatch of WebGL
  operations is slower than in native OpenGL. As a result, for best
  performance, the recommended best practice is to avoid large numbers
  of draw calls per frame, so make sure that both instancing and
  batching techniques are used in your shaders.
- SIMD on the web is supported as part of WebAssembly 2023
  <span class="tooltip" tabindex="0">**feature
  set**<span class="tooltiptext">A <span class="notooltips">feature
  set</span> is a collection of related packages that you can use to
  achieve specific results in the Unity Editor. You can manage feature
  sets directly in Unity’s Package Manager.
  <a href="FeatureSets.html" class="tooltipMoreInfoLink"
  aria-label="Navigate to more info about FeatureSets.html">More info</a>\
  <span class="tooltipGlossaryLink">See in
  <a href="Glossary.html#featureset"
  aria-label="Go to glossary anchor for featureset">Glossary</a></span></span></span>.
  Make sure to enable WebAssembly 2023 for best performance on newer
  browsers.

**Tip:** To learn how Unity distributes work to different threads on
non-Web platforms, refer to the new timeline <span class="tooltip"
tabindex="0">[Profiler](Profiler.html)<span class="tooltiptext">A window
that helps you to optimize your game. It shows how much time is spent in
the various areas of your game. For example, it can report the
percentage of time spent rendering, animating, or in your game logic.
<a href="Profiler.html" class="tooltipMoreInfoLink"
aria-label="Navigate to more info about Profiler.html">More info</a>\
<span class="tooltipGlossaryLink">See in
<a href="Glossary.html#Profiler"
aria-label="Go to glossary anchor for Profiler">Glossary</a></span></span></span>
in Unity.

## Web-specific Player settings that affect performance

If you disable **Target WebAssembly 2023** (under **Publishing
Settings** \> **WebAssembly Language Features**), improve performance by
setting **Exception** (under **Other Settings** \> **Stack Trace**) to
**None**.

If you enable **Target WebAssembly 2023**, the performance overhead from
any exception support option is minor.

## Web content in background tabs

Your content continues to run when the canvas or browser window loses
focus if one of the following options is enabled:

- **Run in background** in the [Player settings for the Web
  platform](class-PlayerSettingsWebGL.html)
- [Application.runInBackground](../ScriptReference/Application-runInBackground.html)

However, some browsers can throttle content running in background tabs.
If the tab with your content isn’t visible, your content only updates
once per second in most browsers. Note that this causes
[Time.time](../ScriptReference/Time-time.html) to progress slower than
usual with the default settings, as the default value of
[Time.maximumDeltaTime](../ScriptReference/Time-maximumDeltaTime.html)
is lower than one second.

## Throttling Web performance

You might want to run your Web content at a lower frame rate in some
situations to reduce CPU usage. For example, on other platforms, you can
use the
[Application.targetFrameRate](../ScriptReference/Application-targetFrameRate.html)
API to do so.

When you don’t want to throttle performance, set this API to the default
value of –1. This allows the browser to adjust the frame rate for the
smoothest animation in the browser’s render loop, and might produce
better results than Unity trying to do its own main loop timing to match
a target frame rate.

**Note**: For security reasons, Unity can’t query a browser for its
frame rate. As a result, Unity assumes a display rate of 60
<span class="tooltip" tabindex="0">**fps**<span class="tooltiptext">See
first person shooter, frames per second.\
<span class="tooltipGlossaryLink">See in <a href="Glossary.html#FPS"
aria-label="Go to glossary anchor for FPS">Glossary</a></span></span></span>
for all browsers and bases `Application.targetFrameRate` on that value.

## Additional resources

- [Optimize your Web build](web-optimization.html)
- [Optimize Web platform for mobile](web-optimization-mobile.html)
- [Technical limitations](webgl-technical-overview.html)
- [Multithreading in Unity Web](web-multithreading.html)

<div id="_content">

</div>

<div class="nextprev clear">

<div class="icon tt left mr1" distance="-40|-30|top">

<span class="prev"><a href="wasm-2023-enable.html"
aria-label="go to the previous page"></a></span>

<div class="tip">

Enable WebAssembly 2023

</div>

</div>

<div class="icon tt right" distance="-40|-30|top">

<span class="next"><a href="webgl-debugging.html" aria-label="go to the next page"></a></span>

<div class="tip">

Debug and troubleshoot Web builds

</div>

</div>

</div>

</div>

<div class="footer-wrapper">

<div class="footer clear">

<div class="copy">

Copyright ©2005-2026 Unity Technologies. All rights reserved. Built from
job ID 71047759. Built on: 2026-07-03.

</div>

<div class="menu">

[Tutorials](https://learn.unity.com/)[Community
Answers](https://answers.unity3d.com)[Knowledge
Base](https://support.unity3d.com/hc/en-us)[Forums](https://forum.unity3d.com)[Asset
Store](https://unity3d.com/asset-store)[Terms of
use](https://docs.unity3d.com/Manual/TermsOfUse.html)[Legal](https://unity.com/legal)[Privacy
Policy](https://unity.com/legal/privacy-policy)[Cookies](https://unity.com/legal/cookie-policy)[Do
Not Sell or Share My Personal
Information](https://unity.com/legal/do-not-sell-my-personal-information)

<div id="ot-sdk-btn-container">

<a href="javascript:void(0);" id="ot-sdk-btn"
class="ot-sdk-show-settings">Your Privacy Choices (Cookie Settings)</a>

</div>

</div>

</div>

</div>

</div>

</div>

</div>

</div>
