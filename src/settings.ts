import { Plugin, MarkdownRenderChild, PluginSettingTab, App, Setting, Modal, Notice } from 'obsidian';
import { MindMapSettings, MindMapTheme, RenderMode } from './types';
import { PRESET_THEMES, DEFAULT_SETTINGS, RENDER_MODE_NAMES } from './constants';
import MindMapRenderer from './renderer';

// Import MindMapPlugin type - this will be defined in main.ts
// We'll use a forward reference pattern
interface MindMapPlugin extends Plugin {
	settings: MindMapSettings;
	saveSettings(): Promise<void>;
}

class MindMapSettingTab extends PluginSettingTab {
	plugin: MindMapPlugin;

	constructor(app: App, plugin: MindMapPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Mindmark Settings' });

		// 主题选择
		containerEl.createEl('h3', { text: 'Theme' });

		// 构建主题选项
		const themeOptions: Record<string, string> = {};
		PRESET_THEMES.forEach(theme => {
			themeOptions[theme.name] = theme.name;
		});
		this.plugin.settings.customThemes.forEach(theme => {
			themeOptions[theme.name] = theme.name;
		});
		// 添加 Custom 选项
		themeOptions['Custom'] = 'Custom';

		// 判断是否为自定义主题
		const isCustom = this.plugin.settings.currentTheme === 'Custom';

		new Setting(containerEl)
			.setName('Theme')
			.setDesc('Choose a theme for your mind map.')
			.addDropdown(dropdown => dropdown
				.addOptions(themeOptions)
				.setValue(this.plugin.settings.currentTheme)
				.onChange(async (value) => {
					this.plugin.settings.currentTheme = value;
					await this.applyTheme(value);
					await this.plugin.saveSettings();
					this.display(); // 重新渲染设置页面
				}));

		// 自定义主题管理（仅在自定义模式下显示）
		if (isCustom) {
			new Setting(containerEl)
				.setName('Save current settings as custom theme')
				.setDesc('Save the current color settings as a new custom theme.')
				.addButton(button => button
					.setButtonText('Save')
					.onClick(async () => {
						const themeName = await this.promptForThemeName();
						if (themeName) {
							const newTheme: MindMapTheme = {
								name: themeName,
								canvasBackgroundColor: this.plugin.settings.canvasBackgroundColor,
								fontColor: this.plugin.settings.fontColor,
								nodeBackgroundColor: this.plugin.settings.nodeBackgroundColor,
								lineColor: this.plugin.settings.lineColor,
								connectionColor: this.plugin.settings.connectionColor
							};
							this.plugin.settings.customThemes.push(newTheme);
							this.plugin.settings.currentTheme = themeName;
							await this.plugin.saveSettings();
							this.display(); // 重新渲染设置页面
						}
					}));

			// 删除自定义主题
			if (this.plugin.settings.customThemes.length > 0) {
				new Setting(containerEl)
					.setName('Delete custom theme')
					.setDesc('Remove a custom theme.')
					.addDropdown(dropdown => {
						const customThemeOptions: Record<string, string> = {};
						this.plugin.settings.customThemes.forEach(theme => {
							customThemeOptions[theme.name] = theme.name;
						});
						dropdown.addOptions(customThemeOptions);
						dropdown.onChange(async (value) => {
							// 不在这里删除，只是选择
						});
					})
					.addButton(button => button
						.setButtonText('Delete')
						.setWarning()
						.onClick(async () => {
							const dropdown = button.buttonEl.previousElementSibling as HTMLSelectElement;
							const themeName = dropdown.value;
							if (themeName) {
								this.plugin.settings.customThemes = this.plugin.settings.customThemes.filter(
									t => t.name !== themeName
								);
								if (this.plugin.settings.currentTheme === themeName) {
									this.plugin.settings.currentTheme = 'Default';
									await this.applyTheme('Default');
								}
								await this.plugin.saveSettings();
								this.display(); // 重新渲染设置页面
							}
						}));
			}

			// 颜色设置（仅在自定义模式下显示）
			containerEl.createEl('h3', { text: 'Color Settings' });

			new Setting(containerEl)
				.setName('Canvas background color')
				.setDesc('Background color of the mind map canvas.')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.canvasBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.canvasBackgroundColor = value;
						this.plugin.settings.currentTheme = 'Custom';
						await this.plugin.saveSettings();
						MindMapRenderer.updateAllColors();
					}));

			new Setting(containerEl)
				.setName('Font color')
				.setDesc('Color of the text in mind map nodes.')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.fontColor)
					.onChange(async (value) => {
						this.plugin.settings.fontColor = value;
						this.plugin.settings.currentTheme = 'Custom';
						await this.plugin.saveSettings();
						MindMapRenderer.updateAllColors();
					}));

			new Setting(containerEl)
				.setName('Node background color')
				.setDesc('Background color of mind map nodes.')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.nodeBackgroundColor)
					.onChange(async (value) => {
						this.plugin.settings.nodeBackgroundColor = value;
						this.plugin.settings.currentTheme = 'Custom';
						await this.plugin.saveSettings();
						MindMapRenderer.updateAllColors();
					}));

			new Setting(containerEl)
				.setName('Line color')
				.setDesc('Color of the node borders and outlines.')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.lineColor)
					.onChange(async (value) => {
						this.plugin.settings.lineColor = value;
						this.plugin.settings.currentTheme = 'Custom';
						await this.plugin.saveSettings();
						MindMapRenderer.updateAllColors();
					}));

			new Setting(containerEl)
				.setName('Connection color')
				.setDesc('Color of the connection lines between nodes.')
				.addColorPicker(colorPicker => colorPicker
					.setValue(this.plugin.settings.connectionColor)
					.onChange(async (value) => {
						this.plugin.settings.connectionColor = value;
						this.plugin.settings.currentTheme = 'Custom';
						await this.plugin.saveSettings();
						MindMapRenderer.updateAllColors();
					}));
		}

		containerEl.createEl('h3', { text: 'General Settings' });

		new Setting(containerEl)
			.setName('Default render mode')
			.setDesc('Choose the default rendering mode for mind maps.')
			.addDropdown(dropdown => dropdown
				.addOptions(RENDER_MODE_NAMES)
				.setValue(this.plugin.settings.defaultRenderMode)
				.onChange(async (value) => {
					this.plugin.settings.defaultRenderMode = value as RenderMode;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable mouse wheel zoom')
			.setDesc('Allow zooming the mind map using mouse wheel. When disabled, use the +/- buttons to zoom.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableWheelZoom)
				.onChange(async (value) => {
					this.plugin.settings.enableWheelZoom = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Enable pinch zoom')
			.setDesc('Allow zooming the mind map using trackpad pinch gesture (spread to zoom in, pinch to zoom out).')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enablePinchZoom)
				.onChange(async (value) => {
					this.plugin.settings.enablePinchZoom = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note panel width')
			.setDesc('Width of the note panel in pixels.')
			.addText(text => text
				.setValue(this.plugin.settings.notePanelWidth.toString())
				.setPlaceholder('300')
				.onChange(async (value) => {
					const width = parseInt(value);
					if (!isNaN(width) && width >= 200 && width <= 800) {
						this.plugin.settings.notePanelWidth = width;
						await this.plugin.saveSettings();
						// Update all open mind map panels
						MindMapRenderer.updateAllNotePanelWidth(width);
					}
				}));
	}

	private async applyTheme(themeName: string): Promise<void> {
		// 如果选择 Custom，不覆盖当前颜色设置
		if (themeName === 'Custom') {
			MindMapRenderer.updateAllColors();
			return;
		}

		const presetTheme = PRESET_THEMES.find(t => t.name === themeName);
		const customTheme = this.plugin.settings.customThemes.find(t => t.name === themeName);
		const theme = presetTheme || customTheme;

		if (theme) {
			this.plugin.settings.canvasBackgroundColor = theme.canvasBackgroundColor;
			this.plugin.settings.fontColor = theme.fontColor;
			this.plugin.settings.nodeBackgroundColor = theme.nodeBackgroundColor;
			this.plugin.settings.lineColor = theme.lineColor;
			this.plugin.settings.connectionColor = theme.connectionColor;
			MindMapRenderer.updateAllColors();
		}
	}

	private async promptForThemeName(): Promise<string | null> {
		const modal = new ThemeNameModal(this.app);
		return new Promise((resolve) => {
			modal.open();
			modal.onClose = () => {
				resolve(modal.themeName);
			};
		});
	}
}

// 主题名称输入模态框
class ThemeNameModal extends Modal {
	themeName: string | null = null;

	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl('h2', { text: 'Save Custom Theme' });

		const input = contentEl.createEl('input', {
			type: 'text',
			placeholder: 'Enter theme name...'
		});
		input.style.width = '100%';
		input.style.padding = '8px';
		input.style.marginBottom = '16px';

		const buttonContainer = contentEl.createDiv();
		buttonContainer.style.display = 'flex';
		buttonContainer.style.gap = '8px';

		const saveBtn = buttonContainer.createEl('button', { text: 'Save' });
		saveBtn.style.padding = '8px 16px';
		saveBtn.style.cursor = 'pointer';

		const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
		cancelBtn.style.padding = '8px 16px';
		cancelBtn.style.cursor = 'pointer';

		saveBtn.addEventListener('click', () => {
			const name = input.value.trim();
			if (name) {
				this.themeName = name;
				this.close();
			} else {
				new Notice('Please enter a theme name');
			}
		});

		cancelBtn.addEventListener('click', () => {
			this.themeName = null;
			this.close();
		});

		input.focus();
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				saveBtn.click();
			} else if (e.key === 'Escape') {
				cancelBtn.click();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

export { MindMapSettingTab, ThemeNameModal };