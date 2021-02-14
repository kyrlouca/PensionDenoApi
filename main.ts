import * as path from 'https://deno.land/std@0.86.0/path/mod.ts';
import { Path, WINDOWS_SEPS } from 'https://deno.land/x/path/mod.ts';
import { delay } from 'https://deno.land/x/delay@v0.2.0/mod.ts';
import {
  exists as fexists,
  existsSync,
  existsSync as sexists,
} from 'https://deno.land/std@0.86.0/fs/mod.ts';
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
  execFolder: '',
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

console.log('PensionDenoApi started=> http://localhost:8080/');

app.use((next) => async (c) => {
  c.set('Name', 'Mu Shan');

  const __filename = new URL('', import.meta.url).pathname;
  // const __dirname = new URL('.', import.meta.url).pathname;
  const __dirname = Deno.cwd();
  const filename = path.join(__dirname, 'ConfigData.json');
  const jsonObj: any = await readJson(filename);
  filesData.excelFolder = jsonObj['OutputXbrlFolder'];
  filesData.execFolder = jsonObj['ExecFolder'];
  return next(c);
});

const validateDocument: HandlerFunc = async (c) => {
  //http://localhost:8000/validate?documentId=3838&fundId=7

  const { fundId = 0, documentId = 0 } = c.queryParams;
  if (fundId == 0 || documentId == 0) {
    console.log('Validation Arguments: fundId, documentId');
    return `Failed Validation: Arguments: fundId, documentId`;
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      path.join(filesData.execFolder, 'ValidationsZ.exe'),
      `${fundId}`,
      `${documentId}`,
    ],
  });
  p.close;
  return `Validated document: ${documentId}`;
};
const deleteDocument: HandlerFunc = async (c) => {
  //http://localhost:8000/delete?documentId=3811
  const { documentId = 0 } = c.queryParams;
  if (documentId == 0) {
    console.log('DeleteDocumentData Arguments: documentId');
    return 'Failed deleteDocument. Arguments: documentId';
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      path.join(filesData.execFolder, 'DeleteDocumentData.exe'),
      `${documentId}`,
    ],
  });
  return `Deleted DocumentId:${documentId}`;
};

const aggregate: HandlerFunc = async (c) => {
  // Arguments: UserId, ModuleCode, year, quarter
  //http://localhost:8000/aggregate?userId=4&moduleCode=qra&year=2020&quarter=3
  const { userId = 0, moduleCode = '', year = 0, quarter = 0 } = c.queryParams;
  if (userId == 0 || moduleCode == '' || year == 0) {
    console.log('aggregate Arguments: UserId, ModuleCode, year, quarter');
    return `Failed: aggregate Arguments: UserId, ModuleCode, year, quarter`;
  }
  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      path.join(filesData.execFolder, 'Aggregates.exe'),
      `${userId}`,
      `${moduleCode}`,
      `${year}`,
      `${quarter}`,
    ],
  });
  return `Finished aggregation for module: ${moduleCode} year:${year} quarter ${quarter}`;
};

const downloadXbrl: HandlerFunc = async (ctx: Context) => {
  //http://localhost:8000/downloadXbrl?documentId=3838&filename=C:\Users\kyrlo\soft\DbTest\public\babamaba7.xbrl
  //pass the document id and the filepath
  //the program will first create the xbrl in the filename provided and then pass it as an attachement
  //deno requires that the filePath must be under /public
  // the name of the file  should be unique but also have some meaning because
  // it will be used to zip and send to eipa
  // ex:  DSIS_quid_0007_qri_2020_1_2021-02-05-200025.xbrl fundId, module, year, month, date

  const { documentId = 0, filename = '' } = ctx.queryParams;
  if (!documentId) {
    console.log('downloadXbrlFile Arguments (api): documentId fullfilepath');
    return `Failed downloadXbrl: Arguments :documentId`;
  }
  if (!filename) {
    //user did not specified filename. It's ok.
    //Console program will create file in XbrlFolder in configdata.json
    const p = await Deno.run({
      cmd: [
        'cmd',
        '/c',
        path.join(filesData.execFolder, 'XbrlWriterZ.exe'),
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
      return `failed to find Folder for ${filename}`;
    }
  }

  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      path.join(filesData.execFolder, 'XbrlWriterZ.exe'),
      `${documentId}`,
      `${filename}`,
    ],
  });

  //give it some time to create the file

  // setTimeout(
  //   async (ctx, filename) => {
  //     const fileCreated = sexists(filename);
  //     if (!fileCreated) {
  //       console.log(`vvvvXbrl File was not created. file:${filename}`);
  //       return `vvvvXbrl File was not created. file:${filename}`;
  //     } else {
  //       console.log(`yyycreated. file:${filename}`);
  //       const fileBuf =  Deno.readFileSync(filename);
  //       if (!fileBuf) {
  //         console.log(`fff Xbrl File was not created. file:${filename}`);
  //         return `fff Xbrl File was not created. file:${filename}`;
  //       }
  //       const ff=path.basename(filename);
  //       ctx.response.headers.set('Content-Type', 'application/octet-stream');
  //       ctx.response.headers.set(
  //         'Content-Disposition',
  //         `attachment;filename=${ff}`
  //       );
  //       return fileBuf;
  //     }
  //   },
  //   4000,
  //   ctx,
  //   filename
  // );

  const t1 = new Date();
  // await delay(6000);
  let diff=0;  
  let fileCreated = false;
  while (!fileCreated && diff < 9000) {
    fileCreated = existsSync(filename);
    const t2 = new Date();
    diff = t2.getTime() - t1.getTime();    
  }
  console.log(`loading:${diff}`);
  fileCreated = existsSync(filename);
  if (!fileCreated) {
    console.log(`Xbrl File was not created. file:${filename}`);
    return `Xbrl File was not created. file:${filename}`;
  }

  const fileBuf = Deno.readFileSync(filename);
  if (!fileBuf) {
    console.log(`Xbrl File was not created. file:${filename}`);
    return `Xbrl File was not created. file:${filename}`;
  }
  const ff = path.basename(filename);
  ctx.response.headers.set('Content-Type', 'application/octet-stream');
  ctx.response.headers.set('Content-Disposition', `attachment;filename=${ff}`);
  return fileBuf;
};

const uploadExcel: HandlerFunc = async (ctx: Context) => {
  //pass  filePath, fundId, userId, module, year, quarter
  //http://localhost:8000/uploadExcel?filename=C:\Users\kyrlo\OneDrive\Documents\PENSION%20DSIS\My%20Testing\UserExcel\AXI_Anual_Exempted_L6.xlsx&fundId=9&userId=19&module=axi&year=2020&quarter=2

  const {
    filename = '',
    fundId = 0,
    userId = 0,
    module = '',
    year = 0,
    quarter = -1,
  } = ctx.queryParams;

  if (!filename || !fundId || !userId || !module || !year || quarter == -1) {
    console.log(
      'uploadExcel arguments: filePath, fundId, userId, module, year, quarter'
    );
    return 'uploadExcel arguments: filePath, fundId, userId, module, year, quarter';
  }

  try {
    const isFileExists = await fexists(filename);
    if (!isFileExists) {
      console.log(`File does NOT exist`);
      console.log(`file :${filename} `);
      return `Does NOT exist. File :${filename}`;
    }
  } catch (e) {
    console.log(e);
    return `{e}`;
  }

  const p = await Deno.run({
    cmd: [
      'cmd',
      '/c',
      path.join(filesData.execFolder, 'DataOperationsZ.exe'),
      `${filename}`,
      `${fundId}`,
      `${userId}`,
      `${module}`,
      `${year}`,
      `${quarter}`,
    ],
  });
  return `Uploaded file :${filename}`;
};

app
  .get('/', () => {
    return 'in root doing nothing';
  })
  .get('/delete', deleteDocument)
  .get('/validate', validateDocument)
  .get('/aggregate', aggregate)
  .get('/downloadXbrl', downloadXbrl)
  .get('/uploadExcel', uploadExcel)
  .file('/show', 'public/index.html')
  .static('/test', './public') //this is required to make a folder accessible
  .start({ port: 8000 });

export {};
