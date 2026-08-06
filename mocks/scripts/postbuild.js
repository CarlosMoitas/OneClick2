const { readFileSync, writeFileSync } = require('fs');
const { version } = require('../../package.json');

function fillVersion(original) {
  const filled = original.replaceAll('[[VERSION]]', version);
  console.log(`[INFO] Versao preenchida no index.html [ ${version} ]`);
  return filled;
}

function keepOnlyLines(match) {
  return match.replace(/[^\n]/g, '');
}

function stripIndexComments(original) {
  let stripped = original.replace(/\s*<!--.*?-->\s*?\n/gs, keepOnlyLines);
  stripped = stripped.replace(/\s*\/\*.*?\*\/\s*?\n/gs, keepOnlyLines);
  stripped = stripped.replace(/^[ \t]*\/\/.*$/gm, keepOnlyLines);
  console.log('[INFO] Comentarios retirados do index.html.');
  return stripped;
}

try {
  const index = 'dist/index.html';
  const encoding = 'utf8';
  let content = readFileSync(index, encoding);
  content = fillVersion(content);
  content = stripIndexComments(content);
  writeFileSync(index, content, encoding);
} catch (error) {
  console.warn('[WARN] Erro ao alterar index.html. Conteudo original mantido.');
  console.error(error);
}
