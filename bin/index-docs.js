"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var commander = require("commander");
var path = require("path");
var fs = require("fs");
var child_process_1 = require("child_process");
var util_1 = require("util");
var inliner = require('html-inline');
var aglio = require('aglio');
var apib2swagger = require('apib2swagger');
var tempy = require("tempy");
var replaceExt = require('replace-ext');
var mkdirp = require("mkdirp");
/*
aglio -i ./docs/api/api-technician.apib -c -o ./docs/api/api-technician.apib.all
&& apib2swagger --prefer-reference -i ./docs/api/api-technician.apib.all -o ./docs/api/api-technician.swagger.json
&& swagger-gen --no-try-out -d ./docs/api/.temp-api-technician ./docs/api/api-technician.swagger.json
&& html-inline -i ./docs/api/.temp-api-technician/index.html -o ./docs-output/api-technician.html -b ./docs/api/.temp-api-technician
*/
var collect = function (val, memo) { return memo.concat(val); };
var last = function (val) { return val; };
commander
    .option('-i, --input [value]', 'Apib source files', collect, [])
    .option('-o, --output [value]', 'Output folder', last, './docs-output')
    .option('--tempDir [value]', 'Temp directory', last, tempy.directory())
    .parse(process.argv);
exports.aglioCompilation = function (options) { return __awaiter(_this, void 0, void 0, function () {
    var mergeFile;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                mergeFile = path.join(options.tempDir, path.basename(options.input[0]) + "-all.apib");
                console.log("Compiling with Algio. Out: " + mergeFile);
                return [4 /*yield*/, util_1.promisify(aglio.compileFile)(path.join(process.cwd(), options.input[0]), mergeFile)];
            case 1:
                _a.sent();
                console.log('Aglio done');
                return [2 /*return*/, { mergeFile: mergeFile }];
        }
    });
}); };
exports.swaggerize = function (options) { return __awaiter(_this, void 0, void 0, function () {
    var swaggerFile, result, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                swaggerFile = path.join(options.tempDir, path.basename(options.input[0]) + "-swagger.json");
                console.log("Converting apib to Swagger. Out: " + swaggerFile);
                _a = util_1.promisify(apib2swagger.convert);
                return [4 /*yield*/, util_1.promisify(fs.readFile)(options.mergeFile, 'utf8')];
            case 1: return [4 /*yield*/, _a.apply(void 0, [_b.sent(),
                    {
                        preferReference: true,
                    }])];
            case 2:
                result = _b.sent();
                return [4 /*yield*/, util_1.promisify(fs.writeFile)(swaggerFile, JSON.stringify(result.swagger, null, 2), 'utf8')];
            case 3:
                _b.sent();
                console.log('Conversion done');
                return [2 /*return*/, { swaggerFile: swaggerFile }];
        }
    });
}); };
exports.generateSwaggerUi = function (options) { return __awaiter(_this, void 0, void 0, function () {
    var swaggerGenPath, webFolder;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                swaggerGenPath = require.resolve('swagger-gen');
                webFolder = path.join(options.tempDir, "" + path.basename(options.input[0]).replace(/\./gi, ''));
                console.log("Generating Swagger web. Out: " + webFolder);
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        var child = child_process_1.spawn('node', [swaggerGenPath, options.swaggerFile, '-d', webFolder]);
                        child.on('close', function (code) {
                            if (!code) {
                                return resolve();
                            }
                            return reject(new Error("swagger-gen exited with non-zero code: " + code));
                        });
                    })];
            case 1:
                _a.sent();
                console.log('Web page generated');
                return [2 /*return*/, { webFolder: webFolder }];
        }
    });
}); };
exports.mergeHtml = function (options) { return __awaiter(_this, void 0, void 0, function () {
    var webFolderIndex, inStream, htmlFile, outStream, inline;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log("Merging html: Out: " + options.output);
                webFolderIndex = path.join(options.webFolder, 'index.html');
                inStream = fs.createReadStream(webFolderIndex);
                return [4 /*yield*/, util_1.promisify(mkdirp)(options.output)];
            case 1:
                _a.sent();
                htmlFile = replaceExt(path.join(process.cwd(), options.output, path.basename(options.input[0])), '.html');
                outStream = fs.createWriteStream(htmlFile, 'utf8');
                inline = inliner({
                    basedir: options.webFolder,
                });
                return [4 /*yield*/, new Promise(function (resolve, reject) {
                        inStream
                            .pipe(inline)
                            .on('error', reject)
                            .pipe(outStream)
                            .on('error', reject)
                            .on('finish', resolve)
                            .on('end', resolve);
                    })];
            case 2:
                _a.sent();
                console.log('Merging done');
                return [2 /*return*/, { htmlFile: htmlFile }];
        }
    });
}); };
function main(args, options) {
    return __awaiter(this, void 0, void 0, function () {
        var mergeFile, swaggerFile, webFolder, htmlFile;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!options.input.length) {
                        console.log('Oops! Looks like you didn\'t specify any input files.');
                        console.log('Here\'s atleast a unicorn for you: 🦄');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, exports.aglioCompilation(options)];
                case 1:
                    mergeFile = (_a.sent()).mergeFile;
                    return [4 /*yield*/, exports.swaggerize(__assign({}, options, { mergeFile: mergeFile }))];
                case 2:
                    swaggerFile = (_a.sent()).swaggerFile;
                    return [4 /*yield*/, exports.generateSwaggerUi(__assign({}, options, { swaggerFile: swaggerFile }))];
                case 3:
                    webFolder = (_a.sent()).webFolder;
                    return [4 /*yield*/, exports.mergeHtml(__assign({}, options, { webFolder: webFolder }))];
                case 4:
                    htmlFile = (_a.sent()).htmlFile;
                    console.log("Docs generated! \uD83C\uDF89\nYou can find it here: " + htmlFile);
                    return [2 /*return*/];
            }
        });
    });
}
exports.default = main;
main(commander.args, {
    input: commander.input,
    output: commander.output,
    tempDir: commander.tempDir,
});
//# sourceMappingURL=index-docs.js.map