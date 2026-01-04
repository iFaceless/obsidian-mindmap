import { MindMapSettings, MindMapTheme, RenderMode } from './types';

// 渲染模式名称映射
export const RENDER_MODE_NAMES: Record<RenderMode, string> = {
	'logic': 'Outline View',
	'clockwise': 'Radial Mind Map'
};

// 默认设置
export const DEFAULT_SETTINGS: MindMapSettings = {
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

// 预设主题
export const PRESET_THEMES: MindMapTheme[] = [
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