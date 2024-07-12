import { CheckHooks } from '../../../checks/check-hooks.mjs';

Hooks.on(CheckHooks.renderCheck, (sections, check, actor, item) => {
	if (item?.system instanceof ConsumableDataModel) {
		sections.push(item.createChatMessage(item, false).then((v) => ({ content: v.content })));
	}
});

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} isFavored.value
 * @property {boolean} showTitleCard.value
 * @property {number} ipCost.value
 * @property {string} source.value
 */
export class ConsumableDataModel extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		const { SchemaField, StringField, HTMLField, BooleanField, NumberField } = foundry.data.fields;
		return {
			subtype: new SchemaField({ value: new StringField() }),
			summary: new SchemaField({ value: new StringField() }),
			description: new HTMLField(),
			isFavored: new SchemaField({ value: new BooleanField() }),
			showTitleCard: new SchemaField({ value: new BooleanField() }),
			ipCost: new SchemaField({ value: new NumberField({ initial: 3, min: 0, integer: true, nullable: false }) }),
			source: new SchemaField({ value: new StringField() }),
		};
	}
}
