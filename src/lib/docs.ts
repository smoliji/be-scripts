
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as mkdirp from 'mkdirp';
import * as path from 'path';
import { promisify } from 'util';
const inliner = require('html-inline');
const aglio = require('aglio');
const apib2swagger = require('apib2swagger');
const replaceExt = require('replace-ext');

/*
aglio -i ./docs/api/api-technician.apib -c -o ./docs/api/api-technician.apib.all
&& apib2swagger --prefer-reference -i ./docs/api/api-technician.apib.all -o ./docs/api/api-technician.swagger.json
&& swagger-gen --no-try-out -d ./docs/api/.temp-api-technician ./docs/api/api-technician.swagger.json
&& html-inline -i ./docs/api/.temp-api-technician/index.html -o ./docs-output/api-technician.html -b ./docs/api/.temp-api-technician
*/

export interface Options {
    input: string[];
    output: string;
    tempDir: string;
}

export const aglioCompilation = async(options: Options) => {
    const mergeFile = path.join(options.tempDir, `${path.basename(options.input[0])}-all.apib`);
    console.log(`Compiling with Algio. Out: ${mergeFile}`);
    await promisify(aglio.compileFile)(
        path.isAbsolute(options.input[0])
            ? options.input[0]
            : path.join(process.cwd(), options.input[0]),
        mergeFile
    );
    console.log('Aglio done');
    return { mergeFile };
};

export const swaggerize = async(options: Options & { mergeFile: string }) => {
    const swaggerFile = path.join(options.tempDir, `${path.basename(options.input[0])}-swagger.json`);
    console.log(`Converting apib to Swagger. Out: ${swaggerFile}`);
    const result = await promisify(apib2swagger.convert)(
        await promisify(fs.readFile)(options.mergeFile, 'utf8'),
        {
            preferReference: true,
            bearerAsApikey: true,
        }
    );
    await promisify(fs.writeFile)(swaggerFile, JSON.stringify(result.swagger, null, 2), 'utf8');
    console.log('Conversion done');
    return { swaggerFile };
};

export const generateSwaggerUi = async(options: Options & { swaggerFile: string }) => {
    const swaggerGenPath = require.resolve('swagger-gen');
    const webFolder = path.join(options.tempDir, `${path.basename(options.input[0]).replace(/\./gi, '')}`);
    console.log(`Generating Swagger web. Out: ${webFolder}`);
    await new Promise((resolve, reject) => {
        const child = spawn('node', [swaggerGenPath, options.swaggerFile, '-d', webFolder]);
        child.on('close', (code: number) => {
            if (!code) {
                return resolve();
            }
            return reject(new Error(`swagger-gen exited with non-zero code: ${code}`));
        });
    });
    console.log('Web page generated');
    return { webFolder };
};

export const mergeHtml = async(options: Options & { webFolder: string }) => {
    console.log(`Merging html: Out: ${options.output}`);
    const webFolderIndex = path.join(options.webFolder, 'index.html');
    const inStream = fs.createReadStream(webFolderIndex);
    await promisify(mkdirp)(options.output);
    const htmlFile = replaceExt(
        path.isAbsolute(options.input[0])
            ? options.input[0]
            : path.join(
                  process.cwd(),
                  options.output,
                  path.basename(options.input[0])
              ),
        '.html'
    );
    const outStream = fs.createWriteStream(htmlFile, 'utf8');
    const inline = inliner(
        {
            basedir: options.webFolder,
        }
    );
    await new Promise((resolve, reject) => {
        inStream
            .pipe(inline)
            .on('error', reject)
            .pipe(outStream)
            .on('error', reject)
            .on('finish', resolve)
            .on('end', resolve);
    });
    console.log('Merging done');
    return { htmlFile };
};

export default async function docs(args: any[], options: Options) {
    if (!options.input.length) {
        console.log('Oops! Looks like you didn\'t specify any input files.');
        console.log('Here\'s atleast a unicorn for you: 🦄');
        return;
    }

    const { mergeFile } = await aglioCompilation(options);
    const { swaggerFile } = await swaggerize({ ...options, mergeFile });
    const { webFolder } = await generateSwaggerUi({ ...options, swaggerFile });
    const { htmlFile } = await mergeHtml({ ...options, webFolder });
    console.log(`Docs generated! 🎉\nYou can find it here: ${htmlFile}`);
}
