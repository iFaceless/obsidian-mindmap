import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild, PluginSettingTab, App, Setting } from 'obsidian';

interface MindMapNode {
	id: string;
	text: string;
	children: MindMapNode[];
	collapsed: boolean;
}

interface MindMapSettings {
	enableWheelZoom: boolean;
}

const DEFAULT_SETTINGS: MindMapSettings = {
	enableWheelZoom: false
};

// 用于保存节点折叠状态的映射
let collapsedStateMap: Map<string, boolean> = new Map();

export default class MindMapPlugin extends Plugin {
	settings: MindMapSettings;

	async onload() {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor('obmind', (source, el, ctx) => {
			const mindMap = new MindMapRenderer(source, el, ctx, this.settings);
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

		containerEl.createEl('h2', { text: 'Mind Map Settings' });

		new Setting(containerEl)
			.setName('Enable mouse wheel zoom')
			.setDesc('Allow zooming the mind map using mouse wheel. When disabled, use the +/- buttons to zoom.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableWheelZoom)
				.onChange(async (value) => {
					this.plugin.settings.enableWheelZoom = value;
					await this.plugin.saveSettings();
				}));
	}
}

class MindMapRenderer extends MarkdownRenderChild {
	private source: string;
	private container: HTMLElement;
	private root: MindMapNode | null = null;
	private settings: MindMapSettings;

	// Zoom and pan state
	private scale: number = 1;
	private translateX: number = 0;
	private translateY: number = 0;
	private isDragging: boolean = false;
	private dragStartX: number = 0;
	private dragStartY: number = 0;
	private svg: SVGSVGElement | null = null;
	private mainGroup: SVGGElement | null = null;

	constructor(source: string, container: HTMLElement, ctx: MarkdownPostProcessorContext, settings: MindMapSettings) {
		super(container);
		this.source = source;
		this.container = container;
		this.settings = settings;
	}

	onload() {
		this.render();
	}

	private parseMarkdownList(text: string): MindMapNode | null {
		const lines = text.split('\n').filter(line => line.trim());
		if (lines.length === 0) return null;

		const root: MindMapNode = {
			id: 'root',
			text: 'Root',
			children: [],
			collapsed: false
		};

		const stack: { node: MindMapNode; level: number }[] = [{ node: root, level: -1 }];

		for (const line of lines) {
			const trimmed = line.trim();
			if (!trimmed) continue;

			// 计算缩进级别
			const leadingSpaces = line.search(/\S|$/);
			const level = Math.floor(leadingSpaces / 2); // 假设每级缩进2个空格

			// 移除列表标记（- 或 *）
			const text = trimmed.replace(/^[-*]\s*/, '').trim();

			const nodeId = `node-${Math.random().toString(36).substr(2, 9)}`;
			const newNode: MindMapNode = {
				id: nodeId,
				text: text,
				children: [],
				collapsed: collapsedStateMap.get(nodeId) || false
			};

			// 找到正确的父节点
			while (stack.length > 1 && stack[stack.length - 1].level >= level) {
				stack.pop();
			}

			const parent = stack[stack.length - 1].node;
			parent.children.push(newNode);
			stack.push({ node: newNode, level });
		}

		// 如果只有一个顶层节点，将其作为根节点
		if (root.children.length === 1) {
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
		wrapper.style.height = '600px';

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

		// 两阶段渲染：先画所有连线，再画所有节点
		this.renderLines(this.root, linesGroup, 50, 300, 0);
		this.renderNodes(this.root, nodesGroup, 50, 300, 0);
		this.centerTree(g, svg);

		// Add zoom and pan event listeners
		this.setupZoomAndPan(svg);
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

		// Reset zoom button
		const resetBtn = controls.createEl('button');
		resetBtn.textContent = '⟲';
		this.styleButton(resetBtn);
		resetBtn.addEventListener('click', () => this.resetZoom());

		// Separator
		const separator = controls.createSpan();
		separator.style.cssText = 'width: 1px; background: #ddd; margin: 0 5px;';

		// Expand All button
		const expandAllBtn = controls.createEl('button');
		expandAllBtn.innerHTML = '&#x25BC;'; // ▼ 向下箭头
		expandAllBtn.title = 'Expand All';
		this.styleButton(expandAllBtn);
		expandAllBtn.addEventListener('click', () => this.expandAll());

		// Collapse All button
		const collapseAllBtn = controls.createEl('button');
		collapseAllBtn.innerHTML = '&#x25B6;'; // ▶ 向右箭头
		collapseAllBtn.title = 'Collapse All';
		this.styleButton(collapseAllBtn);
		collapseAllBtn.addEventListener('click', () => this.collapseAll());
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

	private setupZoomAndPan(svg: SVGSVGElement) {
		// Mouse wheel zoom (only if enabled in settings)
		if (this.settings.enableWheelZoom) {
			svg.addEventListener('wheel', (e: WheelEvent) => {
				e.preventDefault();
				const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
				this.zoom(zoomFactor, e.clientX, e.clientY);
			});
		}

		// Pan with mouse drag
		svg.addEventListener('mousedown', (e: MouseEvent) => {
			if (e.button === 0) { // Left mouse button
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
	}

	private resetZoom() {
		this.scale = 1;
		if (this.mainGroup && this.svg) {
			this.centerTree(this.mainGroup, this.svg);
		}
	}

	private applyTransform() {
		if (this.mainGroup) {
			this.mainGroup.setAttribute('transform', 
				`translate(${this.translateX}, ${this.translateY}) scale(${this.scale})`);
		}
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
		const lineColor = '#605CE5';

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
		const textColor = '#605CE5';

		// 文字背景（白色矩形遮挡连线）
		const textBg = nodeGroup.createSvg('rect');
		const textX = x + 2; // 文字起始位置
		const textY = y - 12; // 文字在横线上方
		textBg.setAttribute('x', textX.toString());
		textBg.setAttribute('y', (textY - fontSize + 2).toString());
		textBg.setAttribute('width', textWidth.toString());
		textBg.setAttribute('height', (fontSize + 4).toString());
		textBg.setAttribute('fill', 'white');

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

		// 非叶子节点：绘制空心圆
		if (!isLeaf || (node.children.length > 0 && node.collapsed)) {
			const circleX = x + lineLength + nodeRadius;
			
			// 空心圆背景（白色填充）
			const circleBg = nodeGroup.createSvg('circle');
			circleBg.setAttribute('cx', circleX.toString());
			circleBg.setAttribute('cy', y.toString());
			circleBg.setAttribute('r', (nodeRadius + 1).toString());
			circleBg.setAttribute('fill', 'white');

			// 空心圆
			const circle = nodeGroup.createSvg('circle');
			circle.setAttribute('cx', circleX.toString());
			circle.setAttribute('cy', y.toString());
			circle.setAttribute('r', nodeRadius.toString());
			circle.setAttribute('fill', 'white');
			circle.setAttribute('stroke', textColor);
			circle.setAttribute('stroke-width', '1.5');
			circle.style.cursor = 'pointer';
			circle.addEventListener('click', toggleNode);

			// 如果已折叠，显示折叠指示器
			if (node.children.length > 0 && node.collapsed) {
				const plusText = nodeGroup.createSvg('text');
				plusText.setAttribute('x', (circleX - 3).toString());
				plusText.setAttribute('y', (y + 4).toString());
				plusText.setAttribute('fill', textColor);
				plusText.setAttribute('font-size', '12');
				plusText.setAttribute('font-weight', 'bold');
				plusText.setAttribute('font-family', 'system-ui, sans-serif');
				plusText.textContent = '+';
				plusText.style.cursor = 'pointer';
				plusText.addEventListener('click', toggleNode);
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
		// 估算文本宽度
		const charWidth = fontSize * 0.55;
		return text.length * charWidth + 16; // 留出边距
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
}
