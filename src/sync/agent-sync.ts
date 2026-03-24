/**
 * OpenClaw Agent Forge - Agent Sync Tool
 *
 * Implements Agent Forge <-> OpenClaw bidirectional sync.
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
      throw new Error(`Agent "${agentName}" not found in Forge: ${forgeAgentPath}`);
    }

    fs.mkdirSync(openclawAgentPath, { recursive: true });

    const soulPath = path.join(forgeAgentPath, 'SOUL.md');
    if (!fs.existsSync(soulPath)) {
      throw new Error(`SOUL.md not found for agent "${agentName}"`);
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

    console.log(`✅ Synced "${agentName}" to OpenClaw`);
  }

  async syncFromOpenClaw(agentName: string): Promise<void> {
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);

    if (!fs.existsSync(openclawAgentPath)) {
      throw new Error(`Agent "${agentName}" not found in OpenClaw: ${openclawAgentPath}`);
    }

    fs.mkdirSync(forgeAgentPath, { recursive: true });

    const modelsPath = path.join(openclawAgentPath, 'models.json');
    const authPath = path.join(openclawAgentPath, 'auth-profiles.json');

    if (!fs.existsSync(modelsPath)) {
      throw new Error(`models.json not found for agent "${agentName}"`);
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

    console.log(`✅ Synced "${agentName}" from OpenClaw`);
  }

  async startSync(agentName: string): Promise<void> {
    const forgeAgentPath = path.join(this.forgePath, 'agents', agentName);
    const openclawAgentPath = path.join(this.openclawPath, 'agents', agentName, 'agent');

    if (!fs.existsSync(forgeAgentPath)) {
      throw new Error(`Forge agent path not found: ${forgeAgentPath}`);
    }
    if (!fs.existsSync(openclawAgentPath)) {
      throw new Error(`OpenClaw agent path not found: ${openclawAgentPath}`);
    }

    await this.stopSync();

    console.log(`🔄 Starting sync watch for "${agentName}"`);

    const forgeWatcher = watch(forgeAgentPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });
    forgeWatcher.on('change', async (filePath: string) => {
      console.log(`📝 Forge changed: ${filePath}`);
      try {
        await this.syncToOpenClaw(agentName);
      } catch (error: unknown) {
        console.error(`❌ Forge -> OpenClaw sync error: ${formatError(error)}`);
      }
    });

    const openclawWatcher = watch(openclawAgentPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      ignoreInitial: true,
    });
    openclawWatcher.on('change', async (filePath: string) => {
      console.log(`📝 OpenClaw changed: ${filePath}`);
      try {
        await this.syncFromOpenClaw(agentName);
      } catch (error: unknown) {
        console.error(`❌ OpenClaw -> Forge sync error: ${formatError(error)}`);
      }
    });

    this.watchers = [forgeWatcher, openclawWatcher];

    console.log('✅ Sync watchers are active');
    console.log(`   Forge: ${forgeAgentPath}`);
    console.log(`   OpenClaw: ${openclawAgentPath}`);
  }

  async stopSync(): Promise<void> {
    if (this.watchers.length === 0) {
      return;
    }

    await Promise.all(this.watchers.map((watcher) => watcher.close()));
    this.watchers = [];
    console.log('🛑 Sync watchers stopped');
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
      throw new Error('models.json does not contain any provider');
    }

    const provider = providers[providerId];
    if (!provider || !Array.isArray(provider.models) || provider.models.length === 0) {
      throw new Error(`Provider "${providerId}" has no model entries`);
    }

    const model = provider.models[0];
    const modelId = model.id || 'unknown-model';
    const contextWindow = model.contextWindow || 204800;

    const soulContent = `# SOUL.md - Who You Are

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful.** Skip filler and focus on outcomes.

**Have opinions.** Offer clear recommendations with tradeoffs.

**Be resourceful.** Try to solve with available tools before escalating.

## Configuration

- **Model**: ${modelId}
- **Provider**: ${providerId}
- **Context Window**: ${contextWindow}

## Boundaries

- Keep private data private.
- Ask before taking external or destructive actions.
- Never send half-baked replies to user-facing channels.
`;

    const agentsContent = `# AGENTS.md - Your Workspace

## Session Startup

1. Read \`SOUL.md\`
2. Read \`USER.md\` (if present)
3. Read recent memory notes for context

## Configuration

- **Model**: ${modelId}
- **Provider**: ${providerId}
- **API**: ${provider.api || 'unknown'}
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
      throw new Error(`Invalid ${label}: ${formatError(error)}`);
    }
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default AgentSync;
