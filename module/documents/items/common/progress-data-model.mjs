import { systemPath } from '../../../helpers/config.mjs';
import { ObjectUtils } from '../../../helpers/object-utils.mjs';
import { MathHelper } from '../../../helpers/math-helper.mjs';
import FoundryUtils from '../../../helpers/foundry-utils.mjs';
import { CheckPrompt } from '../../../checks/check-prompt.mjs';
import { StringUtils } from '../../../helpers/string-utils.mjs';
import { CommonEvents } from '../../../checks/common-events.mjs';
import { getSelected } from '../../../helpers/target-handler.mjs';
import { Checks } from '../../../checks/checks.mjs';
import { CheckConfiguration } from '../../../checks/check-configuration.mjs';

/**
 * @typedef ProgressSegment
 * @property {Number} id
 * @property {Boolean} checked
 */

/**
 * @typedef ProgressUpdateData
 * @property {Document} document The reference to the document
 * @property {String} propertyPath The path to the property
 * @property {Number} increment How much to update for
 * @property {Number|undefined} index If it's an array, the index of the element
 */

/**
 * @description Models the tracking of progress, whether that be clocks or resources.
 * @property {string} name A label, used for user-facing displays.
 * @property {number} current The current value
 * @property {number} step The step size (a multiplier for each increment/decrement)
 * @property {number} max The maximum value
 * @property {string} style An optional style to use for this track
 * @property {Boolean} enabled Whether this progress track should be used
 * @property {string} id Optionally, a unique identifier for internal lookups.
 */
export class ProgressDataModel extends foundry.abstract.DataModel {
	static defineSchema() {
		const { NumberField, StringField, BooleanField } = foundry.data.fields;
		return {
			name: new StringField({ nullable: true }),
			id: new StringField({ nullable: true }),
			current: new NumberField({ initial: 0, min: 0, integer: true, nullable: false }),
			step: new NumberField({ initial: 1, min: 1, integer: true, nullable: false }),
			max: new NumberField({ initial: 6, min: 0, integer: true, nullable: false }),
			enabled: new BooleanField({ initial: false }),
			style: new StringField({ nullable: true }),
		};
	}

	get isMinimum() {
		return this.current === 0;
	}

	get isMaximum() {
		return this.current === this.max;
	}

	get progressArray() {
		return this.segments;
	}

	/**
	 * @returns {ProgressSegment[]}
	 */
	get segments() {
		return ProgressDataModel.generateProgressArray(this);
	}

	/**
	 * @param {String} name
	 * @param {Number} max
	 * @param {String} style
	 * @returns {ProgressDataModel}
	 */
	static construct(name, max, style = undefined) {
		return new this({
			name: name,
			max: max,
			style: style,
		});
	}

	/**
	 * @param {ProgressDataModel} track
	 * @returns {ProgressSegment[]}
	 */
	static generateProgressArray(track) {
		return Array.from({ length: track.max }, (_, i) => ({
			id: i + 1,
			checked: track.current === i + 1,
		})).reverse();
	}

	/**
	 * @param {FUActor|FUItem|Document} actor
	 * @param {ProgressDataModel} track
	 * @param {String} message
	 * @returns {Promise<void>}
	 */
	static async sendToChat(actor, track, message = undefined) {
		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: actor }),
			content: await foundry.applications.handlebars.renderTemplate('systems/projectfu/templates/chat/partials/chat-clock-details.hbs', {
				progress: track,
				segments: this.generateProgressArray(track),
				message: message,
			}),
		});
	}

	/**
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {Number} increment
	 * @param {Boolean} useMultiplier
	 * @returns {Promise<void>}
	 */
	static async updateForDocument(document, propertyPath, increment, useMultiplier) {
		/** @type ProgressDataModel **/
		const progress = foundry.utils.getProperty(document, propertyPath);
		const maxProgress = progress.max;

		let newProgress;

		if (useMultiplier) {
			const stepMultiplier = progress.step || 1;
			newProgress = progress.current + increment * stepMultiplier;
		} else {
			newProgress = progress.current + increment;
		}

		if (maxProgress !== 0) {
			newProgress = Math.min(newProgress, maxProgress);
		}

		const currentPropertyPath = `${propertyPath}.current`;
		await document.update({ [currentPropertyPath]: newProgress });
	}

	/**
	 * @typedef ProgressUpdateOptions
	 * @property {FUActor|FUItem} source
	 */

	/**
	 * @description Updates a progress track at an index
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {number} index The index of the progress track
	 * @param {number} increment
	 * @param {ProgressUpdateOptions} options
	 */
	static async updateAtIndexForDocument(document, propertyPath, index, increment, options = undefined) {
		if (index === undefined) {
			throw Error('Undefined index reference was given');
		}
		const property = ObjectUtils.getProperty(document, propertyPath);
		/** @type ProgressDataModel[] **/
		const tracks = foundry.utils.duplicate(property);
		const track = tracks[index];
		if (track) {
			track.current = MathHelper.clamp(track.current + increment * track.step, 0, track.max);
			document.update({ [propertyPath]: tracks });
			if (options) {
				await this.notifyUpdate(document, track, increment, options.source);
			}
		} else {
			ui.notifications.error(`Failed to update progress track for ${document.name}`);
		}
	}

	/**
	 * @param {Document} document
	 * @param {ProgressDataModel} progress
	 * @param {Number} increment
	 * @param {FUActor|FUItem} source
	 * @returns {Promise}
	 */
	static async notifyUpdate(document, progress, increment, source) {
		CommonEvents.progress(document, progress, 'update', increment, source);
		const message = StringUtils.localize(increment > 0 ? 'FU.ChatIncrementClock' : 'FU.ChatDecrementClock', {
			clock: progress.name ?? progress.parent.parent.name,
			source: source.name,
			step: increment,
		});
		return this.sendToChat(document, progress, message);
	}

	/**
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {number} index
	 */
	static async removeAtIndexForDocument(document, propertyPath, index) {
		if (index === undefined) {
			throw Error('Undefined index reference was given');
		}
		const property = ObjectUtils.getProperty(document, propertyPath);
		/** @type ProgressDataModel[] **/
		const tracks = foundry.utils.duplicate(property);
		const track = tracks[index];
		CommonEvents.progress(document, track, 'remove');
		await this.sendToChat(
			document,
			track,
			StringUtils.localize('FU.ChatProgressTrackRemoved', {
				name: track.name,
			}),
		);
		tracks.splice(index, 1);
		document.update({ [propertyPath]: tracks });
	}

	/**
	 * @description Adds the track to a document (at the end)
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {ProgressDataModel} track
	 */
	static async addToDocument(document, propertyPath, track) {
		if (track === undefined) {
			throw Error('Undefined track reference was given');
		}
		let property = ObjectUtils.getProperty(document, propertyPath);
		/** @type ProgressDataModel[] **/
		const tracks = foundry.utils.duplicate(property);
		const newTrack = new this(ObjectUtils.cleanObject(track));
		tracks.push(newTrack);
		document.update({ [propertyPath]: tracks });
		CommonEvents.progress(document, newTrack, 'add');
	}

	/**
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @pararm {Boolean} selectStyle
	 * @returns {Promise<void>}
	 */
	static async promptAddToDocument(document, propertyPath, selectStyle = false) {
		const result = await foundry.applications.api.DialogV2.input({
			window: { title: game.i18n.localize('FU.ClockAdd') },
			classes: ['projectfu', 'unique-dialog', 'backgroundstyle'],
			content: await foundry.applications.handlebars.renderTemplate(systemPath('templates/dialog/dialog-add-track.hbs'), {
				selectStyle: selectStyle,
			}),
			rejectClose: false,
			ok: {
				label: game.i18n.localize('FU.Confirm'),
			},
		});

		if (result) {
			if (!result.name) {
				return;
			}
			console.log('Creating progress track with name: ', result.name);
			const newTrack = ProgressDataModel.construct(result.name, result.max, result.style);
			await this.addToDocument(document, propertyPath, newTrack);
		}
	}

	/**
	 * @param {Document} document
	 * @param {String} propertyPath
	 * @param {number} index
	 */
	static async promptCheckAtIndexForDocument(document, propertyPath, index) {
		if (index === undefined) {
			throw Error('Undefined index reference was given');
		}

		const property = ObjectUtils.getProperty(document, propertyPath);
		/** @type ProgressDataModel[] **/
		const tracks = foundry.utils.duplicate(property);
		const track = tracks[index];
		const actors = await getSelected(false);

		const prompt = await CheckPrompt.extended(
			document,
			{
				primary: 'dex',
				secondary: 'ins',
				label: track.name,
				increment: true,
				difficulty: 10,
				modifier: 0,
			},
			actors,
		);
		if (prompt) {
			// Execute check directly for each actor
			if (actors.length > 0) {
				console.debug(`Rolling check for progress track at ${propertyPath} from check: ${prompt} on actors.`);
				for (const actor of actors) {
					const attributes = {
						primary: prompt.primary,
						secondary: prompt.secondary,
					};
					await Checks.attributeCheck(
						actor,
						attributes,
						null,
						(check) => {
							const config = CheckConfiguration.configure(check);
							config.setDifficulty(prompt.difficulty);
							config.setLabel(prompt.label);
							config.addModifier('FU.DialogCheckModifier', prompt.modifier);
						},
						async (check) => {
							if (check.fumble || check.result < prompt.difficulty) {
								return;
							}
							let increment = this.calculateChange(check.result, prompt.difficulty, check.critical);
							if (prompt.increment === 'false') {
								increment = -increment;
							}
							await this.updateAtIndexForDocument(document, propertyPath, index, increment, {
								source: actor,
							});
						},
					);
				}
			} else {
				console.debug(`Prompting a request to roll a check for progress track at ${propertyPath} from check: ${prompt}`);
				ChatMessage.create({
					speaker: ChatMessage.getSpeaker(),
					content: await FoundryUtils.renderTemplate('chat/chat-prompt-check', {
						document: document,
						uuid: document.uuid,
						propertyPath: propertyPath,
						index: index,
						track: track,
						segments: this.generateProgressArray(track),
						label: prompt.label,
						primary: prompt.primary,
						secondary: prompt.secondary,
						difficulty: prompt.difficulty,
						modifier: prompt.modifier,
						increment: prompt.increment,
						verb: StringUtils.localize(prompt.increment ? 'FU.Increment' : 'FU.Decrement').toLowerCase(),
					}),
				});
			}
		}
	}

	/**
	 * @description Calculates the change in a clock due to the result of a check
	 * @param result
	 * @param difficulty
	 * @param critical
	 * @returns {number}
	 */
	static calculateChange(result, difficulty, critical) {
		let change = 1;

		const difference = result - difficulty;
		if (difference >= 6) {
			change += 2;
		} else if (difference >= 3) {
			change++;
		}

		if (critical) {
			change += 2;
		}
		return change;
	}
}
