import { Plugin, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';

interface MindMapNode {
	id: string;
	text: string;
	children: MindMapNode[];
	collapsed: boolean;
}

export default class MindMapPlugin extends Plugin {
	async onload() {
		this.registerMarkdownCodeBlockProcessor('obmind', (source, el, ctx) => {
			const mindMap = new MindMapRenderer(source, el, ctx);
			ctx.addChild(mindMap);
		});

		console.log('Mind Map Plugin loaded');
	}

	onunload() {
		console.log('Mind Map Plugin unloaded');
	}
}

class MindMapRenderer extends MarkdownRenderChild {
	private source: string;
	private container: HTMLElement;
	private root: MindMapNode | null = null;

	constructor(source: string, container: HTMLElement, ctx: MarkdownPostProcessorContext) {
		super(container);
		this.source = source;
		this.container = container;
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

			const newNode: MindMapNode = {
				id: `node-${Math.random().toString(36).substr(2, 9)}`,
				text: text,
				children: [],
				collapsed: false
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

		const svg = this.container.createSvg('svg');
		svg.style.width = '100%';
		svg.style.height = '500px';
		svg.style.overflow = 'visible';

		const g = svg.createSvg('g');

		this.renderNode(this.root, g, 0, 0, 0);
		this.centerTree(g, svg);
	}

	private renderNode(
		node: MindMapNode,
		parent: SVGElement,
		x: number,
		y: number,
		depth: number
	): { x: number; y: number } {
		const nodeGroup = parent.createSvg('g');
		nodeGroup.setAttribute('class', 'mindmap-node');
		nodeGroup.setAttribute('data-id', node.id);

		// 节点矩形
		const rect = nodeGroup.createSvg('rect');
		const padding = 10;
		const textWidth = node.text.length * 8 + padding * 2;
		const textHeight = 30;

		rect.setAttribute('x', x.toString());
		rect.setAttribute('y', y.toString());
		rect.setAttribute('width', textWidth.toString());
		rect.setAttribute('height', textHeight.toString());
		rect.setAttribute('rx', '5');
		rect.setAttribute('ry', '5');
		rect.setAttribute('fill', depth === 0 ? '#4CAF50' : '#2196F3');
		rect.setAttribute('stroke', '#333');
		rect.setAttribute('stroke-width', '2');
		rect.style.cursor = 'pointer';

		// 节点文本
		const text = nodeGroup.createSvg('text');
		text.setAttribute('x', (x + padding + 4).toString());
		text.setAttribute('y', (y + 20).toString());
		text.setAttribute('fill', 'white');
		text.setAttribute('font-size', '14');
		text.setAttribute('font-family', 'Arial, sans-serif');
		text.textContent = node.text.length > 20 ? node.text.substring(0, 20) + '...' : node.text;

		// 点击事件
		rect.addEventListener('click', () => {
			node.collapsed = !node.collapsed;
			this.refresh();
		});

		text.addEventListener('click', () => {
			node.collapsed = !node.collapsed;
			this.refresh();
		});

		// 如果有子节点且未折叠，渲染子节点
		if (node.children.length > 0 && !node.collapsed) {
			const childY = y + textHeight + 40;
			const childWidth = this.calculateTreeWidth(node);
			let currentX = x - (childWidth / 2);

			// 绘制连接线
			for (const child of node.children) {
				const childSize = this.calculateTreeWidth(child);
				const childX = currentX + (childSize / 2) - (child.text.length * 8 + 20) / 2;

				const line = parent.createSvg('path');
				line.setAttribute('d', `M${x + textWidth / 2},${y + textHeight} C${x + textWidth / 2},${y + textHeight + 20} ${childX + (child.text.length * 8 + 20) / 2},${childY - 20} ${childX + (child.text.length * 8 + 20) / 2},${childY}`);
				line.setAttribute('stroke', '#666');
				line.setAttribute('stroke-width', '2');
				line.setAttribute('fill', 'none');

				currentX += childSize;
			}

			// 渲染子节点
			currentX = x - (childWidth / 2);
			for (const child of node.children) {
				const childSize = this.calculateTreeWidth(child);
				const childX = currentX + (childSize / 2) - (child.text.length * 8 + 20) / 2;
				this.renderNode(child, parent, childX, childY, depth + 1);
				currentX += childSize;
			}
		} else if (node.children.length > 0 && node.collapsed) {
			// 显示折叠指示器
			const indicator = nodeGroup.createSvg('circle');
			indicator.setAttribute('cx', (x + textWidth / 2).toString());
			indicator.setAttribute('cy', (y + textHeight + 15).toString());
			indicator.setAttribute('r', '10');
			indicator.setAttribute('fill', '#FF9800');
			indicator.setAttribute('stroke', '#333');
			indicator.setAttribute('stroke-width', '2');
			indicator.style.cursor = 'pointer';

			const plusText = nodeGroup.createSvg('text');
			plusText.setAttribute('x', (x + textWidth / 2 - 4).toString());
			plusText.setAttribute('y', (y + textHeight + 19).toString());
			plusText.setAttribute('fill', 'white');
			plusText.setAttribute('font-size', '14');
			plusText.setAttribute('font-weight', 'bold');
			plusText.textContent = '+';

			indicator.addEventListener('click', () => {
				node.collapsed = false;
				this.refresh();
			});

			plusText.addEventListener('click', () => {
				node.collapsed = false;
				this.refresh();
			});
		}

		return { x, y };
	}

	private calculateTreeWidth(node: MindMapNode): number {
		if (node.children.length === 0 || node.collapsed) {
			return node.text.length * 8 + 20;
		}

		let totalWidth = 0;
		for (const child of node.children) {
			totalWidth += this.calculateTreeWidth(child);
		}

		return Math.max(node.text.length * 8 + 20, totalWidth + 40);
	}

	private centerTree(g: SVGElement, svg: SVGElement) {
		const bbox = g.getBBox();
		const svgWidth = svg.clientWidth || 800;
		const svgHeight = svg.clientHeight || 500;

		const scaleX = Math.min(1, (svgWidth - 40) / bbox.width);
		const scaleY = Math.min(1, (svgHeight - 40) / bbox.height);
		const scale = Math.min(scaleX, scaleY);

		const translateX = (svgWidth - bbox.width * scale) / 2 - bbox.x * scale;
		const translateY = (svgHeight - bbox.height * scale) / 2 - bbox.y * scale;

		g.setAttribute('transform', `translate(${translateX}, ${translateY}) scale(${scale})`);
	}

	private refresh() {
		this.container.innerHTML = '';
		this.render();
	}
}
