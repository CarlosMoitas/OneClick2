import * as fs from 'fs';
import AdmZip from 'adm-zip';
import { extractAccountInfoFromZip } from './artifact-extractor';

const logContent = fs.readFileSync(
  __dirname + '/tmp-datapool.log',
  'utf8',
);
const zip = new AdmZip();
zip.addFile(
  'Job_2801925_Data_Pool_Abertura de Conta Corrente PF_TI2.log',
  Buffer.from(logContent, 'utf8'),
);
const buf = zip.toBuffer();
const result = extractAccountInfoFromZip(buf, '2801925');
console.log(JSON.stringify(result, null, 2));
