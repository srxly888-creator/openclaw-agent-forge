/**
 * OpenClaw Agent Forge - 静态安全扫描器
 *
 * 扫描代码与配置中的常见安全风险。
 */

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  location: {
    file: string;
    line?: number;
    column?: number;
  };
  recommendation: string;
}

export interface ScanResult {
  safe: boolean;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface SecretRule {
  name: string;
  type: string;
  severity: SecurityIssue['severity'];
  pattern: RegExp;
  recommendation: string;
}

const SECRET_RULES: SecretRule[] = [
  {
    name: 'OpenAI API key',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bsk-[a-zA-Z0-9]{20,}\b/g,
    recommendation: '请使用环境变量或密钥管理服务存储 API Key。',
  },
  {
    name: 'Anthropic API key',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bsk-ant-api[a-zA-Z0-9-]{20,}\b/g,
    recommendation: '请使用环境变量或密钥管理服务存储 API Key。',
  },
  {
    name: 'Slack token',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/g,
    recommendation: '请立即将 Slack Token 从源码中移除。',
  },
  {
    name: 'GitHub token',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bgh[pousr]_[a-zA-Z0-9]{36}\b/g,
    recommendation: '请立即吊销并轮换已暴露的 GitHub Token。',
  },
  {
    name: 'AWS access key ID',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    recommendation: '请将云凭证存放在环境变量或密钥保险库中。',
  },
  {
    name: 'JWT token',
    type: 'hardcoded-jwt',
    severity: 'high',
    pattern: /\beyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.?[a-zA-Z0-9-_.+/=]*\b/g,
    recommendation: '避免在源码或日志中写入可用 JWT。',
  },
];

const POSSIBLE_SECRET_LINE = /\b[a-f0-9]{32}\b/gi;
const SECRET_CONTEXT = /(api[_-]?key|token|secret|password|credential)/i;

const DANGEROUS_FUNCTIONS = [
  { pattern: /(^|[^.\w])eval\s*\(/g, name: 'eval()', severity: 'critical' as const },
  { pattern: /(^|[^.\w])Function\s*\(/g, name: 'Function()', severity: 'critical' as const },
  { pattern: /(^|[^.\w])exec\s*\(/g, name: 'exec()', severity: 'high' as const },
  { pattern: /(^|[^.\w])spawn\s*\(/g, name: 'spawn()', severity: 'high' as const },
  { pattern: /(^|[^.\w])execSync\s*\(/g, name: 'execSync()', severity: 'high' as const },
  { pattern: /(^|[^.\w])execFileSync\s*\(/g, name: 'execFileSync()', severity: 'high' as const },
];

const UNSAFE_INPUT_PATTERNS = [
  {
    pattern: /process\.argv\s*\[\s*\d+\s*\]/g,
    name: '直接访问 process.argv',
    severity: 'medium' as const,
    recommendation: '请使用参数校验方案（如 zod）验证 CLI 输入。',
  },
  {
    pattern: /require\s*\(\s*[`'"][^`'"]+[`'"]\s*\+.*\)/g,
    name: '基于用户输入的动态 require',
    severity: 'high' as const,
    recommendation: '避免动态 require，优先静态导入或严格白名单。',
  },
  {
    pattern: /\$\{[^}]*process\.env[^}]*\}/g,
    name: '模板字符串中直接使用 process.env',
    severity: 'medium' as const,
    recommendation: '环境变量在插值前应先校验。',
  },
];

const SQL_INJECTION_PATTERNS = [
  /(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]*\$\{[^}]+\}/gi,
  /(?:SELECT|INSERT|UPDATE|DELETE)[^;\n]*\+\s*[a-zA-Z_$][\w$]*/gi,
];

const DANGEROUS_TOOLS = new Set(['exec', 'browser', 'edit', 'write']);

export function scanFileContent(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];
  const lines = content.split('\n');

  SECRET_RULES.forEach((rule) => {
    for (const match of content.matchAll(rule.pattern)) {
      const start = match.index ?? 0;
      issues.push({
        severity: rule.severity,
        type: rule.type,
        message: `检测到 ${rule.name}: ${maskSecret(match[0])}`,
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: rule.recommendation,
      });
    }
  });

  lines.forEach((line, index) => {
    if (!SECRET_CONTEXT.test(line)) {
      return;
    }

    const matches = line.match(POSSIBLE_SECRET_LINE);
    if (!matches) {
      return;
    }

    matches.forEach((match) => {
      issues.push({
        severity: 'medium',
        type: 'possible-hardcoded-secret',
        message: `疑似硬编码敏感信息（凭证上下文）: ${maskSecret(match)}`,
        location: { file: filePath, line: index + 1 },
        recommendation: '请确认该值是否敏感，若敏感请迁移到环境变量或密钥管理服务。',
      });
    });
  });

  DANGEROUS_FUNCTIONS.forEach((func) => {
    for (const match of content.matchAll(func.pattern)) {
      const start = match.index ?? 0;
      issues.push({
        severity: func.severity,
        type: 'dangerous-function',
        message: `检测到危险函数调用: ${func.name}`,
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: '请校验并净化所有输入，优先使用更安全替代方案。',
      });
    }
  });

  UNSAFE_INPUT_PATTERNS.forEach((rule) => {
    for (const match of content.matchAll(rule.pattern)) {
      const start = match.index ?? 0;
      issues.push({
        severity: rule.severity,
        type: 'unsafe-input-handling',
        message: rule.name,
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: rule.recommendation,
      });
    }
  });

  SQL_INJECTION_PATTERNS.forEach((pattern) => {
    for (const match of content.matchAll(pattern)) {
      const start = match.index ?? 0;
      issues.push({
        severity: 'high',
        type: 'sql-injection-risk',
        message: '检测到疑似 SQL 注入风险（字符串拼接/插值）。',
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: '请使用参数化查询或 ORM，避免字符串拼接 SQL。',
      });
    }
  });

  return buildScanResult(issues);
}

export function scanSkillFile(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];
  const normalized = content.toLowerCase();

  if (!normalized.includes('tool') && !content.includes('工具')) {
    issues.push({
      severity: 'medium',
      type: 'missing-tool-documentation',
      message: 'SKILL.md 未描述工具边界。',
      location: { file: filePath },
      recommendation: '请补充工具输入/输出、环境依赖、操作边界。',
    });
  }

  if (normalized.includes('exec') && !normalized.includes('security') && !content.includes('安全')) {
    issues.push({
      severity: 'high',
      type: 'missing-security-warning',
      message: 'SKILL.md 涉及 exec 类能力，但缺少安全警告。',
      location: { file: filePath },
      recommendation: '请补充明确的命令执行安全规范和防护边界。',
    });
  }

  if (!normalized.includes('error') && !content.includes('错误')) {
    issues.push({
      severity: 'low',
      type: 'missing-error-handling',
      message: 'SKILL.md 未说明错误处理方式。',
      location: { file: filePath },
      recommendation: '请描述失败处理流程和用户可见恢复策略。',
    });
  }

  return buildScanResult(issues);
}

export function scanPluginConfig(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];
  let config: Record<string, unknown>;

  try {
    config = JSON.parse(content) as Record<string, unknown>;
  } catch {
    issues.push({
      severity: 'high',
      type: 'invalid-json',
      message: '插件配置不是有效 JSON。',
      location: { file: filePath },
      recommendation: '请修复 openclaw.plugin.json 的 JSON 语法。',
    });
    return buildScanResult(issues);
  }

  const toolsConfig = normalizeTools(config.tools);
  const allowTools = toolsConfig.allow;
  const denyTools = toolsConfig.deny;
  const hasDangerousTool =
    allowTools.includes('*') ||
    allowTools.some((tool) => DANGEROUS_TOOLS.has(tool) || tool.endsWith('*'));
  const sandbox = toRecord(config.sandbox);

  if (hasDangerousTool && (!sandbox || Object.keys(sandbox).length === 0)) {
    issues.push({
      severity: 'high',
      type: 'missing-sandbox',
      message: '已放行危险工具，但未配置沙箱。',
      location: { file: filePath },
      recommendation: '启用危险工具前，请先配置沙箱隔离（Docker 或原生限制）。',
    });
  }

  if (allowTools.includes('*') && denyTools.length === 0) {
    issues.push({
      severity: 'medium',
      type: 'overly-broad-tool-access',
      message: '工具允许列表为 "*"，且未配置 deny 规则。',
      location: { file: filePath },
      recommendation: '请按最小权限原则配置明确的 allow/deny 工具列表。',
    });
  }

  const agents = toRecord(config.agents);
  const allowedAgents = Array.isArray(agents?.allowed)
    ? (agents?.allowed as unknown[]).filter((item) => typeof item === 'string')
    : [];
  if (allowedAgents.length === 0) {
    issues.push({
      severity: 'medium',
      type: 'missing-agent-whitelist',
      message: '未配置智能体白名单。',
      location: { file: filePath },
      recommendation: '请配置 agents.allowed，限制插件仅被授权智能体调用。',
    });
  }

  if (config.hooks && !config.providers) {
    issues.push({
      severity: 'low',
      type: 'deprecated-api',
      message: '检测到旧版 hooks 字段，且未使用 providers。',
      location: { file: filePath },
      recommendation: '建议迁移到新版 provider 注册模式。',
    });
  }

  return buildScanResult(issues);
}

export function generateScanReport(results: ScanResult[], projectName: string): string {
  const totalIssues = results.reduce(
    (acc, result) => ({
      critical: acc.critical + result.summary.critical,
      high: acc.high + result.summary.high,
      medium: acc.medium + result.summary.medium,
      low: acc.low + result.summary.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 },
  );

  const allSafe = results.every((result) => result.safe);

  let report = `# 安全扫描报告 - ${projectName}

## 总体结论

${allSafe ? '✅ 通过：未发现 high/critical 问题。' : '❌ 未通过：发现 high 或 critical 问题。'}

## 问题统计

| 严重级别 | 数量 |
|----------|------|
| 🔴 严重 (Critical) | ${totalIssues.critical} |
| 🟠 高危 (High) | ${totalIssues.high} |
| 🟡 中危 (Medium) | ${totalIssues.medium} |
| 🟢 低危 (Low) | ${totalIssues.low} |

## 问题明细

`;

  let hasFinding = false;

  results.forEach((result) => {
    result.issues.forEach((issue) => {
      hasFinding = true;
      const severityEmoji: Record<SecurityIssue['severity'], string> = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
      };

      const location = issue.location.line
        ? `${issue.location.file}:${issue.location.line}`
        : issue.location.file;

      report += `### ${severityEmoji[issue.severity]} ${issue.type}

- **位置**: \`${location}\`
- **严重级别**: ${issue.severity.toUpperCase()}
- **问题描述**: ${issue.message}
- **修复建议**: ${issue.recommendation}

`;
    });
  });

  if (!hasFinding) {
    report += '_未发现问题。_\n\n';
  }

  report += `## 生成时间

${new Date().toISOString()}
`;

  return report;
}

function normalizeTools(
  tools: unknown,
): {
  allow: string[];
  deny: string[];
} {
  if (Array.isArray(tools)) {
    return {
      allow: tools.filter((tool) => typeof tool === 'string'),
      deny: [],
    };
  }

  const record = toRecord(tools);
  const allow = Array.isArray(record?.allow)
    ? (record?.allow as unknown[]).filter((tool) => typeof tool === 'string')
    : [];
  const deny = Array.isArray(record?.deny)
    ? (record?.deny as unknown[]).filter((tool) => typeof tool === 'string')
    : [];

  return { allow, deny };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function buildScanResult(issues: SecurityIssue[]): ScanResult {
  const summary = {
    critical: issues.filter((issue) => issue.severity === 'critical').length,
    high: issues.filter((issue) => issue.severity === 'high').length,
    medium: issues.filter((issue) => issue.severity === 'medium').length,
    low: issues.filter((issue) => issue.severity === 'low').length,
  };

  return {
    safe: summary.critical === 0 && summary.high === 0,
    issues,
    summary,
  };
}

function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '***';
  }
  return `${secret.slice(0, 4)}...${secret.slice(-4)}`;
}

export default {
  scanFileContent,
  scanSkillFile,
  scanPluginConfig,
  generateScanReport,
};
