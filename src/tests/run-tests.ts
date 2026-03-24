import assert from 'node:assert/strict';
import { scanFileContent, scanPluginConfig } from '../security/ast-scanner';
import { selectSecurityProfile, validateSecurityConfig } from '../security/sandbox-config';

function testSecretDetection(): void {
  const result = scanFileContent(
    `
      const apiKey = "sk-aaaaaaaaaaaaaaaaaaaaaaaa";
      const backup_token = "d41d8cd98f00b204e9800998ecf8427e";
    `,
    'example.ts',
  );

  assert.equal(result.summary.critical >= 1, true, 'should detect hardcoded API key');
  assert.equal(
    result.issues.some((issue) => issue.type === 'possible-hardcoded-secret'),
    true,
    'should flag possible secret with context hint',
  );
}

function testPluginValidation(): void {
  const insecureConfig = scanPluginConfig(
    JSON.stringify({
      tools: ['exec', 'read'],
    }),
    'openclaw.plugin.json',
  );

  assert.equal(insecureConfig.summary.high >= 1, true, 'should report missing sandbox');
  assert.equal(
    insecureConfig.issues.some((issue) => issue.type === 'missing-agent-whitelist'),
    true,
    'should require agent whitelist',
  );
}

function testSecurityProfileValidation(): void {
  const profile = selectSecurityProfile('main-session');
  const validation = validateSecurityConfig(profile);
  assert.equal(validation.valid, true, 'main-session profile should be valid');
}

function run(): void {
  testSecretDetection();
  testPluginValidation();
  testSecurityProfileValidation();
  console.log('All tests passed.');
}

run();
