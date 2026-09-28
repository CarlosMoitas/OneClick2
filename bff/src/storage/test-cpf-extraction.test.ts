
import AdmZip from 'adm-zip';
import { extractAccountInfoFromZip } from './artifact-extractor';

describe('extractAccountInfoFromZip CPF extraction logic', () => {
  interface Case {
    name: string;
    jobId: string;
    ccgc?: string;
    cctrl?: string;
    expectedCpf?: string;
    sepStyle?: 'tab' | 'spaces';
  }

  function buildDataPoolLog(ccgc?: string, cctrl?: string, sepStyle: 'tab' | 'spaces' = 'tab'): string {
    const sep = sepStyle === 'tab' ? '\t' : '    ';
    const header =
      'Storing column values\n' +
      'Requested column values stored\n\n' +
      'Table                         \tColumn                         \tRow  \tValue\n' +
      '------                         \t-----                         \t----- \t--- \n';

    let body = '';
    if (ccgc !== undefined) {
      body +=
        header +
        `CLIENTE_AGENCIA               ${sep}CCGC_CPF                      ${sep}1${sep}${ccgc}\n\n\n`;
    }
    if (cctrl !== undefined) {
      body +=
        'Storing column values\n' +
        'Requested column values stored\n\n' +
        'Table                         \tColumn                         \tRow  \tValue\n' +
        '------                         \t-----                         \t----- \t--- \n' +
        `CLIENTE_AGENCIA               ${sep}CCTRL_CPF_CGC                 ${sep}1${sep}${cctrl}\n\n\n`;
    }
    body += 'Storing column values\nRequested column values stored\n\n';
    return body;
  }

  function buildZip(jobId: string, ccgc?: string, cctrl?: string, sepStyle: 'tab' | 'spaces' = 'tab'): Buffer {
    const zip = new AdmZip();
    const logName = `Job_${jobId}_Data_Pool_Abertura de Conta Corrente PF_TI2.log`;
    const content = buildDataPoolLog(ccgc, cctrl, sepStyle);
    zip.addFile(logName, Buffer.from(content, 'utf8'));
    return zip.toBuffer();
  }

  const cases: Case[] = [
    { name: 'Normal - exemplo do enunciado (47221438 + 11)', jobId: '9000001', ccgc: '47221438', cctrl: '11', expectedCpf: '04722143811' },
    { name: 'Boundary - CCGC_CPF com 9 dígitos, CCTRL_CPF_CGC com 2 dígitos (sem padding)', jobId: '9000002', ccgc: '458532246', cctrl: '97', expectedCpf: '45853224697' },
    { name: 'Boundary - CCTRL_CPF_CGC com 1 dígito (1 -> 01)', jobId: '9000003', ccgc: '123456789', cctrl: '1', expectedCpf: '12345678901' },
    { name: 'Boundary - CCTRL_CPF_CGC = 0 (0 -> 00)', jobId: '9000004', ccgc: '123456789', cctrl: '0', expectedCpf: '12345678900' },
    { name: 'Boundary - CCGC_CPF com 1 dígito (1 -> 000000001)', jobId: '9000005', ccgc: '1', cctrl: '11', expectedCpf: '00000000111' },
    { name: 'Anti-hardcoding - separador com espaços múltiplos em vez de TAB', jobId: '9000006', ccgc: '47221438', cctrl: '11', expectedCpf: '04722143811', sepStyle: 'spaces' },
    { name: 'Anti-hardcoding - valores diferentes (99988877 + 22)', jobId: '9000007', ccgc: '99988877', cctrl: '22', expectedCpf: '09998887722' },
    { name: 'Invalid - CCGC_CPF ausente', jobId: '9000008', ccgc: undefined, cctrl: '11', expectedCpf: undefined },
    { name: 'Invalid - CCTRL_CPF_CGC ausente', jobId: '9000009', ccgc: '47221438', cctrl: undefined, expectedCpf: undefined },
    { name: 'Invalid - ambos ausentes', jobId: '9000010', ccgc: undefined, cctrl: undefined, expectedCpf: undefined },
  ];

  cases.forEach((c) => {
    test(c.name, () => {
      const zipBuffer = buildZip(c.jobId, c.ccgc, c.cctrl, c.sepStyle);
      const result = extractAccountInfoFromZip(zipBuffer, c.jobId);

      if (c.expectedCpf === undefined) {
        expect(result.cpfCliente).toBeUndefined();
      } else {
        expect(result.cpfCliente).toBe(c.expectedCpf);
      }
    });
  });
});
