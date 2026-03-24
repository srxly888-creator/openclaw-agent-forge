/**
 * OpenClaw Agent Forge - Static Analysis Security Scanner
 *
 * Scans generated code and configuration files for common security risks.
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
    recommendation: 'Use environment variables or a secret manager for API keys.',
  },
  {
    name: 'Anthropic API key',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bsk-ant-api[a-zA-Z0-9-]{20,}\b/g,
    recommendation: 'Use environment variables or a secret manager for API keys.',
  },
  {
    name: 'Slack token',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bxox[baprs]-[a-zA-Z0-9-]{10,}\b/g,
    recommendation: 'Move Slack tokens out of source code immediately.',
  },
  {
    name: 'GitHub token',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bgh[pousr]_[a-zA-Z0-9]{36}\b/g,
    recommendation: 'Revoke and rotate exposed GitHub tokens.',
  },
  {
    name: 'AWS access key ID',
    type: 'hardcoded-api-key',
    severity: 'critical',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    recommendation: 'Store cloud credentials in environment variables or vault.',
  },
  {
    name: 'JWT token',
    type: 'hardcoded-jwt',
    severity: 'high',
    pattern: /\beyJ[a-zA-Z0-9-_=]+\.[a-zA-Z0-9-_=]+\.?[a-zA-Z0-9-_.+/=]*\b/g,
    recommendation: 'Avoid embedding live JWTs in source code and logs.',
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
    name: 'Direct process.argv access',
    severity: 'medium' as const,
    recommendation: 'Validate CLI input using a schema validator (e.g. zod).',
  },
  {
    pattern: /require\s*\(\s*[`'"][^`'"]+[`'"]\s*\+.*\)/g,
    name: 'Dynamic require with user input',
    severity: 'high' as const,
    recommendation: 'Avoid dynamic require; prefer static imports or strict allow-lists.',
  },
  {
    pattern: /\$\{[^}]*process\.env[^}]*\}/g,
    name: 'Template literal with process.env',
    severity: 'medium' as const,
    recommendation: 'Validate environment values before interpolation.',
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
        message: `Detected ${rule.name}: ${maskSecret(match[0])}`,
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
        message: `Possible hardcoded secret near credential-like context: ${maskSecret(match)}`,
        location: { file: filePath, line: index + 1 },
        recommendation: 'Review whether this value is sensitive. If yes, move it to env/secret manager.',
      });
    });
  });

  DANGEROUS_FUNCTIONS.forEach((func) => {
    for (const match of content.matchAll(func.pattern)) {
      const start = match.index ?? 0;
      issues.push({
        severity: func.severity,
        type: 'dangerous-function',
        message: `Dangerous function usage: ${func.name}`,
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: 'Validate and sanitize all input. Prefer safer alternatives.',
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
        message: 'Possible SQL injection risk from string interpolation/concatenation.',
        location: { file: filePath, line: lineNumberAt(content, start) },
        recommendation: 'Use parameterized queries or ORM methods instead of string composition.',
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
      message: 'SKILL.md does not describe tool boundaries.',
      location: { file: filePath },
      recommendation: 'Document tool input/output, environment dependencies, and operational boundaries.',
    });
  }

  if (normalized.includes('exec') && !normalized.includes('security') && !content.includes('安全')) {
    issues.push({
      severity: 'high',
      type: 'missing-security-warning',
      message: 'SKILL.md references exec-like capability but lacks a security warning.',
      location: { file: filePath },
      recommendation: 'Add explicit security guidance and guardrails for command execution.',
    });
  }

  if (!normalized.includes('error') && !content.includes('错误')) {
    issues.push({
      severity: 'low',
      type: 'missing-error-handling',
      message: 'SKILL.md does not explain error handling behavior.',
      location: { file: filePath },
      recommendation: 'Describe expected failure handling and user-facing recovery behavior.',
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
      message: 'Plugin config is not valid JSON.',
      location: { file: filePath },
      recommendation: 'Fix JSON syntax errors in openclaw.plugin.json.',
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
      message: 'Dangerous tools are allowed but sandbox is not configured.',
      location: { file: filePath },
      recommendation: 'Configure sandbox isolation (Docker/native restrictions) before enabling dangerous tools.',
    });
  }

  if (allowTools.includes('*') && denyTools.length === 0) {
    issues.push({
      severity: 'medium',
      type: 'overly-broad-tool-access',
      message: 'Tools allow-list is "*" without deny rules.',
      location: { file: filePath },
      recommendation: 'Use principle of least privilege with explicit allow/deny tool lists.',
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
      message: 'No agent whitelist configured.',
      location: { file: filePath },
      recommendation: 'Configure agents.allowed to scope plugin usage to approved agents.',
    });
  }

  if (config.hooks && !config.providers) {
    issues.push({
      severity: 'low',
      type: 'deprecated-api',
      message: 'Legacy "hooks" field detected without "providers".',
      location: { file: filePath },
      recommendation: 'Migrate to modern provider registration patterns.',
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

  let report = `# Security Scan Report - ${projectName}

## Overall

${allSafe ? '✅ PASS - No high/critical issues detected.' : '❌ FAIL - High or critical issues detected.'}

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | ${totalIssues.critical} |
| 🟠 High | ${totalIssues.high} |
| 🟡 Medium | ${totalIssues.medium} |
| 🟢 Low | ${totalIssues.low} |

## Findings

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

- **Location**: \`${location}\`
- **Severity**: ${issue.severity.toUpperCase()}
- **Message**: ${issue.message}
- **Recommendation**: ${issue.recommendation}

`;
    });
  });

  if (!hasFinding) {
    report += '_No findings._\n\n';
  }

  report += `## Generated At

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
