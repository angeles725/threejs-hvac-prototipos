import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ARCHITECTURE_ASSET_ID,
  createArchitecturePlan,
} from '../src/scene/architecture.js';

const APP_ROOT = new URL('../', import.meta.url);

function span([minimum, maximum]) {
  return maximum - minimum;
}

test('shell plan preserves the 60 by 45 metre footprint and exact depth bands', () => {
  const plan = createArchitecturePlan();

  assert.equal(plan.assetId, ARCHITECTURE_ASSET_ID);
  assert.deepEqual(plan.footprint, { x: [-30, 30], z: [-22.5, 22.5] });
  assert.equal(span(plan.footprint.x), 60);
  assert.equal(span(plan.footprint.z), 45);
  assert.deepEqual(plan.bands.map(({ id, bounds }) => [id, span(bounds.z)]), [
    ['front-public', 12],
    ['auditorium-spine', 29],
    ['rear-service', 4],
  ]);
  assert.deepEqual(plan.centralCorridor.bounds, { x: [-3.5, 3.5], z: [-18.5, 10.5] });
  assert.equal(span(plan.centralCorridor.bounds.x), 7);
});

test('shell plan exposes four auditorium portals per side in stable room order', () => {
  const { portals } = createArchitecturePlan();
  const west = portals.filter(({ side }) => side === 'west');
  const east = portals.filter(({ side }) => side === 'east');

  assert.equal(portals.length, 8);
  assert.deepEqual(west.map(({ auditoriumId }) => auditoriumId), [
    'auditorium-sala-1', 'auditorium-sala-2', 'auditorium-sala-3', 'auditorium-sala-4',
  ]);
  assert.deepEqual(east.map(({ auditoriumId }) => auditoriumId), [
    'auditorium-sala-5', 'auditorium-sala-6', 'auditorium-sala-7', 'auditorium-sala-8',
  ]);
  assert.ok(portals.every(({ width, height, metadata }) => (
    width === 2.2
      && height === 2.4
      && metadata.assetId === ARCHITECTURE_ASSET_ID
      && metadata.kind === 'auditorium-portal'
      && metadata.requirementIds.includes('CIN-ARCH-001')
  )));
});

test('auditorium perimeter walls rise to each configured family height', () => {
  const plan = createArchitecturePlan();

  assert.equal(plan.auditoriumOuterWalls.length, 8);
  assert.deepEqual(
    plan.auditoriumOuterWalls.map(({ auditoriumId, height }) => [auditoriumId, height]),
    plan.auditoriums.map(({ id, height }) => [id, height]),
  );
  assert.deepEqual(
    [...new Set(plan.auditoriumOuterWalls.map(({ height }) => height))].sort(),
    [7.2, 8, 8.8],
  );
});

test('rear technical rooms remain disjoint from the service circulation strip', () => {
  const plan = createArchitecturePlan();
  const corridor = plan.rearTechnical.serviceCorridor;

  assert.equal(span(corridor.bounds.z), 1.5);
  assert.equal(plan.rearTechnical.rooms.length, 4);
  for (const room of plan.rearTechnical.rooms) {
    assert.ok(room.bounds.z[1] < corridor.bounds.z[0]);
    assert.equal(Number((corridor.bounds.z[0] - room.bounds.z[1]).toFixed(3)), 0.2);
    assert.equal(room.metadata.kind, 'technical-room');
  }
});

test('facade plan includes a red marquee, legible identity mass and accessible entrance bank', () => {
  const { facade } = createArchitecturePlan();

  assert.equal(facade.marquee.materialKey, 'brand-red');
  assert.deepEqual(facade.marquee.size, [34, 0.55, 2.2]);
  assert.equal(facade.identity.text, 'Cinemex');
  assert.equal(facade.identity.kind, 'seven-segment-wordmark-proxy');
  assert.equal(facade.entrances.length, 5);
  assert.ok(facade.entrances.some(({ accessibleWidth }) => accessibleWidth >= 1.2));
  assert.ok(facade.entrances.every(({ metadata }) => (
    metadata.assetId === ARCHITECTURE_ASSET_ID
      && metadata.requirementIds.includes('CIN-ARCH-002')
  )));
});

test('blockout correction exposes countable auditorium and front-of-house proxies', () => {
  const { blockoutProxies } = createArchitecturePlan();

  assert.equal(blockoutProxies.auditoriums.length, 8);
  assert.deepEqual(
    Object.fromEntries(Object.entries(Object.groupBy(
      blockoutProxies.auditoriums,
      ({ family }) => family,
    )).map(([family, proxies]) => [family, proxies.length])),
    { large: 2, medium: 4, small: 2 },
  );
  assert.ok(blockoutProxies.auditoriums.every((proxy) => (
    proxy.screenSlab
      && proxy.tierCount >= 3
      && proxy.aisleGapWidth >= 0.8
      && proxy.wheelchairBayWidth >= 1.2
  )));

  assert.deepEqual(
    blockoutProxies.frontOfHouse.map(({ kind }) => kind),
    ['lobby', 'ticketing', 'waiting', 'concession-counter', 'kitchen-workline', 'checkpoint-lane'],
  );
  assert.ok(blockoutProxies.frontOfHouse.every(({ materialKey }) => materialKey.startsWith('foh-')));
});

test('final blockout retry repeats three categorical auditorium family profiles', () => {
  const { blockoutProxies } = createArchitecturePlan();
  const expected = {
    large: {
      proxyWidth: 24,
      volumeHeight: 8.4,
      tierCount: 7,
      screenSize: [0.18, 5.2, 7.2],
    },
    medium: {
      proxyWidth: 20,
      volumeHeight: 6,
      tierCount: 5,
      screenSize: [0.18, 3.9, 5],
    },
    small: {
      proxyWidth: 16,
      volumeHeight: 3.8,
      tierCount: 3,
      screenSize: [0.18, 2.7, 3.2],
    },
  };

  for (const [family, profile] of Object.entries(expected)) {
    const members = blockoutProxies.auditoriums.filter((proxy) => proxy.family === family);
    assert.ok(members.length > 0);
    assert.ok(members.every((proxy) => (
      proxy.proxyWidth === profile.proxyWidth
        && proxy.volumeHeight === profile.volumeHeight
        && proxy.tierCount === profile.tierCount
        && JSON.stringify(proxy.screenSize) === JSON.stringify(profile.screenSize)
    )));
  }
});

test('every auditorium proxy declares continuous aisle and a visibly empty wheelchair notch', () => {
  const { blockoutProxies } = createArchitecturePlan();

  assert.ok(blockoutProxies.auditoriums.every((proxy) => (
    proxy.aisleGap.continuous === true
      && proxy.aisleGap.width >= 1.1
      && proxy.wheelchairBay.clear === true
      && proxy.wheelchairBay.width >= 1.8
      && proxy.wheelchairBay.clearTierCount >= 2
  )));
});

test('Sala 3 RS-485 trunk is lowered and routed along the corridor edge', () => {
  const { topologyProxies } = createArchitecturePlan();
  const trunk = topologyProxies.rs485Trunks.find(({ id }) => id === 'rs485-trunk-b');

  assert.ok(trunk.start[1] <= 0.35 && trunk.end[1] <= 0.35);
  assert.ok(trunk.start[0] >= -5.2 && trunk.end[0] >= -5.2);
});

test('blockout correction exposes exact endpoint and media proxy counts', () => {
  const { topologyProxies } = createArchitecturePlan();

  assert.equal(topologyProxies.tc300.length, 14);
  assert.equal(topologyProxies.uc100.length, 4);
  assert.equal(topologyProxies.ug67.antennas, 2);
  assert.deepEqual(topologyProxies.external.map(({ kind }) => kind), [
    'router', 'cloud', 'server', 'pc', 'tablet', 'phone',
  ]);
  assert.equal(new Set(topologyProxies.external.map(({ materialKey }) => materialKey)).size, 6);
  assert.equal(topologyProxies.rs485Trunks.length, 4);
  assert.equal(topologyProxies.rs485Drops.length, 14);
  assert.equal(topologyProxies.lorawanLinks.length, 4);
  assert.equal(topologyProxies.ipChain.id, 'conceptual-ip-chain');
  assert.ok(topologyProxies.lorawanLinks.every(({ physical }) => physical === false));
});

test('application composition wires only the surface shell asset builder into the runtime', async () => {
  const main = await readFile(new URL('main.js', APP_ROOT), 'utf8');
  const html = await readFile(new URL('index.html', APP_ROOT), 'utf8');

  assert.match(main, /createArchitectureStructure/);
  assert.doesNotMatch(main, /createArchitectureBlockout/);
  assert.match(main, /architectureAsset\.dispose\(\)/);
  assert.match(main, /architectureAsset\.setEvidenceCamera\(/);
  assert.doesNotMatch(main, /create(?:FrontOfHouse|Auditorium|Device|Network)/);
  assert.match(html, /id="pass-label"[^>]*>Pase P6 FINAL/);
});

test('silhouette reset exposes one-view room, family, FOH and rear-strip billboards', () => {
  const plan = createArchitecturePlan();
  const architectureLabels = plan.billboards.architecture;
  const roomLabels = architectureLabels.filter(({ kind }) => kind === 'room-family');

  assert.deepEqual(roomLabels.map(({ text }) => text), [
    '1 · L', '2 · M', '3 · M', '4 · S',
    '5 · L', '6 · M', '7 · M', '8 · S',
  ]);
  assert.ok(roomLabels.every(({ billboard, halo }) => billboard === true && halo === true));
  assert.deepEqual(
    architectureLabels.filter(({ kind }) => kind === 'foh').map(({ text }) => text),
    ['LOBBY / TICKETS', 'CONCESSIONS', 'KITCHEN', 'CHECKPOINT'],
  );
  assert.equal(architectureLabels.find(({ kind }) => kind === 'rear-strip').text, 'REAR SERVICE');
  const wheelchairLabel = architectureLabels.find(({ kind }) => kind === 'wheelchair-void');
  assert.equal(wheelchairLabel, undefined);
  assert.ok(roomLabels.every(({ visibilityScope }) => visibilityScope === 'overview'));
});

test('silhouette reset keeps device geometry true-scale and adds countable halo labels', () => {
  const plan = createArchitecturePlan();
  const technical = plan.billboards.technical;

  assert.equal(technical.filter(({ kind }) => kind === 'tc300').length, 14);
  assert.equal(technical.filter(({ kind }) => kind === 'uc100').length, 4);
  assert.equal(technical.filter(({ kind }) => kind === 'ug67').length, 1);
  assert.equal(technical.filter(({ kind }) => kind === 'external').length, 6);
  assert.deepEqual(
    technical.filter(({ kind }) => kind === 'bus-group').map(({ text }) => text),
    ['BUS A', 'BUS B', 'BUS C', 'BUS D'],
  );
  assert.ok(technical.every(({ billboard, halo }) => billboard === true && halo === true));
  assert.deepEqual(plan.topologyProxies.tc300[0].size, [0.34, 0.5, 0.2]);
  assert.deepEqual(plan.topologyProxies.uc100[0].size, [0.75, 1, 0.28]);
});

test('silhouette reset separates FOH silhouettes and leaves checkpoint access open', () => {
  const { blockoutProxies } = createArchitecturePlan();
  const checkpoint = blockoutProxies.frontOfHouse.find(({ kind }) => kind === 'checkpoint-lane');
  const concession = blockoutProxies.frontOfHouse.find(({ kind }) => kind === 'concession-counter');
  const kitchen = blockoutProxies.frontOfHouse.find(({ kind }) => kind === 'kitchen-workline');

  assert.ok(checkpoint.accessGapWidth >= 2.4);
  assert.equal(checkpoint.openAccess, true);
  assert.ok(concession.position[2] - kitchen.position[2] >= 3);
  assert.notDeepEqual(concession.size, kitchen.size);
});

test('silhouette reset spreads LoRa lanes and the external client fan without changing semantics', () => {
  const { topologyProxies } = createArchitecturePlan();

  assert.ok(topologyProxies.lorawanLinks.every(({ via, renderEnd, physical }) => (
    via.length === 1 && renderEnd.length === 3 && physical === false
  )));
  assert.equal(new Set(topologyProxies.lorawanLinks.map(({ via }) => via[0][0])).size, 4);
  const clientZ = topologyProxies.external.slice(3).map(({ position }) => position[2]);
  assert.ok(Math.max(...clientZ) - Math.min(...clientZ) >= 16);
  assert.deepEqual(topologyProxies.rs485Trunks.map(({ groupId }) => groupId), ['A', 'B', 'C', 'D']);
});

test('structural plan declares buildable slab, wall and family-height roof sections', () => {
  const { structural, auditoriums } = createArchitecturePlan();

  assert.equal(structural.pass, 'structural');
  assert.deepEqual(structural.sections, {
    foundationSlabThickness: 0.25,
    roofPanelThickness: 0.22,
    exteriorWallThickness: 0.4,
    interiorWallThickness: 0.25,
  });
  assert.equal(structural.auditoriumShells.length, 8);
  assert.deepEqual(
    structural.auditoriumShells.map(({ auditoriumId, family, wallHeight, roofElevation }) => (
      [auditoriumId, family, wallHeight, roofElevation]
    )),
    auditoriums.map(({ id, family, height }) => [id, family, height, height]),
  );
  assert.ok(structural.auditoriumShells.every(({ roofPanelThickness, perimeterClosed }) => (
    roofPanelThickness === 0.22 && perimeterClosed === true
  )));
});

test('structural plan uses true framed openings for auditorium and emergency doors', () => {
  const { structural } = createArchitecturePlan();

  assert.equal(structural.portalAssemblies.length, 8);
  assert.ok(structural.portalAssemblies.every(({ opening, frame, door }) => (
    opening.trueOpening === true
      && opening.clearWidth === 2.2
      && opening.clearHeight === 2.4
      && frame.jambThickness === 0.14
      && frame.depth === 0.72
      && door.type === 'acoustic-double-leaf'
      && door.leafCount === 2
  )));
  assert.equal(structural.emergencyDoors.length, 8);
  assert.ok(structural.emergencyDoors.every(({ opening, door }) => (
    opening.trueOpening === true
      && opening.opensTo === 'exterior'
      && door.type === 'acoustic-emergency'
  )));
});

test('structural facade has five framed glazed entries with an accessible centre opening and supported signage', () => {
  const { structural } = createArchitecturePlan();
  const entrances = structural.facade.entranceAssemblies;

  assert.equal(entrances.length, 5);
  assert.deepEqual(entrances.map(({ opening }) => opening.clearWidth), [0.9, 0.9, 1.4, 0.9, 0.9]);
  assert.equal(entrances[2].opening.accessible, true);
  assert.ok(entrances.every(({ opening, frame, glazing }) => (
    opening.trueOpening === true
      && frame.jambThickness === 0.1
      && glazing.safetyGlass === true
  )));
  assert.equal(structural.facade.marqueeSupports.length, 6);
  assert.equal(structural.facade.signSupports.length, 4);
  assert.ok(structural.facade.marqueeSupports.every(({ attached }) => attached === true));
});

test('structural rear technical rooms have walls and doors opening into the disjoint service corridor', () => {
  const { structural, rearTechnical } = createArchitecturePlan();

  assert.equal(structural.rearTechnical.rooms.length, 4);
  assert.equal(structural.rearTechnical.serviceDoors.length, 4);
  assert.ok(structural.rearTechnical.serviceDoors.every(({ opening, position }) => (
    opening.trueOpening === true
      && opening.opensTo === rearTechnical.serviceCorridor.id
      && opening.clearWidth >= 1
      && position[2] > rearTechnical.rooms[0].bounds.z[1]
  )));
  assert.ok(structural.rearTechnical.rooms.every(({ enclosed, wallThickness }) => (
    enclosed === true && wallThickness === 0.2
  )));
});

test('structural containment exposes owned contact-coherent sockets without physical LoRa geometry', () => {
  const { structural, topologyProxies } = createArchitecturePlan();
  const { containment } = structural;

  assert.equal(containment.uc100BusRoots.length, 4);
  assert.ok(containment.uc100BusRoots.every(({ contactCoherent, socketOwner, medium }) => (
    contactCoherent === true && socketOwner.startsWith('UC100-') && medium === 'rs485'
  )));
  assert.equal(containment.ug67AntennaRoots.length, 2);
  assert.ok(containment.ug67AntennaRoots.every(({ contactCoherent, vertical }) => (
    contactCoherent === true && vertical === true
  )));
  assert.deepEqual(
    containment.futureSleeves.map(({ id }) => id),
    ['kitchen-extract-sleeve', 'roof-supply-sleeve', 'roof-return-sleeve'],
  );
  assert.ok(topologyProxies.lorawanLinks.every(({ physical }) => physical === false));
});

test('structural device bodies use documented real dimensions while labels provide legibility', () => {
  const { structural } = createArchitecturePlan();

  assert.equal(structural.devices.tc300.length, 14);
  assert.equal(structural.devices.uc100.length, 4);
  assert.equal(structural.devices.ug67.length, 1);
  assert.deepEqual(structural.devices.tc300[0].size, [0.1, 0.1136, 0.026]);
  assert.deepEqual(structural.devices.uc100[0].size, [0.07, 0.045, 0.013]);
  assert.deepEqual(structural.devices.ug67[0].size, [0.164, 0.24, 0.0909]);
  assert.equal(structural.devices.ug67[0].antennaLength, 0.6);
});

test('structural evidence corrections improve front labels and technical anchor spread', () => {
  const { billboards } = createArchitecturePlan();
  const lobby = billboards.architecture.find(({ id }) => id === 'foh-label-lobby-tickets');
  const checkpoint = billboards.architecture.find(({ id }) => id === 'foh-label-checkpoint');
  const ucLabels = billboards.technical.filter(({ kind }) => kind === 'uc100');
  const gateway = billboards.technical.find(({ kind }) => kind === 'ug67');

  assert.deepEqual(lobby.position, [-10.5, 3.8, 19]);
  assert.deepEqual(checkpoint.position, [7.5, 3.5, 12]);
  assert.equal(new Set(ucLabels.map(({ position }) => `${position[0]}:${position[2]}`)).size, 4);
  assert.ok(ucLabels.every(({ metadata }) => metadata.anchorOffset.length === 3));
  assert.deepEqual(gateway.position, [4.1, 4.15, 1.4]);
  assert.deepEqual(gateway.scale, [1.2, 0.3]);
});

test('materials realism reset uses charcoal frames, neutral later-asset proxies, and a true labels layer', async () => {
  const source = await readFile(new URL('../src/scene/architecture.js', import.meta.url), 'utf8');

  assert.match(source, /'facade-frame-charcoal': 'shellCharcoal'/);
  assert.match(source, /'foh-concession': 'offlineGray'/);
  assert.match(source, /'foh-kitchen': 'offlineGray'/);
  assert.match(source, /groups\.labels\.add\(sprite\)/);
  assert.match(source, /!key\.startsWith\('zone-'\)/);
});

test('structural attempt 2 joins the kitchen hood outlet to a visible vertical extract duct', () => {
  const { structural } = createArchitecturePlan();
  const { kitchenExtraction } = structural;

  assert.deepEqual(kitchenExtraction.hoodBody.size, [3.6, 0.6, 1.6]);
  assert.deepEqual(kitchenExtraction.hoodOutlet.position, kitchenExtraction.duct.socketPosition);
  assert.equal(kitchenExtraction.duct.vertical, true);
  assert.equal(kitchenExtraction.duct.contactOverlap, true);
  assert.equal(kitchenExtraction.routeStubs, 0);
});

test('structural attempt 2 makes every public, auditorium and emergency opening contact-readable', () => {
  const { structural } = createArchitecturePlan();
  const doors = [
    ...structural.portalAssemblies,
    ...structural.emergencyDoors,
    ...structural.rearTechnical.serviceDoors,
  ];

  assert.ok(doors.every(({ opening, frame, door, threshold }) => (
    opening.trueOpening
    && frame.jambThickness >= 0.1
    && frame.headThickness >= 0.12
    && frame.depth >= 0.4
    && door.thickness >= 0.08
    && threshold.depth === frame.depth
  )));
  assert.ok(structural.portalAssemblies.every(({ acousticReturnDepth }) => acousticReturnDepth >= 0.65));
});

test('structural attempt 2 aligns the accessible forecourt route and fully attaches facade supports', () => {
  const { structural } = createArchitecturePlan();
  const centreEntry = structural.facade.entranceAssemblies.find(({ opening }) => opening.accessible);
  const { accessibleRoute } = structural.facade;

  assert.equal(accessibleRoute.width, centreEntry.opening.clearWidth);
  assert.equal(accessibleRoute.centreX, centreEntry.position[0]);
  assert.deepEqual(accessibleRoute.thresholdPosition, [centreEntry.position[0], 0.04, 22.35]);
  assert.ok(structural.facade.marqueeSupports.every(({ facadeContact, canopyContact }) => (
    facadeContact === true && canopyContact === true
  )));
  assert.ok(structural.facade.signSupports.every(({ canopyContact, signContact }) => (
    canopyContact === true && signContact === true
  )));
});

test('structural attempt 2 containment runs terminal-to-terminal through visible junctions and sleeves', () => {
  const { structural, topologyProxies } = createArchitecturePlan();
  const { containment } = structural;

  assert.equal(containment.rs485Routes.length, 4);
  assert.ok(containment.rs485Routes.every(({ terminalOwner, points, contactCoherent }) => (
    terminalOwner.startsWith('UC100-') && points.length >= 4 && contactCoherent === true
  )));
  assert.equal(containment.tc300Drops.length, 14);
  assert.ok(containment.tc300Drops.every(({ terminalOwner, points, junctionId }) => (
    terminalOwner.startsWith('TC300-')
    && junctionId.startsWith('junction-')
    && points.at(-1).owner === terminalOwner
  )));
  assert.ok(containment.wallCrossings.length >= 8);
  assert.ok(containment.wallCrossings.every(({ visible, kind }) => visible && kind === 'sleeve'));
  assert.equal(containment.ug67EthernetPort.owner, 'UG67-01');
  assert.deepEqual(containment.ug67EthernetRoute.points[0], containment.ug67EthernetPort.position);
  assert.ok(containment.ug67AntennaRoots.every(({ seatedOnBody }) => seatedOnBody === true));
  assert.ok(topologyProxies.lorawanLinks.every(({ physical }) => physical === false));
});

test('structural attempt 2 exposes geometry-only 2/4/2 family profiles and human scale references', () => {
  const { structural } = createArchitecturePlan();
  const profiles = structural.auditoriumShells.map(({ family, visibleEnvelope }) => ({ family, ...visibleEnvelope }));

  assert.deepEqual(
    Object.fromEntries(['large', 'medium', 'small'].map((family) => {
      const matches = profiles.filter((profile) => profile.family === family);
      return [family, { count: matches.length, width: matches[0].width, height: matches[0].height, tiers: matches[0].tiers }];
    })),
    {
      large: { count: 2, width: 24, height: 8.4, tiers: 7 },
      medium: { count: 4, width: 20, height: 7.2, tiers: 5 },
      small: { count: 2, width: 16, height: 6, tiers: 3 },
    },
  );
  assert.ok(structural.humanReferences.length >= 4);
  assert.ok(structural.humanReferences.every(({ height, lowPoly }) => height >= 1.65 && lowPoly === true));
});

test('structural attempt 3 gives every family master comparable cinema-specific geometry', () => {
  const { structural } = createArchitecturePlan();
  const masters = structural.auditoriumShells.map(({ family, familyMaster }) => ({ family, ...familyMaster }));

  assert.equal(masters.length, 8);
  assert.ok(masters.every((master) => (
    master.tierCount >= 3
    && master.crossAisle === true
    && master.sideAisles === 2
    && master.wheelchairVoid === true
    && master.screenWall === true
    && master.projectionNiche === true
    && master.entryOpening === true
    && master.emergencyOpening === true
  )));
  assert.deepEqual(
    Object.fromEntries(['large', 'medium', 'small'].map((family) => [
      family,
      masters.find((master) => master.family === family).tierCount,
    ])),
    { large: 7, medium: 5, small: 3 },
  );
});

test('structural attempt 3 keeps all RS-485 routes tray-backed and terminal complete', () => {
  const { structural } = createArchitecturePlan();
  const { rs485Routes, tc300Drops } = structural.containment;

  assert.equal(rs485Routes.length, 4);
  assert.ok(rs485Routes.every(({ points, terminalPosition, trayBacked, junctionContact }) => (
    JSON.stringify(points[0]) === JSON.stringify(terminalPosition)
    && trayBacked === true
    && junctionContact === true
  )));
  assert.equal(tc300Drops.length, 14);
  assert.ok(tc300Drops.every(({ points, terminalPosition, trayBacked, junctionContact }) => (
    JSON.stringify(points.at(-1).position) === JSON.stringify(terminalPosition)
    && points.at(-1).kind === 'terminal'
    && trayBacked === true
    && junctionContact === true
  )));
});

test('structural attempt 3 roof services overlap plenums, mains and owned sleeves', () => {
  const { structural } = createArchitecturePlan();
  const { roofService } = structural;

  assert.deepEqual(roofService.routes.map(({ medium }) => medium), ['supply', 'return']);
  assert.ok(roofService.routes.every(({ plenum, main, sleeve, rootOverlap }) => (
    rootOverlap === true
    && plenum.socketPosition.every((value, axis) => value === sleeve.position[axis])
    && main.owner === plenum.id
    && sleeve.owner === plenum.id
  )));
});
