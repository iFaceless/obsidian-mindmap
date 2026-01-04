import { Plugin, MarkdownPostProcessorContext } from 'obsidian';
import { DEFAULT_SETTINGS } from './constants';
import { MindMapSettings } from './types';
import MindMapRenderer from './renderer';
import { MindMapSettingTab } from './settings';

export default class MindMapPlugin extends Plugin {
	settings: MindMapSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor('mindmap', (source, el, ctx) => {
			const mindMap = new MindMapRenderer(source, el, ctx, this.settings, this.app, this);
			ctx.addChild(mindMap);
		});

		// Add settings tab
		this.addSettingTab(new MindMapSettingTab(this.app, this));

		console.log('Mind Map Plugin loaded');
	}

	onunload() {
		console.log('Mind Map Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}