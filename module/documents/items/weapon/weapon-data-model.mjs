import { FU } from '../../../helpers/config.mjs';
import { WeaponMigrations } from './weapon-migrations.mjs';
import { ItemAttributesDataModel } from '../common/item-attributes-data-model.mjs';
import { CheckHooks } from '../../../checks/check-hooks.mjs';
import { CHECK_DETAILS } from '../../../checks/default-section-order.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';
import { CommonSections } from '../../../checks/common-sections.mjs';
import { FUStandardItemDataModel } from '../item-data-model.mjs';
import { ItemPartialTemplates } from '../item-partial-templates.mjs';
import { TraitUtils } from '../../../pipelines/traits.mjs';
import { StringUtils } from '../../../helpers/string-utils.mjs';
import { deprecationNotice } from '../../../helpers/deprecation-helper.mjs';

/**
 * @param {CheckV2} check
 * @param {FUActor} actor
 * @param {FUItem} [item]
 * @param {CheckCallbackRegistration} registerCallback
 */
const prepareCheck = (check, actor, item, registerCallback) => {
	if (check.type === 'accuracy' && item.system instanceof WeaponDataModel) {
		/** @type WeaponDataModel **/
		const weapon = item.system;
		check.primary = weapon.attributes.primary.value;
		check.secondary = weapon.attributes.secondary.value;

		CheckConfiguration.configure(check)
			.addWeaponAccuracy(weapon)
			.setDamage(weapon.damageType.value, weapon.damage.value)
			.setWeaponTraits({
				weaponType: weapon.type.value,
				weaponCategory: weapon.category.value,
				handedness: weapon.hands.value,
			})
			.addTraits(weapon.damageType.value)
			.addTraitsFromItemModel(weapon.traits)
			.setTargetedDefense(weapon.defense)
			.setDamageOverride(actor, 'attack')
			.modifyHrZero((hrZero) => hrZero || weapon.rollInfo.useWeapon.hrZero.value);
	}
};

Hooks.on(CheckHooks.prepareCheck, prepareCheck);

/**
 * @param {CheckRenderData} data
 * @param {CheckResultV2} result
 * @param {FUActor} actor
 * @param {FUItem} [item]
 */
function onRenderCheck(data, result, actor, item) {
	if (item && item.system instanceof WeaponDataModel) {
		data.push(async () => ({
			order: CHECK_DETAILS,
			partial: 'systems/projectfu/templates/chat/partials/chat-weapon-details.hbs',
			data: {
				weapon: {
					type: item.system.type.value,
					quality: item.system.quality.value,
				},
			},
		}));
		CommonSections.tags(data, item.system.getTags(), CHECK_DETAILS);
		CommonSections.description(data, item.system.description, item.system.summary.value, CHECK_DETAILS);
	}
}

Hooks.on(CheckHooks.renderCheck, onRenderCheck);

/**
 * @property {string} subtype.value
 * @property {string} summary.value
 * @property {string} description
 * @property {boolean} showTitleCard.value
 * @property {number} cost.value
 * @property {boolean} isMartial.value
 * @property {string} quality.value
 * @property {ItemAttributesDataModel} attributes
 * @property {number} accuracy.value
 * @property {Defense} defense
 * @property {number} damage.value
 * @property {WeaponType} type.value
 * @property {WeaponCategory} category.value
 * @property {Handedness} hands.value
 * @property {'minor', 'heavy', 'massive'} impType.value
 * @property {DamageType} damageType.value
 * @property {boolean} isBehavior.value
 * @property {number} weight.value
 * @property {string} source.value
 * @property {boolean} rollInfo.useWeapon.hrZero.value
 */
export class WeaponDataModel extends FUStandardItemDataModel {
	static {
		deprecationNotice(this, 'isCustomWeapon.value');
	}

	static defineSchema() {
		const { SchemaField, StringField, BooleanField, NumberField, EmbeddedDataField, SetField } = foundry.data.fields;
		return Object.assign(super.defineSchema(), {
			cost: new SchemaField({ value: new NumberField({ initial: 100, min: 0, integer: true, nullable: false }) }),
			isMartial: new SchemaField({ value: new BooleanField() }),
			quality: new SchemaField({ value: new StringField() }),
			def: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			mdef: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			init: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			attributes: new EmbeddedDataField(ItemAttributesDataModel, { initial: { primary: { value: 'ins' }, secondary: { value: 'mig' } } }),
			accuracy: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			defense: new StringField({ initial: 'def', choices: Object.keys(FU.defenses) }),
			damage: new SchemaField({ value: new NumberField({ initial: 0, integer: true, nullable: false }) }),
			type: new SchemaField({ value: new StringField({ initial: 'melee', choices: Object.keys(FU.weaponTypes) }) }),
			category: new SchemaField({ value: new StringField({ initial: 'brawling', choices: Object.keys(FU.weaponCategories) }) }),
			hands: new SchemaField({ value: new StringField({ initial: 'one-handed', choices: Object.keys(FU.handedness) }) }),
			impType: new SchemaField({ value: new StringField({ initial: 'minor', choices: ['minor', 'heavy', 'massive'] }) }),
			damageType: new SchemaField({ value: new StringField({ initial: 'physical', choices: Object.keys(FU.damageTypes) }) }),
			isBehavior: new SchemaField({ value: new BooleanField() }),
			weight: new SchemaField({ value: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }) }),
			rollInfo: new SchemaField({
				useWeapon: new SchemaField({
					hrZero: new SchemaField({ value: new BooleanField() }),
				}),
			}),
			traits: new SetField(new StringField()),
		});
	}

	static migrateData(source) {
		source = super.migrateData(source) ?? source;
		WeaponMigrations.run(source);
		return source;
	}

	transferEffects() {
		return this.parent.isEquipped && !this.parent.actor?.system.vehicle?.weaponsActive;
	}

	/**
	 * @param {KeyboardModifiers} modifiers
	 * @return {Promise<void>}
	 */
	async roll(modifiers) {
		return Checks.accuracyCheck(this.parent.actor, this.parent, CheckConfiguration.initHrZero(modifiers.shift));
	}

	get attributePartials() {
		return [
			ItemPartialTemplates.standard,
			ItemPartialTemplates.traits,
			ItemPartialTemplates.qualityCost,
			ItemPartialTemplates.weapon,
			ItemPartialTemplates.attackAccuracy,
			ItemPartialTemplates.attackDamage,
			ItemPartialTemplates.behaviorField,
			ItemPartialTemplates.attackTypeField,
		];
	}

	/**
	 * Action definition, invoked by sheets when 'data-action' equals the method name and no action defined on the sheet matches that name.
	 * @param {PointerEvent} event
	 * @param {HTMLElement} target
	 */
	equipWeapon(event, target) {
		// TODO: find better solution, equipment data model maybe?
		return this.parent.actor.equipmentHandler.handleItemClick(event, target);
	}

	/**
	 * @param {Boolean} includeTraits
	 * @return {Tag[]}
	 */
	getTags(includeTraits = true) {
		let result = [
			{
				tag: `FU.${StringUtils.capitalize(this.category.value)}`,
			},
			{
				tag: `FU.${StringUtils.capitalize(this.type.value)}`,
			},
			{
				tag: `FU.${this.hands.value === 'two-handed' ? 'TwoHanded' : 'OneHanded'}`,
			},
		];
		if (includeTraits) {
			result.push(...TraitUtils.toTags(this.traits));
		}
		return result;
	}
}
