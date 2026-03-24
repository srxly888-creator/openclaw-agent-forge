#!/usr/bin/env node
/**
 * OpenClaw Agent Forge - CLI Tool
 */

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import {
  SECURITY_PROFILES,
  generatePluginSecurityConfig,
  generateSecurityDocs,
  selectSecurityProfile,
  validateSecurityConfig,
  type SandboxConfig,
} from '../security/sandbox-config';
import {
  generateScanReport,
  scanFileContent,
  scanPluginConfig,
  scanSkillFile,
  type ScanResult,
} from '../security/ast-scanner';
import { AgentSync } from '../sync/agent-sync';

type SecurityLevel = keyof typeof SECURITY_PROFILES;
type Scenario = 'public-chat' | 'private-chat' | 'main-session' | 'subagent';
type SyncDirection = 'to-openclaw' | 'from-openclaw' | 'bidirectional';
type ListFormat = 'json' | 'table';
type ListScope = 'forge' | 'openclaw' | 'both';

interface CheckResult {
  pass: boolean;
  issues: string[];
  warnings: string[];
}

interface ForgeAgentInfo {
  source: 'forge';
  id: string;
  model: string;
  group?: string;
}

interface OpenClawAgentInfo {
  source: 'openclaw';
  id: string;
  model: string;
  provider: string;
}

const SCENARIOS: Scenario[] = ['public-chat', 'private-chat', 'main-session', 'subagent'];
const SECURITY_LEVELS: SecurityLevel[] = ['maximum', 'high', 'medium', 'low'];
const SYNC_DIRECTIONS: SyncDirection[] = ['to-openclaw', 'from-openclaw', 'bidirectional'];
const LIST_FORMATS: ListFormat[] = ['json', 'table'];
const LIST_SCOPES: ListScope[] = ['forge', 'openclaw', 'both'];
const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.idea',
  '.vscode',
  '.openclaw',
  '.turbo',
  'coverage',
  'dist',
  'node_modules',
]);

const program = new Command();

program
  .name('forge')
  .description('OpenClaw Agent Forge - security-first AI agent toolkit')
  .version('2.1.0');

program
  .command('create <agent-name>')
  .description('Create a new agent scaffold')
  .option('-t, --template <template>', 'Template name/path under agents/', 'basic')
  .option(
    '-s, --security <level>',
    `Security level (${SECURITY_LEVELS.join('|')})`,
    'high',
  )
  .option(
    '--scenario <scenario>',
    `Scenario (${SCENARIOS.join('|')})`,
    'private-chat',
  )
  .action((agentName: string, options: { template: string; security: string; scenario: string }) => {
    try {
      ensureValidAgentName(agentName);
      const scenario = toScenario(options.scenario);
      const level = toSecurityLevel(options.security);

      const workspaceRoot = process.cwd();
      const agentsRoot = path.join(workspaceRoot, 'agents');
      const agentRoot = path.join(agentsRoot, agentName);

      if (fs.existsSync(agentRoot)) {
        throw new Error(`Agent "${agentName}" already exists at ${agentRoot}`);
      }

      const securityConfig = buildSecurityConfig(scenario, level);
      const validation = validateSecurityConfig(securityConfig);
      const templateSoulPath = resolveTemplateSoulPath(agentsRoot, options.template);

      fs.mkdirSync(path.join(agentRoot, 'skills'), { recursive: true });
      fs.writeFileSync(
        path.join(agentRoot, 'SOUL.md'),
        buildSoulContent(agentName, scenario, level, templateSoulPath),
      );
      fs.writeFileSync(path.join(agentRoot, 'AGENTS.md'), buildAgentsContent(agentName, scenario));
      fs.writeFileSync(
        path.join(agentRoot, 'openclaw.plugin.json'),
        `${JSON.stringify(generatePluginSecurityConfig(securityConfig), null, 2)}\n`,
      );
      fs.writeFileSync(path.join(agentRoot, 'SECURITY.md'), generateSecurityDocs(securityConfig));

      console.log(`✅ Created agent: ${agentName}`);
      console.log(`📁 Path: ${agentRoot}`);
      console.log(`🧩 Template: ${templateSoulPath ? path.relative(workspaceRoot, templateSoulPath) : 'basic'}`);
      console.log(`🔒 Security: ${level}`);
      console.log(`🎯 Scenario: ${scenario}`);

      if (validation.warnings.length > 0) {
        console.log('\n⚠️ Security warnings:');
        validation.warnings.forEach((warning) => console.log(`  - ${warning}`));
      }
    } catch (error: unknown) {
      failWithError('Failed to create agent', error);
    }
  });

program
  .command('swarm create <swarm-name>')
  .description('Create a multi-agent swarm scaffold')
  .option('-a, --agents <agents>', 'Comma-separated agents', 'researcher,writer,publisher')
  .action((swarmName: string, options: { agents: string }) => {
    try {
      ensureValidAgentName(swarmName);
      const agents = parseAgentList(options.agents);
      if (agents.length === 0) {
        throw new Error('No valid agent names were provided');
      }

      const swarmRoot = path.join(process.cwd(), 'swarms', swarmName);
      if (fs.existsSync(swarmRoot)) {
        throw new Error(`Swarm "${swarmName}" already exists at ${swarmRoot}`);
      }

      agents.forEach((agent) => ensureValidAgentName(agent));

      fs.mkdirSync(path.join(swarmRoot, 'agents'), { recursive: true });
      agents.forEach((agent) => {
        const agentRoot = path.join(swarmRoot, 'agents', agent);
        fs.mkdirSync(agentRoot, { recursive: true });
        fs.writeFileSync(path.join(agentRoot, 'agent.md'), buildSwarmAgentGuide(agent));
        fs.writeFileSync(path.join(agentRoot, 'soul.md'), buildSwarmAgentSoul(agent));
      });

      const swarmConfig = {
        name: swarmName,
        createdAt: new Date().toISOString(),
        agents,
        coordination: {
          mode: 'cooperative',
          heartbeatCron: '*/5 * * * *',
        },
      };
      fs.writeFileSync(path.join(swarmRoot, 'swarm.json'), `${JSON.stringify(swarmConfig, null, 2)}\n`);

      const jobs = agents.map((agent) => ({
        agent,
        schedule: '*/5 * * * *',
        task: `heartbeat-${agent}`,
      }));
      fs.writeFileSync(path.join(swarmRoot, 'jobs.json'), `${JSON.stringify(jobs, null, 2)}\n`);

      console.log(`✅ Created swarm: ${swarmName}`);
      console.log(`📁 Path: ${swarmRoot}`);
      console.log(`👥 Agents: ${agents.join(', ')}`);
    } catch (error: unknown) {
      failWithError('Failed to create swarm', error);
    }
  });

program
  .command('scan [target-path]')
  .description('Scan source and config files for security issues')
  .option('--fix', 'Auto-fix supported issues (currently not implemented)')
  .action((targetPath: string = '.', options: { fix?: boolean }) => {
    try {
      const absoluteTarget = path.resolve(targetPath);
      if (!fs.existsSync(absoluteTarget)) {
        throw new Error(`Target path does not exist: ${absoluteTarget}`);
      }

      console.log(`🔍 Scanning: ${absoluteTarget}\n`);

      const results: ScanResult[] = [];

      const codeFiles = findFiles(absoluteTarget, /\.(ts|js|mjs|cjs)$/);
      codeFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = scanFileContent(content, filePath);
        results.push(result);
        printScanIssues(filePath, result);
      });

      const skillFiles = findFiles(absoluteTarget, /^SKILL\.md$/);
      skillFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = scanSkillFile(content, filePath);
        results.push(result);
        printScanIssues(filePath, result);
      });

      const pluginFiles = findFiles(absoluteTarget, /^openclaw\.plugin\.json$/);
      pluginFiles.forEach((filePath) => {
        const content = fs.readFileSync(filePath, 'utf-8');
        const result = scanPluginConfig(content, filePath);
        results.push(result);
        printScanIssues(filePath, result);
      });

      const reportPath = path.join(absoluteTarget, 'security-scan-report.md');
      fs.writeFileSync(
        reportPath,
        generateScanReport(results, path.basename(absoluteTarget)),
      );

      const summary = summarizeIssues(results);

      console.log(`\n📊 Report: ${reportPath}`);
      console.log(`🔴 Critical: ${summary.critical}`);
      console.log(`🟠 High: ${summary.high}`);
      console.log(`🟡 Medium: ${summary.medium}`);
      console.log(`🟢 Low: ${summary.low}`);

      if (options.fix) {
        console.log('\nℹ️ --fix is reserved for future release; no auto-fix was applied.');
      }

      if (summary.critical > 0 || summary.high > 0) {
        process.exitCode = 1;
      }
    } catch (error: unknown) {
      failWithError('Scan failed', error);
    }
  });

program
  .command('validate')
  .description('Validate repository against OpenClaw four-layer quality checks')
  .option('--four-layer', 'Run four-layer checks (default behavior)', true)
  .option('--strict', 'Fail if warnings exist')
  .action((options: { strict?: boolean }) => {
    const checks: Array<{ name: string; run: () => CheckResult }> = [
      { name: '1) Structure integrity', run: validateStructureIntegrity },
      { name: '2) Runtime stability', run: validateStability },
      { name: '3) No hidden risks', run: validateNoHiddenRisks },
      { name: '4) Developer experience', run: validateUserExperience },
    ];

    let hasError = false;
    let hasWarning = false;

    checks.forEach((check) => {
      const result = check.run();
      const passLabel = result.pass ? '✅ PASS' : '❌ FAIL';
      console.log(`${passLabel} ${check.name}`);

      result.issues.forEach((issue) => console.log(`  - ${issue}`));
      result.warnings.forEach((warning) => console.log(`  ⚠️ ${warning}`));

      if (!result.pass) {
        hasError = true;
      }
      if (result.warnings.length > 0) {
        hasWarning = true;
      }

      console.log();
    });

    if (hasError || (options.strict && hasWarning)) {
      process.exitCode = 1;
      console.log('❌ Validation did not pass.');
      return;
    }

    console.log('🎉 Validation passed.');
  });

program
  .command('sync <agent-name>')
  .description('Sync agent config with OpenClaw')
  .option(
    '-d, --direction <direction>',
    `Sync direction (${SYNC_DIRECTIONS.join('|')})`,
    'bidirectional',
  )
  .option('-w, --watch', 'Start file watchers for continuous sync', false)
  .action(async (agentName: string, options: { direction: string; watch: boolean }) => {
    try {
      ensureValidAgentName(agentName);
      const direction = toSyncDirection(options.direction);
      const sync = new AgentSync(process.cwd());

      if (direction === 'to-openclaw') {
        await sync.syncToOpenClaw(agentName);
      } else if (direction === 'from-openclaw') {
        await sync.syncFromOpenClaw(agentName);
      } else {
        await sync.syncToOpenClaw(agentName);
        await sync.syncFromOpenClaw(agentName);
      }

      if (options.watch) {
        console.log('👀 Watch mode enabled. Press Ctrl+C to stop.');
        await sync.startSync(agentName);
      }
    } catch (error: unknown) {
      failWithError('Sync failed', error);
    }
  });

program
  .command('list')
  .description('List agents from Forge and/or OpenClaw')
  .option('-f, --format <format>', `Output format (${LIST_FORMATS.join('|')})`, 'table')
  .option('--scope <scope>', `Data scope (${LIST_SCOPES.join('|')})`, 'both')
  .action((options: { format: string; scope: string }) => {
    try {
      const format = toListFormat(options.format);
      const scope = toListScope(options.scope);

      const forgeAgents = scope === 'openclaw' ? [] : listForgeAgents(process.cwd());
      const openclawAgents = scope === 'forge' ? [] : listOpenClawAgents();

      if (format === 'json') {
        console.log(
          JSON.stringify(
            {
              forge: forgeAgents,
              openclaw: openclawAgents,
            },
            null,
            2,
          ),
        );
        return;
      }

      if (scope !== 'openclaw') {
        console.log('\n📦 Forge Agents');
        if (forgeAgents.length === 0) {
          console.log('  (none)');
        }
        forgeAgents.forEach((agent, index) => {
          const group = agent.group ? ` [${agent.group}]` : '';
          console.log(`  ${index + 1}. ${agent.id}${group} - model: ${agent.model}`);
        });
      }

      if (scope !== 'forge') {
        console.log('\n🦞 OpenClaw Agents');
        if (openclawAgents.length === 0) {
          console.log('  (none)');
        }
        openclawAgents.forEach((agent, index) => {
          console.log(`  ${index + 1}. ${agent.id} - ${agent.provider}/${agent.model}`);
        });
      }
    } catch (error: unknown) {
      failWithError('List failed', error);
    }
  });

program.parse(process.argv);

function ensureValidAgentName(name: string): void {
  const validName = /^[a-zA-Z0-9][a-zA-Z0-9-_]*$/;
  if (!validName.test(name)) {
    throw new Error(`Invalid name "${name}". Use letters, numbers, "-" or "_" only.`);
  }
}

function toScenario(value: string): Scenario {
  if (!SCENARIOS.includes(value as Scenario)) {
    throw new Error(`Invalid scenario "${value}". Allowed: ${SCENARIOS.join(', ')}`);
  }
  return value as Scenario;
}

function toSecurityLevel(value: string): SecurityLevel {
  if (!SECURITY_LEVELS.includes(value as SecurityLevel)) {
    throw new Error(`Invalid security level "${value}". Allowed: ${SECURITY_LEVELS.join(', ')}`);
  }
  return value as SecurityLevel;
}

function toSyncDirection(value: string): SyncDirection {
  if (!SYNC_DIRECTIONS.includes(value as SyncDirection)) {
    throw new Error(`Invalid direction "${value}". Allowed: ${SYNC_DIRECTIONS.join(', ')}`);
  }
  return value as SyncDirection;
}

function toListFormat(value: string): ListFormat {
  if (!LIST_FORMATS.includes(value as ListFormat)) {
    throw new Error(`Invalid format "${value}". Allowed: ${LIST_FORMATS.join(', ')}`);
  }
  return value as ListFormat;
}

function toListScope(value: string): ListScope {
  if (!LIST_SCOPES.includes(value as ListScope)) {
    throw new Error(`Invalid scope "${value}". Allowed: ${LIST_SCOPES.join(', ')}`);
  }
  return value as ListScope;
}

function parseAgentList(input: string): string[] {
  return [...new Set(input.split(',').map((value) => value.trim()).filter(Boolean))];
}

function buildSecurityConfig(scenario: Scenario, level: SecurityLevel): SandboxConfig {
  const scenarioConfig = selectSecurityProfile(scenario);
  const levelConfig = SECURITY_PROFILES[level].config;
  return {
    ...scenarioConfig,
    ...levelConfig,
    allowedTools: [...levelConfig.allowedTools],
    deniedTools: [...levelConfig.deniedTools],
    allowedAgents: levelConfig.allowedAgents ? [...levelConfig.allowedAgents] : undefined,
  };
}

function resolveTemplateSoulPath(agentsRoot: string, template: string): string | undefined {
  if (!template || template === 'basic') {
    return undefined;
  }

  const normalized = template.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const directCandidate = path.join(agentsRoot, normalized, 'SOUL.md');
  if (fs.existsSync(directCandidate)) {
    return directCandidate;
  }

  const allSoulFiles = findFiles(agentsRoot, /^SOUL\.md$/);
  const byName = allSoulFiles.find((filePath) => path.basename(path.dirname(filePath)) === normalized);
  return byName;
}

function buildSoulContent(
  agentName: string,
  scenario: Scenario,
  level: SecurityLevel,
  templateSoulPath?: string,
): string {
  if (templateSoulPath) {
    const template = fs.readFileSync(templateSoulPath, 'utf-8').trimEnd();
    return `${template}\n`;
  }

  return `# ${agentName}

## 角色
用一句话定义这个智能体的主要职责。

## 核心能力
1. 能力 1
2. 能力 2
3. 能力 3

## 工作流程
1. 接收请求
2. 在约束条件下规划
3. 执行并验证
4. 总结结果

## 安全策略
- 使用场景: ${scenario}
- 安全级别: ${level}
- 原则: 默认最小权限

## 边界
- 永远不要暴露密钥
- 执行破坏性操作前请求确认
- 保持操作可审计和可逆
`;
}

function buildAgentsContent(agentName: string, scenario: Scenario): string {
  return `# AGENTS.md - ${agentName}

## 启动检查清单
1. 阅读 SOUL.md
2. 阅读 USER.md（如果可用）
3. 阅读今天和昨天的记忆笔记

## 使用场景
- ${scenario}

## 操作规则
- 保持响应简洁和可操作
- 在执行高风险操作前清楚解释权衡
- 优先使用可重现的命令和明确输出
`;
}

function buildSwarmAgentGuide(agentName: string): string {
  return `# ${agentName} - agent.md

## 职责
描述这个角色在群体中的职责。

## 输入
- 共享任务上下文
- 上游智能体的输出

## 输出
- 为下游智能体提供的结构化结果
`;
}

function buildSwarmAgentSoul(agentName: string): string {
  return `# ${agentName} - soul.md

## 个性
冷静、精确、协作。

## 使命
贡献专业输出，提高整体群体质量。
`;
}

function summarizeIssues(results: ScanResult[]): {
  critical: number;
  high: number;
  medium: number;
  low: number;
} {
  return results.reduce(
    (acc, result) => ({
      critical: acc.critical + result.summary.critical,
      high: acc.high + result.summary.high,
      medium: acc.medium + result.summary.medium,
      low: acc.low + result.summary.low,
    }),
    { critical: 0, high: 0, medium: 0, low: 0 },
  );
}

function printScanIssues(filePath: string, result: ScanResult): void {
  if (result.issues.length === 0) {
    return;
  }

  console.log(`📄 ${filePath}`);
  result.issues.forEach((issue) => {
    const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
    const lineText = issue.location.line ? ` line ${issue.location.line}` : '';
    console.log(`  ${emoji}${lineText}: ${issue.message}`);
  });
}

function findFiles(rootDir: string, fileNamePattern: RegExp): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.forEach((entry) => {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isSymbolicLink()) {
        return;
      }

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || IGNORED_DIRECTORIES.has(entry.name)) {
          return;
        }
        stack.push(fullPath);
        return;
      }

      if (fileNamePattern.test(entry.name)) {
        results.push(fullPath);
      }
    });
  }

  results.sort((a, b) => a.localeCompare(b));
  return results;
}

function findAppleDoubleArtifacts(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const results: string[] = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    if (!currentDir) {
      continue;
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    entries.forEach((entry) => {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') {
        return;
      }

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isSymbolicLink()) {
        return;
      }

      if (entry.isDirectory()) {
        stack.push(fullPath);
        return;
      }

      if (entry.name.startsWith('._')) {
        results.push(fullPath);
      }
    });
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function validateStructureIntegrity(): CheckResult {
  const root = process.cwd();
  const issues: string[] = [];
  const warnings: string[] = [];

  const requiredPaths = [
    'README.md',
    'SKILL.md',
    'package.json',
    'tsconfig.json',
    'src/commands/forge.ts',
    'src/security/ast-scanner.ts',
    'src/security/sandbox-config.ts',
    'src/sync/agent-sync.ts',
  ];

  requiredPaths.forEach((relativePath) => {
    if (!fs.existsSync(path.join(root, relativePath))) {
      issues.push(`Missing required file: ${relativePath}`);
    }
  });

  const packageJson = readJsonFile(path.join(root, 'package.json'));
  if (!packageJson) {
    issues.push('package.json is missing or invalid JSON');
  } else {
    const scripts = typeof packageJson.scripts === 'object' && packageJson.scripts ? packageJson.scripts : {};
    ['build', 'scan', 'validate'].forEach((scriptName) => {
      if (typeof (scripts as Record<string, unknown>)[scriptName] !== 'string') {
        warnings.push(`Script "${scriptName}" is not defined in package.json`);
      }
    });
  }

  return {
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

function validateStability(): CheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const cliPath = path.join(process.cwd(), 'src/commands/forge.ts');

  if (!fs.existsSync(cliPath)) {
    issues.push('src/commands/forge.ts not found');
    return { pass: false, issues, warnings };
  }

  const content = fs.readFileSync(cliPath, 'utf-8');
  const parseCount = (content.match(/^\s*program\.parse\(process\.argv\);?\s*$/gm) || []).length;
  if (parseCount !== 1) {
    issues.push(`Expected one "program.parse(process.argv)", found ${parseCount}`);
  }

  const syncCommandCount = (content.match(/\.command\('sync <agent-name>'\)/g) || []).length;
  const listCommandCount = (content.match(/\.command\('list'\)/g) || []).length;
  if (syncCommandCount !== 1) {
    issues.push(`Expected one sync command, found ${syncCommandCount}`);
  }
  if (listCommandCount !== 1) {
    issues.push(`Expected one list command, found ${listCommandCount}`);
  }

  const sourceFiles = findFiles(path.join(process.cwd(), 'src'), /\.(ts|js|mjs|cjs)$/);
  if (sourceFiles.length === 0) {
    warnings.push('No source files found under src/');
  }

  return {
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

function validateNoHiddenRisks(): CheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const root = process.cwd();

  const appleDoubleArtifacts = findAppleDoubleArtifacts(root);
  if (appleDoubleArtifacts.length > 0) {
    issues.push(`Found AppleDouble artifacts (._*) in repository: ${appleDoubleArtifacts.length}`);
  }

  const codeFiles = findFiles(path.join(root, 'src'), /\.(ts|js|mjs|cjs)$/).filter(
    (filePath) =>
      !filePath.endsWith(`${path.sep}security${path.sep}ast-scanner.ts`) &&
      !filePath.includes(`${path.sep}tests${path.sep}`),
  );
  const results = codeFiles.map((filePath) => {
    const content = fs.readFileSync(filePath, 'utf-8');
    return scanFileContent(content, filePath);
  });
  const summary = summarizeIssues(results);

  if (summary.critical > 0 || summary.high > 0) {
    issues.push(`Scanner found ${summary.critical} critical and ${summary.high} high issues in src/`);
  } else if (summary.medium > 0 || summary.low > 0) {
    warnings.push(`Scanner found ${summary.medium} medium and ${summary.low} low issues in src/`);
  }

  return {
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

function validateUserExperience(): CheckResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const root = process.cwd();

  ['docs/getting-started.md', 'docs/SECURITY_GUIDE.md', 'docs/SYNC_GUIDE.md'].forEach((relativePath) => {
    if (!fs.existsSync(path.join(root, relativePath))) {
      warnings.push(`Missing recommended doc: ${relativePath}`);
    }
  });

  const readmePath = path.join(root, 'README.md');
  if (!fs.existsSync(readmePath)) {
    issues.push('README.md is missing');
    return {
      pass: false,
      issues,
      warnings,
    };
  }

  const readme = fs.readFileSync(readmePath, 'utf-8');
  const expectedCommands = ['forge create', 'forge scan', 'forge validate', 'forge sync'];
  expectedCommands.forEach((command) => {
    if (!readme.includes(command)) {
      warnings.push(`README is missing command example: ${command}`);
    }
  });

  return {
    pass: issues.length === 0,
    issues,
    warnings,
  };
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function listForgeAgents(root: string): ForgeAgentInfo[] {
  const agentsRoot = path.join(root, 'agents');
  if (!fs.existsSync(agentsRoot)) {
    return [];
  }

  const soulFiles = findFiles(agentsRoot, /^SOUL\.md$/);
  return soulFiles.map((soulPath) => {
    const soulDir = path.dirname(soulPath);
    const relative = path.relative(agentsRoot, soulDir);
    const parts = relative.split(path.sep);
    const id = parts[parts.length - 1] || relative;
    const group = parts.length > 1 ? parts.slice(0, -1).join('/') : undefined;
    const model = extractModelFromSoul(fs.readFileSync(soulPath, 'utf-8'));

    return {
      source: 'forge',
      id,
      model,
      group,
    };
  });
}

function listOpenClawAgents(): OpenClawAgentInfo[] {
  const home = process.env.HOME;
  if (!home) {
    return [];
  }

  const openclawAgentsRoot = path.join(home, '.openclaw', 'agents');
  if (!fs.existsSync(openclawAgentsRoot)) {
    return [];
  }

  const entries = fs.readdirSync(openclawAgentsRoot, { withFileTypes: true });
  const results: OpenClawAgentInfo[] = [];

  entries.forEach((entry) => {
    if (!entry.isDirectory()) {
      return;
    }

    const agentId = entry.name;
    const modelsPath = path.join(openclawAgentsRoot, agentId, 'agent', 'models.json');
    const modelsJson = readJsonFile(modelsPath);

    let provider = 'unknown';
    let model = 'unknown';

    if (modelsJson && typeof modelsJson.providers === 'object' && modelsJson.providers) {
      const providers = modelsJson.providers as Record<string, unknown>;
      const providerKeys = Object.keys(providers);
      if (providerKeys.length > 0) {
        provider = providerKeys[0];
        const firstProvider = providers[provider] as Record<string, unknown> | undefined;
        const models = Array.isArray(firstProvider?.models) ? firstProvider.models : [];
        const firstModel = (models[0] ?? {}) as Record<string, unknown>;
        if (typeof firstModel.id === 'string' && firstModel.id.trim()) {
          model = firstModel.id;
        }
      }
    }

    results.push({
      source: 'openclaw',
      id: agentId,
      provider,
      model,
    });
  });

  results.sort((a, b) => a.id.localeCompare(b.id));
  return results;
}

function extractModelFromSoul(content: string): string {
  const patterns = [/[-*]\s*\*\*Model\*\*:\s*(.+)/i, /[-*]\s*\*\*模型\*\*:\s*(.+)/i, /模型[：:]\s*(.+)/];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return 'unknown';
}

function failWithError(prefix: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${prefix}: ${message}`);
  process.exit(1);
}
