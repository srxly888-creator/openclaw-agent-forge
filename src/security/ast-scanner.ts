/**
 * OpenClaw Agent Forge - Static Analysis Security Scanner
 *
 * 扫描生成的代码和配置，检测安全隐患
 * 基于 Snyk Skill Security Scanner 规范
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

/**
 * API 密钥模式检测
 */
const API_KEY_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,  // OpenAI
  /sk-ant-api[a-zA-Z0-9-]{20,}/g,  // Anthropic
  /xox[baprs]-[a-zA-Z0-9-]{10,}/g,  // Slack
  /ghp_[a-zA-Z0-9]{36}/g,  // GitHub Personal Access Token
  /gho_[a-zA-Z0-9]{36}/g,  // GitHub OAuth Token
  /ghu_[a-zA-Z0-9]{36}/g,  // GitHub User Token
  /ghs_[a-zA-Z0-9]{36}/g,  // GitHub Server Token
  /ghr_[a-zA-Z0-9]{36}/g,  // GitHub Refresh Token
  /AKIA[0-9A-Z]{16}/g,  // AWS Access Key ID
  /eyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.?[a-zA-Z0-9-_.+/=]*/g,  // JWT
  /[a-f0-9]{32}/gi,  // Generic hex keys (32 chars)
];

/**
 * 危险函数模式检测
 */
const DANGEROUS_FUNCTIONS = [
  { pattern: /eval\s*\(/g, name: 'eval()', severity: 'critical' as const },
  { pattern: /Function\s*\(/g, name: 'Function()', severity: 'critical' as const },
  { pattern: /exec\s*\(/g, name: 'exec()', severity: 'high' as const },
  { pattern: /spawn\s*\(/g, name: 'spawn()', severity: 'high' as const },
  { pattern: /execSync\s*\(/g, name: 'execSync()', severity: 'high' as const },
  { pattern: /execFileSync\s*\(/g, name: 'execFileSync()', severity: 'high' as const },
];

/**
 * 不安全的输入处理模式
 */
const UNSAFE_INPUT_PATTERNS = [
  {
    pattern: /process\.argv\s*\[\s*\d+\s*\]/g,
    name: 'Direct process.argv access',
    severity: 'medium' as const,
    recommendation: '使用参数验证库（如 zod）验证用户输入'
  },
  {
    pattern: /require\s*\(\s*[`'"][^`'"]+[`'"]\s*\+.*\)/g,
    name: 'Dynamic require with user input',
    severity: 'high' as const,
    recommendation: '避免动态 require，使用静态导入或白名单'
  },
  {
    pattern: /\$\{[^}]*process\.env[^}]*\}/g,
    name: 'Template literal with process.env',
    severity: 'medium' as const,
    recommendation: '验证环境变量后再使用'
  },
];

/**
 * 扫描文件内容
 */
export function scanFileContent(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];
  const lines = content.split('\n');

  // 检测 API 密钥
  API_KEY_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const lineNum = content.substring(0, content.indexOf(match)).split('\n').length;
        issues.push({
          severity: 'critical',
          type: 'hardcoded-api-key',
          message: `检测到硬编码的 API 密钥: ${match.substring(0, 10)}...`,
          location: { file: filePath, line: lineNum },
          recommendation: '使用环境变量或配置文件存储敏感信息'
        });
      });
    }
  });

  // 检测危险函数
  DANGEROUS_FUNCTIONS.forEach(func => {
    const matches = [...content.matchAll(func.pattern)];
    matches.forEach(match => {
      const lineNum = match.index ? content.substring(0, match.index).split('\n').length : 1;
      issues.push({
        severity: func.severity,
        type: 'dangerous-function',
        message: `使用了危险函数: ${func.name}`,
        location: { file: filePath, line: lineNum },
        recommendation: '验证并净化所有输入，考虑使用更安全的替代方案'
      });
    });
  });

  // 检测不安全的输入处理
  UNSAFE_INPUT_PATTERNS.forEach(pattern => {
    const matches = [...content.matchAll(pattern.pattern)];
    matches.forEach(match => {
      const lineNum = match.index ? content.substring(0, match.index).split('\n').length : 1;
      issues.push({
        severity: pattern.severity,
        type: 'unsafe-input-handling',
        message: pattern.name,
        location: { file: filePath, line: lineNum },
        recommendation: pattern.recommendation
      });
    });
  });

  // 检测 SQL 注入风险
  const sqlInjectionPatterns = [
    /\$\{.*\}\s*;?\s*['"]?\s*(?:SELECT|INSERT|UPDATE|DELETE)/gi,
    /\+\s*['"]?\s*(?:SELECT|INSERT|UPDATE|DELETE)/gi,
  ];

  sqlInjectionPatterns.forEach((pattern, index) => {
    const matches = [...content.matchAll(pattern)];
    matches.forEach(match => {
      const lineNum = match.index ? content.substring(0, match.index).split('\n').length : 1;
      issues.push({
        severity: 'high',
        type: 'sql-injection-risk',
        message: '可能的 SQL 注入风险',
        location: { file: filePath, line: lineNum },
        recommendation: '使用参数化查询或 ORM，避免字符串拼接'
      });
    });
  });

  // 统计问题数量
  const summary = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  return {
    safe: summary.critical === 0 && summary.high === 0,
    issues,
    summary
  };
}

/**
 * 扫描 SKILL.md 文件
 */
export function scanSkillFile(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];

  // 检查是否明确说明了工具边界
  if (!content.includes('工具') && !content.includes('tool') && !content.includes('Tool')) {
    issues.push({
      severity: 'medium',
      type: 'missing-tool-documentation',
      message: 'SKILL.md 未说明工具使用边界',
      location: { file: filePath },
      recommendation: '在 SKILL.md 中明确说明工具的输入、输出、依赖环境及操作边界'
    });
  }

  // 检查是否包含安全警告
  if (content.includes('exec') && !content.includes('安全') && !content.includes('security')) {
    issues.push({
      severity: 'high',
      type: 'missing-security-warning',
      message: '使用 exec 工具但未提供安全警告',
      location: { file: filePath },
      recommendation: '在 SKILL.md 中添加安全警告，说明使用 exec 工具的风险'
    });
  }

  // 检查是否说明了错误处理
  if (!content.includes('错误') && !content.includes('error') && !content.includes('Error')) {
    issues.push({
      severity: 'low',
      type: 'missing-error-handling',
      message: 'SKILL.md 未说明错误处理方式',
      location: { file: filePath },
      recommendation: '在 SKILL.md 中说明错误处理方式，避免生硬的堆栈追踪'
    });
  }

  const summary = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  return {
    safe: summary.critical === 0 && summary.high === 0,
    issues,
    summary
  };
}

/**
 * 扫描 openclaw.plugin.json 文件
 */
export function scanPluginConfig(content: string, filePath: string): ScanResult {
  const issues: SecurityIssue[] = [];
  let config: any;

  try {
    config = JSON.parse(content);
  } catch (e) {
    issues.push({
      severity: 'high',
      type: 'invalid-json',
      message: '配置文件不是有效的 JSON',
      location: { file: filePath },
      recommendation: '检查 JSON 语法错误'
    });
    return { safe: false, issues, summary: { critical: 0, high: 1, medium: 0, low: 0 } };
  }

  // 检查是否配置了沙箱
  if (config.tools && !config.sandbox) {
    const hasDangerousTools = config.tools.some?.((t: string) =>
      ['exec', 'browser', 'edit', 'write'].includes(t)
    );

    if (hasDangerousTools) {
      issues.push({
        severity: 'high',
        type: 'missing-sandbox',
        message: '使用了危险工具但未配置沙箱',
        location: { file: filePath },
        recommendation: '为包含 exec/browser 等工具的插件配置 Docker 沙箱'
      });
    }
  }

  // 检查是否配置了 allowedAgents
  if (!config.agents || !config.agents.allowed) {
    issues.push({
      severity: 'medium',
      type: 'missing-agent-whitelist',
      message: '未配置智能体白名单',
      location: { file: filePath },
      recommendation: '配置 allowedAgents 以限制插件只能被特定智能体调用'
    });
  }

  // 检查是否使用了过时的 API
  if (config.hooks && !config.providers) {
    issues.push({
      severity: 'low',
      type: 'deprecated-api',
      message: '使用了过时的 hooks 模式',
      location: { file: filePath },
      recommendation: '迁移到现代化的 registerProvider() API'
    });
  }

  const summary = {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
  };

  return {
    safe: summary.critical === 0 && summary.high === 0,
    issues,
    summary
  };
}

/**
 * 生成安全扫描报告
 */
export function generateScanReport(results: ScanResult[], projectName: string): string {
  const totalIssues = results.reduce((acc, r) => ({
    critical: acc.critical + r.summary.critical,
    high: acc.high + r.summary.high,
    medium: acc.medium + r.summary.medium,
    low: acc.low + r.summary.low,
  }), { critical: 0, high: 0, medium: 0, low: 0 });

  const allSafe = results.every(r => r.safe);

  let report = `# 安全扫描报告 - ${projectName}

## 总体评估

${allSafe ? '✅ **通过** - 未发现高危安全问题' : '❌ **失败** - 发现需要处理的安全问题'}

## 问题统计

| 严重性 | 数量 |
|--------|------|
| 🔴 Critical | ${totalIssues.critical} |
| 🟠 High | ${totalIssues.high} |
| 🟡 Medium | ${totalIssues.medium} |
| 🟢 Low | ${totalIssues.low} |

## 详细问题列表

`;

  results.forEach(result => {
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        const severityEmoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity];

        report += `### ${severityEmoji} ${issue.type}

- **文件**: \`${issue.location.file}\`${issue.location.line ? `:${issue.location.line}` : ''}
- **严重性**: ${issue.severity.toUpperCase()}
- **描述**: ${issue.message}
- **建议**: ${issue.recommendation}

`;
      });
    }
  });

  report += `## 修复建议

`;

  if (totalIssues.critical > 0) {
    report += `### 🔴 Critical 问题（必须修复）

- 移除所有硬编码的 API 密钥
- 使用环境变量或配置文件存储敏感信息
- 立即更换已泄露的密钥

`;
  }

  if (totalIssues.high > 0) {
    report += `### 🟠 High 问题（强烈建议修复）

- 配置 Docker 沙箱隔离危险工具
- 验证并净化所有用户输入
- 添加安全警告文档

`;
  }

  if (totalIssues.medium > 0) {
    report += `### 🟡 Medium 问题（建议修复）

- 配置智能体白名单
- 完善错误处理文档
- 迁移到现代化 API

`;
  }

  report += `## 扫描完成时间

${new Date().toISOString()}

---

*此报告由 OpenClaw Agent Forge Security Scanner 生成*
`;

  return report;
}

export default {
  scanFileContent,
  scanSkillFile,
  scanPluginConfig,
  generateScanReport
};
