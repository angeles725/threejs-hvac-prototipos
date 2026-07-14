import { INTERACTION_SELECTION_VALUES } from '../scene/interaction.js';

/** Only the HVAC/IoT endpoints are selectable: a click on a wall must never rewrite the state. */
const SELECTABLE_LAYERS = Object.freeze(['hvac']);

/**
 * Resolves one raycast intersection to the device that OWNS the geometry it struck. The devices are
 * instanced, so the hit carries an `instanceId`, and the owning entity is read back from the same
 * `userData.entities` table the builder emitted — never from a parallel registry.
 */
export function resolvePickedSelection(intersection) {
  const userData = intersection?.object?.userData;
  if (!userData || !SELECTABLE_LAYERS.includes(userData.layer)) return null;
  const entities = userData.entities;
  if (!Array.isArray(entities)) return null;
  const index = Number.isInteger(intersection.instanceId) ? intersection.instanceId : 0;
  const entity = entities.find(({ instanceId }) => instanceId === index) ?? entities[index];
  const entityId = entity?.statusOwner ?? entity?.entityId;
  if (!entityId || !INTERACTION_SELECTION_VALUES.includes(entityId)) return null;
  return entityId;
}

/** First selectable device under the pointer, or null. Keeps the raycaster out of the state layer. */
export function resolvePickedSelectionFromIntersections(intersections = []) {
  for (const intersection of intersections) {
    const selection = resolvePickedSelection(intersection);
    if (selection) return selection;
  }
  return null;
}
