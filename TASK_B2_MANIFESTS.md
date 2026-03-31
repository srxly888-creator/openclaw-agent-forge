# Task B.2: 为 3 个 agent 定义 manifest

> **时间**: 2026-03-31 23:40
> **目标**: 为现有 agent 定义 Agent Package manifest

---

## 3 个 Agent 的 Manifest

### 1. code-reviewer (代码审查 Agent)

```json
{
  "id": "code_reviewer_agent_v0",
  "name": "代码审查 Agent",
  "description": "审查代码质量、安全漏洞、性能问题",
  "version": "0.1.0",

  "input_schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["code", "language"],
    "properties": {
      "code": {
        "type": "string",
        "description": "代码片段"
      },
      "language": {
        "type": "string",
        "enum": ["python", "javascript", "typescript", "java", "go"],
        "description": "编程语言"
      },
      "context": {
        "type": "string",
        "description": "审查上下文 (可选)"
      }
    }
  },

  "output_schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["passed", "issues"],
    "properties": {
      "passed": {
        "type": "boolean",
        "description": "是否通过审查"
      },
      "issues": {
        "type": "array",
        "description": "问题列表"
      },
      "score": {
        "type": "number",
        "description": "质量评分 (0-10)"
      }
    }
  },

  "required_capabilities": {
    "platform": ["openclaw"],
    "tools": ["ast-scanner", "eslint", "security-checker"],
    "min_versions": {
      "openclaw": "0.7.0"
    }
  },

  "supported_worker_types": ["openclaw"],

  "governance": {
    "risk_level": "low",
    "requires_approval_for_write": false,
    "max_execution_time_sec": 60
  },

  "failure_handling": {
    "fallback_strategy": "fail_fast",
    "max_retries": 0
  },

  "execution": {
    "timeout_ms": 60000,
    "heartbeat_interval_ms": 10000
  },

  "artifacts": {
    "required_artifacts": ["log", "report"]
  }
}
```

---

### 2. content-creator (内容创作 Agent)

```json
{
  "id": "content_creator_agent_v0",
  "name": "内容创作 Agent",
  "description": "策划与创作多语言内容，优化 SEO",
  "version": "0.1.0",

  "input_schema": {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["topic", "language"],
    "properties": {
      "topic": {
        "type": "string",
        "description": "内容主题"
      },
      "language": {
        "type": "string",
        "enum": ["zh-CN", "en-US", "ja-JP"],
        "description": "目标语言"
      },
      "keywords": {
        "type": "array",
        "items": {"type": "string"},
        "description": "关键词"
      }
    }
  },

  "output_schema": {
    "$schema": "http://json-schema.org/draft-07/dein07/schema#",
    "type": "object",
    "required": ["content", "metadata"],
    "properties": {
      "content": {
        "type": "string",
        "description": "创作的内容"
      },
      "metadata": {
        "type": "object",
        "properties": {
          "word_count": {"type": "number"},
          "seo_score": {"type": "number"}
        }
      }
    }
  },

  "required_capabilities": {
    "platform": ["openclaw"],
    "tools": ["web-search", "seo-analyzer"],
    "min_versions": {
      "openclaw": "0.7.0"
    }
  },

  "supported_worker_types": ["openclaw"],

  "governance": {
    "risk_level": "low",
    "requires_approval_for_write": false,
    "max_execution_time_sec": 120
  },

  "failure_handling": {
    "fallback_strategy": "manual",
    "max_retries": 1
  },

  "execution": {
    "timeout_ms": 120000,
    "heartbeat_interval_ms": 15000
  },

  "artifacts": {
    "required_artifacts": ["log", "content"]
  }
}
```

---

### 3. project-manager (项目管理 Agent)

```json
{
  "id": "project_manager_agent_v0",
  "name": "项目管理 Agent",
  "description": "任务分解、进度跟踪、团队协作",
  "version": "0.1.0",

  "input_schema": {
    "$schema": "http://json.org/draft-07/schema#",
    "type": "object",
    "required": ["task"],
    "properties": {
      "task": {
        "type": "string",
        "description": "任务描述"
      },
      "deadline": {
        "type": "string",
        "format": "date-time",
        "description": "截止日期"
      },
      "assignees": {
        "type": "array",
        "items": {"type": "string"},
        "description": "团队成员"
      }
    }
  },

  "output_schema": {
    "$schema": "http://json.org/draft-07/schema#",
    "type": "object",
    "required": ["plan", "status"],
    "properties": {
      "plan": {
        "type": "object",
        "description": "任务分解"
      },
      "status": {
        "type": "string",
        "enum": ["pending", "in_progress", "completed", "blocked"]
      }
    }
  },

  "required_capabilities": {
    "platform": ["openclaw"],
    "tools": ["task-manager", "calendar"],
    "min_versions": {
      "openclaw": "0.7.0"
    }
  },

  "supported_worker_types": ["openclaw"],

  "g manifest_schema: {
    "risk_level": "medium",
    "requires_approval_for_write": false,
    "max_execution_time_sec": 300
  },

  "failure_handling": {
    "fallback_strategy": "retry",
    "max_retries": 3
  },

  "execution": {
    "timeout_ms": 300000,
    "heartbeat_interval_ms: 30000
  },

  "artifacts": {
    "required_artifacts": ["log", "plan"]
  }
}
```

---

## 放置位置

每个 agent 的 manifest.json 放在对应目录：

```
agents/
├── development/
│   └── code-reviewer/
│       └── manifest.json
├── marketing/
│   └── content-creator/
│       └── manifest.json
└── productivity/
    └── project-manager/
        └── manifest.json
```

---

## 下一步

创建 Agent Package 校验器，验证 3 个 agent 符合规范

---

**Task B.2 完成** ✅
**改动**: 为 3个 agent 定义了 manifest
