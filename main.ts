import * as path from 'https://deno.land/std@0.86.0/path/mod.ts';
import { Path, WINDOWS_SEPS } from 'https://deno.land/x/path/mod.ts';
import { exists as fexists } from 'https://deno.land/std@0.86.0/fs/mod.ts';
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
  // aWe use browser fetch API
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

  const { documentId = 0, filename = '' } = ctx.queryParams;
  if (!documentId) {
    console.log('downloadXbrlFile Arguments (api): documentId');
    return;
  }
  if (!filename) {
    //user did not specified filename. It's ok.
    //Console program will create file in XbrlFolder in configdata.json
    const p = await Deno.run({
      cmd: [
        'cmd',
        '/c',
        'C:\\Users\\kyrlo\\soft\\DbTest\\XbrlWriterZ.exe',
        `${documentId}`,
      ],
    });
    return;
  }


  if (filename) {
    try {
      const dir = path.dirname(filename);
      const direxists = await fexists(dir);
      if (!direxists) {
        console.log(`directory :${dir} does not EXIST`);
        return;
      }
    } catch (e) {
      console.log(e);
    }
  }

  
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      'C:\\Users\\kyrlo\\soft\\DbTest\\XbrlWriterZ.exe',
      `${documentId}`,
      `${filename}`,
    ],
  });

  const fileCreated = await fexists(filename);
  if (!fileCreated) {
    console.log(`File was not created. file:${filename}`);
    return;
  }

  const fileBuf = await Deno.readFile(filename);
  if (!fileBuf) {
    console.log(`File was not created. file:${filename}`);
    return;
  }

  ctx.response.headers.set('Content-Type', 'application/octet-stream');
  ctx.response.headers.set(
    'Content-Disposition',
    `attachment;filename=${filename}`
  );
  return fileBuf;
};


const uploadExcel: HandlerFunc = async (ctx: Context) => {
  //pass  filePath, fundId, userId, module, year, quarter
  //http://localhost:8000/uploadExcel?filename=C:\Users\kyrlo\OneDrive\Documents\PENSION%20DSIS\My%20Testing\UserExcel\AXI_Anual_Exempted_L6.xlsx&fundId=9&userId=19&module=axi&year=2020&quarter=2

  const {  filename = '',fundId=0,userId=0,module='',year=0,quarter=-1 } = ctx.queryParams;
  
  if (!filename || !fundId || !userId || !module || !year || quarter==-1 ){
    console.log('uploadExcel arguments: filePath, fundId, userId, module, year, quarter')
    return;
  }
  
 
    try {
      
      const isFileExists = await fexists(filename);
      if (!isFileExists) {
        console.log(`File does NOT exist`)
        console.log(`file :${filename} `);
        return;
      }
    } catch (e) {
      console.log(e);
    }  

  
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      'C:\\Users\\kyrlo\\soft\\DbTest\\DataOperationsZ.exe',
      `${filename}`,
      `${fundId}`,
      `${userId}`,
      `${module}`,
      `${year}`,
      `${quarter}`,
    ],
  });

  
  
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
  .get('/uploadExcel', uploadExcel)
  .file('/show', 'public/index.html')
  .static('/test', './public') //this is required to make a folder accessible
  .start({ port: 8000 });

export {};
