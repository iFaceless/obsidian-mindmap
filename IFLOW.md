# Obsidian Mind Map Plugin - 项目上下文

## 项目概述

**Obsidian Mind Map Plugin** (ObMind) 是一款 Obsidian 笔记软件的脑图插件，可以将 Markdown 列表渲染为交互式脑图。

### 核心功能

- 将 Markdown 列表（使用 `-` 或 `*` 标记）转换为可视化脑图
- 支持多级嵌套结构（层级通过缩进判断，每级缩进 2 个空格）
- 点击节点展开/折叠子节点
- 自动布局和居中显示
- 鼠标拖拽平移视图
- 滚轮缩放（可选，在设置中启用）
- 控制按钮：放大/缩小/重置/全部展开/全部折叠

### 使用方式

在 Obsidian 笔记中使用 `obmind` 代码块：

```markdown
```obmind
- 根节点
  - 子节点 1
    - 孙节点 1.1
  - 子节点 2
```
```

## 技术栈

| 技术 | 用途 |
|------|------|
| **TypeScript** | 主要开发语言 |
| **esbuild** | 打包构建工具 |
| **D3.js** | 可视化依赖（虽然代码中使用原生 SVG） |
| **Obsidian API** | Obsidian 插件开发框架 |

## 项目结构

```
obsidian-mindmap/
├── src/
│   └── main.ts           # 核心源代码（MindMapPlugin 主类 + MindMapRenderer 渲染类）
├── assets/
│   └── 示例图片.jpg      # 插件截图
├── package.json          # 项目配置和依赖
├── tsconfig.json         # TypeScript 编译器配置
├── esbuild.config.mjs    # esbuild 构建配置
├── manifest.json         # Obsidian 插件清单
└── README.md             # 项目文档
```

## 构建与运行

### 安装依赖

```bash
npm install
```

### 开发模式

启动开发服务器（自动监听并重新构建）：

```bash
npm run dev
```

### 生产构建

生成生产版本（压缩、去 sourcemap）：

```bash
npm run build
```

构建产物：`main.js`（需放入 Obsidian 插件目录）

## 开发配置

### TypeScript 配置 (`tsconfig.json`)

- **目标**: ES6
- **模块**: ESNext
- **输出目录**: `lib/`
- **包含**: `src/**/*.ts`

### 构建配置 (`esbuild.config.mjs`)

- **入口**: `src/main.ts`
- **格式**: CommonJS (`cjs`)
- **目标**: ES2018
- **外部依赖**: `obsidian`、所有 `@codemirror/*`、`electron`、`builtin-modules`
- **开发模式**: 启用 sourcemap + watch
- **生产模式**: 启用 tree-shaking + 无 sourcemap

### 插件配置 (`manifest.json`)

- **插件 ID**: `obsidian-mindmap`
- **最小 Obsidian 版本**: 0.15.0
- **版本**: 1.0.0

## 代码架构

### 核心类结构

```
MindMapPlugin (主插件类)
├── onload()           # 注册代码块处理器 + 设置选项卡
├── onunload()         # 清理资源
└── settings           # 插件设置（启用滚轮缩放）

MindMapRenderer (渲染类，继承 MarkdownRenderChild)
├── parseMarkdownList()  # 解析 Markdown 列表为树结构
├── render()             # 创建 SVG 容器和控件
├── renderLines()        # 第一阶段：渲染所有连线
├── renderNodes()        # 第二阶段：渲染所有节点
├── setupZoomAndPan()    # 绑定缩放和平移事件
├── expandAll()          # 展开所有节点
├── collapseAll()        # 折叠所有节点
└── refresh()            # 刷新视图（保持缩放状态）

MindMapSettingTab (设置选项卡)
└── display()          # 渲染设置界面
```

### 关键数据结构

```typescript
interface MindMapNode {
  id: string;         // 唯一标识
  text: string;       // 节点文本
  children: MindMapNode[];  // 子节点
  collapsed: boolean; // 是否折叠
}

interface MindMapSettings {
  enableWheelZoom: boolean;  // 启用滚轮缩放
}
```

### 渲染流程

1. **解析**: 解析 Markdown 列表文本 → 构建树结构
2. **两阶段渲染**:
   - 第一阶段：`renderLines()` 渲染所有贝塞尔曲线连线
   - 第二阶段：`renderNodes()` 渲染所有节点（文本、圆形）
3. **居中**: 计算边界框并自动居中
4. **事件绑定**: 缩放/平移/点击展开折叠

## 开发规范

### 代码风格

- 使用 TypeScript 严格类型
- 类名使用 PascalCase
- 私有方法使用 `private` 修饰符
- 事件处理函数命名：`onEvent` 或 `handleEvent`

### 命名约定

- 代码块语言标识符: `obmind`
- 节点 ID 前缀: `node-`
- 样式类名: `mindmap-lines`, `mindmap-nodes`, `mindmap-node`

### 注意事项

- **外部依赖**: `obsidian`、CodeMirror、Electron 相关模块需在 `external` 中声明
- **布局算法**: 水平布局（根节点在左，子节点向右展开）
- **缩放范围**: 0.1 ~ 5 倍
- **刷新机制**: 刷新时保留缩放和平移状态

## 插件安装（开发测试）

将构建产物 `main.js` 复制到 Obsidian 插件目录：

- **macOS**: `~/Library/Application Support/obsidian/plugins/`
- **Windows**: `%APPDATA%\obsidian\plugins\`
- **Linux**: `~/.config/obsidian/plugins/`

然后在 Obsidian 设置中启用 "Mind Map" 插件。
