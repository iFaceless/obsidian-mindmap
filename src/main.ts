import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, PluginSettingTab, App, Setting, MarkdownRenderer, Notice, Modal } from 'obsidian';

// 渲染模式枚举
type RenderMode = 'logic' | 'clockwise';

const RENDER_MODE_NAMES: Record<RenderMode, string> = {
	'logic': 'Outline View',
	'clockwise': 'Radial Mind Map'
};

// 主题接口
interface MindMapTheme {
	name: string;
	canvasBackgroundColor: string;
	fontColor: string;
	nodeBackgroundColor: string;
	lineColor: string;
	connectionColor: string;
}

// 预设主题
const PRESET_THEMES: MindMapTheme[] = [
	{
		name: 'Default',
		canvasBackgroundColor: '#ffffff',
		fontColor: '#000000',
		nodeBackgroundColor: '#ffffff',
		lineColor: '#605CE5',
		connectionColor: '#605CE5'
	},
	{
		name: 'Dark',
		canvasBackgroundColor: '#1e1e1e',
		fontColor: '#e0e0e0',
		nodeBackgroundColor: '#2d2d2d',
		lineColor: '#7c7c7c',
		connectionColor: '#7c7c7c'
	},
	{
		name: 'Darcula',
		canvasBackgroundColor: '#2b2b2b',
		fontColor: '#a9b7c6',
		nodeBackgroundColor: '#3c3f41',
		lineColor: '#808080',
		connectionColor: '#808080'
	},
	{
		name: 'Dracula',
		canvasBackgroundColor: '#282a36',
		fontColor: '#f8f8f2',
		nodeBackgroundColor: '#44475a',
		lineColor: '#bd93f9',
		connectionColor: '#bd93f9'
	},
	{
		name: 'Monokai',
		canvasBackgroundColor: '#272822',
		fontColor: '#f8f8f2',
		nodeBackgroundColor: '#3e3d32',
		lineColor: '#a6e22e',
		connectionColor: '#a6e22e'
	},
	{
		name: 'Solarized Dark',
		canvasBackgroundColor: '#002b36',
		fontColor: '#839496',
		nodeBackgroundColor: '#073642',
		lineColor: '#2aa198',
		connectionColor: '#2aa198'
	},
	{
		name: 'Solarized Light',
		canvasBackgroundColor: '#fdf6e3',
		fontColor: '#657b83',
		nodeBackgroundColor: '#eee8d5',
		lineColor: '#2aa198',
		connectionColor: '#2aa198'
	},
	{
		name: 'Ocean',
		canvasBackgroundColor: '#f0f8ff',
		fontColor: '#2c3e50',
		nodeBackgroundColor: '#e8f4f8',
		lineColor: '#3498db',
		connectionColor: '#3498db'
	},
	{
		name: 'Forest',
		canvasBackgroundColor: '#f0fff4',
		fontColor: '#1b4332',
		nodeBackgroundColor: '#e8f5e9',
		lineColor: '#2e7d32',
		connectionColor: '#2e7d32'
	},
	{
		name: 'Sunset',
		canvasBackgroundColor: '#fff5f0',
		fontColor: '#4a2c2a',
		nodeBackgroundColor: '#ffe8d6',
		lineColor: '#e76f51',
		connectionColor: '#e76f51'
	},
	{
		name: 'Lavender',
		canvasBackgroundColor: '#f3e5f5',
		fontColor: '#4a148c',
		nodeBackgroundColor: '#e1bee7',
		lineColor: '#9c27b0',
		connectionColor: '#9c27b0'
	},
	{
		name: 'Mint',
		canvasBackgroundColor: '#e0f2f1',
		fontColor: '#004d40',
		nodeBackgroundColor: '#b2dfdb',
		lineColor: '#009688',
		connectionColor: '#009688'
	},
	{
		name: 'Rose',
		canvasBackgroundColor: '#fff0f5',
		fontColor: '#880e4f',
		nodeBackgroundColor: '#f8bbd9',
		lineColor: '#e91e63',
		connectionColor: '#e91e63'
	}
];

interface MindMapNode {
	id: string;
	text: string;
	children: MindMapNode[];
	collapsed: boolean;
	note?: string; // 备注内容（Markdown格式）
}

interface MindMapSettings {
	enableWheelZoom: boolean;
	enablePinchZoom: boolean;
	defaultRenderMode: RenderMode;
	notePanelWidth: number;
	currentTheme: string;
	customThemes: MindMapTheme[];
	canvasBackgroundColor: string;
	fontColor: string;
	nodeBackgroundColor: string;
	lineColor: string;
	connectionColor: string;
}

const DEFAULT_SETTINGS: MindMapSettings = {
	enableWheelZoom: false,
	enablePinchZoom: false,
	defaultRenderMode: 'clockwise',
	notePanelWidth: 300,
	currentTheme: 'Default',
	customThemes: [],
	canvasBackgroundColor: '#ffffff',
	fontColor: '#000000',
	nodeBackgroundColor: '#ffffff',
	lineColor: '#605CE5',
	connectionColor: '#605CE5'
};

// 用于保存节点折叠状态的映射
let collapsedStateMap: Map<string, boolean> = new Map();

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

class MindMapRenderer extends MarkdownRenderChild {
	private static instances: MindMapRenderer[] = [];

	private source: string;
	private container: HTMLElement;
	private root: MindMapNode | null = null;
	private settings: MindMapSettings;
	private app: App;
	private plugin?: MindMapPlugin;
	private wrapper: HTMLElement | null = null;
	private notePanel: HTMLElement | null = null; // 右侧备注面板
	private renderMode: RenderMode;
	private isFullscreen: boolean = false;
	private fullscreenBtn: HTMLButtonElement | null = null;

	// Zoom and pan state
	private scale: number = 1;
	private translateX: number = 0;
	private translateY: number = 0;
	private isDragging: boolean = false;
	private dragStartX: number = 0;
	private dragStartY: number = 0;
	private svg: SVGSVGElement | null = null;
	private mainGroup: SVGGElement | null = null;
	private zoomLevelSelect: HTMLSelectElement | null = null; // 缩放比例下拉框

	// Pinch zoom state
	private initialPinchDistance: number = 0;
	private initialScale: number = 1;

	// 保存非全屏状态的缩放和平移
	private savedScale: number = 1;
	private savedTranslateX: number = 0;
	private savedTranslateY: number = 0;

	constructor(source: string, container: HTMLElement, ctx: MarkdownPostProcessorContext, settings: MindMapSettings, app: App, plugin?: MindMapPlugin) {
		super(container);
		this.source = source;
		this.container = container;
		this.settings = settings;
		this.app = app;
		this.plugin = plugin;
		this.renderMode = settings.defaultRenderMode;
		
		// 添加到实例列表
		MindMapRenderer.instances.push(this);
	}

	onload() {
		this.render();
	}

	onunload() {
		// 从实例列表中移除
		const index = MindMapRenderer.instances.indexOf(this);
		if (index > -1) {
			MindMapRenderer.instances.splice(index, 1);
		}
	}

	private parseMarkdownList(text: string): MindMapNode | null {
		const lines = text.split('\n');
		if (lines.length === 0) return null;

		// 检测是否有二级及以上标题（##, ### 等）
		const hasMultiLevelHeadings = lines.some(line => /^\s*#{2,}\s/.test(line));
		
		// 检测是否有列表项
		const hasListItems = lines.some(line => /^\s*[-*]\s/.test(line));
		
		// 检测是否有 # 标题
		const hasHeadings = lines.some(line => /^\s*#+\s/.test(line));

		// 如果有二级及以上标题，使用纯标题模式（即使有列表项）
		if (hasMultiLevelHeadings) {
			return this.parseHeadingsMode(lines);
		}

		// 如果只有 # 标题，没有列表项，则使用纯标题模式
		if (hasHeadings && !hasListItems) {
			return this.parseHeadingsMode(lines);
		}

		// 否则使用列表模式（支持 # 作为根标题）
		return this.parseListMode(lines);
	}

	// 纯 # 标题模式解析
	private parseHeadingsMode(lines: string[]): MindMapNode | null {
		let root: MindMapNode | null = null;
		const stack: { node: MindMapNode; level: number }[] = [];
		let currentNode: MindMapNode | null = null;
		let noteLines: string[] = [];

		const flushNote = () => {
			if (currentNode && noteLines.length > 0) {
				currentNode.note = noteLines.join('\n').trim();
				noteLines = [];
			}
		};

		for (const line of lines) {
			const trimmed = line.trim();

			// 检查是否是 # 标题
			const headingMatch = trimmed.match(/^(#+)\s*(.*)$/);
			
			if (headingMatch) {
				// 先保存上一个节点的备注
				flushNote();

				const level = headingMatch[1].length; // # 的数量代表层级
				const nodeText = headingMatch[2].trim();

				const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
				const newNode: MindMapNode = {
					id: nodeId,
					text: nodeText,
					children: [],
					collapsed: collapsedStateMap.get(nodeId) || false
				};

				// 第一个 # 作为根节点
				if (!root) {
					root = newNode;
					stack.push({ node: newNode, level });
					currentNode = newNode;
					continue;
				}

				// 找到正确的父节点：弹出所有层级 >= 当前层级的节点
				while (stack.length > 0 && stack[stack.length - 1].level >= level) {
					stack.pop();
				}

				if (stack.length > 0) {
					const parent = stack[stack.length - 1].node;
					parent.children.push(newNode);
				} else {
					// 如果栈为空，说明这是一个新的顶层节点（不应该发生）
					root.children.push(newNode);
				}
				stack.push({ node: newNode, level });
				currentNode = newNode;
			} else if (trimmed) {
				// 非标题行，作为当前节点的备注内容
				noteLines.push(trimmed);
			}
		}

		// 保存最后一个节点的备注
		flushNote();

		return root;
	}

	// 列表模式解析（支持 # 作为根标题）
	private parseListMode(lines: string[]): MindMapNode | null {
		// 检查是否有 # 标题作为中心标题
		let rootTitle = 'Root';
		let startIndex = 0;
		for (let i = 0; i < lines.length; i++) {
			const trimmed = lines[i].trim();
			if (!trimmed) continue;
			// 检查是否是 # 标题
			if (trimmed.startsWith('#')) {
				rootTitle = trimmed.replace(/^#+\s*/, '').trim();
				startIndex = i + 1;
				break;
			}
			// 如果第一个非空行不是 # 开头，则不继续查找
			break;
		}

		const root: MindMapNode = {
			id: 'root',
			text: rootTitle,
			children: [],
			collapsed: false
		};

		const stack: { node: MindMapNode; level: number; indent: number }[] = [{ node: root, level: -1, indent: -1 }];

		// 计算缩进宽度（Tab算作4个空格）
		const getIndentWidth = (line: string): number => {
			let width = 0;
			for (const char of line) {
				if (char === ' ') {
					width += 1;
				} else if (char === '\t') {
					width += 4; // Tab算作4个空格
				} else {
					break;
				}
			}
			return width;
		};

		for (let i = startIndex; i < lines.length; i++) {
			const line = lines[i];
			const trimmed = line.trim();
			if (!trimmed) continue;
			// 跳过 # 标题行
			if (trimmed.startsWith('#')) continue;

			// 计算缩进宽度
			const indent = getIndentWidth(line);

			// 移除列表标记（- 或 *）
			const nodeText = trimmed.replace(/^[-*]\s*/, '').trim();

			const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
			const newNode: MindMapNode = {
				id: nodeId,
				text: nodeText,
				children: [],
				collapsed: collapsedStateMap.get(nodeId) || false
			};

			// 找到正确的父节点：弹出所有缩进 >= 当前缩进的节点
			while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
				stack.pop();
			}

			const parent = stack[stack.length - 1].node;
			parent.children.push(newNode);
			stack.push({ node: newNode, level: stack.length - 1, indent });
		}

		// 如果只有一个顶层节点且没有自定义标题，将其作为根节点
		if (root.children.length === 1 && rootTitle === 'Root') {
			return root.children[0];
		}

		return root;
	}

	private render() {
		this.root = this.parseMarkdownList(this.source);
		if (!this.root) {
			this.container.innerHTML = '<p>No content to render</p>';
			return;
		}

		// Create wrapper for controls and SVG
		const wrapper = this.container.createDiv();
		wrapper.style.position = 'relative';
		wrapper.style.width = '100%';
		wrapper.style.maxWidth = '100%';
		wrapper.style.height = '600px';
		wrapper.style.overflow = 'hidden';
		wrapper.style.background = this.settings.canvasBackgroundColor;
		wrapper.style.transition = 'all 0.3s ease';
		this.wrapper = wrapper;

		// Create right sidebar for notes
		const notePanel = wrapper.createDiv();
		notePanel.style.cssText = `
			position: absolute;
			top: 0;
			right: 0;
			width: ${this.settings.notePanelWidth}px;
			height: 100%;
			background: #fffef0;
			border-left: 1px solid #e6ddb3;
			box-shadow: -2px 0 12px rgba(0,0,0,0.08);
			transform: translateX(100%);
			visibility: hidden;
			transition: transform 0.3s ease, visibility 0.3s ease;
			z-index: 1000;
			overflow: auto;
			padding: 16px;
		`;
		this.notePanel = notePanel;

		// Create control buttons
		this.createControls(wrapper);

		const svg = wrapper.createSvg('svg') as SVGSVGElement;
		svg.style.width = '100%';
		svg.style.height = '100%';
		svg.style.cursor = 'grab';
		svg.style.userSelect = 'none';
		this.svg = svg;

		const g = svg.createSvg('g') as SVGGElement;
		this.mainGroup = g;

		// Create separate groups for lines and nodes (lines first, nodes on top)
		const linesGroup = g.createSvg('g') as SVGGElement;
		linesGroup.setAttribute('class', 'mindmap-lines');
		const nodesGroup = g.createSvg('g') as SVGGElement;
		nodesGroup.setAttribute('class', 'mindmap-nodes');

		// 根据渲染模式选择不同的渲染方法
		switch (this.renderMode) {
			case 'clockwise':
				this.renderRadialMindMap(this.root, linesGroup, nodesGroup);
				break;
			case 'logic':
			default:
				// 大纲模式：全部向右展开
				this.renderOutlineView(this.root, linesGroup, nodesGroup);
				break;
		}
		this.centerTree(g, svg);

		// Add zoom and pan event listeners
		this.setupZoomAndPan(svg);

		// 点击画布其它区域关闭备注面板
		svg.addEventListener('click', (e: MouseEvent) => {
			if (e.target === svg || (e.target as Element).tagName === 'svg') {
				this.hideNotePanel();
			}
		});

		// 监听全屏变化事件
		const handleFullscreenChange = () => {
			const isFullscreen = document.fullscreenElement === this.wrapper ||
				(document as any).webkitFullscreenElement === this.wrapper ||
				(document as any).msFullscreenElement === this.wrapper;
			
			// 如果全屏状态改变
			if (this.isFullscreen !== isFullscreen) {
				this.isFullscreen = isFullscreen;
				
				// 更新高度和背景色
				if (this.wrapper) {
					this.wrapper.style.height = isFullscreen ? '100vh' : '600px';
					this.wrapper.style.background = this.settings.canvasBackgroundColor;
				}
				
				// 退出全屏时恢复缩放和平移，并隐藏备注面板
				if (!isFullscreen) {
					this.scale = this.savedScale;
					this.translateX = this.savedTranslateX;
					this.translateY = this.savedTranslateY;
					this.applyTransform();
					this.hideNotePanel();
				}
				
				// 更新按钮图标
				if (this.fullscreenBtn) {
					this.fullscreenBtn.textContent = this.isFullscreen ? '⛶' : '⛶';
					this.fullscreenBtn.title = this.isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';
				}
				
				// 全屏时自动调整缩放比例（自适应）
				if (isFullscreen && this.mainGroup && this.svg) {
					this.centerTree(this.mainGroup, this.svg);
				}
			}
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('msfullscreenchange', handleFullscreenChange);

		// 清理函数
		this.register(() => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('msfullscreenchange', handleFullscreenChange);
		});
	}

	private createControls(wrapper: HTMLElement) {
		const controls = wrapper.createDiv();
		controls.style.cssText = `
			position: absolute;
			top: 10px;
			right: 10px;
			z-index: 100;
			display: flex;
			gap: 5px;
			background: rgba(255, 255, 255, 0.9);
			padding: 5px;
			border-radius: 6px;
			box-shadow: 0 2px 8px rgba(0,0,0,0.15);
		`;

		// Zoom In button
		const zoomInBtn = controls.createEl('button');
		zoomInBtn.textContent = '+';
		this.styleButton(zoomInBtn);
		zoomInBtn.addEventListener('click', () => this.zoom(1.2));

		// Zoom Out button
		const zoomOutBtn = controls.createEl('button');
		zoomOutBtn.textContent = '−';
		this.styleButton(zoomOutBtn);
		zoomOutBtn.addEventListener('click', () => this.zoom(0.8));

		// Zoom level select dropdown
		const zoomLevelSelect = controls.createEl('select');
		zoomLevelSelect.style.cssText = `
			padding: 4px 8px;
			border: 1px solid #ddd;
			border-radius: 4px;
			background: white;
			cursor: pointer;
			font-size: 12px;
			line-height: 1;
			min-width: 70px;
		`;

		// 添加常用缩放比例选项
		const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
		zoomLevels.forEach(level => {
			const option = zoomLevelSelect.createEl('option');
			option.value = level.toString();
			option.textContent = `${Math.round(level * 100)}%`;
		});

		// 添加自定义选项
		const customOption = zoomLevelSelect.createEl('option');
		customOption.value = 'custom';
		customOption.textContent = 'Custom';
		customOption.disabled = true;

		// 设置当前缩放级别
		this.updateZoomLevelSelect(zoomLevelSelect, this.scale);

		// 监听缩放级别选择
		zoomLevelSelect.addEventListener('change', (e) => {
			const selectedLevel = parseFloat((e.target as HTMLSelectElement).value);
			if (!isNaN(selectedLevel)) {
				this.scale = selectedLevel;
				this.applyTransform();
				this.updateZoomLevelSelect(zoomLevelSelect, this.scale);
			}
		});

		this.zoomLevelSelect = zoomLevelSelect;

		// Reset zoom button
		const resetBtn = controls.createEl('button');
		resetBtn.textContent = '⟲';
		this.styleButton(resetBtn);
		resetBtn.addEventListener('click', () => this.resetZoom());

		// Separator 2
		const separator2 = controls.createSpan();
		separator2.style.cssText = 'width: 1px; background: #ddd; margin: 0 5px;';

		// Copy as PNG button
		const copyBtn = controls.createEl('button');
		copyBtn.textContent = '📷';
		this.styleButton(copyBtn);
		copyBtn.title = 'Copy as PNG';
		copyBtn.addEventListener('click', () => this.copyAsPNG());

		// Fullscreen button
		const fullscreenBtn = controls.createEl('button');
		fullscreenBtn.textContent = '⛶';
		this.styleButton(fullscreenBtn);
		fullscreenBtn.title = 'Toggle fullscreen';
		fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
		this.fullscreenBtn = fullscreenBtn;

		// Separator
		const separator = controls.createSpan();
		separator.style.cssText = 'width: 1px; background: #ddd; margin: 0 5px;';

		// Render mode dropdown
		const modeSelect = controls.createEl('select');
		modeSelect.style.cssText = `
			padding: 4px 8px;
			border: 1px solid #ddd;
			border-radius: 4px;
			background: white;
			cursor: pointer;
			font-size: 12px;
			line-height: 1;
		`;

		// 添加模式选项
		Object.entries(RENDER_MODE_NAMES).forEach(([key, name]) => {
			const option = modeSelect.createEl('option');
			option.value = key;
			option.textContent = name;
		});

		// 设置当前选中的模式
		modeSelect.value = this.renderMode;

		// 监听模式切换
		modeSelect.addEventListener('change', (e) => {
			this.renderMode = (e.target as HTMLSelectElement).value as RenderMode;
			this.refresh();
		});
	}

	private styleButton(btn: HTMLButtonElement) {
		btn.style.cssText = `
			width: 28px;
			height: 28px;
			border: 1px solid #ddd;
			background: white;
			border-radius: 4px;
			cursor: pointer;
			font-size: 16px;
			line-height: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: background 0.2s;
		`;
		btn.addEventListener('mouseenter', () => btn.style.background = '#f0f0f0');
		btn.addEventListener('mouseleave', () => btn.style.background = 'white');
	}

	private updateZoomLevelSelect(select: HTMLSelectElement, scale: number) {
		const zoomLevels = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0];
		
		// 检查当前缩放值是否匹配预设值
		const matchedLevel = zoomLevels.find(level => Math.abs(level - scale) < 0.01);
		
		if (matchedLevel !== undefined) {
			// 匹配预设值，选中对应选项
			select.value = matchedLevel.toString();
		} else {
			// 不匹配预设值，显示自定义值
			select.value = 'custom';
			// 更新自定义选项的文本
			const customOption = select.querySelector('option[value="custom"]');
			if (customOption) {
				customOption.textContent = `${Math.round(scale * 100)}%`;
				customOption.disabled = false;
			}
		}
	}

	private setupZoomAndPan(svg: SVGSVGElement) {
		// Mouse wheel zoom (only if enabled in settings)
		if (this.settings.enableWheelZoom) {
			svg.addEventListener('wheel', (e: WheelEvent) => {
				e.preventDefault();
				const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
				this.zoom(zoomFactor, e.clientX, e.clientY);
			});
		}

		// Pinch zoom with trackpad (only if enabled in settings)
		if (this.settings.enablePinchZoom) {
			svg.addEventListener('touchstart', (e: TouchEvent) => {
				if (e.touches.length === 2) {
					// 双指捏合手势
					e.preventDefault();
					const touch1 = e.touches[0];
					const touch2 = e.touches[1];
					this.initialPinchDistance = Math.hypot(
						touch2.clientX - touch1.clientX,
						touch2.clientY - touch1.clientY
					);
					this.initialScale = this.scale;
				}
			}, { passive: false });

			svg.addEventListener('touchmove', (e: TouchEvent) => {
				if (e.touches.length === 2) {
					e.preventDefault();
					const touch1 = e.touches[0];
					const touch2 = e.touches[1];
					const currentDistance = Math.hypot(
						touch2.clientX - touch1.clientX,
						touch2.clientY - touch1.clientY
					);
					
					// 计算缩放比例
					const scaleFactor = currentDistance / this.initialPinchDistance;
					const newScale = Math.max(0.1, Math.min(5, this.initialScale * scaleFactor));
					
					// 计算中心点（两个手指的中点）
					const centerX = (touch1.clientX + touch2.clientX) / 2;
					const centerY = (touch1.clientY + touch2.clientY) / 2;
					
					// 应用缩放
					if (this.svg) {
						const rect = this.svg.getBoundingClientRect();
						const svgCenterX = centerX - rect.left;
						const svgCenterY = centerY - rect.top;
						
						this.translateX = svgCenterX - (svgCenterX - this.translateX) * (newScale / this.scale);
						this.translateY = svgCenterY - (svgCenterY - this.translateY) * (newScale / this.scale);
					}
					
					this.scale = newScale;
					this.applyTransform();
					
					// 更新缩放百分比选择框
					if (this.zoomLevelSelect) {
						this.updateZoomLevelSelect(this.zoomLevelSelect, this.scale);
					}
				}
			}, { passive: false });
		}

		// Pan with mouse drag
		svg.addEventListener('mousedown', (e: MouseEvent) => {
			if (e.button === 0) { // Left mouse button
				// 检查目标是否是可点击元素（circle 或 text）
				const target = e.target as Element;
				if (target.tagName === 'circle' || target.tagName === 'text') {
					// 不启动拖拽，让 click 事件处理
					return;
				}
				
				this.isDragging = true;
				this.dragStartX = e.clientX - this.translateX;
				this.dragStartY = e.clientY - this.translateY;
				svg.style.cursor = 'grabbing';
			}
		});

		svg.addEventListener('mousemove', (e: MouseEvent) => {
			if (this.isDragging) {
				this.translateX = e.clientX - this.dragStartX;
				this.translateY = e.clientY - this.dragStartY;
				this.applyTransform();
			}
		});

		svg.addEventListener('mouseup', () => {
			this.isDragging = false;
			svg.style.cursor = 'grab';
		});

		svg.addEventListener('mouseleave', () => {
			this.isDragging = false;
			svg.style.cursor = 'grab';
		});
	}

	private zoom(factor: number, centerX?: number, centerY?: number) {
		const newScale = Math.max(0.1, Math.min(5, this.scale * factor));
		
		if (centerX !== undefined && centerY !== undefined && this.svg) {
			// Zoom towards mouse position
			const rect = this.svg.getBoundingClientRect();
			const mouseX = centerX - rect.left;
			const mouseY = centerY - rect.top;
			
			this.translateX = mouseX - (mouseX - this.translateX) * (newScale / this.scale);
			this.translateY = mouseY - (mouseY - this.translateY) * (newScale / this.scale);
		}
		
		this.scale = newScale;
		this.applyTransform();
		
		// 更新缩放百分比选择框
		if (this.zoomLevelSelect) {
			this.updateZoomLevelSelect(this.zoomLevelSelect, this.scale);
		}
	}

	private resetZoom() {
		this.scale = 1;
		if (this.mainGroup && this.svg) {
			this.centerTree(this.mainGroup, this.svg);
		}
		
		// 更新缩放百分比选择框
		if (this.zoomLevelSelect) {
			this.updateZoomLevelSelect(this.zoomLevelSelect, this.scale);
		}
	}

	private async copyAsPNG() {
		if (!this.svg || !this.mainGroup) return;

		try {
			// 获取 SVG 的边界框
			const bbox = this.mainGroup.getBBox();
			const padding = 40; // 增加内边距
			const scaleFactor = 2; // 2倍放大，提高清晰度
			const width = (bbox.width + padding * 2) * scaleFactor;
			const height = (bbox.height + padding * 2) * scaleFactor;

			// 创建新的 SVG 元素用于导出
			const svgClone = this.svg.cloneNode(true) as SVGSVGElement;
			svgClone.setAttribute('width', width.toString());
			svgClone.setAttribute('height', height.toString());
			svgClone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${bbox.width + padding * 2} ${bbox.height + padding * 2}`);

			// 将 SVG 转换为字符串
			const svgString = new XMLSerializer().serializeToString(svgClone);
			const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
			const svgUrl = URL.createObjectURL(svgBlob);

			// 创建 Image 对象
			const img = new Image();
			img.onload = async () => {
				// 创建 Canvas（使用高分辨率）
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext('2d', { alpha: false }); // 优化性能
				if (!ctx) return;

				// 绘制白色背景
				ctx.fillStyle = 'white';
				ctx.fillRect(0, 0, width, height);

				// 绘制 SVG（使用高质量缩放）
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = 'high';
				ctx.drawImage(img, 0, 0, width, height);

				// 导出为 PNG（最高质量）
				canvas.toBlob(async (blob) => {
					if (!blob) return;

					// 复制到剪贴板
					try {
						await navigator.clipboard.write([
							new ClipboardItem({ 'image/png': blob })
						]);
						console.log('Copied as PNG');
						new Notice('Mind map copied as PNG');
					} catch (err) {
						console.error('Failed to copy:', err);
						new Notice('Failed to copy as PNG');
					}

					// 清理
					URL.revokeObjectURL(svgUrl);
				}, 'image/png', 1.0); // 质量参数设为 1.0（最高）
			};

			img.src = svgUrl;
		} catch (err) {
			console.error('Failed to copy as PNG:', err);
		}
	}

	private applyTransform() {
		if (this.mainGroup) {
			this.mainGroup.setAttribute('transform', 
				`translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
		}
	}

	private hideNotePanel() {
		if (this.notePanel) {
			this.notePanel.style.transform = 'translateX(100%)';
			this.notePanel.style.visibility = 'hidden';
		}
	}

	private updateNotePanelWidth() {
		if (this.notePanel) {
			this.notePanel.style.width = `${this.settings.notePanelWidth}px`;
		}
	}

	private updateCanvasColor() {
		if (this.wrapper) {
			this.wrapper.style.background = this.settings.canvasBackgroundColor;
		}
	}

	private toggleFullscreen() {
		if (!this.wrapper) return;

		this.isFullscreen = !this.isFullscreen;

		if (this.isFullscreen) {
			// 进入全屏：保存当前状态
			this.savedScale = this.scale;
			this.savedTranslateX = this.translateX;
			this.savedTranslateY = this.translateY;
			
			// 设置全屏样式
			this.wrapper.style.height = '100vh';
			this.wrapper.style.background = this.settings.canvasBackgroundColor;
			
			if (this.wrapper.requestFullscreen) {
				this.wrapper.requestFullscreen();
			} else if (this.wrapper.webkitRequestFullscreen) {
				this.wrapper.webkitRequestFullscreen();
			} else if (this.wrapper.msRequestFullscreen) {
				this.wrapper.msRequestFullscreen();
			}
		} else {
			// 退出全屏：恢复之前的状态
			this.wrapper.style.height = '600px';
			this.wrapper.style.background = this.settings.canvasBackgroundColor;
			
			// 恢复缩放和平移
			this.scale = this.savedScale;
			this.translateX = this.savedTranslateX;
			this.translateY = this.savedTranslateY;
			this.applyTransform();
			
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if ((document as any).webkitExitFullscreen) {
				(document as any).webkitExitFullscreen();
			} else if ((document as any).msExitFullscreen) {
				(document as any).msExitFullscreen();
			}
		}

		// 更新按钮图标
		if (this.fullscreenBtn) {
			this.fullscreenBtn.textContent = this.isFullscreen ? '⛶' : '⛶';
			this.fullscreenBtn.title = this.isFullscreen ? 'Exit fullscreen' : 'Toggle fullscreen';
		}
		
		// 全屏时自动调整缩放比例（自适应）
		if (this.isFullscreen && this.mainGroup && this.svg) {
			this.centerTree(this.mainGroup, this.svg);
		}
	}

	static updateAllNotePanelWidth(width: number) {
		MindMapRenderer.instances.forEach(renderer => {
			renderer.settings.notePanelWidth = width;
			renderer.updateNotePanelWidth();
		});
	}

	static updateAllColors() {
		MindMapRenderer.instances.forEach(renderer => {
			renderer.updateCanvasColor();
			renderer.refresh();
		});
	}

	private expandAll() {
		if (this.root) {
			this.setCollapsedState(this.root, false);
			this.refresh();
		}
	}

	private collapseAll() {
		if (this.root) {
			this.setCollapsedState(this.root, true);
			this.refresh();
		}
	}

	private setCollapsedState(node: MindMapNode, collapsed: boolean) {
		if (node.children.length > 0) {
			node.collapsed = collapsed;
			collapsedStateMap.set(node.id, collapsed);
			for (const child of node.children) {
				this.setCollapsedState(child, collapsed);
			}
		}
	}

	// 第一阶段：渲染所有连线
	private renderLines(
		node: MindMapNode,
		linesGroup: SVGElement,
		x: number,
		y: number,
		depth: number,
		isRoot: boolean = true
	): void {
		const isLeaf = node.children.length === 0 || node.collapsed;
		const textWidth = this.calculateTextWidth(node.text, depth);
		// 叶子节点线段长度需要比文字长一些
		const lineLength = textWidth + 25;
		const nodeRadius = 6; // 空心圆半径
		
		// 连线粗细根据层级变化
		const strokeWidth = Math.max(1.2, 2.2 - depth * 0.3);
		const lineColor = this.settings.connectionColor;

		// 每个节点都有一条横线（文字在横线上方）
		const horizontalLine = linesGroup.createSvg('line');
		horizontalLine.setAttribute('x1', x.toString());
		horizontalLine.setAttribute('y1', y.toString());
		
		if (isLeaf) {
			// 叶子节点：横线延伸到文字末尾
			horizontalLine.setAttribute('x2', (x + lineLength).toString());
		} else {
			// 非叶子节点：横线延伸到空心圆位置
			horizontalLine.setAttribute('x2', (x + lineLength + nodeRadius).toString());
		}
		horizontalLine.setAttribute('y2', y.toString());
		horizontalLine.setAttribute('stroke', lineColor);
		horizontalLine.setAttribute('stroke-width', strokeWidth.toString());

		// 如果是非叶子节点且有子节点，绘制到子节点的曲线
		if (!isLeaf) {
			const circleX = x + lineLength + nodeRadius; // 空心圆位置
			const totalHeight = this.calculateTreeHeight(node);
			let currentY = y - (totalHeight / 2);

			for (const child of node.children) {
				const childHeight = this.calculateTreeHeight(child);
				const childY = currentY + (childHeight / 2);
				const childX = circleX + 30; // 子节点横线起点

				// 从空心圆到子节点的贝塞尔曲线
				const curve = linesGroup.createSvg('path');
				const startX = circleX + nodeRadius;
				const startY = y;
				const endX = childX;
				const endY = childY;
				
				// 更自然的弧度：使用不同的控制点比例
				const deltaY = Math.abs(endY - startY);
				const deltaX = endX - startX;
				
				// 控制点的水平偏移根据垂直距离调整
				const curveRatio = Math.min(0.7, 0.3 + deltaY / 200);
				const controlX1 = startX + deltaX * curveRatio;
				const controlY1 = startY;
				const controlX2 = startX + deltaX * (1 - curveRatio + 0.3);
				const controlY2 = endY;

				curve.setAttribute('d', `M${startX},${startY} C${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`);
				curve.setAttribute('stroke', lineColor);
				curve.setAttribute('stroke-width', strokeWidth.toString());
				curve.setAttribute('fill', 'none');

				// 递归渲染子节点的连线
				this.renderLines(child, linesGroup, childX, childY, depth + 1, false);

				currentY += childHeight + 20;
			}
		}
	}

	// 第二阶段：渲染所有节点（文字和空心圆）
	private renderNodes(
		node: MindMapNode,
		nodesGroup: SVGElement,
		x: number,
		y: number,
		depth: number
	): void {
		const nodeGroup = nodesGroup.createSvg('g');
		nodeGroup.setAttribute('class', 'mindmap-node');
		nodeGroup.setAttribute('data-id', node.id);

		const isLeaf = node.children.length === 0 || node.collapsed;
		const textWidth = this.calculateTextWidth(node.text, depth);
		const lineLength = textWidth + 25;
		const nodeRadius = 6;
		const fontSize = Math.max(11, 13 - depth * 0.5);
		const fontWeight = depth === 0 ? '600' : 'normal';
		const textColor = this.settings.fontColor;

		// 文字背景（白色矩形遮挡连线）
		const textBg = nodeGroup.createSvg('rect');
		const textX = x + 2; // 文字起始位置
		const textY = y - 12; // 文字在横线上方
		textBg.setAttribute('x', textX.toString());
		textBg.setAttribute('y', (textY - fontSize + 2).toString());
		textBg.setAttribute('width', textWidth.toString());
		textBg.setAttribute('height', (fontSize + 4).toString());
		textBg.setAttribute('fill', this.settings.nodeBackgroundColor);

		// 节点文本（在横线正上方）
		const text = nodeGroup.createSvg('text');
		text.setAttribute('x', textX.toString());
		text.setAttribute('y', textY.toString());
		text.setAttribute('fill', textColor);
		text.setAttribute('font-size', fontSize.toString());
		text.setAttribute('font-family', 'system-ui, -apple-system, sans-serif');
		text.setAttribute('font-weight', fontWeight);
		text.style.cursor = 'pointer';
		text.textContent = node.text;

		// 点击事件
		const toggleNode = (e: Event) => {
			e.preventDefault();
			e.stopPropagation();
			if (node.children.length > 0) {
				node.collapsed = !node.collapsed;
				collapsedStateMap.set(node.id, node.collapsed);
				this.refresh();
			}
		};

		text.addEventListener('click', toggleNode);

		// 如果有备注，显示备注图标
		if (node.note) {
			const noteIconX = textX + textWidth - 10; // 紧跟文字后面
			const noteIconY = textY; // 与文字水平居中
			const iconSize = fontSize;

			// 备注图标（使用 emoji）
			const noteIcon = nodeGroup.createSvg('text');
			noteIcon.setAttribute('x', noteIconX.toString());
			noteIcon.setAttribute('y', noteIconY.toString());
			noteIcon.setAttribute('font-size', iconSize.toString());
			noteIcon.textContent = '📝';
			noteIcon.style.cursor = 'pointer';
			noteIcon.style.opacity = '0.6';
			noteIcon.style.transition = 'opacity 0.15s';

			// 点击显示备注在右侧面板
			const showNote = (e: MouseEvent) => {
				e.stopPropagation();
				
				if (!this.notePanel) return;
				
				// 图标高亮
				noteIcon.style.opacity = '1';
				
				// 清空并填充备注内容
				this.notePanel.innerHTML = '';
				
				// 添加标题
				const title = this.notePanel.createEl('h3');
				title.textContent = node.text;
				title.style.cssText = `
					margin: 0 0 12px 0;
					font-size: 16px;
					font-weight: 600;
					color: #333;
				`;

				// 添加备注内容
				const noteContent = this.notePanel.createDiv();
				noteContent.style.cssText = 'font-size: 13px; line-height: 1.6; color: #5c5640;';
				MarkdownRenderer.render(this.app, node.note, noteContent, '', this);

				// 显示面板
				this.notePanel.style.transform = 'translateX(0)';
				this.notePanel.style.visibility = 'visible';
			};

			noteIcon.addEventListener('click', showNote);
		}

		// 非叶子节点：绘制空心圆
		if (!isLeaf || (node.children.length > 0 && node.collapsed)) {
			const circleX = x + lineLength + nodeRadius;
			
			// 空心圆背景（白色填充）
			const circleBg = nodeGroup.createSvg('circle');
			circleBg.setAttribute('cx', circleX.toString());
			circleBg.setAttribute('cy', y.toString());
			circleBg.setAttribute('r', (nodeRadius + 1).toString());
			circleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

			// 空心圆
			const circle = nodeGroup.createSvg('circle');
			circle.setAttribute('cx', circleX.toString());
			circle.setAttribute('cy', y.toString());
			circle.setAttribute('r', nodeRadius.toString());
			circle.setAttribute('fill', this.settings.nodeBackgroundColor);
			circle.setAttribute('stroke', textColor);
			circle.setAttribute('stroke-width', '1.5');
			circle.style.cursor = 'pointer';
			circle.addEventListener('click', toggleNode);

			// 显示展开/折叠指示器
			if (node.children.length > 0) {
				const indicatorText = nodeGroup.createSvg('text');
				indicatorText.setAttribute('x', (circleX - 3).toString());
				indicatorText.setAttribute('y', (y + 4).toString());
				indicatorText.setAttribute('fill', textColor);
				indicatorText.setAttribute('font-size', '12');
				indicatorText.setAttribute('font-weight', 'bold');
				indicatorText.setAttribute('font-family', 'system-ui, sans-serif');
				indicatorText.textContent = node.collapsed ? '+' : '-';
				indicatorText.style.cursor = 'pointer';
				indicatorText.addEventListener('click', toggleNode);
			}
		}
		// 叶子节点：不绘制空心圆，只有横线和文字

		// 递归渲染子节点
		if (node.children.length > 0 && !node.collapsed) {
			const circleX = x + lineLength + nodeRadius;
			const totalHeight = this.calculateTreeHeight(node);
			let currentY = y - (totalHeight / 2);

			for (const child of node.children) {
				const childHeight = this.calculateTreeHeight(child);
				const childY = currentY + (childHeight / 2);
				const childX = circleX + 30;

				this.renderNodes(child, nodesGroup, childX, childY, depth + 1);

				currentY += childHeight + 20;
			}
		}
	}

	private countDescendants(node: MindMapNode): number {
		let count = node.children.length;
		for (const child of node.children) {
			count += this.countDescendants(child);
		}
		return count;
	}

	private calculateTextWidth(text: string, depth: number): number {
		// 根据深度计算字体大小
		const fontSize = Math.max(10, 13 - depth);
		// 分别计算中文和非中文字符的宽度
		let totalWidth = 0;
		for (const char of text) {
			// 检测中文字符（包括中文标点）
			if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
				// 中文字符宽度约等于字体大小
				totalWidth += fontSize;
			} else {
				// 英文和其他字符宽度约为字体大小的0.55倍
				totalWidth += fontSize * 0.55;
			}
		}
		return totalWidth + 16; // 留出边距
	}

	private calculateTreeHeight(node: MindMapNode): number {
		if (node.children.length === 0 || node.collapsed) {
			return 24; // 单个节点的基础高度
		}

		let totalHeight = 0;
		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i];
			totalHeight += this.calculateTreeHeight(child);
			if (i < node.children.length - 1) {
				totalHeight += 20; // 节点之间的间距
			}
		}

		return totalHeight;
	}

	private calculateTreeWidth(node: MindMapNode, depth: number = 0): number {
		if (node.children.length === 0 || node.collapsed) {
			return this.calculateTextWidth(node.text, depth) + 30;
		}

		let maxWidth = this.calculateTextWidth(node.text, depth) + 30;
		for (const child of node.children) {
			const childWidth = this.calculateTreeWidth(child, depth + 1);
			maxWidth = Math.max(maxWidth, childWidth + 100); // 子节点水平偏移
		}

		return maxWidth;
	}

	private centerTree(g: SVGGElement, svg: SVGSVGElement) {
		const bbox = g.getBBox();
		const svgWidth = svg.clientWidth || 800;
		const svgHeight = svg.clientHeight || 600;

		// 计算缩放比例，优先适应宽度
		const scaleX = Math.min(1, (svgWidth - 80) / bbox.width);
		const scaleY = Math.min(1, (svgHeight - 60) / bbox.height);
		this.scale = Math.min(scaleX, scaleY, 1); // 不放大，只缩小

		// 计算居中位置
		this.translateX = 40 - bbox.x * this.scale;
		this.translateY = (svgHeight - bbox.height * this.scale) / 2 - bbox.y * this.scale;

		this.applyTransform();
		
		// 更新缩放百分比选择框
		if (this.zoomLevelSelect) {
			this.updateZoomLevelSelect(this.zoomLevelSelect, this.scale);
		}
	}

	private refresh() {
		// Preserve zoom state during refresh
		const savedScale = this.scale;
		const savedTranslateX = this.translateX;
		const savedTranslateY = this.translateY;
		
		this.container.innerHTML = '';
		this.render();
		
		// Restore zoom state
		this.scale = savedScale;
		this.translateX = savedTranslateX;
		this.translateY = savedTranslateY;
		this.applyTransform();
	}

	// 大纲模式渲染（全部向右展开）
	private renderOutlineView(root: MindMapNode, linesGroup: SVGGElement, nodesGroup: SVGGElement) {
		const lineColor = this.settings.lineColor;
		const startX = 50;
		const totalHeight = this.calculateRadialMindMapTreeHeight(root);
		const startY = totalHeight / 2 + 50;

		const textWidth = this.calculateTextWidth(root.text, 0);
		const noteIconWidth = root.note ? 20 : 0;
		const totalNodeWidth = textWidth + noteIconWidth;
		const nodeHeight = 24;

		// 根节点背景
		const bgRect = nodesGroup.createSvg('rect');
		bgRect.setAttribute('x', startX.toString());
		bgRect.setAttribute('y', (startY - nodeHeight / 2).toString());
		bgRect.setAttribute('width', totalNodeWidth.toString());
		bgRect.setAttribute('height', nodeHeight.toString());
		bgRect.setAttribute('rx', '4');
		bgRect.setAttribute('fill', lineColor);

		// 根节点文字
		const rootText = nodesGroup.createSvg('text');
		rootText.setAttribute('x', (startX + textWidth / 2).toString());
		rootText.setAttribute('y', (startY + 5).toString());
		rootText.setAttribute('fill', 'white');
		rootText.setAttribute('font-size', '14');
		rootText.setAttribute('font-weight', '600');
		rootText.setAttribute('text-anchor', 'middle');
		rootText.textContent = root.text;

		// 根节点备注图标
		if (root.note) {
			this.addNoteIcon(nodesGroup, startX + textWidth + 2, startY, root.note, 14, 'white', root.text);
		}

		// Root 节点的圆圈和展开/收缩功能
		if (root.children.length > 0) {
			const nodeRadius = 6;
			const circleX = startX + totalNodeWidth + nodeRadius + 2; // 在节点框右侧，留 2px 间隙
			const circleY = startY;

			// 空心圆背景
			const circleBg = nodesGroup.createSvg('circle');
			circleBg.setAttribute('cx', circleX.toString());
			circleBg.setAttribute('cy', circleY.toString());
			circleBg.setAttribute('r', (nodeRadius + 1).toString());
			circleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

			// 空心圆
			const circle = nodesGroup.createSvg('circle');
			circle.setAttribute('cx', circleX.toString());
			circle.setAttribute('cy', circleY.toString());
			circle.setAttribute('r', nodeRadius.toString());
			circle.setAttribute('fill', this.settings.nodeBackgroundColor);
			circle.setAttribute('stroke', lineColor);
			circle.setAttribute('stroke-width', '2');
			circle.style.cursor = 'pointer';

			// 展开/收缩指示器
			const indicatorText = nodesGroup.createSvg('text');
			indicatorText.setAttribute('x', (circleX - 3).toString());
			indicatorText.setAttribute('y', (circleY + 4).toString());
			indicatorText.setAttribute('fill', lineColor);
			indicatorText.setAttribute('font-size', '12');
			indicatorText.setAttribute('font-weight', 'bold');
			indicatorText.setAttribute('font-family', 'system-ui, sans-serif');
			indicatorText.textContent = root.collapsed ? '+' : '-';
			indicatorText.style.cursor = 'pointer';

			// 点击事件
			const toggleRoot = (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.isDragging = false;
				root.collapsed = !root.collapsed;
				collapsedStateMap.set(root.id, root.collapsed);
				this.refresh();
			};

			circle.addEventListener('click', toggleRoot);
			indicatorText.addEventListener('click', toggleRoot);
		}

		// 全部子节点向右展开
		if (!root.collapsed && root.children.length > 0) {
			const nodeRadius = 6;
			const circleX = startX + totalNodeWidth + nodeRadius + 2;
			const parentRight = circleX + nodeRadius + 30; // 从圆圈右侧开始，留 30px 间距
			this.renderOutlineViewChildren(root.children, linesGroup, nodesGroup, parentRight, startY, 1);
		}
	}

	// 大纲模式子节点渲染（全部向右）
	private renderOutlineViewChildren(
		children: MindMapNode[],
		linesGroup: SVGGElement,
		nodesGroup: SVGGElement,
		parentRight: number,
		parentY: number,
		depth: number
	) {
		const lineColor = this.settings.lineColor;
		const horizontalGap = 30;
		const verticalGap = 8;

		const childHeights = children.map(child => this.calculateRadialMindMapTreeHeight(child));
		const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * verticalGap;

		let currentY = parentY - totalChildrenHeight / 2;
		const lineStartX = parentRight;
		const turnX = parentRight + horizontalGap / 2;

		children.forEach((child, i) => {
			const childHeight = childHeights[i];
			const childCenterY = currentY + childHeight / 2;

			const fontSize = Math.max(10, 13 - depth);
			const textWidth = this.calculateTextWidth(child.text, depth);
			const noteIconWidth = child.note ? 18 : 0;
			const totalNodeWidth = textWidth + noteIconWidth;
			const nodeHeight = fontSize + 10;
			const nodeX = parentRight + horizontalGap;
			const nodeRadius = 6;

			// 计算圆圈位置（在节点框右侧，留 2px 间隙）
			const circleX = nodeX + totalNodeWidth + nodeRadius + 2;
			const circleY = childCenterY;
			const strokeWidth = 1.5; // 与连线粗细一致

			// 绘制连接线（延伸到圆圈左边缘）
			const path = linesGroup.createSvg('path');
			const d = `M ${lineStartX} ${parentY} L ${turnX} ${parentY} L ${turnX} ${childCenterY} L ${circleX - nodeRadius} ${childCenterY}`;
			path.setAttribute('d', d);
			path.setAttribute('stroke', lineColor);
			path.setAttribute('stroke-width', strokeWidth);
			path.setAttribute('fill', 'none');

			// 节点背景
			const bgRect = nodesGroup.createSvg('rect');
			bgRect.setAttribute('x', nodeX.toString());
			bgRect.setAttribute('y', (childCenterY - nodeHeight / 2).toString());
			bgRect.setAttribute('width', totalNodeWidth.toString());
			bgRect.setAttribute('height', nodeHeight.toString());
			bgRect.setAttribute('rx', '3');
			bgRect.setAttribute('fill', this.settings.nodeBackgroundColor);
			bgRect.setAttribute('stroke', lineColor);
			bgRect.setAttribute('stroke-width', '1');

			// 节点文字
			const text = nodesGroup.createSvg('text');
			text.setAttribute('x', (nodeX + textWidth / 2).toString());
			text.setAttribute('y', (childCenterY + fontSize / 3).toString());
			text.setAttribute('fill', this.settings.fontColor);
			text.setAttribute('font-size', fontSize.toString());
			text.setAttribute('text-anchor', 'middle');
			text.textContent = child.text;

			// 备注图标
			if (child.note) {
				this.addNoteIcon(nodesGroup, nodeX + textWidth + 2, childCenterY, child.note, fontSize, lineColor);
			}

			// 空心圆和展开/收缩功能
			if (child.children.length > 0) {
				// 空心圆背景（遮挡连接线）
				const circleBg = nodesGroup.createSvg('circle');
				circleBg.setAttribute('cx', circleX.toString());
				circleBg.setAttribute('cy', circleY.toString());
				circleBg.setAttribute('r', (nodeRadius + 1).toString());
				circleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

				// 空心圆
				const circle = nodesGroup.createSvg('circle');
				circle.setAttribute('cx', circleX.toString());
				circle.setAttribute('cy', circleY.toString());
				circle.setAttribute('r', nodeRadius.toString());
				circle.setAttribute('fill', this.settings.nodeBackgroundColor);
				circle.setAttribute('stroke', lineColor); // 颜色与连线一致
				circle.setAttribute('stroke-width', strokeWidth); // 粗细与连线一致
				circle.style.cursor = 'pointer';

				// 展开/收缩指示器
				const indicatorText = nodesGroup.createSvg('text');
				indicatorText.setAttribute('x', (circleX - 3).toString());
				indicatorText.setAttribute('y', (circleY + 4).toString());
				indicatorText.setAttribute('fill', lineColor); // 颜色与连线一致
				indicatorText.setAttribute('font-size', '12');
				indicatorText.setAttribute('font-weight', 'bold');
				indicatorText.setAttribute('font-family', 'system-ui, sans-serif');
				indicatorText.textContent = child.collapsed ? '+' : '-';
				indicatorText.style.cursor = 'pointer';

				// 点击事件
				const toggleNode = (e: MouseEvent) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					
					// 重置拖拽状态，防止拖拽干扰
					this.isDragging = false;
					
					child.collapsed = !child.collapsed;
					collapsedStateMap.set(child.id, child.collapsed);
					this.refresh();
				};

				circle.addEventListener('click', toggleNode);
				indicatorText.addEventListener('click', toggleNode);
			}

			// 递归渲染子节点
			if (!child.collapsed && child.children.length > 0) {
				const childRight = circleX + nodeRadius + horizontalGap; // 从圆圈右侧开始
				this.renderOutlineViewChildren(child.children, linesGroup, nodesGroup, childRight, childCenterY, depth + 1);
			}

			currentY += childHeight + verticalGap;
		});
	}

	// 中心辐射模式渲染（左右对称布局）
	private renderRadialMindMap(root: MindMapNode, linesGroup: SVGGElement, nodesGroup: SVGGElement) {
		const lineColor = this.settings.lineColor;
		const centerX = 400;
		const centerY = 300;

		const textWidth = this.calculateTextWidth(root.text, 0);
		const noteIconWidth = root.note ? 20 : 0;
		const totalNodeWidth = textWidth + noteIconWidth;
		const nodeHeight = 24;

		// 根节点背景（居中）
		const rootX = centerX - totalNodeWidth / 2;
		const bgRect = nodesGroup.createSvg('rect');
		bgRect.setAttribute('x', rootX.toString());
		bgRect.setAttribute('y', (centerY - nodeHeight / 2).toString());
		bgRect.setAttribute('width', totalNodeWidth.toString());
		bgRect.setAttribute('height', nodeHeight.toString());
		bgRect.setAttribute('rx', '4');
		bgRect.setAttribute('fill', lineColor);

		// 根节点文字
		const rootText = nodesGroup.createSvg('text');
		rootText.setAttribute('x', (rootX + textWidth / 2).toString());
		rootText.setAttribute('y', (centerY + 5).toString());
		rootText.setAttribute('fill', 'white');
		rootText.setAttribute('font-size', '14');
		rootText.setAttribute('font-weight', '600');
		rootText.setAttribute('text-anchor', 'middle');
		rootText.textContent = root.text;

		// 根节点备注图标
		if (root.note) {
			this.addNoteIcon(nodesGroup, rootX + textWidth + 2, centerY, root.note, 14, 'white', root.text);
		}

		// Root 节点的圆圈和展开/收缩功能
		if (root.children.length > 0) {
			const nodeRadius = 6;
			
			// 右侧圆圈（在节点框右侧，留 2px 间隙）
			const rightCircleX = rootX + totalNodeWidth + nodeRadius + 2;
			const rightCircleY = centerY;

			const rightCircleBg = nodesGroup.createSvg('circle');
			rightCircleBg.setAttribute('cx', rightCircleX.toString());
			rightCircleBg.setAttribute('cy', rightCircleY.toString());
			rightCircleBg.setAttribute('r', (nodeRadius + 1).toString());
			rightCircleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

			const rightCircle = nodesGroup.createSvg('circle');
			rightCircle.setAttribute('cx', rightCircleX.toString());
			rightCircle.setAttribute('cy', rightCircleY.toString());
			rightCircle.setAttribute('r', nodeRadius.toString());
			rightCircle.setAttribute('fill', this.settings.nodeBackgroundColor);
			rightCircle.setAttribute('stroke', lineColor);
			rightCircle.setAttribute('stroke-width', '2');
			rightCircle.style.cursor = 'pointer';

			const rightIndicatorText = nodesGroup.createSvg('text');
			rightIndicatorText.setAttribute('x', (rightCircleX - 3).toString());
			rightIndicatorText.setAttribute('y', (rightCircleY + 4).toString());
			rightIndicatorText.setAttribute('fill', lineColor);
			rightIndicatorText.setAttribute('font-size', '12');
			rightIndicatorText.setAttribute('font-weight', 'bold');
			rightIndicatorText.setAttribute('font-family', 'system-ui, sans-serif');
			rightIndicatorText.textContent = root.collapsed ? '+' : '-';
			rightIndicatorText.style.cursor = 'pointer';

			// 左侧圆圈（在节点框左侧，留 2px 间隙）
			const leftCircleX = rootX - nodeRadius - 2;
			const leftCircleY = centerY;

			const leftCircleBg = nodesGroup.createSvg('circle');
			leftCircleBg.setAttribute('cx', leftCircleX.toString());
			leftCircleBg.setAttribute('cy', leftCircleY.toString());
			leftCircleBg.setAttribute('r', (nodeRadius + 1).toString());
			leftCircleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

			const leftCircle = nodesGroup.createSvg('circle');
			leftCircle.setAttribute('cx', leftCircleX.toString());
			leftCircle.setAttribute('cy', leftCircleY.toString());
			leftCircle.setAttribute('r', nodeRadius.toString());
			leftCircle.setAttribute('fill', this.settings.nodeBackgroundColor);
			leftCircle.setAttribute('stroke', lineColor);
			leftCircle.setAttribute('stroke-width', '2');
			leftCircle.style.cursor = 'pointer';

			const leftIndicatorText = nodesGroup.createSvg('text');
			leftIndicatorText.setAttribute('x', (leftCircleX - 3).toString());
			leftIndicatorText.setAttribute('y', (leftCircleY + 4).toString());
			leftIndicatorText.setAttribute('fill', lineColor);
			leftIndicatorText.setAttribute('font-size', '12');
			leftIndicatorText.setAttribute('font-weight', 'bold');
			leftIndicatorText.setAttribute('font-family', 'system-ui, sans-serif');
			leftIndicatorText.textContent = root.collapsed ? '+' : '-';
			leftIndicatorText.style.cursor = 'pointer';

			// 点击事件
			const toggleRoot = (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
				this.isDragging = false;
				root.collapsed = !root.collapsed;
				collapsedStateMap.set(root.id, root.collapsed);
				this.refresh();
			};

			rightCircle.addEventListener('click', toggleRoot);
			rightIndicatorText.addEventListener('click', toggleRoot);
			leftCircle.addEventListener('click', toggleRoot);
			leftIndicatorText.addEventListener('click', toggleRoot);
		}

		if (!root.collapsed && root.children.length > 0) {
			const children = root.children;
			// 计算左右分配：前半部分在右边，后半部分在左边
			// 奇数时右边多一个
			const rightCount = Math.ceil(children.length / 2);
			const rightChildren = children.slice(0, rightCount);
			const leftChildren = children.slice(rightCount);

			// 渲染右侧子节点
			if (rightChildren.length > 0) {
				const nodeRadius = 6;
				const rightCircleX = rootX + totalNodeWidth + nodeRadius + 2;
				const parentRight = rightCircleX + nodeRadius + 30; // 从圆圈右侧开始，留 30px 间距
				this.renderRadialMindMapChildrenRight(rightChildren, linesGroup, nodesGroup, parentRight, centerY, 1);
			}

			// 渲染左侧子节点（镜像布局）
			if (leftChildren.length > 0) {
				const nodeRadius = 6;
				const leftCircleX = rootX - nodeRadius - 2;
				const parentLeft = leftCircleX - nodeRadius - 30; // 从圆圈左侧开始，留 30px 间距
				this.renderRadialMindMapChildrenLeft(leftChildren, linesGroup, nodesGroup, parentLeft, centerY, 1);
			}
		}
	}

	// 右侧子节点渲染
	private renderRadialMindMapChildrenRight(
		children: MindMapNode[],
		linesGroup: SVGGElement,
		nodesGroup: SVGGElement,
		parentRight: number,
		parentY: number,
		depth: number
	) {
		const lineColor = this.settings.lineColor;
		const horizontalGap = 30;
		const verticalGap = 8;

		const childHeights = children.map(child => this.calculateRadialMindMapTreeHeight(child));
		const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * verticalGap;

		let currentY = parentY - totalChildrenHeight / 2;
		const lineStartX = parentRight;
		const turnX = parentRight + horizontalGap / 2;

		children.forEach((child, i) => {
			const childHeight = childHeights[i];
			const childCenterY = currentY + childHeight / 2;

			const fontSize = Math.max(10, 13 - depth);
			const textWidth = this.calculateTextWidth(child.text, depth);
			const noteIconWidth = child.note ? 18 : 0;
			const totalNodeWidth = textWidth + noteIconWidth;
			const nodeHeight = fontSize + 10;
			const nodeX = parentRight + horizontalGap;
			const nodeRadius = 6;

			// 计算圆圈位置（在节点框右侧，留 2px 间隙）
			const circleX = nodeX + totalNodeWidth + nodeRadius + 2;
			const circleY = childCenterY;
			const strokeWidth = 1.5; // 与连线粗细一致

			// 绘制连接线（延伸到圆圈左边缘）
			const path = linesGroup.createSvg('path');
			const d = `M ${lineStartX} ${parentY} L ${turnX} ${parentY} L ${turnX} ${childCenterY} L ${circleX - nodeRadius} ${childCenterY}`;
			path.setAttribute('d', d);
			path.setAttribute('stroke', lineColor);
			path.setAttribute('stroke-width', strokeWidth);
			path.setAttribute('fill', 'none');

			// 节点背景
			const bgRect = nodesGroup.createSvg('rect');
			bgRect.setAttribute('x', nodeX.toString());
			bgRect.setAttribute('y', (childCenterY - nodeHeight / 2).toString());
			bgRect.setAttribute('width', totalNodeWidth.toString());
			bgRect.setAttribute('height', nodeHeight.toString());
			bgRect.setAttribute('rx', '3');
			bgRect.setAttribute('fill', this.settings.nodeBackgroundColor);
			bgRect.setAttribute('stroke', lineColor);
			bgRect.setAttribute('stroke-width', '1');

			// 节点文字
			const text = nodesGroup.createSvg('text');
			text.setAttribute('x', (nodeX + textWidth / 2).toString());
			text.setAttribute('y', (childCenterY + fontSize / 3).toString());
			text.setAttribute('fill', this.settings.fontColor);
			text.setAttribute('font-size', fontSize.toString());
			text.setAttribute('text-anchor', 'middle');
			text.textContent = child.text;

			// 备注图标
			if (child.note) {
				this.addNoteIcon(nodesGroup, nodeX + textWidth + 2, childCenterY, child.note, fontSize, lineColor, child.text);
			}

			// 空心圆和展开/收缩功能
			if (child.children.length > 0) {
				// 空心圆背景（遮挡连接线）
				const circleBg = nodesGroup.createSvg('circle');
				circleBg.setAttribute('cx', circleX.toString());
				circleBg.setAttribute('cy', circleY.toString());
				circleBg.setAttribute('r', (nodeRadius + 1).toString());
				circleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

				// 空心圆
				const circle = nodesGroup.createSvg('circle');
				circle.setAttribute('cx', circleX.toString());
				circle.setAttribute('cy', circleY.toString());
				circle.setAttribute('r', nodeRadius.toString());
				circle.setAttribute('fill', this.settings.nodeBackgroundColor);
				circle.setAttribute('stroke', lineColor); // 颜色与连线一致
				circle.setAttribute('stroke-width', strokeWidth); // 粗细与连线一致
				circle.style.cursor = 'pointer';

				// 展开/收缩指示器
				const indicatorText = nodesGroup.createSvg('text');
				indicatorText.setAttribute('x', (circleX - 3).toString());
				indicatorText.setAttribute('y', (circleY + 4).toString());
				indicatorText.setAttribute('fill', lineColor); // 颜色与连线一致
				indicatorText.setAttribute('font-size', '12');
				indicatorText.setAttribute('font-weight', 'bold');
				indicatorText.setAttribute('font-family', 'system-ui, sans-serif');
				indicatorText.textContent = child.collapsed ? '+' : '-';
				indicatorText.style.cursor = 'pointer';

				// 点击事件
				const toggleNode = (e: MouseEvent) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					
					// 重置拖拽状态，防止拖拽干扰
					this.isDragging = false;
					
					child.collapsed = !child.collapsed;
					collapsedStateMap.set(child.id, child.collapsed);
					this.refresh();
				};

				circle.addEventListener('click', toggleNode);
				indicatorText.addEventListener('click', toggleNode);
			}

			// 递归渲染子节点
			if (!child.collapsed && child.children.length > 0) {
				const childRight = circleX + nodeRadius + horizontalGap; // 从圆圈右侧开始
				this.renderRadialMindMapChildrenRight(child.children, linesGroup, nodesGroup, childRight, childCenterY, depth + 1);
			}

			currentY += childHeight + verticalGap;
		});
	}

	// 左侧子节点渲染（镜像布局）
	private renderRadialMindMapChildrenLeft(
		children: MindMapNode[],
		linesGroup: SVGGElement,
		nodesGroup: SVGGElement,
		parentLeft: number,
		parentY: number,
		depth: number
	) {
		const lineColor = this.settings.lineColor;
		const horizontalGap = 30;
		const verticalGap = 8;

		const childHeights = children.map(child => this.calculateRadialMindMapTreeHeight(child));
		const totalChildrenHeight = childHeights.reduce((sum, h) => sum + h, 0) + (children.length - 1) * verticalGap;

		let currentY = parentY - totalChildrenHeight / 2;
		const lineStartX = parentLeft;
		const turnX = parentLeft - horizontalGap / 2;

		children.forEach((child, i) => {
			const childHeight = childHeights[i];
			const childCenterY = currentY + childHeight / 2;

			const fontSize = Math.max(10, 13 - depth);
			const textWidth = this.calculateTextWidth(child.text, depth);
			const noteIconWidth = child.note ? 18 : 0;
			const totalNodeWidth = textWidth + noteIconWidth;
			const nodeHeight = fontSize + 10;
			const nodeRadius = 6;
			const nodeX = parentLeft - horizontalGap - totalNodeWidth; // 左侧节点X坐标

			// 计算圆圈位置（在节点框左侧，留 2px 间隙）
			const circleX = nodeX - nodeRadius - 2;
			const circleY = childCenterY;
			const strokeWidth = 1.5; // 与连线粗细一致

			// 绘制连接线（延伸到圆圈右边缘）
			const path = linesGroup.createSvg('path');
			const d = `M ${lineStartX} ${parentY} L ${turnX} ${parentY} L ${turnX} ${childCenterY} L ${circleX + nodeRadius} ${childCenterY}`;
			path.setAttribute('d', d);
			path.setAttribute('stroke', lineColor);
			path.setAttribute('stroke-width', strokeWidth);
			path.setAttribute('fill', 'none');

			// 节点背景
			const bgRect = nodesGroup.createSvg('rect');
			bgRect.setAttribute('x', nodeX.toString());
			bgRect.setAttribute('y', (childCenterY - nodeHeight / 2).toString());
			bgRect.setAttribute('width', totalNodeWidth.toString());
			bgRect.setAttribute('height', nodeHeight.toString());
			bgRect.setAttribute('rx', '3');
			bgRect.setAttribute('fill', this.settings.nodeBackgroundColor);
			bgRect.setAttribute('stroke', lineColor);
			bgRect.setAttribute('stroke-width', '1');

			// 节点文字
			const text = nodesGroup.createSvg('text');
			text.setAttribute('x', (nodeX + textWidth / 2).toString());
			text.setAttribute('y', (childCenterY + fontSize / 3).toString());
			text.setAttribute('fill', this.settings.fontColor);
			text.setAttribute('font-size', fontSize.toString());
			text.setAttribute('text-anchor', 'middle');
			text.textContent = child.text;

			// 备注图标
			if (child.note) {
				this.addNoteIcon(nodesGroup, nodeX + textWidth + 2, childCenterY, child.note, fontSize, lineColor, child.text);
			}

			// 空心圆和展开/收缩功能（在节点左侧）
			if (child.children.length > 0) {
				// 空心圆背景（遮挡连接线）
				const circleBg = nodesGroup.createSvg('circle');
				circleBg.setAttribute('cx', circleX.toString());
				circleBg.setAttribute('cy', circleY.toString());
				circleBg.setAttribute('r', (nodeRadius + 1).toString());
				circleBg.setAttribute('fill', this.settings.nodeBackgroundColor);

				// 空心圆
				const circle = nodesGroup.createSvg('circle');
				circle.setAttribute('cx', circleX.toString());
				circle.setAttribute('cy', circleY.toString());
				circle.setAttribute('r', nodeRadius.toString());
				circle.setAttribute('fill', this.settings.nodeBackgroundColor);
				circle.setAttribute('stroke', lineColor); // 颜色与连线一致
				circle.setAttribute('stroke-width', strokeWidth); // 粗细与连线一致
				circle.style.cursor = 'pointer';

				// 展开/收缩指示器
				const indicatorText = nodesGroup.createSvg('text');
				indicatorText.setAttribute('x', (circleX - 3).toString());
				indicatorText.setAttribute('y', (circleY + 4).toString());
				indicatorText.setAttribute('fill', lineColor); // 颜色与连线一致
				indicatorText.setAttribute('font-size', '12');
				indicatorText.setAttribute('font-weight', 'bold');
				indicatorText.setAttribute('font-family', 'system-ui, sans-serif');
				indicatorText.textContent = child.collapsed ? '+' : '-';
				indicatorText.style.cursor = 'pointer';

				// 点击事件
				const toggleNode = (e: MouseEvent) => {
					e.preventDefault();
					e.stopPropagation();
					e.stopImmediatePropagation();
					
					// 重置拖拽状态，防止拖拽干扰
					this.isDragging = false;
					
					child.collapsed = !child.collapsed;
					collapsedStateMap.set(child.id, child.collapsed);
					this.refresh();
				};

				circle.addEventListener('click', toggleNode);
				indicatorText.addEventListener('click', toggleNode);
			}

			// 递归渲染子节点（继续向左展开）
			if (!child.collapsed && child.children.length > 0) {
				this.renderRadialMindMapChildrenLeft(child.children, linesGroup, nodesGroup, circleX - nodeRadius - horizontalGap, childCenterY, depth + 1); // 从圆圈左侧开始
			}

			currentY += childHeight + verticalGap;
		});
	}

	private calculateRadialMindMapTreeHeight(node: MindMapNode): number {
		if (node.children.length === 0 || node.collapsed) {
			return 28;
		}
		const verticalGap = 8;
		let totalHeight = 0;
		for (let i = 0; i < node.children.length; i++) {
			totalHeight += this.calculateRadialMindMapTreeHeight(node.children[i]);
			if (i < node.children.length - 1) {
				totalHeight += verticalGap;
			}
		}
		return Math.max(28, totalHeight);
	}

	// 添加备注图标
	private addNoteIcon(
		group: SVGGElement,
		x: number,
		y: number,
		note: string,
		fontSize: number,
		color: string,
		nodeText: string
	) {
		const noteIcon = group.createSvg('text');
		noteIcon.setAttribute('x', x.toString());
		noteIcon.setAttribute('y', (y + fontSize / 3).toString());
		noteIcon.setAttribute('font-size', (fontSize - 2).toString());
		noteIcon.setAttribute('fill', color);
		noteIcon.textContent = '📝';
		noteIcon.style.cursor = 'pointer';
		noteIcon.style.opacity = '0.7';

		// 点击显示备注在右侧面板
		const showNote = (e: MouseEvent) => {
			e.stopPropagation();
			
			if (!this.notePanel) return;
			
			// 图标高亮
			noteIcon.style.opacity = '1';
			
			// 清空并填充备注内容
							this.notePanel.innerHTML = '';
							
							// 添加标题
							const title = this.notePanel.createEl('h3');
							title.textContent = nodeText;
							title.style.cssText = `
								margin: 0 0 12px 0;
								font-size: 16px;
								font-weight: 600;
								color: #333;
							`;
			// 添加备注内容
			const noteContent = this.notePanel.createDiv();
			noteContent.style.cssText = 'font-size: 13px; line-height: 1.6; color: #5c5640;';
			MarkdownRenderer.render(this.app, note, noteContent, '', this);

			// 显示面板
			this.notePanel.style.transform = 'translateX(0)';
			this.notePanel.style.visibility = 'visible';
		};

		noteIcon.addEventListener('click', showNote);
	}
}
