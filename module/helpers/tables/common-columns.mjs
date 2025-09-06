/**
 * @typedef ItemNameColumnRenderOptions
 * @property {string, (() => string)} [columnName]
 * @property {number} [headerSpan]
 * @property {(FUItem) => string|Promise<string>} [renderCaption]
 * @property {string, ((FUItem) => string)} [cssClass]
 */

import { systemTemplatePath } from '../system-utils.mjs';
import { FU } from '../config.mjs';

/**
 * @param {ItemNameColumnRenderOptions} [options]
 * @return {ColumnConfig<FUItem>}
 */
function itemNameColumn(options = {}) {
	const { columnName, headerSpan, renderCaption, cssClass } = options;
	return {
		renderHeader: columnName instanceof Function ? columnName : () => game.i18n.localize(columnName || 'FU.Name'),
		headerAlignment: 'start',
		headerSpan: headerSpan,
		renderCell: renderNameCell(renderCaption, cssClass),
	};
}

/**
 * @param {(FUItem) => string|Promise<string>} [renderCaption]
 * @param {string, ((FUItem) => string)} [cssClass]
 * @return {(FUItem) => Promise<string>}
 */
function renderNameCell(renderCaption, cssClass) {
	const caption = renderCaption instanceof Function ? renderCaption : () => renderCaption;
	const getCssClass = cssClass instanceof Function ? cssClass : () => cssClass;
	return async (item) => {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-item-name.hbs', { name: item.name, img: item.img, caption: await caption(item), cssClass: getCssClass(item) });
	};
}

/**
 * @typedef ItemControlsColumnHeaderRenderOptions
 * @property {string} [type]
 * @property {string} [subtype]
 * @property {string} [label]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string|Promise<string>|(() => string|Promise<string>)} [custom]
 */

/**
 * @typedef ItemControlsColumnCellRenderOptions
 * @property {boolean, ((item: FUItem) => boolean)} [disableFavorite=() => false]
 * @property {boolean, ((item: FUItem) => boolean)} [disableEdit=() => false]
 * @property {boolean, ((item: FUItem) => boolean)} [disableMenu=() => false]
 * @property {boolean, ((item: FUItem) => boolean)} [disableShare=() => true]
 * @property {boolean, ((item: FUItem) => boolean)} [disableSell=() => true]
 * @property {boolean, ((item: FUItem) => boolean)} [disableLoot=() => true]
 */

/**
 * @param {ItemControlsColumnHeaderRenderOptions} headerOptions
 * @param {ItemControlsColumnCellRenderOptions} [cellOptions]
 * @return ColumnConfig
 */
function itemControlsColumn(headerOptions, cellOptions = {}) {
	return {
		headerAlignment: headerOptions.headerAlignment,
		renderHeader: renderControlsHeader(headerOptions),
		renderCell: renderControls(cellOptions),
	};
}

/**
 * @param {ItemControlsColumnHeaderRenderOptions} options
 * @return {() => Promise<string>}
 */
function renderControlsHeader(options) {
	if (options.custom) {
		return options.custom;
	} else {
		return async () => {
			return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/header/header-item-controls.hbs', options);
		};
	}
}

/**
 * @param {ItemControlsColumnCellRenderOptions} options
 * @return {(FUItem) => Promise<string>}
 */
function renderControls(options) {
	const { disableFavorite = false, disableEdit = false, disableMenu = false, disableShare = true, disableLoot = true, disableSell = true } = options;
	return async (item) => {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-item-controls.hbs', {
			isFavorite: item.isFavorite,
			disableFavorite: disableFavorite instanceof Function ? disableFavorite(item) : disableFavorite,
			disableEdit: disableEdit instanceof Function ? disableEdit(item) : disableEdit,
			disableMenu: disableMenu instanceof Function ? disableMenu(item) : disableMenu,
			disableShare: disableShare instanceof Function ? disableShare(item) : disableShare,
			disableLoot: disableLoot instanceof Function ? disableLoot(item) : disableLoot,
			disableSell: disableSell instanceof Function ? disableSell(item) : disableSell,
		});
	};
}

/**
 * @typedef ResourceData
 * @property {number} current
 * @property {number} max
 * @property {number} step
 * @property {string} [displayName]
 */

/**
 * @typedef ResourceColumnRenderOptions
 * @property {string} [columnName]
 * @property {string, ((FUItem) => string)} [cellCssClass]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string} [action]
 * @property {Record<string, string>} [increaseAttributes] WARNING: these are passed through 1:1 to the html, make sure they include the "data-" prefix for data attributes
 * @property {Record<string, string>} [decreaseAttributes] WARNING: these are passed through 1:1 to the html, make sure they include the "data-" prefix for data attributes
 * @property {(FUItem) => ProgressDataModel | ResourceData | null} getResource
 * @property {"flat","stacked",((FUItem) => "flat"|"stacked")} [layout="flat"]
 */

/**
 * @param {ResourceColumnRenderOptions} options
 * @return ColumnConfig
 */
function resourceColumn(options) {
	const { columnName, action, increaseAttributes, decreaseAttributes, getResource, headerAlignment, cellCssClass, layout } = options;
	return {
		hideHeader: !columnName,
		renderHeader: () => game.i18n.localize(columnName || 'FU.Resource'),
		headerAlignment: headerAlignment,
		renderCell: renderResourceCell(getResource, action, increaseAttributes, decreaseAttributes, cellCssClass, layout),
	};
}

function renderResourceCell(getResource, action, increaseAttributes, decreaseAttributes, cellCssClass, layout) {
	const getCellCssClass = cellCssClass instanceof Function ? cellCssClass : () => cellCssClass;
	return async (item) => {
		let cellLayout = layout ?? 'flat';
		if (cellLayout instanceof Function) {
			cellLayout = cellLayout(item);
		}

		if (cellLayout !== 'flat' && cellLayout !== 'stacked') {
			cellLayout = 'flat';
		}

		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-resource.hbs', {
			data: getResource(item),
			action: action,
			increaseAttributes: increaseAttributes,
			decreaseAttributes: decreaseAttributes,
			cssClass: getCellCssClass(item),
			layout: cellLayout,
		});
	};
}

/**
 * @typedef TextColumnRenderOptions
 * @property {string} [cssClass]
 * @property {"start", "center", "end"} [alignment="center"]
 * @property {"low", "normal", "high"} [importance="normal"]
 * @property {string} columnLabel will be translated
 * @property {(FUItem) => string|number|Promise<string|number>} getText result will be translated
 * @property {string|((FUItem) => string|number|Promise<string|number>)} [tooltip]
 */

/**
 * @param {TextColumnRenderOptions} [options]
 * @return {ColumnConfig<FUItem>}
 */
function textColumn(options = {}) {
	const { cssClass, columnLabel, getText, tooltip, alignment, importance } = options;
	return {
		hideHeader: !columnLabel,
		renderHeader: () => game.i18n.localize(columnLabel),
		headerAlignment: alignment,
		renderCell: renderTextCell(getText, tooltip, alignment, importance, cssClass),
	};
}

/**
 * @param {(FUItem) => string|number|Promise<string|number>} getText
 * @param {(FUItem) => string|number|Promise<string|number>} tooltip
 * @param {"start", "center", "end"} [alignment="center"]
 * @param {"low","normal","high"} [importance="normal"]
 * @param {string} [cssClass]
 * @return {(FUItem) => Promise<string>}
 */
function renderTextCell(getText, tooltip, alignment = 'center', importance = 'normal', cssClass) {
	return async (item) => {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-text.hbs', {
			text: '' + (await getText(item)),
			tooltip: tooltip instanceof Function ? tooltip(item) : tooltip,
			alignment,
			importance,
			cssClass: cssClass,
		});
	};
}

/**
 * @typedef ClockColumnRenderOptions
 * @property {string} [columnName]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string} [action]
 * @property {Record<string, string>} [fillAttributes] WARNING: these are passed through 1:1 to the html, make sure they include the "data-" prefix for data attributes
 * @property {Record<string, string>} [eraseAttributes] WARNING: these are passed through 1:1 to the html, make sure they include the "data-" prefix for data attributes
 * @property {number} [clockSize] in pixels
 * @property {(FUItem) => ProgressDataModel | null} getClock
 */

/**
 * @param {ClockColumnRenderOptions} options
 * @return ColumnConfig
 */
function clockColumn(options = {}) {
	const { columnName, headerAlignment, action, fillAttributes, eraseAttributes, clockSize, getClock } = options;
	return {
		hideHeader: !columnName,
		renderHeader: () => game.i18n.localize(columnName),
		headerAlignment: headerAlignment,
		renderCell: renderClockCell(getClock, action, fillAttributes, eraseAttributes, clockSize),
	};
}

/**
 * @param {(FUItem) => (ProgressDataModel|null)} getResource
 * @param {string} action
 * @param {Record<string, string>} fillAttributes
 * @param {Record<string, string>} eraseAttributes
 * @param {number} clockSize
 * @return {(FUItem) => Promise<string>}
 */
function renderClockCell(getResource, action, fillAttributes, eraseAttributes, clockSize) {
	return async (item) => {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-clock.hbs', {
			data: getResource(item),
			clockSize: clockSize,
			action: action,
			fillAttributes: fillAttributes,
			eraseAttributes: eraseAttributes,
		});
	};
}

/**
 * @typedef ProgressBarColumnRenderOptions
 * @property {string} [columnName]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {(FUItem) => ProgressDataModel | ResourceData | null} getProgress
 */

/**
 * @param {ProgressBarColumnRenderOptions} options
 * @return ColumnConfig
 */
function progressBarColumn(options = {}) {
	const { columnName, headerAlignment, getProgress } = options;
	return {
		hideHeader: !columnName,
		renderHeader: () => game.i18n.localize(columnName),
		headerAlignment: headerAlignment,
		renderCell: renderProgressBarCell(getProgress),
	};
}

/**
 * @param getProgress
 * @return {(FUItem) => Promise<string>}
 */
function renderProgressBarCell(getProgress) {
	return async (item) => {
		return foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/table/cell/cell-progress-bar.hbs', getProgress(item));
	};
}

/**
 * @typedef IfElseColumnRenderOptions
 * @property {string} [columnName]
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {((item) => boolean)} condition
 * @property {(item) => string|Promise<string>} ifTrue
 * @property {(item) => string|Promise<string>} otherwise
 */

/**
 * @param {IfElseColumnRenderOptions} options
 */
function ifElseColumn(options = {}) {
	const { columnName, headerAlignment, condition, ifTrue, otherwise } = options;
	return {
		hideHeader: !columnName,
		renderHeader: () => game.i18n.localize(columnName),
		headerAlignment: headerAlignment,
		renderCell: renderIfElseCell(condition, ifTrue, otherwise),
	};
}

function renderIfElseCell(condition, ifTrue, otherwise) {
	return async (item) => {
		if (condition(item)) {
			return ifTrue(item);
		} else {
			return otherwise(item);
		}
	};
}

/**
 * @typedef CheckColumnCheck
 * @property {Attribute} primary
 * @property {Attribute} secondary
 * @property {number} [bonus=0]
 */

/**
 * @typedef CheckColumnRenderOptions
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string} columnLabel will be translated
 * @property {(FUItem) => CheckColumnCheck} getCheck result will be translated
 */

/**
 * @param {CheckColumnRenderOptions} options
 * @return {ColumnConfig<FUItem>}
 */
function checkColumn(options = {}) {
	const { columnLabel, headerAlignment, getCheck } = options;
	return {
		renderHeader: () => game.i18n.localize(columnLabel),
		headerAlignment: headerAlignment,
		renderCell: (item) => foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-check'), { ...getCheck(item), FU }),
	};
}

/**
 * @typedef DamageColumnDamage
 * @property {number} damage
 * @property {DamageType} type
 * @property {boolean} [hrZero=false]
 */

/**
 * @typedef DamageColumnRenderOptions
 * @property {"start", "center", "end"} [headerAlignment]
 * @property {string} columnLabel will be translated
 * @property {(FUItem) => DamageColumnDamage} getDamage result will be translated
 */

/**
 * @param {DamageColumnRenderOptions} options
 * @return {ColumnConfig<FUItem>}
 */
function damageColumn(options = {}) {
	const { columnLabel, headerAlignment, getDamage } = options;
	return {
		renderHeader: () => game.i18n.localize(columnLabel),
		headerAlignment: headerAlignment,
		renderCell: (item) => foundry.applications.handlebars.renderTemplate(systemTemplatePath('table/cell/cell-damage'), { ...getDamage(item), FU }),
	};
}

export const CommonColumns = Object.freeze({
	itemNameColumn,
	itemControlsColumn,
	resourceColumn,
	textColumn,
	clockColumn,
	progressBarColumn,
	ifElseColumn,
	checkColumn,
	damageColumn,
});
