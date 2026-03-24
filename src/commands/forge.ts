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
  .description('OpenClaw Agent Forge - 安全优先的智能体工具箱')
  .version('2.1.0');

const SCENARIO_ALIASES: Record<string, Scenario> = {
  '公开群聊': 'public-chat',
  '私聊': 'private-chat',
  '主会话': 'main-session',
  '子智能体': 'subagent',
};

const SECURITY_LEVEL_ALIASES: Record<string, SecurityLevel> = {
  最高: 'maximum',
  高: 'high',
  中: 'medium',
  低: 'low',
};

const SYNC_DIRECTION_ALIASES: Record<string, SyncDirection> = {
  到openclaw: 'to-openclaw',
  从openclaw: 'from-openclaw',
  双向: 'bidirectional',
};

const LIST_FORMAT_ALIASES: Record<string, ListFormat> = {
  表格: 'table',
  json: 'json',
};

const LIST_SCOPE_ALIASES: Record<string, ListScope> = {
  forge: 'forge',
  openclaw: 'openclaw',
  全部: 'both',
  both: 'both',
};

program
  .command('create <agent-name>')
  .description('创建新的智能体脚手架')
  .option('-t, --template <template>', 'agents/ 下的模板名称或路径', 'basic')
  .option(
    '-s, --security <level>',
    `安全级别 (${SECURITY_LEVELS.join('|')}，支持中文: 最高|高|中|低)`,
    'high',
  )
  .option(
    '--scenario <scenario>',
    `使用场景 (${SCENARIOS.join('|')}，支持中文: 公开群聊|私聊|主会话|子智能体)`,
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
        throw new Error(`智能体 "${agentName}" 已存在: ${agentRoot}`);
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

      console.log(`✅ 已创建智能体: ${agentName}`);
      console.log(`📁 路径: ${agentRoot}`);
      console.log(`🧩 模板: ${templateSoulPath ? path.relative(workspaceRoot, templateSoulPath) : 'basic'}`);
      console.log(`🔒 安全级别: ${level}`);
      console.log(`🎯 场景: ${scenario}`);

      if (validation.warnings.length > 0) {
        console.log('\n⚠️ 安全警告:');
        validation.warnings.forEach((warning) => console.log(`  - ${warning}`));
      }
    } catch (error: unknown) {
      failWithError('创建智能体失败', error);
    }
  });

program
  .command('swarm create <swarm-name>')
  .description('创建多智能体协作脚手架')
  .option('-a, --agents <agents>', '智能体列表（逗号分隔）', 'researcher,writer,publisher')
  .action((swarmName: string, options: { agents: string }) => {
    try {
      ensureValidAgentName(swarmName);
      const agents = parseAgentList(options.agents);
      if (agents.length === 0) {
        throw new Error('未提供有效的智能体名称');
      }

      const swarmRoot = path.join(process.cwd(), 'swarms', swarmName);
      if (fs.existsSync(swarmRoot)) {
        throw new Error(`协作组 "${swarmName}" 已存在: ${swarmRoot}`);
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

      console.log(`✅ 已创建协作组: ${swarmName}`);
      console.log(`📁 路径: ${swarmRoot}`);
      console.log(`👥 智能体: ${agents.join(', ')}`);
    } catch (error: unknown) {
      failWithError('创建协作组失败', error);
    }
  });

program
  .command('scan [target-path]')
  .description('扫描源码与配置中的安全问题')
  .option('--fix', '自动修复（预留能力，当前版本未实现）')
  .action((targetPath: string = '.', options: { fix?: boolean }) => {
    try {
      const absoluteTarget = path.resolve(targetPath);
      if (!fs.existsSync(absoluteTarget)) {
        throw new Error(`目标路径不存在: ${absoluteTarget}`);
      }

      console.log(`🔍 开始扫描: ${absoluteTarget}\n`);

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

      console.log(`\n📊 报告路径: ${reportPath}`);
      console.log(`🔴 严重 (Critical): ${summary.critical}`);
      console.log(`🟠 高危 (High): ${summary.high}`);
      console.log(`🟡 中危 (Medium): ${summary.medium}`);
      console.log(`🟢 低危 (Low): ${summary.low}`);

      if (options.fix) {
        console.log('\nℹ️ --fix 为预留能力，当前版本未执行自动修复。');
      }

      if (summary.critical > 0 || summary.high > 0) {
        process.exitCode = 1;
      }
    } catch (error: unknown) {
      failWithError('扫描失败', error);
    }
  });

program
  .command('validate')
  .description('按 OpenClaw 四层标准校验仓库')
  .option('--four-layer', '启用四层标准校验（默认开启）', true)
  .option('--strict', '存在 warning 也视为失败')
  .action((options: { strict?: boolean }) => {
    const checks: Array<{ name: string; run: () => CheckResult }> = [
      { name: '1) 结构完整性', run: validateStructureIntegrity },
      { name: '2) 运行稳定性', run: validateStability },
      { name: '3) 隐蔽风险检查', run: validateNoHiddenRisks },
      { name: '4) 开发体验', run: validateUserExperience },
    ];

    let hasError = false;
    let hasWarning = false;

    checks.forEach((check) => {
      const result = check.run();
      const passLabel = result.pass ? '✅ 通过' : '❌ 失败';
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
      console.log('❌ 校验未通过。');
      return;
    }

    console.log('🎉 校验通过。');
  });

program
  .command('sync <agent-name>')
  .description('与 OpenClaw 同步智能体配置')
  .option(
    '-d, --direction <direction>',
    `同步方向 (${SYNC_DIRECTIONS.join('|')}，支持中文: 到openclaw|从openclaw|双向)`,
    'bidirectional',
  )
  .option('-w, --watch', '开启文件监听并持续同步', false)
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
        console.log('👀 已开启监听模式，按 Ctrl+C 停止。');
        await sync.startSync(agentName);
      }
    } catch (error: unknown) {
      failWithError('同步失败', error);
    }
  });

program
  .command('list')
  .description('列出 Forge 与/或 OpenClaw 智能体')
  .option('-f, --format <format>', `输出格式 (${LIST_FORMATS.join('|')}，支持中文: 表格)`, 'table')
  .option('--scope <scope>', `数据范围 (${LIST_SCOPES.join('|')}，支持中文: 全部)`, 'both')
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
        console.log('\n📦 Forge 智能体');
        if (forgeAgents.length === 0) {
          console.log('  （无）');
        }
        forgeAgents.forEach((agent, index) => {
          const group = agent.group ? ` [${agent.group}]` : '';
          console.log(`  ${index + 1}. ${agent.id}${group} - 模型: ${agent.model}`);
        });
      }

      if (scope !== 'forge') {
        console.log('\n🦞 OpenClaw 智能体');
        if (openclawAgents.length === 0) {
          console.log('  （无）');
        }
        openclawAgents.forEach((agent, index) => {
          console.log(`  ${index + 1}. ${agent.id} - ${agent.provider}/${agent.model}`);
        });
      }
    } catch (error: unknown) {
      failWithError('列出智能体失败', error);
    }
  });

program.parse(process.argv);

function ensureValidAgentName(name: string): void {
  const validName = /^[a-zA-Z0-9][a-zA-Z0-9-_]*$/;
  if (!validName.test(name)) {
    throw new Error(`名称 "${name}" 非法，只允许字母、数字、"-"、"_" 且需以字母或数字开头。`);
  }
}

function toScenario(value: string): Scenario {
  const normalized = SCENARIO_ALIASES[value] || (value as Scenario);
  if (!SCENARIOS.includes(normalized)) {
    throw new Error(`场景 "${value}" 无效，可选值: ${SCENARIOS.join(', ')}`);
  }
  return normalized;
}

function toSecurityLevel(value: string): SecurityLevel {
  const normalized = SECURITY_LEVEL_ALIASES[value] || (value as SecurityLevel);
  if (!SECURITY_LEVELS.includes(normalized)) {
    throw new Error(`安全级别 "${value}" 无效，可选值: ${SECURITY_LEVELS.join(', ')}`);
  }
  return normalized;
}

function toSyncDirection(value: string): SyncDirection {
  const normalized = SYNC_DIRECTION_ALIASES[value] || (value as SyncDirection);
  if (!SYNC_DIRECTIONS.includes(normalized)) {
    throw new Error(`同步方向 "${value}" 无效，可选值: ${SYNC_DIRECTIONS.join(', ')}`);
  }
  return normalized;
}

function toListFormat(value: string): ListFormat {
  const normalized = LIST_FORMAT_ALIASES[value] || (value as ListFormat);
  if (!LIST_FORMATS.includes(normalized)) {
    throw new Error(`输出格式 "${value}" 无效，可选值: ${LIST_FORMATS.join(', ')}`);
  }
  return normalized;
}

function toListScope(value: string): ListScope {
  const normalized = LIST_SCOPE_ALIASES[value] || (value as ListScope);
  if (!LIST_SCOPES.includes(normalized)) {
    throw new Error(`范围 "${value}" 无效，可选值: ${LIST_SCOPES.join(', ')}`);
  }
  return normalized;
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

## 角色定义
请用一句话描述该智能体的核心职责。

## 核心能力
1. 能力 1
2. 能力 2
3. 能力 3

## 工作流程
1. 接收需求
2. 在约束下制定方案
3. 执行并验证
4. 总结输出

## 安全边界
- 场景: ${scenario}
- 安全级别: ${level}
- 原则: 默认最小权限

## 约束条件
- 禁止泄露任何敏感信息。
- 破坏性动作前必须确认。
- 关键操作应可审计、可回滚。
`;
}

function buildAgentsContent(agentName: string, scenario: Scenario): string {
  return `# AGENTS.md - ${agentName}

## 启动清单
1. 先阅读 SOUL.md
2. 阅读 USER.md（如存在）
3. 阅读最近两天的 memory 记录

## 运行场景
- ${scenario}

## 运行规则
- 回复简洁、可执行。
- 高风险动作前先解释取舍并确认。
- 优先使用可复现命令和明确输出。
`;
}

function buildSwarmAgentGuide(agentName: string): string {
  return `# ${agentName} - agent.md

## 角色职责
描述该角色在协作组中的负责范围。

## 输入
- 共享任务上下文
- 上游智能体的产出

## 输出
- 结构化结果（供下游智能体消费）
`;
}

function buildSwarmAgentSoul(agentName: string): string {
  return `# ${agentName} - soul.md

## 风格
冷静、准确、协作。

## 使命
输出专业结果，持续提升协作组整体质量。
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
    const lineText = issue.location.line ? ` 行 ${issue.location.line}` : '';
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
      issues.push(`缺少必需文件: ${relativePath}`);
    }
  });

  const packageJson = readJsonFile(path.join(root, 'package.json'));
  if (!packageJson) {
    issues.push('package.json 缺失或 JSON 格式无效');
  } else {
    const scripts = typeof packageJson.scripts === 'object' && packageJson.scripts ? packageJson.scripts : {};
    ['build', 'scan', 'validate'].forEach((scriptName) => {
      if (typeof (scripts as Record<string, unknown>)[scriptName] !== 'string') {
        warnings.push(`package.json 未定义脚本 "${scriptName}"`);
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
    issues.push('未找到 src/commands/forge.ts');
    return { pass: false, issues, warnings };
  }

  const content = fs.readFileSync(cliPath, 'utf-8');
  const parseCount = (content.match(/^\s*program\.parse\(process\.argv\);?\s*$/gm) || []).length;
  if (parseCount !== 1) {
    issues.push(`期望仅有一个 "program.parse(process.argv)"，实际找到 ${parseCount} 个`);
  }

  const syncCommandCount = (content.match(/\.command\('sync <agent-name>'\)/g) || []).length;
  const listCommandCount = (content.match(/\.command\('list'\)/g) || []).length;
  if (syncCommandCount !== 1) {
    issues.push(`期望仅有一个 sync 命令，实际找到 ${syncCommandCount} 个`);
  }
  if (listCommandCount !== 1) {
    issues.push(`期望仅有一个 list 命令，实际找到 ${listCommandCount} 个`);
  }

  const sourceFiles = findFiles(path.join(process.cwd(), 'src'), /\.(ts|js|mjs|cjs)$/);
  if (sourceFiles.length === 0) {
    warnings.push('src/ 目录下未找到源码文件');
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
    issues.push(`仓库中存在 AppleDouble 资源分叉文件 (._*): ${appleDoubleArtifacts.length} 个`);
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
    issues.push(`扫描器在 src/ 中发现 ${summary.critical} 个 critical 和 ${summary.high} 个 high 问题`);
  } else if (summary.medium > 0 || summary.low > 0) {
    warnings.push(`扫描器在 src/ 中发现 ${summary.medium} 个 medium 和 ${summary.low} 个 low 问题`);
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
      warnings.push(`缺少推荐文档: ${relativePath}`);
    }
  });

  const readmePath = path.join(root, 'README.md');
  if (!fs.existsSync(readmePath)) {
    issues.push('缺少 README.md');
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
      warnings.push(`README 缺少命令示例: ${command}`);
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

    let provider = '未知';
    let model = '未知';

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
  return '未知';
}

function failWithError(prefix: string, error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ ${prefix}: ${message}`);
  process.exit(1);
}
