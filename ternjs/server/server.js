"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const vscode_languageserver_1 = require("vscode-languageserver");
const vscode_uri_1 = require("vscode-uri");
const ternjs_1 = require("./ternjs");
const connection = vscode_languageserver_1.createConnection(new vscode_languageserver_1.IPCMessageReader(process), new vscode_languageserver_1.IPCMessageWriter(process));
const documents = new vscode_languageserver_1.TextDocuments();
documents.listen(connection);
let workspaceRoot;
let ternSrv;
connection.onInitialize(params => {
    workspaceRoot = params.rootPath;
    ternSrv = new ternjs_1.Ternjs(workspaceRoot);
    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
            definitionProvider: true
        }
    };
});
connection.onDefinition((params) => __awaiter(this, void 0, void 0, function* () {
    const file = vscode_uri_1.default.parse(params.textDocument.uri).path;
    const loc = { line: params.position.line, ch: params.position.character };
    const def = yield ternSrv.definition(file, loc);
    if (def.file && def.start && def.end) {
        const uri = vscode_uri_1.default.file(ternSrv.absPath(def.file));
        return {
            uri: uri.toString(),
            range: {
                start: { line: def.start.line, character: def.start.ch },
                end: { line: def.end.line, character: def.end.ch }
            }
        };
    }
    return [];
}));
connection.listen();
//# sourceMappingURL=server.js.map