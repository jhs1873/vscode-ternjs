import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  IConnection,
  TextDocuments,
  MarkedString
} from "vscode-languageserver";

import Uri from "vscode-uri";

import { Ternjs } from "./ternjs";

const connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

const documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string | null = null;
let ternSrv: Ternjs | null = null;

connection.onInitialize(params => {
  workspaceRoot = params.rootPath;
  if (workspaceRoot !== null) ternSrv = new Ternjs(workspaceRoot);
  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true,
      hoverProvider: true
    }
  };
});

connection.onDefinition(async params => {
  if (ternSrv === null) return;
  const file = Uri.parse(params.textDocument.uri).path;
  const loc = { line: params.position.line, ch: params.position.character };
  const def = await ternSrv.definition(file, loc);
  if (def.file && def.start && def.end) {
    const uri = Uri.file(ternSrv.absPath(def.file));
    return {
      uri: uri.toString(),
      range: {
        start: { line: def.start.line, character: def.start.ch },
        end: { line: def.end.line, character: def.end.ch }
      }
    };
  }
  return [] as any;
});

connection.onHover(async params => {
  if (ternSrv === null) return;
  const file = Uri.parse(params.textDocument.uri).path;
  const loc = { line: params.position.line, ch: params.position.character };
  const typ = await ternSrv.type(file, loc);
  const doc = await ternSrv.doc(file, loc);
  const hoverTexts: MarkedString[] = [];
  // if type cannot be inferred or it is guessed then just discard it
  if (typ.type !== "?" && !typ.guess) {
    hoverTexts.push({ language: "javascript", value: typ.type });
  }
  if (doc.doc) {
    hoverTexts.push({ language: "plaintext", value: doc.doc });
  }
  return hoverTexts.length ? { contents: hoverTexts } : [] as any;
});

connection.listen();
