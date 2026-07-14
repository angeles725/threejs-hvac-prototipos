import { createTopology, traceFrom } from './topology.mjs';

export function selectThermostatsForUc100(config, uc100Id) {
  const concentrator = config.devices.uc100.find(({ id }) => id === uc100Id);
  if (!concentrator) return [];
  const byId = new Map(config.devices.tc300.map((device) => [device.id, device]));
  return concentrator.memberIds.map((id) => byId.get(id)).filter(Boolean);
}

export function selectTrace(config, sourceId) {
  return traceFrom(createTopology(config), sourceId);
}
