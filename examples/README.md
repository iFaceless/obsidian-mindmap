# Mindmark Examples

This directory contains example mind maps demonstrating various features and use cases of the Mindmark plugin.

## Examples

### 1. Kubernetes Architecture (List Syntax)

**File**: `kubernetes-architecture.md`

This example demonstrates:
- List syntax with indentation using `-` or `*`
- Root heading using `#`
- Deep hierarchical structure with 4-5 levels
- Comprehensive coverage of Kubernetes components
- Multiple child nodes at each level

**Topics Covered**:
- Control Plane Components (API Server, etcd, Scheduler, Controller Manager)
- Node Components (Kubelet, Kube-proxy, Container Runtime)
- Addons (DNS, Dashboard, Logging, Monitoring)
- Core Concepts (Pod, Service, Volume, Namespace)

### 2. MySQL Database Architecture (Heading Syntax)

**File**: `mysql-database.md`

This example demonstrates:
- Multi-level heading syntax using `##`, `###`, `####`
- Notes content below each heading (automatically recognized)
- Rich Markdown formatting in notes (bold, code blocks, lists)
- Detailed technical documentation
- Comprehensive database architecture coverage

**Topics Covered**:
- Storage Engines (InnoDB, MyISAM, Memory)
- Query Execution (Parser, Optimizer, Execution Engine)
- Replication (Master-Slave, Group Replication, InnoDB Cluster)
- Performance Optimization (Indexing, Query Optimization, Configuration)
- Security (Authentication, Privileges, Encryption)

## How to Use

1. Open one of the example files in this directory
2. Copy the entire code block (including the \`\`\`mindmap ... \`\`\` markers)
3. Paste it into an Obsidian note
4. The mind map will be automatically rendered

## Syntax Comparison

### List Syntax
```markdown
```mindmap
# Root Node
- Child Node 1
  - Grandchild 1.1
  - Grandchild 1.2
- Child Node 2
  - Grandchild 2.1
```
```

### Heading Syntax
```markdown
```mindmap
## Root Node
### Child Node 1
Notes content here...

#### Grandchild 1.1
More notes...

#### Grandchild 1.2
Even more notes...

### Child Node 2
#### Grandchild 2.1
Additional notes...
```
```

## Tips

- **List Syntax**: Best for simple hierarchical structures without extensive notes
- **Heading Syntax**: Ideal when you want to include detailed notes for each node
- **Mixed Usage**: You can use `#` as root heading in list mode to combine both approaches
- **Indentation**: Use consistent indentation (2 spaces per level) for best results
- **Notes**: Click the 📝 icon on nodes to view notes in the right panel

## Creating Your Own Mind Maps

1. Start with the root concept
2. Add main branches using `-` or `##`
3. Indent or use deeper headings for sub-branches
4. Add notes using paragraph text below headings
5. Use Markdown formatting in notes (bold, italic, code, lists)
6. Test your mind map by copying it to an Obsidian note

## More Examples

To contribute more examples or request specific topics, please open an issue or pull request on GitHub.

Happy mind mapping! 🧠