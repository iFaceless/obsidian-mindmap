# Obsidian Mind Map Plugin

一款用于 Obsidian 的脑图插件，可以将 Markdown 列表渲染为交互式脑图。

## 功能特性

- 将 Markdown 列表转换为可视化脑图
- 支持点击节点展开/折叠子节点
- 自动布局和居中显示
- 支持多级嵌套结构

## 安装方法

1. 将 `obsidian-mindmap` 文件夹复制到 Obsidian 的插件目录：
   - macOS: `~/Library/Application Support/obsidian/plugins/`
   - Windows: `%APPDATA%\obsidian\plugins\`
   - Linux: `~/.config/obsidian/plugins/`

2. 在 Obsidian 中启用插件：
   - 打开设置 → 第三方插件
   - 找到 "Mind Map" 并启用

## 使用方法

在 Obsidian 笔记中创建一个代码块，使用 `obmind` 作为语言标识符：

````markdown
```obmind
- 介绍
  - 定义：结合模型、工具、orchestration层的AI系统
  - 目标：从预测性AI过渡至自主代理

- 核心架构
  - Model（大脑）
    - 选择原则：业务需求导向
    - 多模型策略：根据任务特点选用不同模型
  - Tools（手臂）
    - 功能分类：检索现实信息、执行动作
  - Orchestration Layer（神经网络）
    - 角色：规划、记忆管理、决策执行
```
````

切换到预览模式（阅读视图）即可查看脑图。

## 交互操作

- **点击节点**：展开或折叠该节点的子节点
- **点击折叠指示器**（橙色圆圈）：展开折叠的子节点

## 示例

````markdown
```obmind
- 根节点
  - 子节点 1
    - 孙节点 1.1
    - 孙节点 1.2
  - 子节点 2
    - 孙节点 2.1
      - 曾孙节点 2.1.1
```
````

## 开发

```bash
# 安装依赖
npm install

# 开发模式（自动重新构建）
npm run dev

# 生产构建
npm run build
```

## 许可证

MIT