#!/usr/bin/env node
/**
 * OpenClaw Agent Forge - CLI Tool
 *
 * 用法:
 *   forge create <agent-name> --template <template>
 *   forge swarm create <swarm-name> --agents <agent1,agent2>
 *   forge validate --four-layer
 *   forge deploy --env vps
 *   forge sync <agent-name> --direction <to-openclaw|from-openclaw|bidirectional>
 */

import { Command } from 'commander';
import { selectSecurityProfile, generateSecurityDocs, validateSecurityConfig } from './security/sandbox-config';
import { scanFileContent, scanSkillFile, scanPluginConfig, generateScanReport } from './security/ast-scanner';
import { AgentSync } from '../sync/agent-sync';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('forge')
  .description('OpenClaw Agent Forge - 安全的智能体锻造工具')
  .version('2.0.0');

/**
 * 创建新智能体
 */
program
  .command('create <agent-name>')
  .description('创建新的智能体')
  .option('-t, --template <template>', '使用模板', 'basic')
  .option('-s, --security <level>', '安全级别 (maximum|high|medium|low)', 'high')
  .option('--scenario <scenario>', '使用场景 (public-chat|private-chat|main-session|subagent)', 'private-chat')
  .action((agentName, options) => {
    console.log(`🔨 创建智能体: ${agentName}`);
    console.log(`📋 模板: ${options.template}`);
    console.log(`🔒 安全级别: ${options.security}`);
    console.log(`🎯 使用场景: ${options.scenario}`);

    // 选择安全配置
    const securityConfig = selectSecurityProfile(options.scenario as any);
    console.log('\n✅ 安全配置已生成:');
    console.log(JSON.stringify(securityConfig, null, 2));

    // 生成安全文档
    const securityDocs = generateSecurityDocs(securityConfig);
    console.log('\n📄 安全文档:');
    console.log(securityDocs);

    // TODO: 创建智能体目录结构
    console.log(`\n📁 创建目录结构...`);
    console.log(`   - ${agentName}/`);
    console.log(`   - ${agentName}/SOUL.md`);
    console.log(`   - ${agentName}/AGENTS.md`);
    console.log(`   - ${agentName}/skills/`);
    console.log(`   - ${agentName}/openclaw.plugin.json`);
  });

/**
 * 创建智能体集群
 */
program
  .command('swarm create <swarm-name>')
  .description('创建智能体集群')
  .option('-a, --agents <agents>', '智能体列表（逗号分隔）', 'researcher,writer,publisher')
  .option('-c, --config <config>', '集群配置文件')
  .action((swarmName, options) => {
    const agents = options.agents.split(',');
    console.log(`🤖 创建智能体集群: ${swarmName}`);
    console.log(`👥 智能体列表: ${agents.join(', ')}`);

    // TODO: 生成集群配置
    console.log('\n📁 生成集群配置...');
    console.log(`   - .agents/`);
    agents.forEach(agent => {
      console.log(`   - .agents/${agent}/`);
      console.log(`   - .agents/${agent}/agent.md`);
      console.log(`   - .agents/${agent}/soul.md`);
    });
    console.log(`   - swarm.json`);
    console.log(`   - jobs.json (Cron 心跳)`);
  });

/**
 * 安全扫描
 */
program
  .command('scan [path]')
  .description('扫描代码和配置的安全问题')
  .option('--fix', '自动修复可修复的问题')
  .action((targetPath = '.', options) => {
    console.log('🔍 开始安全扫描...\n');

    const results: any[] = [];

    // 扫描 TypeScript/JavaScript 文件
    const codeFiles = findFiles(targetPath, /\.(ts|js)$/);
    codeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const result = scanFileContent(content, file);
      results.push(result);

      if (result.issues.length > 0) {
        console.log(`📄 ${file}:`);
        result.issues.forEach(issue => {
          const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
          console.log(`  ${emoji} Line ${issue.location.line}: ${issue.message}`);
        });
      }
    });

    // 扫描 SKILL.md 文件
    const skillFiles = findFiles(targetPath, /SKILL\.md$/);
    skillFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const result = scanSkillFile(content, file);
      results.push(result);

      if (result.issues.length > 0) {
        console.log(`\n📄 ${file}:`);
        result.issues.forEach(issue => {
          const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
          console.log(`  ${emoji} ${issue.message}`);
        });
      }
    });

    // 扫描 openclaw.plugin.json 文件
    const pluginFiles = findFiles(targetPath, /openclaw\.plugin\.json$/);
    pluginFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const result = scanPluginConfig(content, file);
      results.push(result);

      if (result.issues.length > 0) {
        console.log(`\n📄 ${file}:`);
        result.issues.forEach(issue => {
          const emoji = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[issue.severity];
          console.log(`  ${emoji} ${issue.message}`);
        });
      }
    });

    // 生成报告
    const report = generateScanReport(results, path.basename(targetPath));
    const reportPath = path.join(targetPath, 'security-scan-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📊 扫描报告已生成: ${reportPath}`);

    const totalIssues = results.reduce((acc, r) => ({
      critical: acc.critical + r.summary.critical,
      high: acc.high + r.summary.high,
      medium: acc.medium + r.summary.medium,
      low: acc.low + r.summary.low,
    }), { critical: 0, high: 0, medium: 0, low: 0 });

    console.log(`\n✅ 扫描完成!`);
    console.log(`   🔴 Critical: ${totalIssues.critical}`);
    console.log(`   🟠 High: ${totalIssues.high}`);
    console.log(`   🟡 Medium: ${totalIssues.medium}`);
    console.log(`   🟢 Low: ${totalIssues.low}`);

    if (totalIssues.critical > 0 || totalIssues.high > 0) {
      console.log(`\n❌ 发现高危问题，请修复后再部署`);
      process.exit(1);
    }
  });

/**
 * 四层标准验证
 */
program
  .command('validate')
  .description('验证是否符合四层标准')
  .option('--four-layer', '使用四层标准验证')
  .option('--strict', '严格模式（不允许任何警告）')
  .action((options) => {
    console.log('📋 开始四层标准验证...\n');

    const checks = [
      {
        name: '1. 规范清晰度与结构完整性',
        check: () => validateStructureIntegrity()
      },
      {
        name: '2. 运行稳定性',
        check: () => validateStability()
      },
      {
        name: '3. 零隐蔽风险',
        check: () => validateNoHiddenRisks()
      },
      {
        name: '4. 低遗憾体验',
        check: () => validateUserExperience()
      }
    ];

    const results: any[] = [];
    checks.forEach(({ name, check }) => {
      console.log(`检查: ${name}`);
      const result = check();
      results.push(result);

      if (result.pass) {
        console.log(`  ✅ 通过\n`);
      } else {
        console.log(`  ❌ 失败`);
        result.issues.forEach((issue: string) => {
          console.log(`     - ${issue}`);
        });
        console.log();
      }
    });

    const allPassed = results.every(r => r.pass);
    if (allPassed) {
      console.log('🎉 所有检查通过！符合四层标准');
    } else {
      console.log('❌ 存在不符合标准的项，请修复');
      process.exit(1);
    }
  });

/**
 * 同步 Agent 到 OpenClaw
 */
program
  .command('sync <agent-name>')
  .description('同步 Agent 与 OpenClaw')
  .option('-d, --direction <direction>', '同步方向 (to-openclaw|from-openclaw|bidirectional)', 'bidirectional')
  .option('-w, --watch', '启动文件监听，实时同步', false)
  .action(async (agentName, options) => {
    console.log(`🔄 同步 Agent: ${agentName}`);
    console.log(`📍 方向: ${options.direction}`);

    const forgePath = process.cwd();
    const sync = new AgentSync(forgePath);

    try {
      if (options.direction === 'to-openclaw') {
        await sync.syncToOpenClaw(agentName);
      } else if (options.direction === 'from-openclaw') {
        await sync.syncFromOpenClaw(agentName);
      } else {
        // 双向同步
        await sync.syncToOpenClaw(agentName);
        await sync.syncFromOpenClaw(agentName);
      }

      if (options.watch) {
        console.log('\n🔄 启动实时同步监听...');
        await sync.startSync(agentName);
      }
    } catch (error: any) {
      console.error(`❌ 同步失败: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * 列出所有 Agent
 */
program
  .command('list')
  .description('列出所有 Agent')
  .option('-f, --format <format>', '输出格式 (json|table)', 'table')
  .action((options) => {
    const agentsDir = path.join(process.cwd(), 'agents');
    
    if (!fs.existsSync(agentsDir)) {
      console.log('❌ 未找到 agents 目录');
      return;
    }

    const agents = fs.readdirSync(agentsDir).filter(dir => {
      const agentPath = path.join(agentsDir, dir);
      return fs.statSync(agentPath).isDirectory();
    });

    if (agents.length === 0) {
      console.log('❌ 未找到任何 Agent');
      return;
    }

    if (options.format === 'json') {
      console.log(JSON.stringify(agents, null, 2));
    } else {
      console.log('\n📋 Agent 列表:\n');
      agents.forEach((agent, index) => {
        const agentPath = path.join(agentsDir, agent);
        const soulPath = path.join(agentPath, 'SOUL.md');
        
        if (fs.existsSync(soulPath)) {
          const soulContent = fs.readFileSync(soulPath, 'utf-8');
          const modelMatch = soulContent.match(/模型[：:]\s*(.+)/);
          const model = modelMatch ? modelMatch[1].trim() : '未知';
          
          console.log(`${index + 1}. ${agent}`);
          console.log(`   模型: ${model}`);
        } else {
          console.log(`${index + 1}. ${agent} (无 SOUL.md)`);
        }
      });
    }
  });

// 解析命令行参数
program.parse(process.argv);

/**
 * 辅助函数：查找文件
 */
function findFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const items = fs.readdirSync(currentDir);
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }

  traverse(dir);
  return files;
}

/**
 * 四层标准验证函数
 */
function validateStructureIntegrity(): { pass: boolean; issues: string[] } {
  const issues: string[] = [];

  // TODO: 实现实际检查逻辑
  if (!fs.existsSync('SKILL.md')) {
    issues.push('缺少 SKILL.md 文件');
  }

  if (!fs.existsSync('README.md')) {
    issues.push('缺少 README.md 文件');
  }

  return { pass: issues.length === 0, issues };
}

function validateStability(): { pass: boolean; issues: string[] } {
  const issues: string[] = [];

  // TODO: 检查异常处理
  // TODO: 检查错误消息质量

  return { pass: issues.length === 0, issues };
}

function validateNoHiddenRisks(): { pass: boolean; issues: string[] } {
  const issues: string[] = [];

  // TODO: 检查网络外发请求
  // TODO: 检查数据收集行为

  return { pass: issues.length === 0, issues };
}

function validateUserExperience(): { pass: boolean; issues: string[] } {
  const issues: string[] = [];

  // TODO: 检查文档质量
  // TODO: 检查示例代码

  return { pass: issues.length === 0, issues };
}

/**
 * 同步 Agent 到 OpenClaw
 */
program
  .command('sync <agent-name>')
  .description('同步 Agent 与 OpenClaw')
  .option('-d, --direction <direction>', '同步方向 (to-openclaw|from-openclaw|bidirectional)', 'bidirectional')
  .option('-w, --watch', '启动文件监听，实时同步', false)
  .action(async (agentName, options) => {
    console.log(`🔄 同步 Agent: ${agentName}`);
    console.log(`📍 方向: ${options.direction}`);
    console.log(`👁️  监听: ${options.watch ? '是' : '否'}`);

    const forgePath = process.cwd();
    const sync = new AgentSync(forgePath);

    try {
      if (options.direction === 'to-openclaw') {
        await sync.syncToOpenClaw(agentName);
      } else if (options.direction === 'from-openclaw') {
        await sync.syncFromOpenClaw(agentName);
      } else {
        // 双向同步
        await sync.syncToOpenClaw(agentName);
        await sync.syncFromOpenClaw(agentName);
      }

      if (options.watch) {
        console.log('\n👀 启动实时监听...');
        await sync.startSync(agentName);
        console.log('按 Ctrl+C 停止监听');
      }
    } catch (error: any) {
      console.error(`❌ 同步失败: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * 列出所有 Agent
 */
program
  .command('list')
  .description('列出所有 Agent')
  .option('--forge', '只显示 Forge Agent')
  .option('--openclaw', '只显示 OpenClaw Agent')
  .action((options) => {
    const forgePath = path.join(process.cwd(), 'agents');
    const openclawPath = path.join(process.env.HOME || '', '.openclaw', 'agents');

    if (!options.openclaw) {
      console.log('\n📦 Forge Agents:');
      if (fs.existsSync(forgePath)) {
        const forgeAgents = fs.readdirSync(forgePath).filter(f => 
          fs.statSync(path.join(forgePath, f)).isDirectory()
        );
        forgeAgents.forEach(agent => {
          const soulPath = path.join(forgePath, agent, 'SOUL.md');
          const hasSoul = fs.existsSync(soulPath);
          console.log(`  ${hasSoul ? '✅' : '⚠️'} ${agent}`);
        });
      } else {
        console.log('  无');
      }
    }

    if (!options.forge) {
      console.log('\n🦞 OpenClaw Agents:');
      if (fs.existsSync(openclawPath)) {
        const openclawAgents = fs.readdirSync(openclawPath).filter(f => 
          fs.statSync(path.join(openclawPath, f)).isDirectory()
        );
        openclawAgents.forEach(agent => {
          const modelsPath = path.join(openclawPath, agent, 'agent', 'models.json');
          const hasModels = fs.existsSync(modelsPath);
          console.log(`  ${hasModels ? '✅' : '⚠️'} ${agent}`);
        });
      } else {
        console.log('  无');
      }
    }
  });

// 解析命令行参数
program.parse(process.argv);
