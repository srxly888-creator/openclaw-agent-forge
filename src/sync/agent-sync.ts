/**
 * OpenClaw Agent Forge - 智能体同步工具
 *
 * 实现 Forge 与 OpenClaw 的双向同步。
 */

import * as fs from 'fs';
import * as path from 'path';
import { watch, type FSWatcher } from 'chokidar';

export interface OpenClawModel {
  id: string;
  name: string;
  reasoning: boolean;
  input: string[];
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
  contextWindow: number;
  maxTokens: number;
}

export interface OpenClawProviderConfig {
  baseUrl: string;
  api: string;
  models: OpenClawModel[];
  apiKey: string;
}

export interface OpenClawAgentConfig {
  models: {
    providers: Record<string, OpenClawProviderConfig>;
  };
  auth: {
    profiles: Record<string, { provider: string; mode: string }>;
  };
}

export class AgentSync {
  private readonly openclawPath: string;
  private readonly forgePath: string;
  private watchers: FSWatcher[] = [];

  constructor(forgePath: string, openclawPath: string = '~/.openclaw') {
    this.forgePath = forgePath;
    this.openclawPath = openclawPath.replace('~', process.env.HOME || '');
  }

  async syncToOpenClaw(agentName: string): Promise<void> {
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');

    if (!fs.existsSync(forgeAgentPath)) {
      throw new Error(`Forge 中未找到智能体 "${agentName}": ${forgeAgentPath}`);
    }

    fs.mkdirSync(openclawAgentPath, { recursive: true });

    const soulPath = path.join(forgeAgentPath, 'SOUL.md');
    if (!fs.existsSync(soulPath)) {
      throw new Error(`智能体 "${agentName}" 缺少 SOUL.md`);
    }

    const soulContent = fs.readFileSync(soulPath, 'utf-8');
    const openclawConfig = this.convertToOpenClawConfig(soulContent);

    fs.writeFileSync(
      path.join(openclawAgentPath, 'models.json'),
      `${JSON.stringify(openclawConfig.models, null, 2)}\n`,
    );
    fs.writeFileSync(
      path.join(openclawAgentPath, 'auth-profiles.json'),
      `${JSON.stringify(openclawConfig.auth, null, 2)}\n`,
    );

    console.log(`✅ 已将 "${agentName}" 同步到 OpenClaw`);
  }

  async syncFromOpenClaw(agentName: string): Promise<void> {
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);

    if (!fs.existsSync(openclawAgentPath)) {
      throw new Error(`OpenClaw 中未找到智能体 "${agentName}": ${openclawAgentPath}`);
    }

    fs.mkdirSync(forgeAgentPath, { recursive: true });

    const modelsPath = path.join(openclawAgentPath, 'models.json');
    const authPath = path.join(openclawAgentPath, 'auth-profiles.json');

    if (!fs.existsSync(modelsPath)) {
      throw new Error(`智能体 "${agentName}" 缺少 models.json`);
    }

    const models = this.parseJsonFile<{ providers: Record<string, OpenClawProviderConfig> }>(
      modelsPath,
      'models.json',
    );
    const auth = fs.existsSync(authPath)
      ? this.parseJsonFile<{ profiles: Record<string, { provider: string; mode: string }> }>(
          authPath,
          'auth-profiles.json',
        )
      : { profiles: {} };

    const openclawConfig: OpenClawAgentConfig = { models, auth };
    const forgeConfig = this.convertToForgeConfig(openclawConfig);

    fs.writeFileSync(path.join(forgeAgentPath, 'SOUL.md'), forgeConfig.soul);
    fs.writeFileSync(path.join(forgeAgentPath, 'AGENTS.md'), forgeConfig.agents);

    console.log(`✅ 已从 OpenClaw 同步 "${agentName}" 到 Forge`);
  }

  async startSync(agentName: string): Promise<void> {
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');

    if (!fs.existsSync(forgeAgentPath)) {
      throw new Error(`Forge 智能体路径不存在: ${forgeAgentPath}`);
    }
    if (!fs.existsSync(openclawAgentPath)) {
      throw new Error(`OpenClaw 智能体路径不存在: ${openclawAgentPath}`);
    }

    await this.stopSync();

    console.log(`🔄 开始监听 "${agentName}" 的同步变更`);

    const forgeWatcher = watch(forgeAgentPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });
    forgeWatcher.on('change', async (filePath: string) => {
      console.log(`📝 Forge 发生变化: ${filePath}`);
      try {
        await this.syncToOpenClaw(agentName);
      } catch (error: unknown) {
        console.error(`❌ Forge -> OpenClaw 同步失败: ${formatError(error)}`);
      }
    });

    const openclawWatcher = watch(openclawAgentPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });
    openclawWatcher.on('change', async (filePath: string) => {
      console.log(`📝 OpenClaw 发生变化: ${filePath}`);
      try {
        await this.syncFromOpenClaw(agentName);
      } catch (error: unknown) {
        console.error(`❌ OpenClaw -> Forge 同步失败: ${formatError(error)}`);
      }
    });

    this.watchers = [forgeWatcher, openclawWatcher];

    console.log('✅ 同步监听器已启动');
    console.log(`   Forge: ${forgeAgentPath}`);
    console.log(`   OpenClaw: ${openclawAgentPath}`);
  }

  async stopSync(): Promise<void> {
    if (this.watchers.length === 0) {
      return;
    }

    await Promise.all(this.watchers.map((watcher) => watcher.close()));
    this.watchers = [];
    console.log('🛑 同步监听器已停止');
  }

  private convertToOpenClawConfig(soulContent: string): OpenClawAgentConfig {
    const modelMatch =
      soulContent.match(/[-*]\s*\*\*Model\*\*:\s*(.+)/i) ||
      soulContent.match(/[-*]\s*\*\*模型\*\*:\s*(.+)/i) ||
      soulContent.match(/模型[：:]\s*(.+)/);
    const providerMatch =
      soulContent.match(/[-*]\s*\*\*Provider\*\*:\s*(.+)/i) ||
      soulContent.match(/[-*]\s*\*\*提供商\*\*:\s*(.+)/i) ||
      soulContent.match(/提供商[：:]\s*(.+)/);

    const modelId = modelMatch?.[1]?.trim() || 'glm-5';
    const provider = providerMatch?.[1]?.trim() || 'zai';

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
                  cacheWrite: 0,
                },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
            apiKey: this.getProviderApiKey(provider),
          },
        },
      },
      auth: {
        profiles: {
          [`${provider}:default`]: {
            provider,
            mode: 'api_key',
          },
        },
      },
    };
  }

  private convertToForgeConfig(openclawConfig: OpenClawAgentConfig): { soul: string; agents: string } {
    const providers = openclawConfig.models?.providers || {};
    const providerId = Object.keys(providers)[0];
    if (!providerId) {
      throw new Error('models.json 未包含任何 provider');
    }

    const provider = providers[providerId];
    if (!provider || !Array.isArray(provider.models) || provider.models.length === 0) {
      throw new Error(`Provider "${providerId}" 未包含模型配置`);
    }

    const model = provider.models[0];
    const modelId = model.id || '未知模型';
    const contextWindow = model.contextWindow || 204800;

    const soulContent = `# SOUL.md - 你是谁

_你不是一个“聊天机器人”，你是一个持续进化的专业协作者。_

## 核心原则

**真诚有用。** 少废话，直达结果。

**有判断力。** 清晰给出建议与取舍，不做无意义中立。

**先自助后求助。** 先尽力利用现有工具，再进行升级和确认。

## 配置

- **模型**: ${modelId}
- **提供商**: ${providerId}
- **上下文窗口**: ${contextWindow}

## 边界

- 严格保护隐私和敏感信息。
- 涉及外部动作或破坏性动作前先确认。
- 不向用户侧输出半成品结论。
`;

    const agentsContent = `# AGENTS.md - 工作区约定

## 会话启动

1. 先阅读 \`SOUL.md\`
2. 再阅读 \`USER.md\`（如存在）
3. 回看最近的 memory 记录，补齐上下文

## 配置

- **模型**: ${modelId}
- **提供商**: ${providerId}
- **API**: ${provider.api || '未知'}
`;

    return {
      soul: `${soulContent.trimEnd()}\n`,
      agents: `${agentsContent.trimEnd()}\n`,
    };
  }

  private getProviderBaseUrl(provider: string): string {
    const urls: Record<string, string> = {
      zai: 'https://open.bigmodel.cn/api/coding/paas/v4',
      anthropic: 'https://api.anthropic.com',
      openai: 'https://api.openai.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta',
    };
    return urls[provider] || '';
  }

  private getProviderApi(provider: string): string {
    const apis: Record<string, string> = {
      zai: 'openai-completions',
      anthropic: 'anthropic-messages',
      openai: 'openai-completions',
      google: 'google-generativeai',
    };
    return apis[provider] || 'openai-completions';
  }

  private getProviderApiKey(provider: string): string {
    const keys: Record<string, string> = {
      zai: process.env.ZHIPUAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      openai: process.env.OPENAI_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
    };
    return keys[provider] || '';
  }

  private parseJsonFile<T>(filePath: string, label: string): T {
    const content = fs.readFileSync(filePath, 'utf-8');
    try {
      return JSON.parse(content) as T;
    } catch (error: unknown) {
      throw new Error(`${label} 不是有效 JSON: ${formatError(error)}`);
    }
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default AgentSync;
