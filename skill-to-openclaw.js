#!/usr/bin/env node

/**
 * Skill → OpenClaw Skill Converter
 * 
 * Converts Claude Code skills to OpenClaw skill format.
 * Supports local paths and GitHub repos.
 * 
 * Usage:
 *   skill-to-openclaw <source> [options]
 * 
 * Options:
 *   -n, --name <name>      Output skill name (default: auto-detected)
 *   -f, --force            Overwrite existing skill
 *   -d, --dry-run          Show what would be done without writing
 *   -h, --help             Show this help
 * 
 * Examples:
 *   skill-to-openclaw ./my-skill
 *   skill-to-openclaw https://github.com/user/repo
 *   skill-to-openclaw user/repo --name my-skill
 *   skill-to-openclaw user/repo --dry-run
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const SKILLS_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'skills');
const CLI_NAME = 'skill-to-openclaw';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function info(msg) { log(msg, 'cyan'); }
function success(msg) { log(msg, 'green'); }
function warn(msg) { log(msg, 'yellow'); }
function error(msg) { log(msg, 'red'); }
function dim(msg) { log(msg, 'dim'); }

// Parse frontmatter from SKILL.md
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { name: null, description: '', triggers: [], metadata: {} };
  
  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*"?([^"\n]+)"?/m);
  const descMatch = frontmatter.match(/^description:\s*"?([^"\n]+)"?/m);
  
  // Extract triggers from description (everything after "Triggers on")
  let triggers = [];
  if (descMatch) {
    const desc = descMatch[1];
    const triggersMatch = desc.match(/Triggers? on[:\s]+(.+?)(?:\.|$)/i);
    if (triggersMatch) {
      triggers = triggersMatch[1].split(/[,;]/).map(t => t.trim().toLowerCase()).filter(Boolean);
    }
  }
  
  // Extract any metadata block
  let metadata = {};
  const metadataMatch = frontmatter.match(/metadata:\s*([\s\S]*?)(?=\n---|$)/);
  if (metadataMatch) {
    try {
      metadata = JSON.parse(metadataMatch[1].replace(/^\s+/m, ''));
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  return {
    name: nameMatch ? nameMatch[1].trim() : null,
    description: descMatch ? descMatch[1].replace(/Triggers? on[:\s]+.+?(\.|$)/i, '').trim() : '',
    triggers,
    metadata
  };
}

// Convert to OpenClaw SKILL.md format
function convertToOpenClaw(skillName, frontmatter, originalContent) {
  const triggersText = frontmatter.triggers.length > 0 
    ? `\nTriggers: ${frontmatter.triggers.join(', ')}` 
    : '';
  
  return `---
description: ${frontmatter.description}${triggersText}
---

# ${skillName}

Converted from Claude Code skill.

---

## Original Instructions

${originalContent.replace(/^---[\s\S]*?---\n/, '').trim()}

---

*Converted by ${CLI_NAME}*`;
}

// Extract repo info from various GitHub URL formats
function parseGitHubUrl(input) {
  // Already a full URL
  if (input.startsWith('http')) {
    // GitHub raw file
    if (input.includes('raw.githubusercontent.com')) {
      const match = input.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)/);
      if (match) {
        return { owner: match[1], repo: match[2], path: match[3], isRaw: true };
      }
    }
    
    // GitHub tree/folder URL
    const treeMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)/);
    if (treeMatch) {
      return { owner: treeMatch[1], repo: treeMatch[2], branch: treeMatch[3], path: treeMatch[4], isTree: true };
    }
    
    // Simple repo URL
    const repoMatch = input.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (repoMatch) {
      return { owner: repoMatch[1], repo: repoMatch[2] };
    }
  }
  
  // Short format: owner/repo or owner/repo/path
  const shortMatch = input.match(/^([^\/]+)\/([^\/]+)(?:\/(.+))?$/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2], path: shortMatch[3] };
  }
  
  return null;
}

// Find SKILL.md in a directory
function findSkillMd(dir) {
  const possiblePaths = [
    path.join(dir, 'SKILL.md'),
    path.join(dir, 'skill', 'SKILL.md'),
    path.join(dir, 'skills', path.basename(dir), 'SKILL.md'),
  ];
  
  let found = possiblePaths.find(p => fs.existsSync(p));
  
  if (!found) {
    try {
      const files = execSync(`find "${dir}" -maxdepth 4 -name "SKILL.md" 2>/dev/null | head -5`, { encoding: 'utf8' });
      const lines = files.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        found = lines[0];
      }
    } catch (e) {
      // Ignore
    }
  }
  
  return found;
}

// Main converter
async function convert(source, options = {}) {
  const { name: outputName, force, dryRun } = options;
  
  info(`🔄 Converting: ${source}`);
  
  let tempDir = null;
  let skillDir = source;
  let isTempClone = false;
  
  try {
    // Handle GitHub sources
    const ghInfo = parseGitHubUrl(source);
    
    if (ghInfo) {
      tempDir = `/tmp/${CLI_NAME}-${Date.now()}`;
      isTempClone = true;
      
      if (ghInfo.isRaw) {
        // Raw file - download directly
        info(`📥 Downloading raw SKILL.md...`);
        const rawUrl = `https://raw.githubusercontent.com/${ghInfo.owner}/${ghInfo.repo}/${ghInfo.path}`;
        execSync(`curl -sL "${rawUrl}" -o "${tempDir}/SKILL.md"`, { stdio: 'inherit' });
        fs.mkdirSync(tempDir, { recursive: true });
      } else {
        // Clone repo
        info(`📦 Cloning ${ghInfo.owner}/${ghInfo.repo}...`);
        const repoUrl = `https://github.com/${ghInfo.owner}/${ghInfo.repo}.git`;
        
        try {
          execSync(`git clone --depth 1 ${repoUrl} "${tempDir}"`, { stdio: 'pipe' });
        } catch (e) {
          error(`Failed to clone repository`);
          process.exit(1);
        }
        
        // If path specified, navigate to subdirectory
        if (ghInfo.path) {
          tempDir = path.join(tempDir, ghInfo.path);
        }
      }
      
      skillDir = tempDir;
    } else {
      // Local path - verify it exists
      if (!fs.existsSync(source)) {
        error(`Source path does not exist: ${source}`);
        process.exit(1);
      }
      
      const stat = fs.statSync(source);
      if (stat.isDirectory()) {
        skillDir = source;
      } else {
        // It's a file - use its directory
        skillDir = path.dirname(source);
      }
    }
    
    // Find SKILL.md
    const skillMdPath = findSkillMd(skillDir);
    
    if (!skillMdPath) {
      error(`No SKILL.md found in: ${skillDir}`);
      process.exit(1);
    }
    
    dim(`📄 Found: ${path.relative(skillDir, skillMdPath)}`);
    
    // Read and parse
    const content = fs.readFileSync(skillMdPath, 'utf8');
    const frontmatter = parseFrontmatter(content);
    
    // Determine skill name
    const skillName = outputName || frontmatter.name || path.basename(skillDir).replace(/[_-]/g, '-');
    
    // Show what we found
    log(`\n${colors.bright}✨ Skill: ${colors.green}${skillName}${colors.reset}`);
    dim(`📝 ${frontmatter.description?.slice(0, 80) || 'No description'}${frontmatter.description?.length > 80 ? '...' : ''}`);
    if (frontmatter.triggers.length > 0) {
      dim(`🏷️  Triggers: ${frontmatter.triggers.join(', ')}`);
    }
    
    // Check for existing skill
    const outDir = path.join(SKILLS_DIR, skillName);
    const exists = fs.existsSync(outDir);
    
    if (exists && !force) {
      warn(`Skill "${skillName}" already exists at: ${outDir}`);
      warn(`Use --force to overwrite`);
      process.exit(1);
    }
    
    if (dryRun) {
      warn(`\n🔍 Dry run - nothing written`);
      return;
    }
    
    // Create output
    if (exists) {
      warn(`⚠️  Backing up existing skill...`);
      execSync(`mv "${outDir}" "${outDir}.bak-${Date.now()}"`);
    }
    
    fs.mkdirSync(outDir, { recursive: true });
    
    // Copy skill files
    const skillSrcDir = path.dirname(skillMdPath);
    execSync(`cp -r "${skillSrcDir}"/* "${outDir}"/`);
    
    // Write converted SKILL.md
    const converted = convertToOpenClaw(skillName, frontmatter, content);
    fs.writeFileSync(path.join(outDir, 'SKILL.md'), converted);
    
    // Count files
    const files = execSync(`ls -1 "${outDir}"`).toString().trim().split('\n').length;
    
    success(`\n✅ Saved to: ${outDir}`);
    dim(`   ${files} file(s)`);
    log(`\n🎉 Skill "${skillName}" ready!`);
    log(`   Restart OpenClaw or run: openclaw skills sync`);
    
  } finally {
    // Cleanup temp
    if (tempDir && isTempClone) {
      try {
        execSync(`rm -rf "${tempDir}"`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

// Show help
function showHelp() {
  console.log(`
${colors.bright}Skill → OpenClaw Skill Converter${colors.reset}

${colors.cyan}Usage:${colors.reset}
  ${CLI_NAME} <source> [options]

${colors.cyan}Arguments:${colors.reset}
  source                  Local path, GitHub repo (owner/repo), or URL

${colors.cyan}Options:${colors.reset}
  -n, --name <name>      Output skill name (default: auto-detected)
  -f, --force            Overwrite existing skill
  -d, --dry-run          Show what would be done without writing
  -h, --help             Show this help

${colors.cyan}Examples:${colors.reset}
  # From local path
  ${CLI_NAME} ./my-claude-skill

  # From GitHub
  ${CLI_NAME} ParthJadhav/app-store-screenshots
  ${CLI_NAME} https://github.com/ParthJadhav/app-store-screenshots

  # With custom name
  ${CLI_NAME} user/repo --name my-awesome-skill

  # Dry run to preview
  ${CLI_NAME} user/repo --dry-run
`.replace(/^  /gm, ''));
}

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  const sources = [];
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '-h':
      case '--help':
        showHelp();
        process.exit(0);
        
      case '-n':
      case '--name':
        options.name = args[++i];
        break;
        
      case '-f':
      case '--force':
        options.force = true;
        break;
        
      case '-d':
      case '--dry-run':
        options.dryRun = true;
        break;
        
      default:
        sources.push(arg);
    }
  }
  
  if (sources.length === 0) {
    error('Missing source argument');
    console.log(`\nRun: ${CLI_NAME} --help`);
    process.exit(1);
  }
  
  return { source: sources[0], options };
}

// Main
const { source, options } = parseArgs();
convert(source, options).catch(err => {
  error(`Error: ${err.message}`);
  process.exit(1);
});
