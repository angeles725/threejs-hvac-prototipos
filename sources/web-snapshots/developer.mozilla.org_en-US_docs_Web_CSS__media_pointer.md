<div id="content" class="layout__content" role="main">

<div class="layout__header reference-layout__header">

# `pointer` CSS media feature

<span class="indicator" role="img" aria-label="Baseline Check"></span>

<div class="status-title">

Baseline <span class="not-bold"> Widely available </span>

</div>

<div class="browsers">

<span class="engine" title="Supported in Chrome and Edge">
<span class="browser chrome supported" role="img"
aria-label="Chrome check"></span><span class="browser edge supported"
role="img" aria-label="Edge check"></span> </span><span class="engine"
title="Supported in Firefox"> <span class="browser firefox supported"
role="img" aria-label="Firefox check"></span>
</span><span class="engine" title="Supported in Safari">
<span class="browser safari supported" role="img"
aria-label="Safari check"></span> </span>

</div>

<span class="icon icon-chevron"></span>

<div class="extra">

This feature is well established and works across many devices and
browser versions. It’s been available across browsers since December
2018.

- <a href="/en-US/docs/Glossary/Baseline/Compatibility" class="learn-more"
  data-glean-id="baseline_link_learn_more" target="_blank">Learn more</a>
- <a href="#browser_compatibility"
  data-glean-id="baseline_link_bcd_table">See full compatibility</a>

</div>

\<?\>

<div class="section content-section">

The **`pointer`** [CSS](/en-US/docs/Web/CSS) [media
feature](/en-US/docs/Web/CSS/Reference/At-rules/@media#media_features)
tests whether the user has a pointing device (such as a mouse), and if
so, how accurate the *primary* pointing device is.

<div class="notecard note">

**Note:** If you want to test the accuracy of *any* pointing device, use
[`any-pointer`](/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer)
instead.

</div>

</div>

</div>

## In this article

- <a href="#syntax" data-glean-id="toc_click: #syntax">Syntax</a>
- <a href="#examples" data-glean-id="toc_click: #examples">Examples</a>
- <a href="#specifications"
  data-glean-id="toc_click: #specifications">Specifications</a>
- <a href="#browser_compatibility"
  data-glean-id="toc_click: #browser_compatibility">Browser
  compatibility</a>
- <a href="#see_also" data-glean-id="toc_click: #see_also">See also</a>

<div class="layout__body reference-layout__body">

<div class="section content-section" aria-labelledby="syntax">

## <a href="#syntax" class="heading-anchor">Syntax</a>

The `pointer` feature is specified as a keyword value chosen from the
list below.

[`none`](#none)  
The primary input mechanism does not include a pointing device.

[`coarse`](#coarse)  
The primary input mechanism includes a pointing device of limited
accuracy, such as a finger on a touchscreen.

[`fine`](#fine)  
The primary input mechanism includes an accurate pointing device, such
as a mouse.

</div>

<div class="section content-section" aria-labelledby="examples">

## <a href="#examples" class="heading-anchor">Examples</a>

This example creates a small checkbox for users with fine primary
pointers and a large checkbox for users with coarse primary pointers.

</div>

<div class="section content-section" aria-labelledby="html">

### <a href="#html" class="heading-anchor">HTML</a>

<div class="code-example">

<div class="example-header">

<span class="language-name">html</span>

</div>

``` brush:
<input id="test" type="checkbox" /> <label for="test">Look at me!</label>
```

</div>

</div>

<div class="section content-section" aria-labelledby="css">

### <a href="#css" class="heading-anchor">CSS</a>

<div class="code-example">

<div class="example-header">

<span class="language-name">css</span>

</div>

``` brush:
input[type="checkbox"] {
  appearance: none;
  border: solid;
  margin: 0;
}

input[type="checkbox"]:checked {
  background: gray;
}

@media (pointer: fine) {
  input[type="checkbox"] {
    width: 15px;
    height: 15px;
    border-width: 1px;
    border-color: blue;
  }
}

@media (pointer: coarse) {
  input[type="checkbox"] {
    width: 30px;
    height: 30px;
    border-width: 2px;
    border-color: red;
  }
}
```

</div>

</div>

<div class="section content-section" aria-labelledby="result">

### <a href="#result" class="heading-anchor">Result</a>

<div class="code-example">

<div class="example-header">

</div>

</div>

</div>

<div class="section content-section" aria-labelledby="specifications">

## <a href="#specifications" class="heading-anchor">Specifications</a>

<table>
<colgroup>
<col style="width: 100%" />
</colgroup>
<thead>
<tr>
<th scope="col">Specification</th>
</tr>
</thead>
<tbody>
<tr>
<td><a href="https://drafts.csswg.org/mediaqueries/#pointer"
class="external" rel="noopener" target="_blank">Media Queries Level
4&lt;?&gt;<br />
# pointer&lt;?&gt;</a></td>
</tr>
</tbody>
</table>

</div>

<div class="section content-section"
aria-labelledby="browser_compatibility">

## <a href="#browser_compatibility" class="heading-anchor">Browser
compatibility</a>

<style>*,:after,:before{box-sizing:border-box}button,input,select,textarea{font:inherit}button{color:inherit;cursor:pointer}img{height:auto;max-width:100%}a{color:var(--color-link-normal)}[hidden]{display:none!important}</style>

Enable JavaScript to view this browser compatibility table.

</div>

<div class="section content-section" aria-labelledby="see_also">

## <a href="#see_also" class="heading-anchor">See also</a>

- [The `any-pointer` media
  feature](/en-US/docs/Web/CSS/Reference/At-rules/@media/any-pointer)

</div>

<div class="section content-section article-footer"
aria-labelledby="feedback">

<div class="article-footer__inner">

<div class="article-footer__svg-container">

![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjIiIGhlaWdodD0iMTYyIiBmaWxsPSJub25lIiB2aWV3Ym94PSIwIDAgMTYyIDE2MiI+PG1hc2sgaWQ9ImIiIGZpbGw9IiNmZmYiPjxwYXRoIGQ9Ik05Ny4yMDMgNDcuMDRjOC4xMTMtNy44ODYgMTguMDA0LTEzLjg3MSAyOC45MDYtMTcuNDkyYTc4IDc4IDAgMCAxIDMzLjk2OS0zLjM5YzExLjQ0MyAxLjM5IDIyLjQwMSA1LjI5NSAzMi4wMjQgMTEuNDExczE3LjY1NiAxNC4yOCAyMy40NzYgMjMuODZjNS44MTkgOS41NzkgOS4yNjkgMjAuMzE4IDEwLjA4MyAzMS4zODVhNjkuODUgNjkuODUgMCAwIDEtNS4zODcgMzIuNDRjLTQuMzU4IDEwLjI3Mi0xMS4xMTUgMTkuNDQzLTE5Ljc0NyAyNi44MDEtOC42MzIgNy4zNTktMTguOTA4IDEyLjcwOS0zMC4wMzQgMTUuNjM3bC02LjE3LTIxLjY5OGM3LjY2Ni0yLjAxNyAxNC43NDYtNS43MDMgMjAuNjk0LTEwLjc3MyA1Ljk0OC01LjA3MSAxMC42MDMtMTEuMzg5IDEzLjYwNi0xOC40NjdhNDguMTQgNDguMTQgMCAwIDAgMy43MTItMjIuMzUyYy0uNTYxLTcuNjI1LTIuOTM4LTE1LjAyNS02Ljk0OC0yMS42MjVzLTkuNTQ0LTEyLjIyNi0xNi4xNzUtMTYuNDQtMTQuMTgxLTYuOTA0LTIyLjA2NS03Ljg2M2E1My43NSA1My43NSAwIDAgMC0yMy40MDUgMi4zMzZjLTcuNTEzIDIuNDk1LTE0LjMyNyA2LjYyLTE5LjkxOCAxMi4wNTN6IiAvPjwvbWFzaz48cGF0aCBzdHJva2U9InVybCgjYSkiIHN0cm9rZS1kYXNoYXJyYXk9IjYsIDYiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTk3LjIwMyA0Ny4wNGM4LjExMy03Ljg4NiAxOC4wMDQtMTMuODcxIDI4LjkwNi0xNy40OTJhNzggNzggMCAwIDEgMzMuOTY5LTMuMzljMTEuNDQzIDEuMzkgMjIuNDAxIDUuMjk1IDMyLjAyNCAxMS40MTFzMTcuNjU2IDE0LjI4IDIzLjQ3NiAyMy44NmM1LjgxOSA5LjU3OSA5LjI2OSAyMC4zMTggMTAuMDgzIDMxLjM4NWE2OS44NSA2OS44NSAwIDAgMS01LjM4NyAzMi40NGMtNC4zNTggMTAuMjcyLTExLjExNSAxOS40NDMtMTkuNzQ3IDI2LjgwMS04LjYzMiA3LjM1OS0xOC45MDggMTIuNzA5LTMwLjAzNCAxNS42MzdsLTYuMTctMjEuNjk4YzcuNjY2LTIuMDE3IDE0Ljc0Ni01LjcwMyAyMC42OTQtMTAuNzczIDUuOTQ4LTUuMDcxIDEwLjYwMy0xMS4zODkgMTMuNjA2LTE4LjQ2N2E0OC4xNCA0OC4xNCAwIDAgMCAzLjcxMi0yMi4zNTJjLS41NjEtNy42MjUtMi45MzgtMTUuMDI1LTYuOTQ4LTIxLjYyNXMtOS41NDQtMTIuMjI2LTE2LjE3NS0xNi40NC0xNC4xODEtNi45MDQtMjIuMDY1LTcuODYzYTUzLjc1IDUzLjc1IDAgMCAwLTIzLjQwNSAyLjMzNmMtNy41MTMgMi40OTUtMTQuMzI3IDYuNjItMTkuOTE4IDEyLjA1M3oiIG1hc2s9InVybCgjYikiIHN0eWxlPSJzdHJva2U6dXJsKCNhKSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTYzLjk5MiAtMjUuNTg3KSIgLz48ZWxsaXBzZSBjeD0iOC4wNjYiIGN5PSIxMTEuNTk3IiBmaWxsPSJjdXJyZW50Q29sb3IiIHJ4PSI1My42NzciIHJ5PSI1My42OTkiIHRyYW5zZm9ybT0ibWF0cml4KC43MTcwNyAtLjY5NyAuNzI0MyAuNjg5NSAwIDApIj48L2VsbGlwc2U+PGcgY2xpcC1wYXRoPSJ1cmwoI2MpIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjMuOTkyIC0yNS41ODcpIj48cGF0aCBmaWxsPSIjOWFiZmY1IiBkPSJtMTQ0LjI1NiAxMzcuMzc5IDMyLjkwNiAxMi40MzRhNC40MSA0LjQxIDAgMCAxIDIuNTU5IDUuNjY3bC05LjMyNiAyNC42NzlhNC40MSA0LjQxIDAgMCAxLTUuNjY3IDIuNTU5bC04LjIyNi0zLjEwOC0yLjMzMiA2LjE3Yy0uNDY2IDEuMjMzLS4zNzUgMS44ODMtMS42MDkgMS40MTdsLTIuMjUzLS41MjdjLS40MTEtLjE1NS0uOTUtLjU5NC0xLjIwNi0xLjE2MWwtNC43MzQtMTAuNDg0LTEyLjU0NS00Ljc0MWE0LjQxIDQuNDEgMCAwIDEtMi41NTktNS42NjdsOS4zMjUtMjQuNjc5YTQuNDEgNC40MSAwIDAgMSA1LjY2Ny0yLjU1OW05Ljk2MSAyOS42MTcgOC4yMjcgMy4xMDggMy4yNjQtOC42MzgtLjQ5OC02Ljc2OC00LjExMy0xLjU1NS41NDggNy4yNTgtNC4zMTktMS42MzJ6bS0xMi4zMzktNC42NjMgOC4yMjYgMy4xMDggMy4yNjQtOC42MzctLjQ5OC02Ljc2OS00LjExMy0xLjU1NC41NDggNy4yNTctNC4zMTktMS42MzJ6IiAvPjwvZz48ZyBjbGlwLXBhdGg9InVybCgjZCkiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02My45OTIgLTI1LjU4NykiPjxwYXRoIGZpbGw9IiM4MWIwZjMiIGQ9Ik0xMzUuMzUgNjAuMTM2IDg2LjY3IDQxLjY1NGMtMy4zNDYtMS4yNy03LjEyNC40MjgtOC4zOTQgMy43NzVMNjQuNDE0IDgxLjkzOGMtMS4yNyAzLjM0Ny40MjggNy4xMjUgMy43NzQgOC4zOTVsMTIuMTcgNC42Mi0zLjQ2NSA5LjEyOGMtLjY5MyAxLjgyNi0xLjQzMiAyLjQ1Ny4zOTQgMy4xNWwzLjAxNCAxLjYyNWMuNjA5LjIzMSAxLjYzNy4yNzQgMi40NzctLjEwNGwxNS41My02Ljk4MyAxOC41NiA3LjA0N2MzLjM0NiAxLjI3IDcuMTI0LS40MjggOC4zOTUtMy43NzVsMTMuODYyLTM2LjUxYzEuMjctMy4zNDYtLjQyOC03LjEyNC0zLjc3NS04LjM5NU05NS4yNjEgODMuMjA3bC0xMi4xNy00LjYyIDQuODUyLTEyLjc3OSA3LjE5LTcuMDE3IDYuMDg1IDIuMzEtNy43MjUgNy41MSA2LjM4OSAyLjQyNnptMTguMjU1IDYuOTMtMTIuMTctNC42MiA0Ljg1Mi0xMi43NzggNy4xODktNy4wMTcgNi4wODUgMi4zMS03LjcyNSA3LjUxIDYuMzkgMi40MjZ6IiAvPjwvZz48ZGVmcz48Y2xpcHBhdGggaWQ9ImMiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Im0xOTguNjM4IDE0Ni41ODYtNjUuMDU2LTI0LjU4My0yNC41ODMgNjUuMDU3IDY1LjA1NiAyNC41ODJ6IiAvPjwvY2xpcHBhdGg+PGNsaXBwYXRoIGlkPSJkIj48cGF0aCBmaWxsPSIjZmZmIiBkPSJtNjYuNDM4IDE0LjA1NSA5Ni4yNDIgMzYuNTQtMzYuNTQgOTYuMjQzLTk2LjI0My0zNi41NHoiIC8+PC9jbGlwcGF0aD48bGluZWFyZ3JhZGllbnQgaWQ9ImEiIHgxPSI5Ny4yMDMiIHgyPSIxOTkuOTk1IiB5MT0iNDcuMDQiIHkyPSIxNTIuNzkzIiBncmFkaWVudHVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agc3RvcC1jb2xvcj0iIzA4NmRmYyI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjI0NiIgc3RvcC1jb2xvcj0iIzJjODFmYSI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjUxNiIgc3RvcC1jb2xvcj0iIzU0OTdmOCI+PC9zdG9wPjxzdG9wIG9mZnNldD0iLjgyMSIgc3RvcC1jb2xvcj0iIzgwYjBmNiI+PC9zdG9wPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhYmZmNSI+PC9zdG9wPjwvbGluZWFyZ3JhZGllbnQ+PC9kZWZzPjwvc3ZnPg==)

</div>

## Help improve MDN

<style>.content-feedback{border:none;margin:0 0 .25rem;padding:0}.content-feedback>label{display:block;margin-bottom:.25rem}.content-feedback .thank-you{display:block;margin-bottom:calc(2.75rem + 2px)}.content-feedback mdn-button{flex:1;min-width:0}.content-feedback--buttons{display:inline-flex;gap:.75rem;margin:.25rem 0}.content-feedback--radios{align-items:center;display:flex;gap:.25rem;margin:.25rem 0}</style>

Was this page helpful to you?

<div class="content-feedback--buttons">

<style>.button{align-items:center;background-color:initial;border:1px solid #0000;border-radius:.25rem;color:var(--color-text-primary);column-gap:.3125em;cursor:pointer;display:inline-flex;font-family:var(--font-family-text);font-size:.875em;font-weight:450;justify-content:center;line-height:var(--font-line-ui);margin:0;padding:.5em;-webkit-text-decoration:none;text-decoration:none;vertical-align:middle}.button[data-variant=primary]{--csstools-light-dark-toggle-33eaa513-0:var(--csstools-color-scheme--light) var(--color-black);color:var(--csstools-light-dark-toggle-33eaa513-0,var(--color-white));--csstools-light-dark-toggle-33eaa513-1:var(--csstools-color-scheme--light) var(--color-white);background-color:var(--csstools-light-dark-toggle-33eaa513-1,var(--color-black))}@supports (color:light-dark(red,red)){.button[data-variant=primary]{background-color:light-dark(var(--color-black),var(--color-white));color:light-dark(var(--color-white),var(--color-black))}}.button[data-variant=primary]:hover{--csstools-light-dark-toggle-33eaa513-2:var(--csstools-color-scheme--light) var(--color-gray-60);background-color:var(--csstools-light-dark-toggle-33eaa513-2,var(--color-gray-40))}@supports (color:light-dark(red,red)){.button[data-variant=primary]:hover{background-color:light-dark(var(--color-gray-40),var(--color-gray-60))}}.button[data-variant=primary][data-action=positive]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-3:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-3,var(--color-green-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]{background-color:light-dark(var(--color-green-50),var(--color-green-20))}}.button[data-variant=primary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-4:var(--csstools-color-scheme--light) var(--color-green-50);background-color:var(--csstools-light-dark-toggle-33eaa513-4,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]:hover{background-color:light-dark(var(--color-green-20),var(--color-green-50))}}.button[data-variant=primary][data-action=negative]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-5:var(--csstools-color-scheme--light) var(--color-red-20);background-color:var(--csstools-light-dark-toggle-33eaa513-5,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]{background-color:light-dark(var(--color-red-50),var(--color-red-20))}}.button[data-variant=primary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-6:var(--csstools-color-scheme--light) var(--color-red-50);background-color:var(--csstools-light-dark-toggle-33eaa513-6,var(--color-red-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]:hover{background-color:light-dark(var(--color-red-20),var(--color-red-50))}}.button[data-variant=secondary]{border-color:currentcolor}.button[data-variant=secondary]:hover{--csstools-light-dark-toggle-33eaa513-7:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-7,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=secondary]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=secondary][data-action=positive]{--csstools-light-dark-toggle-33eaa513-8:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-8,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=secondary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-9:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-9,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=secondary][data-action=negative]{--csstools-light-dark-toggle-33eaa513-10:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-10,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=secondary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-11:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-11,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-12:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-12,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[data-variant=plain]:hover{--csstools-light-dark-toggle-33eaa513-13:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-13,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=plain]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=plain][data-action=positive]{--csstools-light-dark-toggle-33eaa513-14:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-14,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=plain][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-15:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-15,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=plain][data-action=negative]{--csstools-light-dark-toggle-33eaa513-16:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-16,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=plain][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-17:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-17,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-18:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-18,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[disabled]{--csstools-light-dark-toggle-33eaa513-19:var(--csstools-color-scheme--light) var(--color-gray-60)!important;color:var(--csstools-light-dark-toggle-33eaa513-19,var(--color-gray-40))!important;cursor:default;--csstools-light-dark-toggle-33eaa513-20:var(--csstools-color-scheme--light) var(--color-gray-20)!important;background-color:var(--csstools-light-dark-toggle-33eaa513-20,var(--color-gray-80))!important;border-color:#0000}@supports (color:light-dark(red,red)){.button[disabled]{background-color:light-dark(var(--color-gray-80),var(--color-gray-20))!important;color:light-dark(var(--color-gray-40),var(--color-gray-60))!important}}.button .icon{display:flex}.button svg{height:1.25em;width:1.25em}.button .label{padding-block:.125em;padding-inline:.0625em}:host{display:inline-flex;vertical-align:middle}.button{box-sizing:border-box;height:100%;width:100%}</style>

<span class="icon"
part="icon">![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Ym94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik03IDEwdjEybTgtMTYuMTJMMTQgMTBoNS44M2EyIDIgMCAwIDEgMS45MiAyLjU2bC0yLjMzIDhBMiAyIDAgMCAxIDE3LjUgMjJINGEyIDIgMCAwIDEtMi0ydi04YTIgMiAwIDAgMSAyLTJoMi43NmEyIDIgMCAwIDAgMS43OS0xLjExTDEyIDJhMy4xMyAzLjEzIDAgMCAxIDMgMy44OCIgLz48L3N2Zz4=)</span>
<span id="label-eisz02nhmq" class="label" part="label"></span>

Yes
<style>.button{align-items:center;background-color:initial;border:1px solid #0000;border-radius:.25rem;color:var(--color-text-primary);column-gap:.3125em;cursor:pointer;display:inline-flex;font-family:var(--font-family-text);font-size:.875em;font-weight:450;justify-content:center;line-height:var(--font-line-ui);margin:0;padding:.5em;-webkit-text-decoration:none;text-decoration:none;vertical-align:middle}.button[data-variant=primary]{--csstools-light-dark-toggle-33eaa513-0:var(--csstools-color-scheme--light) var(--color-black);color:var(--csstools-light-dark-toggle-33eaa513-0,var(--color-white));--csstools-light-dark-toggle-33eaa513-1:var(--csstools-color-scheme--light) var(--color-white);background-color:var(--csstools-light-dark-toggle-33eaa513-1,var(--color-black))}@supports (color:light-dark(red,red)){.button[data-variant=primary]{background-color:light-dark(var(--color-black),var(--color-white));color:light-dark(var(--color-white),var(--color-black))}}.button[data-variant=primary]:hover{--csstools-light-dark-toggle-33eaa513-2:var(--csstools-color-scheme--light) var(--color-gray-60);background-color:var(--csstools-light-dark-toggle-33eaa513-2,var(--color-gray-40))}@supports (color:light-dark(red,red)){.button[data-variant=primary]:hover{background-color:light-dark(var(--color-gray-40),var(--color-gray-60))}}.button[data-variant=primary][data-action=positive]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-3:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-3,var(--color-green-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]{background-color:light-dark(var(--color-green-50),var(--color-green-20))}}.button[data-variant=primary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-4:var(--csstools-color-scheme--light) var(--color-green-50);background-color:var(--csstools-light-dark-toggle-33eaa513-4,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=positive]:hover{background-color:light-dark(var(--color-green-20),var(--color-green-50))}}.button[data-variant=primary][data-action=negative]{color:var(--color-white);--csstools-light-dark-toggle-33eaa513-5:var(--csstools-color-scheme--light) var(--color-red-20);background-color:var(--csstools-light-dark-toggle-33eaa513-5,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]{background-color:light-dark(var(--color-red-50),var(--color-red-20))}}.button[data-variant=primary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-6:var(--csstools-color-scheme--light) var(--color-red-50);background-color:var(--csstools-light-dark-toggle-33eaa513-6,var(--color-red-20))}@supports (color:light-dark(red,red)){.button[data-variant=primary][data-action=negative]:hover{background-color:light-dark(var(--color-red-20),var(--color-red-50))}}.button[data-variant=secondary]{border-color:currentcolor}.button[data-variant=secondary]:hover{--csstools-light-dark-toggle-33eaa513-7:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-7,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=secondary]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=secondary][data-action=positive]{--csstools-light-dark-toggle-33eaa513-8:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-8,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=secondary][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-9:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-9,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=secondary][data-action=negative]{--csstools-light-dark-toggle-33eaa513-10:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-10,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=secondary][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-11:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-11,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-12:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-12,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=secondary][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[data-variant=plain]:hover{--csstools-light-dark-toggle-33eaa513-13:var(--csstools-color-scheme--light) var(--color-gray-40);background-color:var(--csstools-light-dark-toggle-33eaa513-13,var(--color-gray-80))}@supports (color:light-dark(red,red)){.button[data-variant=plain]:hover{background-color:light-dark(var(--color-gray-80),var(--color-gray-40))}}.button[data-variant=plain][data-action=positive]{--csstools-light-dark-toggle-33eaa513-14:var(--csstools-color-scheme--light) var(--color-green-80);color:var(--csstools-light-dark-toggle-33eaa513-14,var(--color-green-20))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]{color:light-dark(var(--color-green-20),var(--color-green-80))}}.button[data-variant=plain][data-action=positive]:hover{--csstools-light-dark-toggle-33eaa513-15:var(--csstools-color-scheme--light) var(--color-green-20);background-color:var(--csstools-light-dark-toggle-33eaa513-15,var(--color-green-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=positive]:hover{background-color:light-dark(var(--color-green-90),var(--color-green-20))}}.button[data-variant=plain][data-action=negative]{--csstools-light-dark-toggle-33eaa513-16:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-16,var(--color-red-50))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]{color:light-dark(var(--color-red-50),var(--color-red-80))}}.button[data-variant=plain][data-action=negative]:hover{--csstools-light-dark-toggle-33eaa513-17:var(--csstools-color-scheme--light) var(--color-red-80);color:var(--csstools-light-dark-toggle-33eaa513-17,var(--color-red-20));--csstools-light-dark-toggle-33eaa513-18:var(--csstools-color-scheme--light) var(--color-red-10);background-color:var(--csstools-light-dark-toggle-33eaa513-18,var(--color-red-90))}@supports (color:light-dark(red,red)){.button[data-variant=plain][data-action=negative]:hover{background-color:light-dark(var(--color-red-90),var(--color-red-10));color:light-dark(var(--color-red-20),var(--color-red-80))}}.button[disabled]{--csstools-light-dark-toggle-33eaa513-19:var(--csstools-color-scheme--light) var(--color-gray-60)!important;color:var(--csstools-light-dark-toggle-33eaa513-19,var(--color-gray-40))!important;cursor:default;--csstools-light-dark-toggle-33eaa513-20:var(--csstools-color-scheme--light) var(--color-gray-20)!important;background-color:var(--csstools-light-dark-toggle-33eaa513-20,var(--color-gray-80))!important;border-color:#0000}@supports (color:light-dark(red,red)){.button[disabled]{background-color:light-dark(var(--color-gray-80),var(--color-gray-20))!important;color:light-dark(var(--color-gray-40),var(--color-gray-60))!important}}.button .icon{display:flex}.button svg{height:1.25em;width:1.25em}.button .label{padding-block:.125em;padding-inline:.0625em}:host{display:inline-flex;vertical-align:middle}.button{box-sizing:border-box;height:100%;width:100%}</style>

<span class="icon"
part="icon">![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgc3Ryb2tlLXdpZHRoPSIyIiB2aWV3Ym94PSIwIDAgMjQgMjQiPjxwYXRoIGQ9Ik0xNyAxNFYyTTkgMTguMTIgMTAgMTRINC4xN2EyIDIgMCAwIDEtMS45Mi0yLjU2bDIuMzMtOEEyIDIgMCAwIDEgNi41IDJIMjBhMiAyIDAgMCAxIDIgMnY4YTIgMiAwIDAgMS0yIDJoLTIuNzZhMiAyIDAgMCAwLTEuNzkgMS4xMUwxMiAyMmEzLjEzIDMuMTMgMCAwIDEtMy0zLjg4IiAvPjwvc3ZnPg==)</span>
<span id="label-bka0s0d4yi" class="label" part="label"></span>

No

</div>

<a href="/en-US/docs/MDN/Community/Getting_started"
class="article-footer__contribute">Learn how to contribute</a>

This page was last modified on Apr 20, 2026 by [MDN
contributors](/en-US/docs/Web/CSS/Reference/At-rules/@media/pointer/contributors.txt).

<div class="article-footer__links">

<a
href="https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/at-rules/@media/pointer/index.md?plain=1"
class="external" target="_blank" rel="noopener"
title="Folder: en-us/web/css/reference/at-rules/@media/pointer (Opens in a new tab)">View
this page on GitHub</a> • <a
href="https://github.com/mdn/content/issues/new?template=page-report.yml&amp;mdn-url=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FCSS%2FReference%2FAt-rules%2F%40media%2Fpointer&amp;metadata=%3C%21--+Do+not+make+changes+below+this+line+--%3E%0A%3Cdetails%3E%0A%3Csummary%3EPage+report+details%3C%2Fsummary%3E%0A%0A*+Folder%3A+%60en-us%2Fweb%2Fcss%2Freference%2Fat-rules%2F%40media%2Fpointer%60%0A*+MDN+URL%3A+https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FCSS%2FReference%2FAt-rules%2F%40media%2Fpointer%0A*+GitHub+URL%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fblob%2Fmain%2Ffiles%2Fen-us%2Fweb%2Fcss%2Freference%2Fat-rules%2F%40media%2Fpointer%2Findex.md%0A*+Last+commit%3A+https%3A%2F%2Fgithub.com%2Fmdn%2Fcontent%2Fcommit%2F67d40334c8b90e4623f3b0d3aea466b9882d8236%0A*+Document+last+modified%3A+2026-04-20T16%3A07%3A30.000Z%0A%0A%3C%2Fdetails%3E"
class="external" target="_blank" rel="noopener"
title="This will take you to GitHub to file a new issue.">Report a
problem with this content</a>

</div>

</div>

</div>

</div>

</div>
