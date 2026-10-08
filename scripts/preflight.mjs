#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

const isColorSupported =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb';

const colors = {
  reset: isColorSupported ? '\x1b[0m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
  dim: isColorSupported ? '\x1b[2m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',
};

const symbols = {
  check: `${colors.green}✓${colors.reset}`,
  cross: `${colors.red}✗${colors.reset}`,
  warn: `${colors.yellow}⚠️${colors.reset}`,
  arrow: `${colors.cyan}→${colors.reset}`,
  bullet: `${colors.gray}•${colors.reset}`,
};

let failures = 0;
let warnings = 0;

function header(title) {
  console.log(`\n${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(title.length)}${colors.reset}`);
}

function pass(message) {
  console.log(`  ${symbols.check} ${message}`);
}

function warn(message) {
  warnings++;
  console.log(`  ${symbols.warn} ${colors.yellow}${message}${colors.reset}`);
}

function fail(message, details = null) {
  failures++;
  console.log(`  ${symbols.cross} ${colors.red}${message}${colors.reset}`);
  if (details) {
    const indented = details
      .trim()
      .split('\n')
      .map((line) => `      ${colors.gray}${line}${colors.reset}`)
      .join('\n');
    console.log(indented);
  }
}

// -------------------------------------------------------------
// 1. Node version check
// -------------------------------------------------------------
function checkNodeVersion() {
  header('Environment & Runtime');
  const nvmrcPath = resolve(ROOT_DIR, '.nvmrc');
  if (!existsSync(nvmrcPath)) {
    warn('.nvmrc file not found');
    return;
  }

  const expectedVersion = readFileSync(nvmrcPath, 'utf8').trim();
  const currentVersion = process.version;
  const currentMajor = process.versions.node.split('.')[0];
  const expectedMajor = expectedVersion.replace(/^v/, '').split('.')[0];

  if (currentMajor !== expectedMajor) {
    warn(
      `Node version mismatch: running ${currentVersion}, but .nvmrc specifies v${expectedVersion} (run 'nvm use')`
    );
  } else {
    pass(`Node version matches .nvmrc (${currentVersion})`);
  }
}

// -------------------------------------------------------------
// 2. Dev Client Environment & App Check Debug Token
// -------------------------------------------------------------
function checkDevEnvironment() {
  const envLocalPath = resolve(ROOT_DIR, 'apps/mobile/.env.local');

  if (!existsSync(envLocalPath)) {
    fail(
      'Missing apps/mobile/.env.local',
      'Development builds and backend tests require apps/mobile/.env.local with EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN.'
    );
    return;
  }

  const content = readFileSync(envLocalPath, 'utf8');
  const match = content.match(/^EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN\s*=\s*(.+)$/m);

  if (!match || !match[1].trim() || match[1].trim() === 'YOUR_DEBUG_TOKEN') {
    fail(
      'EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN is missing or empty in apps/mobile/.env.local',
      'Please set a valid App Check debug token in apps/mobile/.env.local'
    );
    return;
  }

  pass('apps/mobile/.env.local present with EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN');
}

// -------------------------------------------------------------
// 3. Firebase project aliases
// -------------------------------------------------------------
function checkFirebaseAliases() {
  header('Firebase Configuration');
  const firebasercPath = resolve(ROOT_DIR, '.firebaserc');

  if (!existsSync(firebasercPath)) {
    fail('.firebaserc not found at repository root');
    return;
  }

  try {
    const rc = JSON.parse(readFileSync(firebasercPath, 'utf8'));
    const projects = rc.projects || {};

    const expectedProjects = {
      default: 'egenberedskapsappen-test',
      test: 'egenberedskapsappen-test',
      prod: 'egenberedskapsappen',
    };

    let allAliasesValid = true;
    for (const [alias, expectedId] of Object.entries(expectedProjects)) {
      if (projects[alias] !== expectedId) {
        fail(`Firebase alias "${alias}" should point to "${expectedId}", found "${projects[alias]}"`);
        allAliasesValid = false;
      }
    }

    if (allAliasesValid) {
      pass('Firebase project aliases valid (test: egenberedskapsappen-test, prod: egenberedskapsappen)');
    }
  } catch (err) {
    fail('Could not parse .firebaserc as valid JSON', err.message);
  }
}

// -------------------------------------------------------------
// 4. App configuration integrity (app.json, app.config.ts)
// -------------------------------------------------------------
function checkAppConfigIntegrity() {
  header('Mobile App Configuration Integrity');
  const appJsonPath = resolve(ROOT_DIR, 'apps/mobile/app.json');
  const appConfigPath = resolve(ROOT_DIR, 'apps/mobile/app.config.ts');

  if (!existsSync(appJsonPath)) {
    fail('apps/mobile/app.json not found');
    return;
  }

  try {
    const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));
    const expo = appJson.expo || {};

    // Version
    if (!expo.version || !/^\d+\.\d+\.\d+/.test(expo.version)) {
      fail(`Invalid or missing expo.version in app.json: "${expo.version}"`);
    } else {
      pass(`App version: ${expo.version} (runtimePolicy: ${expo.runtimeVersion?.policy || 'unknown'})`);
    }

    // iOS NSFileProtectionComplete entitlement
    const dataProtection = expo.ios?.entitlements?.['com.apple.developer.default-data-protection'];
    if (dataProtection !== 'NSFileProtectionComplete') {
      fail(
        'Missing NSFileProtectionComplete entitlement in apps/mobile/app.json',
        `Expected "NSFileProtectionComplete", found "${dataProtection}"`
      );
    } else {
      pass('iOS data protection: NSFileProtectionComplete configured');
    }

    // Dynamic bundle IDs from app.config.ts
    if (!existsSync(appConfigPath)) {
      fail('apps/mobile/app.config.ts not found');
    } else {
      const configCode = readFileSync(appConfigPath, 'utf8');
      const hasProdId = configCode.includes('no.htas.egenberedskap');
      const hasDevId = configCode.includes('no.htas.egenberedskap.dev');
      const setsBundleId = configCode.includes('bundleIdentifier');
      const setsPackage = configCode.includes('package');

      if (hasProdId && hasDevId && setsBundleId && setsPackage) {
        pass('Bundle IDs configured (prod: no.htas.egenberedskap, dev: no.htas.egenberedskap.dev)');
      } else {
        fail(
          'apps/mobile/app.config.ts does not properly configure bundle IDs',
          'Expected bundleIdentifier and package with production and development variants.'
        );
      }
    }

    // Firebase native service configuration files
    const plistProd = resolve(ROOT_DIR, 'apps/mobile/firebase/prod/GoogleService-Info.plist');
    const plistTest = resolve(ROOT_DIR, 'apps/mobile/firebase/test/GoogleService-Info.plist');
    const jsonProd = resolve(ROOT_DIR, 'apps/mobile/firebase/prod/google-services.json');
    const jsonTest = resolve(ROOT_DIR, 'apps/mobile/firebase/test/google-services.json');

    if (existsSync(plistProd) && existsSync(plistTest) && existsSync(jsonProd) && existsSync(jsonTest)) {
      pass('Firebase native config files present (iOS plist and Android JSON for test & prod)');
    } else {
      fail('Missing Firebase native configuration files in apps/mobile/firebase/(test|prod)');
    }
  } catch (err) {
    fail('Could not parse apps/mobile/app.json', err.message);
  }
}

// -------------------------------------------------------------
// 5. Automated Tests, Typecheck, and Lint
// -------------------------------------------------------------
function runStep(name, command, args, cwd = ROOT_DIR) {
  const start = Date.now();
  const res = spawnSync(command, args, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8',
  });
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (res.status === 0) {
    pass(`${name} passed (${duration}s)`);
    return true;
  }

  const output = (res.stderr || res.stdout || '').trim();
  fail(`${name} failed (${duration}s)`, output);
  return false;
}

function runVerificationSuites() {
  header('Code Quality & Test Suites');

  runStep('Workspace tests (packages/core, packages/store, packages/sync)', 'npm', ['test']);
  runStep('Workspace typecheck (mobile, web, core, store, sync)', 'npm', ['run', 'typecheck']);
  runStep('Workspace lint (mobile)', 'npm', ['run', 'lint']);
  runStep('Functions test suite', 'npm', ['--prefix', 'functions', 'test']);
}

// -------------------------------------------------------------
// 6. Manual checklist printout
// -------------------------------------------------------------
function printManualChecklist() {
  console.log(`\n${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}📋 Production Launch Manual Checklist (from README.md)${colors.reset}`);
  console.log(`${colors.gray}The prod project (egenberedskapsappen) requires the following steps in order:${colors.reset}\n`);

  const steps = [
    {
      title: '1. Firebase Authentication',
      desc: 'Open Firebase Console → Authentication → Get Started → Enable Anonymous sign-in.',
    },
    {
      title: '2. Firebase Storage & IAM',
      desc: 'Create default bucket in europe-north1. Grant roles/firebaserules.firestoreServiceAgent to the Firebase Storage service agent (so Storage rules can inspect Firestore vaults).',
    },
    {
      title: '3. Backend Deployment & Artifact Lifecycle',
      desc: 'Deploy rules and functions:\n   npx firebase-tools deploy --only firestore,storage,functions --project prod\n   Set container cleanup policy: functions:artifacts:setpolicy',
    },
    {
      title: '4. Functions App Check IAM',
      desc: 'Grant roles/firebaseappcheck.tokenVerifier to the Functions service account (needed to verify and consume one-time tokens).',
    },
    {
      title: '5. App Check Attestation Registration',
      desc: 'In Firebase Console → App Check:\n   • iOS: Register App Attest (requires Apple Team ID).\n   • Android: Register Play Integrity (link Google Play Console with SHA-256 fingerprint).',
    },
    {
      title: '6. App Check Enforcement',
      desc: 'Enforce App Check for Firestore and Storage ONLY after a production release build has successfully connected. (Enforcing earlier locks all users out).',
    },
    {
      title: '7. Vertex AI (Room Analysis)',
      desc: 'Enable Vertex AI API and grant roles/aiplatform.user to Functions service account. Verify Gemini models in europe-north1 and ensure prompt caching/logging is disabled.',
    },
  ];

  for (const step of steps) {
    console.log(`  ${colors.bold}${step.title}${colors.reset}`);
    const indented = step.desc
      .split('\n')
      .map((l) => `     ${colors.dim}${l}${colors.reset}`)
      .join('\n');
    console.log(indented);
  }

  console.log(`${colors.bold}${colors.cyan}══════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

// -------------------------------------------------------------
// Main execution
// -------------------------------------------------------------
function main() {
  console.log(`${colors.bold}🚀 Egenberedskapsappen Pre-flight Verification${colors.reset}`);
  console.log(`${colors.gray}Verifying repository state, configurations, and test suites...${colors.reset}`);

  checkNodeVersion();
  checkDevEnvironment();
  checkFirebaseAliases();
  checkAppConfigIntegrity();
  runVerificationSuites();

  header('Summary');
  if (failures > 0) {
    console.log(
      `\n  ${symbols.cross} ${colors.bold}${colors.red}Pre-flight verification FAILED with ${failures} failure(s)${colors.reset} and ${warnings} warning(s).\n`
    );
    process.exit(1);
  }

  const warnMsg = warnings > 0 ? ` (${warnings} warning${warnings > 1 ? 's' : ''})` : '';
  console.log(
    `\n  ${symbols.check} ${colors.bold}${colors.green}All automated pre-flight checks PASSED!${colors.reset}${warnMsg}\n`
  );

  printManualChecklist();
  process.exit(0);
}

main();
