import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH
  ?? '/home/cristian/.cache/puppeteer/chrome/linux-150.0.7871.46/chrome-linux64/chrome';
const MIME = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
});

async function captureLiveSceneSnapshot(page, state) {
  return page.evaluate(async (nextState) => {
    const app = globalThis.__cinemexApp;
    app.layerController.setVisualMode('architectural');
    app.layerController.setView('architecture');
    app.layerController.setLayer('roof', nextState.roof ?? false);
    app.layerController.setLayer('walls', nextState.walls ?? true);
    app.layerController.setLayer('labels', nextState.labels);
    app.cameraController.applyPreset(nextState.camera);
    app.runtime.setLookdevCamera(nextState.camera);
    app.architectureAsset.setEvidenceCamera(nextState.camera, {
      camera: app.runtime.camera,
      viewport: {
        width: app.runtime.renderer.domElement.clientWidth,
        height: app.runtime.renderer.domElement.clientHeight,
      },
    });
    app.architectureAsset.setSurfaceFrame({
      posterFrame: nextState.posterFrame,
      displayFrame: nextState.displayFrame,
    });
    app.runtime.scene.updateMatrixWorld(true);
    app.runtime.render();

    const round = (value) => Number.isFinite(value) ? Number(value.toFixed(8)) : null;
    const vector = (value) => value?.toArray?.().map(round) ?? null;
    const materialRecord = (input) => (Array.isArray(input) ? input : [input]).filter(Boolean).map((material) => ({
      identity: material.uuid,
      name: material.name,
      type: material.type,
      color: material.color?.getHex?.() ?? null,
      emissive: material.emissive?.getHex?.() ?? null,
      emissiveIntensity: round(material.emissiveIntensity),
      opacity: round(material.opacity),
      transparent: material.transparent,
      depthWrite: material.depthWrite,
      depthTest: material.depthTest,
      alphaTest: round(material.alphaTest),
      roughness: round(material.roughness),
      metalness: round(material.metalness),
      side: material.side,
      mapIdentity: material.map?.uuid ?? null,
    }));
    const geometryRecord = (geometry) => {
      if (!geometry) return null;
      if (!geometry.boundingBox) geometry.computeBoundingBox?.();
      if (!geometry.boundingSphere) geometry.computeBoundingSphere?.();
      return {
        identity: geometry.uuid,
        type: geometry.type,
        indexCount: geometry.index?.count ?? 0,
        attributes: Object.fromEntries(Object.entries(geometry.attributes ?? {})
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, attribute]) => [name, {
            count: attribute.count,
            itemSize: attribute.itemSize,
            normalized: attribute.normalized,
          }])),
        drawRange: { start: geometry.drawRange?.start ?? 0, count: geometry.drawRange?.count ?? 0 },
        groups: (geometry.groups ?? []).map(({ start, count, materialIndex }) => ({ start, count, materialIndex })),
        bounds: geometry.boundingBox ? {
          min: vector(geometry.boundingBox.min),
          max: vector(geometry.boundingBox.max),
          centre: vector(geometry.boundingSphere?.center),
          radius: round(geometry.boundingSphere?.radius),
        } : null,
      };
    };
    const isEffectivelyVisible = (object) => {
      for (let cursor = object; cursor; cursor = cursor.parent) if (!cursor.visible) return false;
      return true;
    };
    const hashText = async (text) => Array.from(new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)),
    )).map((byte) => byte.toString(16).padStart(2, '0')).join('');

    const surfaceMeshes = new Set([
      ...app.architectureAsset.surfaceMeshes,
      ...app.architectureAsset.networkSchematic.objects,
    ]);
    const nonGenerated = [];
    const generated = [];
    for (const [groupName, root] of Object.entries(app.runtime.groups).sort(([a], [b]) => a.localeCompare(b))) {
      let traversalIndex = 0;
      root.traverse((object) => {
        if (object === root) return;
        const key = `${groupName}:${String(traversalIndex).padStart(4, '0')}:${object.name || object.userData?.entityId || object.type}`;
        traversalIndex += 1;
        const record = {
          key,
          type: object.type,
          matrixWorld: object.matrixWorld.elements.map(round),
          geometry: geometryRecord(object.geometry),
          material: materialRecord(object.material),
          instanceCount: object.isInstancedMesh ? object.count : null,
          visible: object.visible,
          effectiveVisible: isEffectivelyVisible(object),
        };
        if (surfaceMeshes.has(object) || groupName === 'labels') generated.push(record);
        else nonGenerated.push(record);
      });
    }
    const cameraRecord = {
      matrixWorld: app.runtime.camera.matrixWorld.elements.map(round),
      projection: app.runtime.camera.projectionMatrix.elements.map(round),
      position: vector(app.runtime.camera.position),
      quaternion: vector(app.runtime.camera.quaternion),
      fov: app.runtime.camera.fov,
    };
    nonGenerated.sort((a, b) => a.key.localeCompare(b.key));
    generated.sort((a, b) => a.key.localeCompare(b.key));
    return {
      name: nextState.name,
      nonGeneratedCount: nonGenerated.length,
      generatedCount: generated.length,
      nonGeneratedHash: await hashText(JSON.stringify(nonGenerated)),
      cameraHash: await hashText(JSON.stringify(cameraRecord)),
      generated: Object.fromEntries(await Promise.all(generated.map(async (record) => [
        record.key,
        await hashText(JSON.stringify(record)),
      ]))),
    };
  }, state);
}

async function pixelRegionHash(page) {
  const saved = await page.evaluate(() => {
    const app = globalThis.__cinemexApp;
    const surfaceVisibility = app.architectureAsset.surfaceMeshes.map((mesh) => mesh.visible);
    const labelsVisible = app.runtime.groups.labels.visible;
    app.architectureAsset.surfaceMeshes.forEach((mesh) => { mesh.visible = false; });
    app.runtime.groups.labels.visible = false;
    app.runtime.render();
    return { surfaceVisibility, labelsVisible };
  });
  const canvas = await page.$('#viewer canvas');
  const maskedPixels = await canvas.screenshot({ type: 'png' });
  await page.evaluate((prior) => {
    const app = globalThis.__cinemexApp;
    app.architectureAsset.surfaceMeshes.forEach((mesh, index) => { mesh.visible = prior.surfaceVisibility[index]; });
    app.runtime.groups.labels.visible = prior.labelsVisible;
    app.runtime.render();
  }, saved);
  return createHash('sha256').update(maskedPixels).digest('hex');
}

function generatedDiff(left, right) {
  return [...new Set([...Object.keys(left.generated), ...Object.keys(right.generated)])]
    .filter((key) => left.generated[key] !== right.generated[key])
    .sort();
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestedPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const relativePath = requestedPath === '/' ? 'index.html' : requestedPath.replace(/^\/+/, '');
      const filePath = path.resolve(APP_ROOT, relativePath);
      if (!filePath.startsWith(`${APP_ROOT}${path.sep}`)) throw new Error('Path traversal rejected.');
      const fileStats = await stat(filePath);
      if (!fileStats.isFile()) throw new Error('Not a file.');
      response.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] ?? 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });
}

let server = createStaticServer();
let baseUrl;
let transport = 'local-http-server';
try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/`;
} catch (error) {
  if (error?.code !== 'EPERM') throw error;
  server = null;
  baseUrl = 'http://cinemex.local/';
  transport = 'intercepted-http-sandbox-fallback';
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    pipe: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--no-sandbox',
      '--no-zygote',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--ignore-certificate-errors',
      '--window-size=1280,800',
    ],
  });
} catch (error) {
  console.error(JSON.stringify({
    status: 'BLOCKED',
    stage: 'browser-launch',
    transport,
    executablePath: CHROME,
    error: String(error),
  }, null, 2));
  if (server) await new Promise((resolve) => server.close(resolve));
  process.exit(2);
}

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
if (!server) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://cinemex.local') {
      await request.continue();
      return;
    }
    try {
      const relativePath = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.resolve(APP_ROOT, relativePath);
      if (!filePath.startsWith(`${APP_ROOT}${path.sep}`)) throw new Error('Path traversal rejected.');
      const body = await readFile(filePath);
      await request.respond({
        status: 200,
        contentType: MIME[path.extname(filePath)] ?? 'application/octet-stream',
        body,
      });
    } catch {
      await request.respond({ status: 404, contentType: 'text/plain', body: 'Not found' });
    }
  });
}
const issues = [];
page.on('console', (message) => {
  if (message.type() === 'error' || message.type() === 'warning') {
    issues.push({ type: `console:${message.type()}`, text: message.text() });
  }
});
page.on('pageerror', (error) => issues.push({ type: 'pageerror', text: String(error) }));
page.on('requestfailed', (request) => issues.push({
  type: 'requestfailed',
  text: `${request.failure()?.errorText ?? 'failed'} ${request.url()}`,
}));
page.on('response', (response) => {
  if (response.status() >= 400) issues.push({ type: 'response', text: `${response.status()} ${response.url()}` });
});

const checks = [];
const surfaceIntegrity = {};
try {
  await page.goto(`${baseUrl}?mode=engineering&camera=network&nav=orbit&roof=1&walls=1&cutaway=1&view=all&rs485=1&lorawan=1&internet=1&labels=1`, {
    waitUntil: 'networkidle0',
    timeout: 60_000,
  });
  await page.waitForSelector('html[data-app-ready="true"]', { timeout: 30_000 });

  const initial = await page.evaluate(() => ({
    title: document.querySelector('h1')?.textContent,
    status: document.querySelector('#app-status')?.textContent,
    fatalHidden: document.querySelector('#fatal-panel')?.hidden,
    canvasCount: document.querySelectorAll('#viewer canvas').length,
    cameraButtons: document.querySelectorAll('[data-camera]').length,
    pixelRatio: globalThis.__cinemexApp.runtime.renderer.getPixelRatio(),
    semanticGroups: Object.fromEntries(Object.entries(globalThis.__cinemexApp.runtime.groups)
      .map(([name, group]) => [name, group.children.length])),
    architectureAsset: {
      id: globalThis.__cinemexApp.architectureAsset.assetId,
      pass: globalThis.__cinemexApp.architectureAsset.pass,
      portals: globalThis.__cinemexApp.architectureAsset.plan.portals.length,
      meshes: globalThis.__cinemexApp.architectureAsset.meshes.length,
      billboards: globalThis.__cinemexApp.architectureAsset.billboards.length,
      surface: {
        placements: globalThis.__cinemexApp.architectureAsset.surfacePlacements.length,
        finiteAndBounded: globalThis.__cinemexApp.architectureAsset.surfacePlacements.every((placement) => (
          placement.position.every(Number.isFinite)
            && placement.size.every((value) => Number.isFinite(value) && value > 0 && value <= 14)
            && placement.localSpace === 'world-root'
            && ['architecture', 'labels'].includes(placement.parentLayer)
            && placement.visibilityOnly === true
        )),
        cutoutDepthStable: globalThis.__cinemexApp.architectureAsset.surfaceMeshes.every((mesh) => (
          mesh.material.transparent === false && mesh.material.depthWrite === true
        )),
        directionMarkers: (() => {
          const markerMeshes = globalThis.__cinemexApp.architectureAsset.meshes.filter((mesh) => (
            mesh.userData.entities?.some(({ kind }) => kind === 'media-arrowhead')
          ));
          const entities = markerMeshes.flatMap((mesh) => mesh.userData.entities)
            .filter(({ kind }) => kind === 'media-arrowhead');
          return {
            components: entities.length,
            terminalAdjacent: entities.every(({ terminalAdjacent }) => terminalAdjacent === true),
            singleArrowhead: entities.every(({ component }) => component === 'single-arrowhead'),
            tangentAligned: entities.every(({ orientationErrorRadians }) => orientationErrorRadians === 0),
            projectedSizePolicy: entities.every(({ projectedMinPx, projectedMaxPx }) => (
              projectedMinPx >= 16 && projectedMaxPx <= 18
            )),
            topologyNeutral: entities.every(({ topologyImpact }) => topologyImpact === false),
            subordinateRenderPolicy: markerMeshes.every((mesh) => (
              mesh.userData.instancesPerMarker === 1
                && mesh.userData.geometryRole === 'triangular-cone'
                && mesh.userData.baseRadius === 0.075
                && mesh.renderOrder === 1180
                && mesh.frustumCulled === false
            )),
            occlusionAwareMaterial: markerMeshes.every((mesh) => (
              mesh.material.name.endsWith('direction-amber')
                && mesh.material.opacity === 1
                && mesh.material.transparent === false
                && mesh.material.emissiveIntensity >= 0.6
                && mesh.material.emissiveIntensity <= 0.7
                && mesh.material.depthTest === true
                && mesh.material.depthWrite === false
            )),
          };
        })(),
      },
      structural: {
        shells: globalThis.__cinemexApp.architectureAsset.plan.structural.auditoriumShells.length,
        portalAssemblies: globalThis.__cinemexApp.architectureAsset.plan.structural.portalAssemblies.length,
        emergencyDoors: globalThis.__cinemexApp.architectureAsset.plan.structural.emergencyDoors.length,
        entrances: globalThis.__cinemexApp.architectureAsset.plan.structural.facade.entranceAssemblies.length,
        serviceDoors: globalThis.__cinemexApp.architectureAsset.plan.structural.rearTechnical.serviceDoors.length,
        sleeves: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.futureSleeves.length,
        rs485Routes: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.rs485Routes.length,
        containedDrops: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.tc300Drops.length,
        wallCrossings: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.wallCrossings.length,
        humanReferences: globalThis.__cinemexApp.architectureAsset.plan.structural.humanReferences.length,
        hoodConnected: globalThis.__cinemexApp.architectureAsset.plan.structural.kitchenExtraction.duct.contactOverlap,
        familyMasters: globalThis.__cinemexApp.architectureAsset.plan.structural.auditoriumShells
          .filter(({ familyMaster }) => familyMaster?.projectionNiche && familyMaster?.crossAisle).length,
        roofRoutes: globalThis.__cinemexApp.architectureAsset.plan.structural.roofService.routes.length,
        trayBackedRoutes: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.rs485Routes
          .filter(({ trayBacked, junctionContact }) => trayBacked && junctionContact).length,
        terminalDrops: globalThis.__cinemexApp.architectureAsset.plan.structural.containment.tc300Drops
          .filter(({ points, terminalPosition }) => JSON.stringify(points.at(-1).position) === JSON.stringify(terminalPosition)).length,
      },
      proxies: {
        auditoriums: globalThis.__cinemexApp.architectureAsset.plan.blockoutProxies.auditoriums.length,
        tc300: globalThis.__cinemexApp.architectureAsset.plan.topologyProxies.tc300.length,
        uc100: globalThis.__cinemexApp.architectureAsset.plan.topologyProxies.uc100.length,
        rs485Drops: globalThis.__cinemexApp.architectureAsset.plan.topologyProxies.rs485Drops.length,
        lorawanLinks: globalThis.__cinemexApp.architectureAsset.plan.topologyProxies.lorawanLinks.length,
      },
      networkSchematic: {
        evidenceOnly: globalThis.__cinemexApp.architectureAsset.networkSchematic.model.evidenceOnly,
        topologyImpact: globalThis.__cinemexApp.architectureAsset.networkSchematic.model.topologyImpact,
        thermostats: globalThis.__cinemexApp.architectureAsset.networkSchematic.model.thermostatCount,
        buses: globalThis.__cinemexApp.architectureAsset.networkSchematic.model.buses.length,
        lorawanLanes: globalThis.__cinemexApp.architectureAsset.networkSchematic.layout.lorawanLanes.length,
        textureSize: [
          globalThis.__cinemexApp.architectureAsset.networkSchematic.texture.image.width,
          globalThis.__cinemexApp.architectureAsset.networkSchematic.texture.image.height,
        ],
      },
    },
    materials: {
      stats: globalThis.__cinemexApp.materialRegistry.getStats(),
      red: {
        color: globalThis.__cinemexApp.materialRegistry.materials.cinemaRedPainted.color.getHex(),
        metalness: globalThis.__cinemexApp.materialRegistry.materials.cinemaRedPainted.metalness,
        roughness: globalThis.__cinemexApp.materialRegistry.materials.cinemaRedPainted.roughness,
      },
      glass: {
        transmission: globalThis.__cinemexApp.materialRegistry.materials.facadeGlass.transmission,
        opacity: globalThis.__cinemexApp.materialRegistry.materials.facadeGlass.opacity,
        depthWrite: globalThis.__cinemexApp.materialRegistry.materials.facadeGlass.depthWrite,
      },
      shell: {
        opacity: globalThis.__cinemexApp.materialRegistry.materials.architecturalShell.opacity,
        depthWrite: globalThis.__cinemexApp.materialRegistry.materials.architecturalShell.depthWrite,
      },
    },
    layerState: globalThis.__cinemexApp.layerController.getState(),
  }));
  assert.equal(initial.title, 'Cinemex – Integración HVAC LoRaWAN');
  assert.equal(initial.status, 'Sistema listo · Sin alarmas');
  assert.equal(initial.fatalHidden, true);
  assert.equal(initial.canvasCount, 1);
  assert.equal(initial.cameraButtons, 11);
  assert.equal(initial.pixelRatio, 1.5);
  for (const name of [
    'architecture', 'roof', 'walls', 'zones', 'labels',
    'hvac', 'rs485', 'lorawan', 'internet',
  ]) {
    assert.ok(initial.semanticGroups[name] > 0, `${name} should contain blockout geometry`);
  }
  assert.equal(initial.architectureAsset.id, 'shell-circulation-facade');
  assert.equal(initial.architectureAsset.pass, 'interaction-ui');
  assert.equal(initial.architectureAsset.portals, 8);
  assert.deepEqual(initial.architectureAsset.structural, {
    shells: 8,
    portalAssemblies: 8,
    emergencyDoors: 8,
    entrances: 5,
    serviceDoors: 4,
    sleeves: 3,
    rs485Routes: 4,
    containedDrops: 14,
    wallCrossings: 10,
    humanReferences: 5,
    hoodConnected: true,
    familyMasters: 8,
    roofRoutes: 2,
    trayBackedRoutes: 4,
    terminalDrops: 14,
  });
  assert.deepEqual(initial.architectureAsset.proxies, {
    auditoriums: 8,
    tc300: 14,
    uc100: 4,
    rs485Drops: 14,
    lorawanLinks: 4,
  });
  assert.deepEqual(initial.architectureAsset.networkSchematic, {
    evidenceOnly: true,
    topologyImpact: false,
    thermostats: 14,
    buses: 4,
    lorawanLanes: 4,
    textureSize: [2048, 840],
  });
  assert.ok(initial.architectureAsset.meshes >= 12);
  assert.equal(initial.architectureAsset.billboards, 46);
  assert.ok(initial.architectureAsset.surface.placements > 40);
  assert.equal(initial.architectureAsset.surface.finiteAndBounded, true);
  assert.equal(initial.architectureAsset.surface.cutoutDepthStable, true);
  assert.deepEqual(initial.architectureAsset.surface.directionMarkers, {
    components: 9,
    terminalAdjacent: true,
    singleArrowhead: true,
    tangentAligned: true,
    projectedSizePolicy: true,
    topologyNeutral: true,
    subordinateRenderPolicy: true,
    occlusionAwareMaterial: true,
  });
  assert.ok(initial.materials.stats.materialCount >= 20 && initial.materials.stats.materialCount <= 50);
  assert.equal(initial.materials.stats.responseTextureCount, 6);
  assert.equal(initial.materials.stats.engineeringEnabled, true);
  assert.deepEqual(initial.materials.red, { color: 0xd71920, metalness: 0.02, roughness: 0.32 });
  assert.deepEqual(initial.materials.glass, { transmission: 0.84, opacity: 0.18, depthWrite: false });
  assert.deepEqual(initial.materials.shell, { opacity: 0.18, depthWrite: false });
  assert.equal(initial.layerState.cutaway, true);
  assert.equal(initial.layerState.rs485, true);
  checks.push('ready-marker-shell-structural-webgl-dpr-groups');

  const networkEvidencePriority = await page.evaluate(() => {
    const app = globalThis.__cinemexApp;
    const asset = app.architectureAsset;
    app.cameraController.applyPreset('complete-network');
    app.runtime.setLookdevCamera('complete-network');
    const viewport = {
      width: app.runtime.renderer.domElement.clientWidth,
      height: app.runtime.renderer.domElement.clientHeight,
    };
    asset.setEvidenceCamera('complete-network', {
      camera: app.runtime.camera,
      viewport,
    });
    app.runtime.scene.updateMatrixWorld(true);
    app.runtime.render();
    const visibleLabels = asset.billboards.filter((sprite) => sprite.visible);
    const panel = asset.networkSchematic.root.getObjectByName('architecture-system-diagram-board-panel');
    const Vector3Class = app.runtime.camera.position.constructor;
    const corner = new Vector3Class();
    const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    panel.updateMatrixWorld(true);
    for (const xSign of [-1, 1]) {
      for (const ySign of [-1, 1]) {
          corner.set(17 * xSign, 7 * ySign, 0)
            .applyMatrix4(panel.matrixWorld)
            .project(app.runtime.camera);
          const x = (corner.x + 1) * viewport.width / 2;
          const y = (1 - corner.y) * viewport.height / 2;
          bounds.minX = Math.min(bounds.minX, x);
          bounds.minY = Math.min(bounds.minY, y);
          bounds.maxX = Math.max(bounds.maxX, x);
          bounds.maxY = Math.max(bounds.maxY, y);
      }
    }
    const model = asset.networkSchematic.model;
    const densePhysical = asset.meshes.filter((mesh) => (
      /^structural-(?:rs485|lorawan|internet|zones)-/.test(mesh.name)
        || /^surface-(?:rs485|lorawan|internet)-/.test(mesh.name)
    ));
    const ug67Body = asset.meshes.find((mesh) => mesh.userData.entities?.some(({ kind }) => kind === 'ug67-device'));
    return {
      schematicVisible: asset.networkSchematic.root.visible,
      technicalLabelsVisible: visibleLabels.length,
      densePhysicalVisible: densePhysical.filter((mesh) => mesh.visible).length,
      realUg67Visible: Boolean(ug67Body?.visible && ug67Body.parent?.visible),
      evidenceOnly: model.evidenceOnly,
      topologyImpact: model.topologyImpact,
      thermostatCount: model.thermostatCount,
      busTexts: model.buses.map(({ text }) => text),
      uc100Ids: model.buses.map(({ uc100Id }) => uc100Id),
      canonicalOrder: model.canonicalOrder,
      noShortcut: !model.edges.some(({ from, to }) => from.startsWith('TC300-') && to === 'UG67-01'),
      lorawanPorts: asset.networkSchematic.layout.lorawanLanes.map(({ portY }) => portY),
      layoutOverlaps: asset.networkSchematic.layout.overlaps.length,
      layoutIntersections: asset.networkSchematic.layout.intersections.length,
      bridge: model.bridge,
      texture: {
        size: [asset.networkSchematic.texture.image.width, asset.networkSchematic.texture.image.height],
        colorSpace: asset.networkSchematic.texture.colorSpace,
        mipmaps: asset.networkSchematic.texture.generateMipmaps,
      },
      viewport,
      bounds,
      occupancyWidth: (bounds.maxX - bounds.minX) / viewport.width,
      occupancyHeight: (bounds.maxY - bounds.minY) / viewport.height,
    };
  });
  assert.equal(networkEvidencePriority.schematicVisible, true);
  assert.equal(networkEvidencePriority.technicalLabelsVisible, 0);
  assert.equal(networkEvidencePriority.densePhysicalVisible, 0);
  assert.equal(networkEvidencePriority.realUg67Visible, true);
  assert.equal(networkEvidencePriority.evidenceOnly, true);
  assert.equal(networkEvidencePriority.topologyImpact, false);
  assert.equal(networkEvidencePriority.thermostatCount, 14);
  assert.deepEqual(networkEvidencePriority.busTexts, [
    'BUS A · TC01/02/03/04/14', 'BUS B · TC06–09', 'BUS C · TC10–13', 'BUS D · TC05',
  ]);
  assert.deepEqual(networkEvidencePriority.uc100Ids, ['UC100-A', 'UC100-B', 'UC100-C', 'UC100-D']);
  assert.deepEqual(networkEvidencePriority.canonicalOrder, [
    'TC300', 'RS-485 / Modbus RTU', 'UC100', 'LoRaWAN RF', 'UG67-01',
    'Ethernet / Internet', 'Niagara Supervisor', 'PC / Tablet / Smartphone',
  ]);
  assert.equal(networkEvidencePriority.noShortcut, true);
  assert.equal(new Set(networkEvidencePriority.lorawanPorts).size, 4);
  assert.equal(networkEvidencePriority.layoutOverlaps, 0);
  assert.equal(networkEvidencePriority.layoutIntersections, 0);
  assert.deepEqual(networkEvidencePriority.bridge.origin, [3.15, 3.5, 2]);
  assert.equal(networkEvidencePriority.bridge.label, 'UG67-01 · UBICACIÓN REAL');
  assert.deepEqual(networkEvidencePriority.texture.size, [2048, 840]);
  assert.equal(networkEvidencePriority.texture.colorSpace, 'srgb');
  assert.equal(networkEvidencePriority.texture.mipmaps, true);
  assert.ok(networkEvidencePriority.bounds.minX >= networkEvidencePriority.viewport.width * 0.02, JSON.stringify(networkEvidencePriority));
  assert.ok(networkEvidencePriority.bounds.maxX <= networkEvidencePriority.viewport.width * 0.98, JSON.stringify(networkEvidencePriority));
  assert.ok(networkEvidencePriority.bounds.minY >= networkEvidencePriority.viewport.height * 0.02, JSON.stringify(networkEvidencePriority));
  assert.ok(networkEvidencePriority.bounds.maxY <= networkEvidencePriority.viewport.height * 0.98, JSON.stringify(networkEvidencePriority));
  // The board now stands behind the shell and above every roof so it can occlude neither the
  // building nor the UG67 -> router Ethernet run. It is therefore farther away, and its vertical
  // occupancy is necessarily smaller: it must stay a readable summary, not a slab over the model.
  assert.ok(networkEvidencePriority.occupancyWidth >= 0.22, JSON.stringify(networkEvidencePriority));
  assert.ok(networkEvidencePriority.occupancyHeight >= 0.1, JSON.stringify(networkEvidencePriority));
  checks.push('derived-network-schematic-canonical-order-and-viewport');

  const rs485Evidence = await page.evaluate(() => {
    const app = globalThis.__cinemexApp;
    const viewport = {
      width: app.runtime.renderer.domElement.clientWidth,
      height: app.runtime.renderer.domElement.clientHeight,
    };
    app.cameraController.applyPreset('rs485-master');
    app.runtime.setLookdevCamera('rs485-master');
    app.architectureAsset.setEvidenceCamera('rs485-master', { camera: app.runtime.camera, viewport });
    const visible = app.architectureAsset.billboards.filter((sprite) => sprite.visible);
    const countByKind = Object.fromEntries([...new Set(visible.map((sprite) => sprite.userData.billboardKind))]
      .sort().map((kind) => [kind, visible.filter((sprite) => sprite.userData.billboardKind === kind).length]));
    const densePhysical = app.architectureAsset.meshes.filter((mesh) => (
      /^structural-(?:rs485|lorawan|internet|zones)-/.test(mesh.name)
        || /^surface-(?:rs485|lorawan|internet)-/.test(mesh.name)
    ));
    return {
      countByKind,
      densePhysicalRestored: densePhysical.every((mesh) => mesh.visible),
      schematicHidden: !app.architectureAsset.networkSchematic.root.visible,
    };
  });
  assert.deepEqual(rs485Evidence, {
    countByKind: { 'bus-group': 4, tc300: 14, uc100: 4 },
    densePhysicalRestored: true,
    schematicHidden: true,
  });
  checks.push('surface-rs485-complete-thermostat-evidence');

  const directionMarkerPresetEvidence = await page.evaluate(() => {
    const app = globalThis.__cinemexApp;
    const markerMeshes = app.architectureAsset.meshes.filter((mesh) => (
      mesh.userData.entities?.some(({ kind }) => kind === 'media-arrowhead')
    ));
    const viewport = {
      width: app.runtime.renderer.domElement.clientWidth,
      height: app.runtime.renderer.domElement.clientHeight,
    };
    const project = (vector) => {
      const projected = vector.clone().project(app.runtime.camera);
      return {
        x: (projected.x + 1) * viewport.width / 2,
        y: (1 - projected.y) * viewport.height / 2,
        ndc: projected,
      };
    };
    const Vector3Class = app.runtime.camera.position.constructor;
    const QuaternionClass = app.runtime.camera.quaternion.constructor;
    const Matrix4Class = app.runtime.camera.matrixWorld.constructor;
    const matrix = new Matrix4Class();
    const worldMatrix = new Matrix4Class();
    const position = new Vector3Class();
    const quaternion = new QuaternionClass();
    const scale = new Vector3Class();
    const localAxis = new Vector3Class(0, 0, 1);
    const corner = new Vector3Class();
    const cameras = {};

    for (const cameraName of ['ug67']) {
      app.cameraController.applyPreset(cameraName);
      app.runtime.setLookdevCamera(cameraName);
      app.architectureAsset.setEvidenceCamera(cameraName, { camera: app.runtime.camera, viewport });
      app.runtime.scene.updateMatrixWorld(true);
      app.runtime.render();

      const markers = [];
      for (const mesh of markerMeshes) {
        const positions = mesh.geometry.attributes.position;
        for (const entity of mesh.userData.entities) {
          mesh.getMatrixAt(entity.instanceId, matrix);
          worldMatrix.multiplyMatrices(mesh.matrixWorld, matrix);
          worldMatrix.decompose(position, quaternion, scale);
          const axis = localAxis.clone().applyQuaternion(quaternion).normalize();
          const renderedLength = mesh.userData.baseLength * scale.z;
          const base = position.clone().addScaledVector(axis, -renderedLength / 2);
          const tip = position.clone().addScaledVector(axis, renderedLength / 2);
          const baseScreen = project(base);
          const tipScreen = project(tip);
          const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
          const projectedVertices = [];
          for (let vertex = 0; vertex < positions.count; vertex += 1) {
            corner.fromBufferAttribute(positions, vertex).applyMatrix4(worldMatrix);
            const screen = project(corner);
            bounds.minX = Math.min(bounds.minX, screen.x);
            bounds.minY = Math.min(bounds.minY, screen.y);
            bounds.maxX = Math.max(bounds.maxX, screen.x);
            bounds.maxY = Math.max(bounds.maxY, screen.y);
            projectedVertices.push(screen);
          }
          const axisX = tipScreen.x - baseScreen.x;
          const axisY = tipScreen.y - baseScreen.y;
          const axisLength = Math.hypot(axisX, axisY);
          const perpendicularX = -axisY / axisLength;
          const perpendicularY = axisX / axisLength;
          const lateral = projectedVertices.map((screen) => (
            (screen.x - baseScreen.x) * perpendicularX + (screen.y - baseScreen.y) * perpendicularY
          ));
          const routeAnchor = new Vector3Class(...entity.routeAnchor);
          const routeTangent = new Vector3Class(...entity.routeTangent).normalize();
          markers.push({
            routeComponentId: entity.routeComponentId,
            baseContactPx: base.distanceTo(routeAnchor),
            tangentDot: axis.dot(routeTangent),
            projectedLengthPx: Math.hypot(tipScreen.x - baseScreen.x, tipScreen.y - baseScreen.y),
            projectedWidthPx: Math.max(...lateral) - Math.min(...lateral),
            visible: Math.abs(baseScreen.ndc.x) <= 1.05 && Math.abs(baseScreen.ndc.y) <= 1.05
              && baseScreen.ndc.z >= -1 && baseScreen.ndc.z <= 1,
            bounds,
          });
        }
      }
      let overlapCount = 0;
      let minimumSeparationPx = Infinity;
      const overlapPairs = [];
      const visible = markers.filter((marker) => marker.visible);
      for (let left = 0; left < visible.length; left += 1) {
        for (let right = left + 1; right < visible.length; right += 1) {
          const a = visible[left].bounds;
          const b = visible[right].bounds;
          if (a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY) {
            overlapCount += 1;
            overlapPairs.push([visible[left].routeComponentId, visible[right].routeComponentId]);
          }
          const dx = Math.max(a.minX - b.maxX, b.minX - a.maxX, 0);
          const dy = Math.max(a.minY - b.maxY, b.minY - a.maxY, 0);
          minimumSeparationPx = Math.min(minimumSeparationPx, Math.hypot(dx, dy));
        }
      }
      cameras[cameraName] = {
        count: markers.length,
        uniqueRoutes: new Set(markers.map(({ routeComponentId }) => routeComponentId)).size,
        contact: markers.every(({ baseContactPx }) => baseContactPx <= 1e-6),
        tangentAligned: markers.every(({ tangentDot }) => tangentDot >= 0.999999),
        minProjectedPx: Math.min(...visible.map(({ projectedLengthPx }) => projectedLengthPx)),
        maxProjectedPx: Math.max(...visible.map(({ projectedLengthPx }) => projectedLengthPx)),
        maxProjectedWidthPx: Math.max(...visible.map(({ projectedWidthPx }) => projectedWidthPx)),
        minimumSeparationPx,
        overlapCount,
        overlapPairs,
        visibleMarkers: visible.map(({ routeComponentId, bounds, projectedWidthPx }) => ({ routeComponentId, bounds, projectedWidthPx })),
      };
    }
    return cameras;
  });
  for (const [cameraName, evidence] of Object.entries(directionMarkerPresetEvidence)) {
    assert.equal(evidence.count, 9, `${cameraName} marker count`);
    assert.equal(evidence.uniqueRoutes, 9, `${cameraName} one marker per route component`);
    assert.equal(evidence.contact, true, `${cameraName} marker base contact`);
    assert.equal(evidence.tangentAligned, true, `${cameraName} marker tangent alignment`);
    assert.ok(evidence.minProjectedPx >= 16, `${cameraName} marker minimum: ${evidence.minProjectedPx}`);
    assert.ok(evidence.maxProjectedPx <= 18, `${cameraName} marker cap: ${evidence.maxProjectedPx}`);
    assert.ok(evidence.maxProjectedWidthPx <= 8, `${cameraName} marker width: ${JSON.stringify(evidence)}`);
    assert.ok(evidence.minimumSeparationPx >= 8, `${cameraName} marker separation: ${JSON.stringify(evidence)}`);
    assert.equal(evidence.overlapCount, 0, `${cameraName} visible marker overlap: ${JSON.stringify(evidence)}`);
  }
  checks.push('surface-arrowhead-contact-tangent-size-nonoverlap');

  const surfaceStability = await page.evaluate(() => {
    const app = globalThis.__cinemexApp;
    const before = app.architectureAsset.getSurfaceState();
    const labelChildren = app.runtime.groups.labels.children.length;
    app.architectureAsset.setSurfaceFrame({ posterFrame: 1, displayFrame: 1 });
    app.layerController.setLayer('labels', false);
    const after = app.architectureAsset.getSurfaceState();
    const hiddenChildren = app.runtime.groups.labels.children.length;
    app.layerController.setLayer('labels', true);
    app.architectureAsset.setSurfaceFrame({ posterFrame: 0, displayFrame: 0 });
    return {
      sameFingerprint: before.placementFingerprint === after.placementFingerprint,
      childCoverageStable: labelChildren === hiddenChildren,
      frameSwap: after.visibleFrames,
    };
  });
  assert.equal(surfaceStability.sameFingerprint, true);
  assert.equal(surfaceStability.childCoverageStable, true);
  assert.deepEqual(surfaceStability.frameSwap, {
    poster0: false, poster1: true, display0: false, display1: true,
  });
  checks.push('surface-frame-and-label-visibility-only');

  const integrityPairs = [
    {
      name: 'concessions-frame0-frame1',
      left: { name: 'concessions-frame0', camera: 'concessions', posterFrame: 0, displayFrame: 0, labels: true, roof: false, walls: true },
      right: { name: 'concessions-frame1', camera: 'concessions', posterFrame: 1, displayFrame: 1, labels: true, roof: false, walls: true },
      allowed: (key) => /surface-atlas-(?:poster|display)-[01]$/.test(key),
    },
    {
      name: 'corridor-labels-on-off',
      left: { name: 'corridor-labels-on', camera: 'corridor', posterFrame: 1, displayFrame: 1, labels: true, roof: false, walls: false },
      right: { name: 'corridor-labels-off', camera: 'corridor', posterFrame: 1, displayFrame: 1, labels: false, roof: false, walls: false },
      allowed: (key) => key.startsWith('labels:'),
    },
    {
      name: 'sala3-frame0-frame1',
      left: { name: 'sala3-frame0', camera: 'sala-3', posterFrame: 0, displayFrame: 0, labels: true, roof: false, walls: true },
      right: { name: 'sala3-frame1', camera: 'sala-3', posterFrame: 1, displayFrame: 1, labels: true, roof: false, walls: true },
      allowed: (key) => /surface-atlas-(?:poster|display)-[01]$/.test(key),
    },
  ];
  for (const pair of integrityPairs) {
    const left = await captureLiveSceneSnapshot(page, pair.left);
    const leftPixelHash = await pixelRegionHash(page);
    const right = await captureLiveSceneSnapshot(page, pair.right);
    const rightPixelHash = await pixelRegionHash(page);
    const changedGenerated = generatedDiff(left, right);
    assert.ok(left.nonGeneratedCount > 30, `${pair.name} must hash the live non-generated scene (${left.nonGeneratedCount})`);
    assert.equal(left.nonGeneratedCount, right.nonGeneratedCount, `${pair.name} object coverage`);
    assert.equal(left.nonGeneratedHash, right.nonGeneratedHash, `${pair.name} non-generated world snapshot`);
    assert.equal(left.cameraHash, right.cameraHash, `${pair.name} fixed camera`);
    assert.equal(leftPixelHash, rightPixelHash, `${pair.name} generated-mask pixel coverage`);
    assert.ok(changedGenerated.length > 0, `${pair.name} must exercise an intended toggle`);
    assert.ok(changedGenerated.every(pair.allowed), `${pair.name} changed unexpected generated objects: ${changedGenerated.join(', ')}`);
    surfaceIntegrity[pair.name] = {
      nonGeneratedCount: left.nonGeneratedCount,
      generatedCount: left.generatedCount,
      nonGeneratedHash: left.nonGeneratedHash,
      cameraHash: left.cameraHash,
      pixelMaskHash: leftPixelHash,
      changedGenerated,
    };
  }
  checks.push('live-scene-snapshot-and-masked-pixel-pairs');

  await page.click('#navigation-toggle');
  await page.keyboard.press('KeyW');
  const firstPerson = await page.evaluate(() => ({
    query: location.search,
    mode: globalThis.__cinemexApp.cameraController.getState().navigation,
    y: globalThis.__cinemexApp.runtime.camera.position.y,
  }));
  assert.match(firstPerson.query, /nav=first-person/);
  assert.equal(firstPerson.mode, 'first-person');
  assert.equal(firstPerson.y, 1.7);
  checks.push('bounded-first-person-toggle');

  await page.click('[data-camera="lobby"]');
  const lobbyPreset = await page.evaluate(() => ({
    query: location.search,
    navigation: globalThis.__cinemexApp.cameraController.getState().navigation,
    preset: globalThis.__cinemexApp.cameraController.getState().activePreset,
  }));
  assert.match(lobbyPreset.query, /camera=lobby/);
  assert.match(lobbyPreset.query, /nav=orbit/);
  assert.deepEqual(lobbyPreset, { query: lobbyPreset.query, navigation: 'orbit', preset: 'lobby' });
  checks.push('camera-preset-query-sync');

  await page.click('[data-view="architecture"]');
  const architectureView = await page.evaluate(() => ({
    state: globalThis.__cinemexApp.layerController.getState(),
    architecture: globalThis.__cinemexApp.runtime.groups.architecture.visible,
    hvac: globalThis.__cinemexApp.runtime.groups.hvac.visible,
  }));
  assert.equal(architectureView.state.view, 'architecture');
  assert.equal(architectureView.architecture, true);
  assert.equal(architectureView.hvac, false);
  checks.push('semantic-layer-view-toggle');

  await page.setViewport({ width: 960, height: 640, deviceScaleFactor: 2 });
  await page.waitForFunction(() => {
    const canvas = globalThis.__cinemexApp?.runtime?.renderer?.domElement;
    if (!canvas) return false;
    return canvas.width > canvas.clientWidth
      && canvas.width <= Math.ceil(canvas.clientWidth * 1.5)
      && canvas.height > canvas.clientHeight
      && canvas.height <= Math.ceil(canvas.clientHeight * 1.5);
  }, { timeout: 5_000, polling: 25 });
  const resized = await page.evaluate(() => {
    const canvas = globalThis.__cinemexApp.runtime.renderer.domElement;
    return { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight };
  });
  assert.ok(
    resized.width > resized.clientWidth && resized.width <= Math.ceil(resized.clientWidth * 1.5),
    `width DPR bounds: ${JSON.stringify(resized)}`,
  );
  assert.ok(
    resized.height > resized.clientHeight && resized.height <= Math.ceil(resized.clientHeight * 1.5),
    `height DPR bounds: ${JSON.stringify(resized)}`,
  );
  checks.push('resize-dpr-cap');

  const disposed = await page.evaluate(() => {
    globalThis.__cinemexApp.dispose();
    return { canvasCount: document.querySelectorAll('#viewer canvas').length, appPresent: Boolean(globalThis.__cinemexApp) };
  });
  assert.deepEqual(disposed, { canvasCount: 0, appPresent: false });
  checks.push('runtime-disposal');

  assert.deepEqual(issues, []);
  console.log(JSON.stringify({
    status: 'PASS',
    url: baseUrl,
    transport,
    checks,
    networkEvidencePriority,
    rs485Evidence,
    directionMarkerPresetEvidence,
    surfaceIntegrity,
    issues,
  }, null, 2));
} finally {
  await page.close();
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
