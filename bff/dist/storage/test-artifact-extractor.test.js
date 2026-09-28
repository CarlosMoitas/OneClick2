"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const artifact_extractor_1 = require("./artifact-extractor");
async function runTest() {
    try {
        // Path para o arquivo ZIP teste - ajuste para apontar para um artefato real existente
        // Caminho direto para seu artefato real, conforme instrução fornecida
        const zipPath = 'C:/Users/candremo/Downloads/2801925.zip';
        if (!fs_1.default.existsSync(zipPath)) {
            console.error('Arquivo ZIP de teste não encontrado no caminho:', zipPath);
            process.exit(1);
        }
        const buffer = fs_1.default.readFileSync(zipPath);
        const info = (0, artifact_extractor_1.extractAccountInfoFromZip)(buffer);
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
    }
    catch (error) {
        console.error('Erro ao executar teste:', error);
        process.exit(1);
    }
}
runTest();
//# sourceMappingURL=test-artifact-extractor.test.js.map