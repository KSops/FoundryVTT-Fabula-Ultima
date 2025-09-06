import { FUTableRenderer } from './table-renderer.mjs';
import { CommonColumns } from './common-columns.mjs';

export class OtherItemsTableRenderer extends FUTableRenderer {
	/** @type TableConfig */
	static TABLE_CONFIG = {
		cssClass: 'other-items-table',
		getItems: OtherItemsTableRenderer.#getItems,
		renderDescription: () => '',
		hideIfEmpty: true,
		columns: {
			name: CommonColumns.itemNameColumn({ columnName: 'FU.Other' }),
			type: CommonColumns.textColumn({ columnLabel: 'FU.ItemType', getText: (item) => CONFIG.Item.typeLabels[item.type] ?? item.constructor.metadata.label, importance: 'high' }),
			controls: CommonColumns.itemControlsColumn(
				{ custom: `<span></span>` },
				{
					disableFavorite: (item) => !item.actor.isCharacterType,
					disableShare: (item) => item.actor.type !== 'party',
					disableSell: (item) => item.actor.type !== 'stash' || !item.actor.system.merchant,
					disableLoot: (item) => item.actor.type !== 'stash' || item.actor.system.merchant,
				},
			),
		},
	};

	#excludedTypes = new Set();

	/**
	 * @param {...string} excludedTypes
	 */
	constructor(...excludedTypes) {
		super();
		excludedTypes.forEach((type) => this.#excludedTypes.add(type));
	}

	static #getItems(document, options) {
		const includedTypes = new Set(this.#excludedTypes);

		(options.exclude ?? []).forEach((excludedType) => includedTypes.add(excludedType));
		(options.include ?? []).forEach((excludedType) => includedTypes.delete(excludedType));

		return document.items.filter((item) => !includedTypes.has(item.type));
	}
}
