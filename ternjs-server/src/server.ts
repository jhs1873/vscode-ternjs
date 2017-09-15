import {
  IPCMessageReader,
  IPCMessageWriter,
  createConnection,
  IConnection,
  TextDocuments
} from "vscode-languageserver";

import Uri from "vscode-uri";

import { Ternjs } from "./ternjs";

const connection: IConnection = createConnection(
  new IPCMessageReader(process),
  new IPCMessageWriter(process)
);

const documents: TextDocuments = new TextDocuments();
documents.listen(connection);

let workspaceRoot: string;
let ternSrv: Ternjs;

connection.onInitialize(params => {
  workspaceRoot = params.rootPath;
  ternSrv = new Ternjs(workspaceRoot);

  return {
    capabilities: {
      textDocumentSync: documents.syncKind,
      definitionProvider: true
    }
  };
});

connection.onDefinition(async params => {
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

connection.listen();
