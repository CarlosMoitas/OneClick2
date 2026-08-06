const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const indexPath = path.join(projectRoot, 'src', 'index.html');
const localIndexPath = path.join(projectRoot, 'mocks', '_index.html');
const angularJsonPath = path.join(projectRoot, 'angular.json');
const originalIndex = readFileSync(indexPath, 'utf8');
const originalAngularJson = readFileSync(angularJsonPath, 'utf8');

function convertStaticToRelative(html) {
  return html
    .replaceAll('https://static.bradesco.com.br/dsysliquid/', '/dsysliquid/')
    .replaceAll('http://static.bradesco.com.br/dsysliquid/', '/dsysliquid/');
}

function applyLocalRewrite() {
  const rewritten = convertStaticToRelative(originalIndex);

  writeFileSync(localIndexPath, rewritten, 'utf8');
  console.log('[INFO] Arquivo mocks/_index.html criado para uso local.');

  if (rewritten === originalIndex) {
    console.log('[INFO] Nenhuma URL de dsysliquid com dominio static foi encontrada no index.');
  } else {
    console.log('[INFO] URLs de dsysliquid convertidas para relativas no mocks/_index.html durante o ng serve.');
  }
}

function applyAngularIndexOverride() {
  const angularJson = JSON.parse(originalAngularJson);
  const project = angularJson.projects?.['fed-node-npm-template'];
  const development = project?.architect?.build?.configurations?.development;

  if (!project || !development) {
    throw new Error('Estrutura esperada do angular.json não encontrada para aplicar index local.');
  }

  development.index = 'mocks/_index.html';
  writeFileSync(angularJsonPath, JSON.stringify(angularJson, null, 2), 'utf8');
  console.log('[INFO] angular.json configurado temporariamente para usar mocks/_index.html em build:development.');
}

try {
  applyLocalRewrite();
  applyAngularIndexOverride();
} catch (error) {
  console.error('[ERROR] Falha ao preparar prestart:', error.message);
  process.exit(1);
}
