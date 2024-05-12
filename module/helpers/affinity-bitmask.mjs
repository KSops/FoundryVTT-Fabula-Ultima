// Clamp input to [0, 3] to reflect valid affinity values
function _clampLevel(level) {
	return Math.max(Math.min(level + 1, 3), 0);
}

/**
 * Sets the affinity level to a bitmask
 * @param {number} bitmask bitmask value
 * @param {number} level numeric affinity level
 * @return {number} resulting bitmask
 */
export function affinityBitmaskSet(bitmask, level) {
	let adjustedLevel = _clampLevel(level);
	return bitmask | (1 << level);
}

/**
 * Gets the affinity level of a bitmask
 * @param {number} bitmask bitmask value
 * @param {number} level numeric affinity level
 * @return {bool} true if the affinity flag of the bitmask is on
 */
export function affinityBitmaskGet(bitmask, level) {
	let adjustedLevel = _clampLevel(level);
	return (bitmask & (1 << level)) != 0;
}
