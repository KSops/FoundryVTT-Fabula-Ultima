import { TextEditor } from '../text-editor.mjs';

/**
 * @param {string} [descriptionKey="system.description"]
 * @return {(FUItem) => Promise<string>}
 */
function simpleDescription(descriptionKey) {
	return (item) => renderDescription(item, descriptionKey, []);
}

/**
 * @param {(FUItem) => Tag[]} getTags
 * @param {string} [descriptionKey="system.description"]
 * @return {(FUItem) => Promise<string>}
 */
function descriptionWithTags(getTags, descriptionKey) {
	return function (item) {
		return renderDescription(item, descriptionKey, getTags.call(this, item));
	};
}

/**
 * @param {((document: any) => string|Promise<string>)} [descriptionEnricher]
 * @return {(FUItem) => Promise<string>}
 */
function descriptionWithCustomEnrichment(descriptionEnricher) {
	return async function (item) {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/expand/expand-item-description-with-tags.hbs', {
			description: await descriptionEnricher.call(this, item),
		});
	};
}

/**
 * @param {FUItem} item
 * @param {string} descriptionKey
 * @param {Tag[]} [tags]
 * @return {Promise<string>}
 */
async function renderDescription(item, descriptionKey = 'system.description', tags = []) {
	return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/expand/expand-item-description-with-tags.hbs', {
		description: await TextEditor.enrichHTML(foundry.utils.getProperty(item, descriptionKey), { rollData: item.getRollData && item.getRollData() }),
		tags: tags,
	});
}

export const CommonDescriptions = Object.freeze({
	simpleDescription,
	descriptionWithTags,
	descriptionWithCustomEnrichment,
});
