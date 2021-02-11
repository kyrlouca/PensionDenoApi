import * as path from 'https://deno.land/std@0.86.0/path/mod.ts';
import {Path, WINDOWS_SEPS} from "https://deno.land/x/path/mod.ts";
// import { copy } from "https://deno.land/std/fs/mod.ts";
import getFiles, {
  exists,
  fileExt,
  trimPath,
  fmtFileSize,
} from 'https://deno.land/x/getfiles/mod.ts';
import { readJson, readJsonSync } from 'https://deno.land/x/jsonfile/mod.ts';
import {
  Application,
  Context,
  HandlerFunc,
} from 'https://deno.land/x/abc@v1.2.4/mod.ts';

import {
  download as donwloadFile,
  Destination,
  DownlodedFile,
} from 'https://deno.land/x/download/mod.ts';
const app = new Application();

const filesData = {
  excelFolder: '',
  num: 3,
};

async function justCopy(source: string, destination: string): Promise<void> {
  // We use browser fetch API
  //`C:\Users\kyrlo\OneDrive\Documents\PENSION DSIS\My Testing\xbrlFiles\DSIS_0007_qri_2020_1_2021-02-05-200025.xbrl`;

  const filex = await Deno.open(source);
  const decoder = new TextDecoder('utf-8');
  const textF = decoder.decode(await Deno.readAll(filex));

  const nf2 = await Deno.open(destination, { write: true, create: true });
  await Deno.write(nf2.rid, new TextEncoder().encode(textF));
  nf2.close;
}

console.log('http://localhost:8080/');
console.log('hello');
console.log('abc');

app.use((next) => async (c) => {
  c.set('Name', 'Mu Shan');
  const __filename = new URL('', import.meta.url).pathname;
  const __dirname = new URL('.', import.meta.url).pathname;
  const filename = `${__dirname}ConfigData.json`;
  const filenamex = filename.slice(1);
  const jsonObj: any = await readJson(filenamex);
  filesData.excelFolder = jsonObj['OutputXbrlFolder'];
  return next(c);
});

const validateDocument: HandlerFunc = async (c) => {
  const { fundId = 0, documentId = 0 } = c.queryParams;
  if (fundId == 0 || documentId == 0) {
    console.log('Validation Arguments: fundId, documentId');
    return;
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      'C:\\Users\\kyrlo\\soft\\DbTest\\ValidationsZ.exe',
      `${fundId}`,
      `${documentId}`,
    ],
  });
  p.close;
  return documentId;
};
const deleteDocument: HandlerFunc = async (c) => {
  const { documentId = 0 } = c.queryParams;
  if (documentId == 0) {
    console.log('DeleteDocumentData Arguments: documentId');
    return;
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      'C:\\Users\\kyrlo\\soft\\DbTest\\DeleteDocumentData.exe',
      `${documentId}`,
    ],
  });
  return `${documentId}`;
};

const aggregate: HandlerFunc = async (c) => {
  // Arguments: UserId, ModuleCode, year, quarter)
  const { userId = 0, moduleCode = '', year = 0, quarter = 0 } = c.queryParams;
  if (userId == 0 || moduleCode == '' || year == 0) {
    console.log('aggregate Arguments: UserId, ModuleCode, year, quarter)');
    return;
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      'C:\\Users\\kyrlo\\soft\\DbTest\\Aggregates.exe',
      `${userId}`,
      `${moduleCode}`,
      `${year}`,
      `${quarter}`,
    ],
  });
  return `${moduleCode}`;
};

const downloadXbrl: HandlerFunc = async (ctx: Context) => {
  //pass the document id and the filepath 
  //deno requires that the filePath must be under /public
  // the name of the file  should be unique but also have some meaning because
  // it will be used to zip and send to eipa 
  // ex:  DSIS_quid_0007_qri_2020_1_2021-02-05-200025.xbrl fundId, module, year, month, date 
  
  const { documentId = 0, fileName = '' } = ctx.queryParams;
  if (documentId == 0) {
    console.log('downloadXbrlFile Arguments: documentId');
    return;
  }
const fpath = new Path(fileName);

//const x=await Deno.base

  if (fileName) {
    const p = await Deno.run({
      cmd: [
        'cmd',
        '/c',
        'C:\\Users\\kyrlo\\soft\\DbTest\\XbrlWriterZ.exe',
        `${documentId}`,
        `${fileName}`,
      ],
    });
  } else {
    const p = await Deno.run({
      cmd: [
        'cmd',
        '/c',
        'C:\\Users\\kyrlo\\soft\\DbTest\\XbrlWriterZ.exe',
        `${documentId}`,
      ],
    });
  }

  const fileBuf = await Deno.readFile(fileName);
  ctx.response.headers.set('Content-Type', 'application/octet-stream');
  ctx.response.headers.set(
    'Content-Disposition',
    `attachment;filename=${fileName}`
  );
  return fileBuf;
};

const copyfile = async (sourceName: string, destName: string) => {
  const __dirname = new URL('.', import.meta.url).pathname;

  // sourceName = `DSIS_0007_qri_2020_1_2021-02-05-200025.xbrl`;
  var sourcePath = path.join(filesData.excelFolder, sourceName);

  // destName = `abcd.xbrl`;
  const root = __dirname.slice(1);
  const destPath = path.join(root, 'public', destName);

  try {
    const sourceFile = await Deno.open(sourcePath);
    const decoder = new TextDecoder('utf-8');
    const textF = decoder.decode(await Deno.readAll(sourceFile));

    const destFile = await Deno.open(destPath, { write: true, create: true });
    await Deno.write(destFile.rid, new TextEncoder().encode(textF));
    destFile.close;
  } catch (error) {
    console.log(error);
  }
};

const fetchFile: HandlerFunc = async (ctx: Context) => {
  //download a file  from local storage to the browser
  //first we need to copy the file in pulic which is under the root
  var s2 = path.join(
    filesData.excelFolder,
    `DSIS_0007_qri_2020_1_2021-02-05-200025.xbrl`
  );
  await copyfile('ab', 'cd');

  const fileBuf = await Deno.readFile('./public/DSIS_ari.xbrl');
  ctx.response.headers.set('Content-Type', 'application/octet-stream');
  ctx.response.headers.set(
    'Content-Disposition',
    'attachment;filename=somefile.xbrl'
  );
  return fileBuf;
};

app
  .get('/', () => {
    return 'root';
  })
  .get('/test', fetchFile)
  .get('/delete', deleteDocument)
  .get('/validate', validateDocument)
  .get('/aggregate', aggregate)
  .get('/downloadXbrl', downloadXbrl)
  .file('/show', 'public/index.html')
  .static('/test', './public') //this is required to make a folder accessible
  .start({ port: 8000 });

export {};
