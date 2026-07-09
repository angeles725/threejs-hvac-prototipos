<div class="ios-keep-bar">

Regenerate

3D Models

Orbit

<span id="ios-gtao-hint">GTAO
<span style="color:var(--state-off)">off</span></span>

<span id="ios-static-ao-hint">Heightmap AO
<span style="color:var(--state-on)">on</span></span>

</div>

<div id="dayNightControlDock">

<div id="dayNightSliderDock">

Time of day

12:00

</div>

<img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZGF5LW5pZ2h0LXN1bi1pY29uIiB2aWV3Ym94PSIwIDAgMjQgMjQiIGFyaWEtaGlkZGVuPSJ0cnVlIj4KICAgICAgICAgICAgICAgIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiPjwvY2lyY2xlPgogICAgICAgICAgICAgICAgPHBhdGggZD0iTTEyIDJ2M00xMiAxOXYzTTQuOTMgNC45M2wyLjEyIDIuMTJNMTYuOTUgMTYuOTVsMi4xMiAyLjEyTTIgMTJoM00xOSAxMmgzTTQuOTMgMTkuMDdsMi4xMi0yLjEyTTE2Ljk1IDcuMDVsMi4xMi0yLjEyIiAvPgogICAgICAgICAgICA8L3N2Zz4="
class="day-night-sun-icon" /> <img
src="data:image/svg+xml;base64,PHN2ZyBjbGFzcz0iZGF5LW5pZ2h0LW1vb24taWNvbiIgdmlld2JveD0iMCAwIDI0IDI0IiBhcmlhLWhpZGRlbj0idHJ1ZSI+CiAgICAgICAgICAgICAgICA8cGF0aCBkPSJNMjAuMyAxNS4xQTguMiA4LjIgMCAwIDEgOC45IDMuN0E4LjkgOC45IDAgMSAwIDIwLjMgMTUuMXoiIC8+CiAgICAgICAgICAgIDwvc3ZnPg=="
class="day-night-moon-icon" />

</div>

<div class="ui-layer fixed top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">

<div id="wfcPanel" class="glass p-4 pointer-events-auto">

<div class="flex justify-between items-start gap-3">

<div id="wfcPanelTitleBlock">

<div class="titleHeaderRow mb-1">

# Landscape Generator v2.0

</div>

<div class="seedStatusRow text-xs text-gray-400 uppercase tracking-widest">

<div class="seedControls">

Seed:

</div>

<div id="mainGenerationProgress">

Progress: <span id="mainProgressText">0 tiles</span>

</div>

</div>

</div>

<div class="flex items-center gap-2">

X

</div>

</div>

<div id="wfcPanelBody">

<div class="generationSpeedGrid grid gap-2">

Slow

Fast

Instant

Regenerate

</div>

<div class="renderQuickToggleRow">

<span id="top-gtao-hint">GTAO
<span style="color:var(--state-off)">off</span></span>

<span id="top-static-ao-hint">Heightmap AO
<span style="color:var(--state-on)">on</span></span>

<div class="text-center">

<div id="gradient-hint" class="text-xs text-gray-300 font-medium">

Vertical gradient <span style="color:var(--state-on)">on</span>

</div>

</div>

</div>

</div>

</div>

<div id="seedManagementPanel"
class="glass p-4 pointer-events-auto flex flex-col items-center gap-1">

<div class="flex gap-1">

1

2

3

4

5

6

7

8

</div>

<div class="text-xs text-gray-500">

Left-click load, right-click save

</div>

</div>

<div id="debugToolkitRoot">

Debug toolkit

<div id="debugToolkitPanel" aria-label="Debug toolkit">

<div class="debug-toolkit-header">

<div>

<div class="debug-toolkit-title">

Debug Toolkit

</div>

</div>

x

</div>

<div class="debug-toolkit-section debug-toolkit-extra-section">

<div class="debug-toolkit-section-title">

Generation

</div>

<div class="debug-toolkit-controls">

<div class="text-center">

<div id="view-toggle-hint" class="text-xs text-gray-300 font-medium">

Pieces view

</div>

</div>

<div class="text-center">

<div class="text-xs text-gray-300 font-medium">

Top down

</div>

</div>

</div>

<div id="comboTilesControl">

Use Combo Tiles

<div class="mt-1 text-xs text-gray-500">

Pattern detection stats: <span id="patternStats">0 patterns</span>

</div>

</div>

Stop after pre-generation

<div class="mt-1 text-xs text-gray-500">

Stop after placing initial terrain features

</div>

</div>

<div class="debug-toolkit-section">

<div class="debug-toolkit-section-title">

Overrides

</div>

<div class="debug-toolkit-controls">

<div class="text-center">

<div id="debug-hint" class="text-xs text-gray-300 font-medium">

3D Models <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="godray-debug-hint" class="text-xs text-gray-300 font-medium">

Ray debug <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="cloud-cookie-debug-hint"
class="text-xs text-gray-300 font-medium">

Cloud mask <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="godray-noise-hint" class="text-xs text-gray-300 font-medium">

Pool noise <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="edge-debug-hint" class="text-xs text-gray-300 font-medium">

Edges <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="orbit-rotate-hint" class="text-xs text-gray-300 font-medium">

Orbit <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="camera-sway-hint" class="text-xs text-gray-300 font-medium">

Sway <span style="color:var(--state-off)">off</span>

</div>

</div>

</div>

</div>

<div class="debug-toolkit-section">

<div class="debug-toolkit-section-title">

Rendering

</div>

<div class="debug-toolkit-controls">

<div class="text-center">

<div id="cel-shading-hint" class="text-xs text-gray-300 font-medium">

2-tone shading <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="shadow-hint" class="text-xs text-gray-300 font-medium">

Shadows <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="shadow-softness-hint"
class="text-xs text-gray-300 font-medium">

Soft shadows <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="grid-hint" class="text-xs text-gray-300 font-medium">

Grid <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="godray-ground-hint" class="text-xs text-gray-300 font-medium">

Godray ground areas <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="terrain-skirt-material-hint"
class="text-xs text-gray-300 font-medium">

Skirt fancy <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="gi-probes-hint" class="text-xs text-gray-300 font-medium">

GI probes <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="gi-probe-helper-hint"
class="text-xs text-gray-300 font-medium">

GI helper <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="gi-contribution-hint"
class="text-xs text-gray-300 font-medium">

GI contribution <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="ao-minisection">

<div class="ao-minisection-title">

Heightmap AO

</div>

<div class="ao-minisection-grid">

<div class="text-center">

<div id="static-ao-map-hint" class="text-xs text-gray-300 font-medium">

Heightmap AO <span style="color:var(--state-on)">on</span>

</div>

</div>

<div id="staticAOStyleGroup" class="gtaoStyleGroup"
title="Heightmap AO tint style">

</div>

<div class="text-center">

<div id="static-ao-preview-hint"
class="text-xs text-gray-300 font-medium">

Heightmap AO preview <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div class="text-xs text-gray-300 font-medium">

Bake AO map

</div>

</div>

</div>

</div>

<div class="ao-minisection">

<div class="ao-minisection-title">

GTAO

</div>

<div class="ao-minisection-grid">

<div class="text-center">

<div id="gtao-hint" class="text-xs text-gray-300 font-medium">

GTAO <span style="color:var(--state-off)">off</span>

</div>

</div>

<div id="gtaoStyleGroup" class="gtaoStyleGroup"
title="GTAO composite style">

</div>

<div class="text-center">

<div id="gtao-debug-hint" class="text-xs text-gray-300 font-medium">

AO buffer <span style="color:var(--state-off)">off</span>

</div>

</div>

</div>

</div>

</div>

</div>

<div class="debug-toolkit-section">

<div class="debug-toolkit-section-title">

Visibility

</div>

<div class="debug-toolkit-controls">

<div class="text-center">

<div id="birds-visibility-hint"
class="text-xs text-gray-300 font-medium">

Birds <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="cloud-visibility-hint"
class="text-xs text-gray-300 font-medium">

Cloud <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="cloud-shadow-visibility-hint"
class="text-xs text-gray-300 font-medium">

Cloud shadow <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="water-visibility-hint"
class="text-xs text-gray-300 font-medium">

Water <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="water-glints-hint" class="text-xs text-gray-300 font-medium">

Water glints <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="godrays-visibility-hint"
class="text-xs text-gray-300 font-medium">

God rays <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="vignette-visibility-hint"
class="text-xs text-gray-300 font-medium">

Vignette <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="stars-visibility-hint"
class="text-xs text-gray-300 font-medium">

Stars <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="comet-visibility-hint"
class="text-xs text-gray-300 font-medium">

Comet <span style="color:var(--state-on)">on</span>

</div>

</div>

<div class="text-center">

<div id="tile-hover-info-hint"
class="text-xs text-gray-300 font-medium">

Tile hover <span style="color:var(--state-off)">off</span>

</div>

</div>

</div>

</div>

<div class="debug-toolkit-section">

<div class="debug-toolkit-section-title">

Logging

</div>

<div class="debug-toolkit-controls">

<div class="text-center">

<div id="extra-logs-hint" class="text-xs text-gray-300 font-medium">

Extra logs <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div class="text-xs text-gray-300 font-medium">

Log combos

</div>

</div>

<div class="text-center">

<div id="day-night-logs-hint" class="text-xs text-gray-300 font-medium">

Day night logs <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="camera-angle-toast-hint"
class="text-xs text-gray-300 font-medium">

Camera angle <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="camera-distance-debug-hint"
class="text-xs text-gray-300 font-medium">

Camera distance <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="camera-position-debug-hint"
class="text-xs text-gray-300 font-medium">

Camera position <span style="color:var(--state-off)">off</span>

</div>

</div>

<div class="text-center">

<div id="default-seed-log-hint"
class="text-xs text-gray-300 font-medium">

Default seed <span style="color:var(--state-off)">off</span>

</div>

</div>

</div>

</div>

<div class="debug-toolkit-section">

<div class="debug-toolkit-section-title">

Tweakables

</div>

<div class="tw-group tw-general">

<div class="debug-toolkit-subtitle">

General

</div>

Exposure

300%

Bird height

30%

</div>

<div class="tw-group tw-clouds">

<div class="debug-toolkit-subtitle">

Sky & Clouds

</div>

Cloud height

15%

Sky cloud opacity

65%

Sky cloud layers

5

Cloud layer spacing

4%

Cloud rim light

60%

Sky cloud bottom color

\#f1f5f9

Sky cloud top color

\#edeef2

Cloud mask intensity

45%

Cloud scale

25%

Cloud shadow tint

\#000f85

</div>

<div class="tw-group tw-sun">

<div class="debug-toolkit-subtitle">

Sun

</div>

Sun glow intensity

100%

Sun glow color

\#ffc77a

Sun streaks intensity

100%

Sun streaks color

\#ffd5a8

</div>

<div class="tw-group tw-night-rim">

<div class="debug-toolkit-subtitle">

Night Rim Light

</div>

Left / right bias

65%

Vertical bias

80%

</div>

<div class="tw-group tw-ao">

<div class="debug-toolkit-subtitle">

Heightmap AO

</div>

Heightmap AO bake height

100%

Heightmap AO fade height

1

Heightmap AO strength

70%

Heightmap AO light falloff

40%

</div>

<div class="tw-group tw-fog">

<div class="debug-toolkit-subtitle">

Height Fog

</div>

Morning strength

5%

Day strength

0%

Evening strength

10%

Night strength

25%

Fog bottom height

0

Fog top height

0

Fog noise amount

0%

Fog noise scale

0%

Fog drift speed

0%

</div>

<div class="tw-group tw-distance-fog">

<div class="debug-toolkit-subtitle">

Distance Fog

</div>

Day intensity

10%

Night intensity

100%

Day max distance

72

Night max distance

48

</div>

<div class="tw-group tw-godray">

<div class="debug-toolkit-subtitle">

Godrays

</div>

Godray beam opacity

30%

Godray ground opacity

70%

Godray lower amount

0

Godray spread

100%

Godray convergence

50%

Godray ground color

\#5dfede

</div>

</div>

<div class="debug-toolkit-reset">

Reset Defaults

</div>

</div>

</div>

</div>

<div class="ui-layer fixed bottom-6 left-1/2 transform -translate-x-1/2 z-20">

<span id="cameraZoomDisplay"
class="text-xs text-blue-400 font-mono bg-gray-800/80 px-3 py-1 rounded-lg border border-blue-500/30 shadow-lg"
style="display: none;"> Zoom: 50.00 </span>

</div>

<div id="canvas-container">

</div>

<div id="topDownDebugLegend" aria-hidden="true">

Raw linear sRGB Exp 1.4 Current Punchy Exp 3.0

</div>

<div id="orbitPanHintToast" aria-live="polite">

<div class="tutorialHintLine" tutorial-action="orbit">

<span class="inputLabel">LEFT MOUSE BUTTON</span> to orbit

</div>

<div class="tutorialHintLine" tutorial-action="pan">

<span class="inputLabel">RIGHT MOUSE BUTTON</span> to pan

</div>

<div class="tutorialHintLine" tutorial-action="zoom">

<span class="inputLabel">MOUSE WHEEL</span> to zoom

</div>

</div>

<div id="cameraAngleToast" aria-live="polite">

</div>
