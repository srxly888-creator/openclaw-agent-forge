/**
 * OpenClaw Agent Forge - Security Sandbox Configuration Generator
 *
 * 根据智能体类型自动生成安全的沙箱配置
 * 基于 PR #51165 (Agent-Scoped Policy Parity)
 */

export interface SandboxConfig {
  mode: 'docker' | 'native' | 'none';
  image?: string;
  workspace: 'ro' | 'rw' | 'none';
  network: 'none' | 'restricted' | 'full';
  allowedTools: string[];
  deniedTools: string[];
  allowedAgents?: string[];
  modes?: 'main' | 'non-main' | 'all';
}

export interface SecurityProfile {
  name: string;
  description: string;
  config: SandboxConfig;
}

/**
 * 预定义安全配置文件
 */
export const SECURITY_PROFILES: Record<string, SecurityProfile> = {
  // 最高安全级别 - 适用于不受信任的环境
  maximum: {
    name: 'Maximum Security',
    description: '适用于群聊、公开渠道等不受信任环境',
    config: {
      mode: 'docker',
      image: 'openclaw/sandbox:latest',
      workspace: 'ro',
      network: 'none',
      allowedTools: ['read', 'web_search', 'web_fetch'],
      deniedTools: ['exec', 'browser', 'edit', 'write'],
      modes: 'non-main'
    }
  },

  // 高安全级别 - 适用于敏感操作
  high: {
    name: 'High Security',
    description: '适用于处理敏感数据的智能体',
    config: {
      mode: 'docker',
      image: 'openclaw/sandbox:latest',
      workspace: 'ro',
      network: 'restricted',
      allowedTools: ['read', 'web_search', 'web_fetch', 'feishu_*'],
      deniedTools: ['exec', 'browser'],
      allowedAgents: [],
      modes: 'non-main'
    }
  },

  // 中等安全级别 - 适用于一般任务
  medium: {
    name: 'Medium Security',
    description: '适用于一般任务的智能体',
    config: {
      mode: 'docker',
      image: 'openclaw/sandbox:latest',
      workspace: 'rw',
      network: 'restricted',
      allowedTools: ['read', 'write', 'edit', 'web_search', 'web_fetch'],
      deniedTools: ['exec'],
      allowedAgents: [],
      modes: 'all'
    }
  },

  // 低安全级别 - 适用于受信任的主会话
  low: {
    name: 'Low Security (Main Session Only)',
    description: '仅适用于受信任的主会话',
    config: {
      mode: 'native',
      workspace: 'rw',
      network: 'full',
      allowedTools: ['*'],
      deniedTools: [],
      modes: 'main'
    }
  }
};

/**
 * 根据场景自动选择安全配置
 */
export function selectSecurityProfile(
  scenario: 'public-chat' | 'private-chat' | 'main-session' | 'subagent' | 'custom',
  customConfig?: Partial<SandboxConfig>
): SandboxConfig {
  let profile: SecurityProfile;

  switch (scenario) {
    case 'public-chat':
      profile = SECURITY_PROFILES.maximum;
      break;
    case 'private-chat':
      profile = SECURITY_PROFILES.high;
      break;
    case 'main-session':
      profile = SECURITY_PROFILES.low;
      break;
    case 'subagent':
      profile = SECURITY_PROFILES.medium;
      break;
    case 'custom':
      // 自定义配置，合并默认值
      return {
        mode: customConfig?.mode || 'docker',
        workspace: customConfig?.workspace || 'ro',
        network: customConfig?.network || 'none',
        allowedTools: customConfig?.allowedTools || [],
        deniedTools: customConfig?.deniedTools || [],
        allowedAgents: customConfig?.allowedAgents,
        modes: customConfig?.modes
      };
    default:
      profile = SECURITY_PROFILES.maximum;
  }

  return { ...profile.config, ...customConfig };
}

/**
 * 生成 openclaw.plugin.json 安全配置片段
 */
export function generatePluginSecurityConfig(config: SandboxConfig): object {
  return {
    sandbox: config.mode !== 'none' ? {
      mode: config.mode,
      image: config.image,
      workspace: config.workspace,
      network: config.network
    } : undefined,
    tools: {
      allow: config.allowedTools,
      deny: config.deniedTools
    },
    agents: config.allowedAgents ? {
      allowed: config.allowedAgents
    } : undefined,
    modes: config.modes
  };
}

/**
 * 验证安全配置的完整性
 */
export function validateSecurityConfig(config: SandboxConfig): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // 检查高危工具
  if (config.allowedTools.includes('exec') && config.modes !== 'main') {
    warnings.push('⚠️ exec 工具在非主会话中使用存在安全风险');
  }

  // 检查网络权限
  if (config.network === 'full' && config.mode !== 'native') {
    warnings.push('⚠️ 完全网络访问权限应仅限于受信任环境');
  }

  // 检查工作空间权限
  if (config.workspace === 'rw' && config.modes === 'non-main') {
    warnings.push('⚠️ 读写工作空间权限在非主会话中应谨慎使用');
  }

  // 检查是否配置了 allowedAgents
  if (!config.allowedAgents || config.allowedAgents.length === 0) {
    if (config.modes !== 'main') {
      warnings.push('⚠️ 建议配置 allowedAgents 以限制智能体访问');
    }
  }

  // 检查模式一致性
  if (config.modes === 'main' && config.mode === 'docker') {
    errors.push('❌ 主会话模式不应使用 Docker 沙箱');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * 生成安全配置文档
 */
export function generateSecurityDocs(config: SandboxConfig): string {
  const validation = validateSecurityConfig(config);

  const docs = `# 安全配置说明

## 配置详情

- **沙箱模式**: ${config.mode}
- **工作空间**: ${config.workspace}
- **网络权限**: ${config.network}
- **适用模式**: ${config.modes || '未指定'}

## 工具权限

### 允许的工具
${config.allowedTools.map(t => `- ✅ ${t}`).join('\n')}

### 禁止的工具
${config.deniedTools.map(t => `- ❌ ${t}`).join('\n')}

## 验证结果

### 错误
${validation.errors.length > 0 ? validation.errors.map(e => `- ${e}`).join('\n') : '无错误 ✅'}

### 警告
${validation.warnings.length > 0 ? validation.warnings.map(w => `- ${w}`).join('\n') : '无警告 ✅'}

## 安全建议

${generateSecurityRecommendations(config)}
`;

  return docs;
}

function generateSecurityRecommendations(config: SandboxConfig): string {
  const recommendations: string[] = [];

  if (config.workspace === 'rw') {
    recommendations.push('⚠️ **工作空间权限**: 建议使用只读(ro)模式，除非必须写入');
  }

  if (config.network === 'full') {
    recommendations.push('⚠️ **网络权限**: 完全网络访问存在数据外泄风险，建议使用 restricted 或 none');
  }

  if (!config.allowedAgents || config.allowedAgents.length === 0) {
    recommendations.push('⚠️ **智能体限制**: 建议配置 allowedAgents 以实现细粒度权限控制');
  }

  if (config.allowedTools.includes('exec')) {
    recommendations.push('🔴 **exec 工具**: 允许执行任意命令，仅应在受信任环境使用');
  }

  return recommendations.length > 0
    ? recommendations.join('\n\n')
    : '✅ 当前配置符合安全最佳实践';
}

// 导出类型和函数
export default {
  SECURITY_PROFILES,
  selectSecurityProfile,
  generatePluginSecurityConfig,
  validateSecurityConfig,
  generateSecurityDocs
};
