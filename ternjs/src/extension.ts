import * as fs from "fs";
import * as path from "path";
import { commands, ExtensionContext, workspace } from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";
import { generateTernCfg } from "./command";
import { cfgFileName } from "./config";

const registerCommand = (
  ctx: ExtensionContext,
  command: string,
  callback: (...args: any[]) => any,
  thisArg?: any
) => {
  ctx.subscriptions.push(commands.registerCommand(command, callback, thisArg));
};

const setupServer = (ctx: ExtensionContext) => {
  const serverModule = ctx.asAbsolutePath(path.join("server", "server.js"));
  const debugOptions = { execArgv: ["--inspect", "--debug=53535"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: "file", language: "javascript" }],
    synchronize: {
      configurationSection: "ternjs",
      fileEvents: workspace.createFileSystemWatcher(`**/${cfgFileName}`)
    }
  };

  const disposable = new LanguageClient(
    "ternjs",
    "ternjs server",
    serverOptions,
    clientOptions
  ).start();

  ctx.subscriptions.push(disposable);
};

export function activate(ctx: ExtensionContext) {
  registerCommand(ctx, "ternjs.generateConfig", generateTernCfg);
  setupServer(ctx);
}

// this method is called when your extension is deactivated
export function deactivate() {}
