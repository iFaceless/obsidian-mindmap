// 渲染模式枚举
export type RenderMode = 'logic' | 'clockwise';

// 主题接口
export interface MindMapTheme {
	name: string;
	canvasBackgroundColor: string;
	fontColor: string;
	nodeBackgroundColor: string;
	lineColor: string;
	connectionColor: string;
}

// 节点接口
export interface MindMapNode {
	id: string;
	text: string;
	children: MindMapNode[];
	collapsed: boolean;
	note?: string; // 备注内容（Markdown格式）
}

// 设置接口
export interface MindMapSettings {
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