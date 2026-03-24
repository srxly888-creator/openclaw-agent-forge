/**
 * OpenClaw Agent Forge - Agent Sync Tool
 *
 * 实现 Agent Forge ↔ OpenClaw 双向同步
 */

import * as fs from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';

export interface AgentForgeConfig {
  name: string;
  soul: string;
  agents: string;
  skills: string[];
  security: {
    sandbox: string;
    workspace: string;
    network: string;
    allowedTools: string[];
    deniedTools: string[];
  };
}

export interface OpenClawAgentConfig {
  models: {
    providers: Record<string, any>;
  };
  auth: {
    profiles: Record<string, any>;
  };
}

export class AgentSync {
  private openclawPath: string;
  private forgePath: string;
  private watcher: any;

  constructor(forgePath: string, openclawPath: string = '~/.openclaw') {
    this.forgePath = forgePath;
    this.openclawPath = openclawPath.replace('~', process.env.HOME || '');
  }

  /**
   * 将 Agent Forge 配置同步到 OpenClaw
   */
  async syncToOpenClaw(agentName: string): Promise<void> {
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');

    // 检查 Forge 配置是否存在
    if (!fs.existsSync(forgeAgentPath)) {
      throw new Error(`Agent ${agentName} not found in Forge`);
    }

    // 创建 OpenClaw 目录
    if (!fs.existsSync(openclawAgentPath)) {
      fs.mkdirSync(openclawAgentPath, { recursive: true });
    }

    // 读取 Forge 配置
    const soulPath = path.join(forgeAgentPath, 'SOUL.md');
    const agentsPath = path.join(forgeAgentPath, 'AGENTS.md');

    if (!fs.existsSync(soulPath)) {
      throw new Error(`SOUL.md not found for agent ${agentName}`);
    }

    const soulContent = fs.readFileSync(soulPath, 'utf-8');
    const agentsContent = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf-8') : '';

    // 生成 OpenClaw 配置
    const openclawConfig = this.convertToOpenClawConfig(soulContent, agentsContent);

    // 写入 OpenClaw 配置
    const modelsPath = path.join(openclawAgentPath, 'models.json');
    const authPath = path.join(openclawAgentPath, 'auth-profiles.json');

    fs.writeFileSync(modelsPath, JSON.stringify(openclawConfig.models, null, 2));
    fs.writeFileSync(authPath, JSON.stringify(openclawConfig.auth, null, 2));

    console.log(`✅ Synced ${agentName} to OpenClaw`);
  }

  /**
   * 从 OpenClaw 同步配置到 Agent Forge
   */
  async syncFromOpenClaw(agentName: string): Promise<void> {
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);

    // 检查 OpenClaw 配置是否存在
    if (!fs.existsSync(openclawAgentPath)) {
      throw new Error(`Agent ${agentName} not found in OpenClaw`);
    }

    // 创建 Forge 目录
    if (!fs.existsSync(forgeAgentPath)) {
      fs.mkdirSync(forgeAgentPath, { recursive: true });
    }

    // 读取 OpenClaw 配置
    const modelsPath = path.join(openclawAgentPath, 'models.json');
    const authPath = path.join(openclawAgentPath, 'auth-profiles.json');

    if (!fs.existsSync(modelsPath)) {
      throw new Error(`models.json not found for agent ${agentName}`);
    }

    const modelsContent = fs.readFileSync(modelsPath, 'utf-8');
    const authContent = fs.existsSync(authPath) ? fs.readFileSync(authPath, 'utf-8') : '{}';

    const openclawConfig = {
      models: JSON.parse(modelsContent),
      auth: JSON.parse(authContent)
    };

    // 转换为 Forge 配置
    const forgeConfig = this.convertToForgeConfig(openclawConfig);

    // 写入 Forge 配置
    const soulPath = path.join(forgeAgentPath, 'SOUL.md');
    const agentsPath = path.join(forgeAgentPath, 'AGENTS.md');

    fs.writeFileSync(soulPath, forgeConfig.soul);
    fs.writeFileSync(agentsPath, forgeConfig.agents);

    console.log(`✅ Synced ${agentName} from OpenClaw`);
  }

  /**
   * 启动双向同步监听
   */
  async startSync(agentName: string): Promise<void> {
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');

    console.log(`🔄 Starting sync for ${agentName}...`);

    // 监听 Forge 变化
    const forgeWatcher = watch(forgeAgentPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    forgeWatcher.on('change', (filePath: string) => {
      console.log(`📝 Forge changed: ${filePath}`);
      this.syncToOpenClaw(agentName).catch(console.error);
    });

    // 监听 OpenClaw 变化
    const openclawWatcher = watch(openclawAgentPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true
    });

    openclawWatcher.on('change', (filePath: string) => {
      console.log(`📝 OpenClaw changed: ${filePath}`);
      this.syncFromOpenClaw(agentName).catch(console.error);
    });

    console.log(`✅ Sync started for ${agentName}`);
    console.log(`   Forge: ${forgeAgentPath}`);
    console.log(`   OpenClaw: ${openclawAgentPath}`);
  }

  /**
   * 停止同步监听
   */
  stopSync(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * 转换 Forge 配置到 OpenClaw 配置
   */
  private convertToOpenClawConfig(soulContent: string, agentsContent: string): OpenClawAgentConfig {
    // 解析 SOUL.md 提取配置
    const modelMatch = soulContent.match(/模型[：:]\s*(.+)/);
    const providerMatch = soulContent.match(/提供商[：:]\s*(.+)/);

    const modelId = modelMatch ? modelMatch[1].trim() : 'glm-5';
    const provider = providerMatch ? providerMatch[1].trim() : 'zai';

    return {
      models: {
        providers: {
          [provider]: {
            baseUrl: this.getProviderBaseUrl(provider),
            api: this.getProviderApi(provider),
            models: [
              {
                id: modelId,
                name: modelId,
                reasoning: true,
                input: ['text'],
                cost: {
                  input: 0,
                  output: 0,
                  cacheRead: 0,
                  cacheWrite: 0
                },
                contextWindow: 204800,
                maxTokens: 131072
              }
            ],
            apiKey: this.getProviderApiKey(provider)
          }
        }
      },
      auth: {
        profiles: {
          [`${provider}:default`]: {
            provider: provider,
            mode: 'api_key'
          }
        }
      }
    };
  }

  /**
   * 转换 OpenClaw 配置到 Forge 配置
   */
  private convertToForgeConfig(openclawConfig: OpenClawAgentConfig): { soul: string; agents: string } {
    // 提取第一个 provider 的第一个模型
    const providers = openclawConfig.models.providers;
    const providerId = Object.keys(providers)[0];
    const provider = providers[providerId];
    const model = provider.models[0];

    const soulContent = `# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful.** Skip the filler and just help.

**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing.

**Be resourceful.** Try to figure it out before asking.

## Configuration

- **Model**: ${model.id}
- **Provider**: ${providerId}
- **Context Window**: ${model.contextWindow || 204800}

## Boundaries

- Private things stay private. Period.
- When in doubt, ask before acting externally.
- Never send half-baked replies to messaging surfaces.

---

_This file is yours to evolve. Update it as you learn._
`;

    const agentsContent = `# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## Session Startup

Before doing anything else:

1. Read \`SOUL.md\` — this is who you are
2. Read \`USER.md\` — this is who you're helping
3. Read \`memory/YYYY-MM-DD.md\` (today + yesterday) for recent context

## Configuration

- **Model**: ${model.id}
- **Provider**: ${providerId}
- **API**: ${provider.api}

---

_Make it yours. Add your own conventions, style, and rules._
`;

    return { soul: soulContent, agents: agentsContent };
  }

  /**
   * 获取 Provider Base URL
   */
  private getProviderBaseUrl(provider: string): string {
    const urls: Record<string, string> = {
      zai: 'https://open.bigmodel.cn/api/coding/paas/v4',
      anthropic: 'https://api.anthropic.com',
      openai: 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta'
    };
    return urls[provider] || '';
  }

  /**
   * 获取 Provider API 类型
   */
  private getProviderApi(provider: string): string {
    const apis: Record<string, string> = {
      zai: 'openai-completions',
      anthropic: 'anthropic-messages',
      openai: 'openai-completions',
      google: 'google-generativeai'
    };
    return apis[provider] || 'openai-completions';
  }

  /**
   * 获取 Provider API Key（从环境变量）
   */
  private getProviderApiKey(provider: string): string {
    const keys: Record<string, string> = {
      zai: process.env.ZHIPUAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || ''
    };
    return keys[provider] || '';
  }
}

export default AgentSync;
