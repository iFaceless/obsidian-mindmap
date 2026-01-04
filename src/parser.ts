import { MindMapNode } from './types';

// 用于保存节点折叠状态的映射
let collapsedStateMap: Map<string, boolean> = new Map();

export function getCollapsedStateMap(): Map<string, boolean> {
	return collapsedStateMap;
}

export function setCollapsedState(id: string, collapsed: boolean): void {
	collapsedStateMap.set(id, collapsed);
}

export function clearCollapsedStateMap(): void {
	collapsedStateMap.clear();
}

// 解析 Markdown 列表为树结构
export function parseMarkdownList(text: string): MindMapNode | null {
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
		return parseHeadingsMode(lines);
	}

	// 如果只有 # 标题，没有列表项，则使用纯标题模式
	if (hasHeadings && !hasListItems) {
		return parseHeadingsMode(lines);
	}

	// 否则使用列表模式（支持 # 作为根标题）
	return parseListMode(lines);
}

// 纯 # 标题模式解析
function parseHeadingsMode(lines: string[]): MindMapNode | null {
	let root: MindMapNode | null = null;
	const stack: { node: MindMapNode; level: number }[] = [];
	let currentNode: MindMapNode | null = null;
	let noteLines: string[] = [];
	let nodeIndex = 0; // 用于生成稳定 ID

	const flushNote = () => {
		if (currentNode && noteLines.length > 0) {
			currentNode.note = noteLines.join('\n').trim();
			noteLines = [];
		}
	};

	// 生成稳定的节点 ID
	const generateStableId = (text: string, level: number, index: number): string => {
		return `heading-${level}-${index}-${text.substring(0, 20).replace(/\s+/g, '_')}`;
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

			const nodeId = generateStableId(nodeText, level, nodeIndex++);
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
function parseListMode(lines: string[]): MindMapNode | null {
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
		collapsed: collapsedStateMap.get('root') || false
	};

	const stack: { node: MindMapNode; level: number; indent: number }[] = [{ node: root, level: -1, indent: -1 }];
	let nodeIndex = 0; // 用于生成稳定 ID

	// 生成稳定的节点 ID
	const generateStableId = (text: string, indent: number, index: number): string => {
		return `list-${indent}-${index}-${text.substring(0, 20).replace(/\s+/g, '_')}`;
	};

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

		const nodeId = generateStableId(nodeText, indent, nodeIndex++);
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
