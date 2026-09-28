import fs from 'fs';
import { extractAccountInfoFromZip } from './artifact-extractor';

async function runTest() {
  try {
    // Path para o arquivo ZIP teste - ajuste para apontar para um artefato real existente
    // Caminho direto para seu artefato real, conforme instrução fornecida
    const zipPath = 'C:/Users/candremo/Downloads/2801925.zip';

    if (!fs.existsSync(zipPath)) {
      console.error('Arquivo ZIP de teste não encontrado no caminho:', zipPath);
      process.exit(1);
    }

    const buffer = fs.readFileSync(zipPath);
    const info = extractAccountInfoFromZip(buffer);

    console.log('Resultado da extração do artefato .zip:');
    console.log('Agência:', info.agencia);
    console.log('Conta:', info.conta);
    console.log('CPF Cliente:', info.cpfCliente ?? 'indisponível');
    console.log('Motivo:', info.reason ?? 'Nenhum');

    if (!info.cpfCliente) {
      console.error('Falha: CPF Cliente não extraído do artefato.');
      process.exit(1);
    }

    console.log('Teste finalizado com sucesso, CPF extraído corretamente.');
  } catch (error) {
    console.error('Erro ao executar teste:', error);
    process.exit(1);
  }
}

runTest();
