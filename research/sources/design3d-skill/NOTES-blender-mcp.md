# NOTES — Blender MCP (verified evidence, fetched 2026-07-12)

Purpose: factual base to correct TRACK-BLENDER.md. Every claim tagged
[CERT-web] (source page/file saved in this directory) or [INFER] (reasoned,
not directly documented).

## 1. Two distinct projects — do not conflate

| | Community "BlenderMCP" | Official "Blender MCP" (Blender Lab) |
|---|---|---|
| Repo | github.com/ahujasid/blender-mcp | projects.blender.org/lab/blender_mcp |
| Author | Siddharth Ahuja (third party; README disclaimer: "not made by Blender") | Blender Lab team, GPL-3.0 |
| Blender version | 3.0+ | **5.1+** (distributed as extension via `https://lab.blender.org/` repo) |
| Server install | PyPI `blender-mcp` (v1.6.4), run via `uvx blender-mcp` | NOT on PyPI: `pip install git+https://projects.blender.org/lab/blender_mcp.git#subdirectory=mcp`, or `.mcpb` bundle from releases (v1.0.0, 2026-04-27) |
| Entry point | `blender-mcp` (CLI) | also `blender-mcp` — **name collision** if both installed |
| Focus | Asset creation: PolyHaven, Sketchfab, Hyper3D Rodin, Hunyuan3D, viewport screenshots | Scene inspection, docs lookup, code exec, rendering, UI navigation; bundles full bpy API + manual as RST |
| Env vars | `BLENDER_HOST`, `BLENDER_PORT` | `BLENDER_MCP_HOST`, `BLENDER_MCP_PORT`, `BLENDER_PATH` (for `_for_cli` tools) |
| Default socket | localhost:9876 | localhost:9876 (same port — run only one addon) |
| Telemetry | Yes (anonymized prompts/code/screenshots with consent); `DISABLE_TELEMETRY=true` to kill | None found in source [INFER] |

[CERT-web] Sources: `blender-mcp-readme.md`, `blender-lab-mcp-readme.md`,
`blender-org-lab-mcp-page.md`, `blender-mcp-server.py`, cloned official repo
(commit 98b0e49, 2026-05-05).

Both are current in mid-2026. The official one is real (blender.org/lab/mcp-server,
v1.0.0 Apr 2026) but young and llama.cpp-oriented in its docs; the community one
remains the de-facto standard for asset-driven modeling and is what
`uvx blender-mcp` installs. [CERT-web]

Architecture (identical shape in both): MCP client ⇐ stdio ⇒ MCP server (Python
process) ⇐ TCP socket ⇒ addon inside Blender. The **MCP server dials OUT to the
addon's listening socket**; Blender never connects to the client. [CERT-web]

## 2. Verified tool surface

### Community (ahujasid) — extracted by AST from `blender-mcp-server.py` [CERT-web]

Core:
- `get_scene_info(user_prompt)` — JSON dump of scene
- `get_object_info(object_name, user_prompt='')`
- `get_viewport_screenshot(max_size=1000, user_prompt='')` → PNG Image (docstring says default 800; code default is 1000)
- `execute_blender_code(code, user_prompt='')` — arbitrary Python; returns `"Code executed successfully: <captured stdout>"`

PolyHaven: `get_polyhaven_status()`, `get_polyhaven_categories(asset_type='hdris')`,
`search_polyhaven_assets(asset_type='all', categories=None)`,
`download_polyhaven_asset(asset_id, asset_type, resolution='1k', file_format=None)`,
`set_texture(object_name, texture_id)`

Sketchfab: `get_sketchfab_status()`, `search_sketchfab_models(query, categories=None, count=20, downloadable=True)`,
`get_sketchfab_model_preview(uid)`, `download_sketchfab_model(uid, target_size)`

Hyper3D Rodin: `get_hyper3d_status()`, `generate_hyper3d_model_via_text(text_prompt, bbox_condition=None)`,
`generate_hyper3d_model_via_images(input_image_paths=None, input_image_urls=None, bbox_condition=None)`,
`poll_rodin_job_status(subscription_key=None, request_id=None)`, `import_generated_asset(name, task_uuid=None, request_id=None)`

Hunyuan3D: `get_hunyuan3d_status()`, `generate_hunyuan3d_model(text_prompt=None, input_image_url=None)`,
`poll_hunyuan_job_status(job_id=None)`, `import_generated_asset_hunyuan(name, zip_file_url)`

Plus MCP prompt `asset_creation_strategy` (saved as `blender-mcp-asset-strategy-prompt.txt`).
There is NO dedicated create-object / material / render tool — everything geometric
goes through `execute_blender_code`. [CERT-web]

### Official (Blender Lab) — verbatim from repo readme.md [CERT-web]

Live-instance tools: `execute_blender_code`, `get_blendfile_summary_datablocks`,
`get_blendfile_summary_missing_files`, `get_blendfile_summary_of_linked_libraries`,
`get_blendfile_summary_path_info`, `get_blendfile_summary_usage_guess`,
`get_object_detail_summary`, `get_objects_summary`, `get_python_api_docs`,
`get_screenshot_of_area_as_image`, `get_screenshot_of_window_as_image`,
`get_screenshot_of_window_as_json`, `jump_to_tab_by_name`, `jump_to_tab_by_space_type`,
`jump_to_view3d_object_by_name`, `jump_to_view3d_object_data_by_name`,
`render_thumbnail_to_path`, `render_viewport_to_path`, plus `search_api_docs` /
`search_manual_docs` modules in `tools/`.

Headless variants (each opens a .blend in `blender --background`, needs `BLENDER_PATH`,
120 s timeout): `execute_blender_code_for_cli` and `_for_cli` twins of every
blendfile-summary tool. [CERT-web]

Official `execute_blender_code` contract: assign a JSON-serializable dict to a
variable named `result`; non-serializable values fall back to `repr`; deferred
completion only in interactive mode. [CERT-web]

## 3. Setup recipe — Claude Code CLI in WSL2, Blender on Windows

### Community server (recommended track for asset work)

Documented Claude Code command [CERT-web, README]:
```bash
claude mcp add blender uvx blender-mcp
# hardened form (README recommends pinning python + managed interpreters):
claude mcp add blender -e UV_PYTHON_PREFERENCE=only-managed -e DISABLE_TELEMETRY=true \
  -- uvx --python 3.11 blender-mcp
```
Addon side (Windows Blender): install `addon.py` via Edit > Preferences > Add-ons >
Install; enable "Interface: Blender MCP"; N-panel > BlenderMCP tab > "Connect to Claude"
(this starts the TCP listener). Do NOT run `uvx blender-mcp` manually in a terminal —
the client launches it. [CERT-web]

### The WSL2 topology problem

Facts from source [CERT-web]:
- Community addon binds `host='localhost'` **hardcoded** — the UI exposes only the
  port (`BlenderMCPServer(port=scene.blendermcp_port)`), so the Windows listener is
  reachable only via Windows loopback.
- The MCP server reads `BLENDER_HOST`/`BLENDER_PORT` to decide where to dial.

Consequences [INFER, from WSL2 networking model + the above]:
- Default WSL2 NAT mode: `localhost` inside WSL does not reach Windows services, and
  the Windows host IP won't work either because the addon listens on 127.0.0.1 only.
  A stock `claude mcp add blender uvx blender-mcp` from WSL therefore CANNOT connect.
- Working options, best first:
  1. **Run the server as a Windows process via WSL interop** (cleanest): point the MCP
     command at the Windows uv binary —
     `claude mcp add blender -- /mnt/c/Users/<user>/.local/bin/uvx.exe blender-mcp`.
     stdio crosses the WSL/Windows boundary natively; `localhost:9876` now resolves on
     the Windows side, AND the screenshot temp path becomes a Windows path, fixing the
     bug in section 4. Requires uv installed on Windows (`irm https://astral.sh/uv/install.ps1 | iex`). [INFER]
  2. **Mirrored networking**: `.wslconfig` → `[wsl2] networkingMode=mirrored`
     (Win11 22H2+), then WSL `localhost` reaches Windows loopback and the stock Linux
     `uvx blender-mcp` connects — but `get_viewport_screenshot` stays broken (section 4). [INFER]
  3. Patch `addon.py` to bind `0.0.0.0` + `claude mcp add blender -e BLENDER_HOST=$(ip route show default | awk '{print $3}') -- uvx blender-mcp`.
     Works in NAT mode; exposes the exec-anything socket to the LAN — avoid. [INFER]
- The README's `BLENDER_HOST='host.docker.internal'` example shows remote-host use is
  intended, confirming the env-var route for cross-boundary setups. [CERT-web]

### Official server in the same topology

Same dial-out model; env vars are `BLENDER_MCP_HOST`/`BLENDER_MCP_PORT`; the addon
preferences DO expose host (and port + auto-start), and it requires Blender's
"Online access" system preference enabled. Screenshots are WSL-safe (base64 over the
socket), but `render_*_to_path` paths are written BY BLENDER, so pass Windows paths
(`C:\...`) and read them from WSL as `/mnt/c/...`. [CERT-web for mechanics; INFER for the path recipe]

## 4. Gotchas / limitations (verified)

1. **`get_viewport_screenshot` is broken across the Windows-Blender/WSL-server boundary**
   (community). Server creates a Linux `/tmp/blender_screenshot_<pid>.png` path, sends
   it to Windows Blender to write, then reads it back → "Screenshot file was not
   created". Issues #187 (closed), #189 (open), fix PRs #188/#192 open as of 2026-07-12 —
   NOT merged. Workarounds: run server on the Windows side (option 1 above), or
   screenshot via `execute_blender_code` writing to `C:\` and read via `/mnt/c`.
   [CERT-web: `blender-mcp-issue-189-wsl-screenshot.json`]
2. **No max code size on the community path**, but the community server socket recv
   timeout is **180 s** (matches addon timeout); external asset downloads use 30–60 s
   HTTP timeouts. README: "Timeout errors: try simplifying your requests or breaking
   them into smaller steps." [CERT-web]
3. Official hard limits: addon rejects requests over **10 MiB** (null-byte-delimited
   JSON protocol); MCP-side socket timeout **300 s**; `_for_cli` subprocess timeout
   **120 s**; screenshots auto-downscaled because "MCP messages are limited to
   1,048,576 bytes (1 MB)". [CERT-web, source]
4. Community `execute_blender_code` returns **only captured stdout** — `print()` your
   results; expression values and `result` variables are discarded (unlike official).
   Errors come back as strings ("Error executing code: ..."), not tool errors. [CERT-web]
5. Code runs on Blender's **main thread** — long scripts freeze the UI, and a hard
   crash kills the socket. Recovery: community server auto-revalidates/reconnects on
   the next tool call (`get_blender_connection()` pings and reconnects); README says if
   errors persist, restart both Claude and the Blender addon server, and notes "the
   first command sometimes won't go through, but after that it starts working". [CERT-web]
6. `execute_blender_code` is arbitrary code execution with no sandbox. Community README:
   "ALWAYS save your work before using it." Official ships only a `weak_sandbox.py`
   ("this isn't really a sandbox") and blender.org recommends running in a VM. [CERT-web]
7. Run only **one** MCP server instance (not Cursor + Claude Desktop + Claude Code
   simultaneously). [CERT-web, README]
8. GUI-spawned clients may miss PATH → `spawn uvx ENOENT`; use absolute `uvx` path.
   (Less relevant for Claude Code CLI launched from a shell.) [CERT-web]
9. Screenshot format: community returns PNG, `max_size` clamps the largest dimension
   (addon scales down if larger). Official captures need an interactive Blender window
   for `get_screenshot_*` (uses `bpy.ops.screen.screenshot_area`); headless mode uses
   the `_for_cli` family instead — true headless render-to-file works via
   `execute_blender_code_for_cli` / `render_*` with background Blender. [CERT-web source; last sentence INFER]
10. PyPI `blender-mcp` = community package. Installing the official one also creates a
    `blender-mcp` command — don't install both in the same environment. [CERT-web + INFER]

## 5. Best practices for LLM-driven modeling (from shipped prompts)

From community `asset_creation_strategy` prompt [CERT-web]:
- Always `get_scene_info()` first; screenshot BEFORE and AFTER changes; intermediate
  screenshots between multi-step operations; investigate before proceeding if wrong.
- Asset source priority: specific real-world objects → Sketchfab then PolyHaven;
  generic objects/furniture → PolyHaven then Sketchfab; unique/custom → Hyper3D or
  Hunyuan3D; HDRIs and textures → PolyHaven. Fall back to scripting primitives only
  when integrations are off, the primitive is explicitly requested, or generation failed.
- Gen-AI (Rodin/Hunyuan): single items only — never whole scenes, never ground planes,
  never assemble from separately generated parts. Poll job → import → **always check
  `world_bounding_box`** and fix location/scale/rotation; duplicate via Python instead
  of re-generating.
- Check `world_bounding_box` of every item for clipping and spatial relationships.

From official `prompts.yml` [CERT-web] (applies to any bpy scripting):
- Respect existing structure and naming conventions; NEVER assume missing values —
  inspect the scene first; don't destructively modify without confirmation.
- Prefer `bpy.ops` for standard actions, `bpy.data` for precise control.
- Verify/set the mode first (wrong mode fails or silently no-ops). Active object and
  selection are distinct; set both explicitly and re-set between operator calls
  (operators mutate selection as a side effect).
- Update the depsgraph before reading computed properties (world matrices, modifier
  results). In edit mode use bmesh, and flush changes back or edits are silently lost.
- Return structured data, not print output (official server only).

Community README-level practice: break complex operations into smaller steps (timeout
mitigation). [CERT-web] Batch-size numbers beyond that (e.g. "N objects per call") are
NOT documented anywhere found — any specific number in TRACK-BLENDER.md is [INFER] at
best; the 180 s socket timeout is the real budget per `execute_blender_code` call. [CERT-web]

## Evidence files (this directory)

- `blender-mcp-readme.md` — community README (github raw, main)
- `blender-mcp-server.py` — community MCP server source (tool definitions)
- `blender-mcp-addon.py` — community Blender addon source (socket, exec, screenshot)
- `blender-mcp-asset-strategy-prompt.txt` — community `asset_creation_strategy` prompt
- `blender-mcp-issue-189-wsl-screenshot.json` — GitHub issues #189 + #187 (WSL bug)
- `blender-lab-mcp-readme.md` — official repo readme (verbatim tool list)
- `blender-lab-mcp-prompts.yml` — official LLM instructions shipped with the server
- `blender-org-lab-mcp-page.md` — blender.org/lab/mcp-server page text extract
- Official repo also cloned during research (commit 98b0e49, 2026-05-05); connection,
  addon-server, and toolcode facts read directly from that source.
