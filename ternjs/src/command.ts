import * as fs from "fs";
import * as path from "path";
import { workspace, window } from "vscode";
import { cfgFileName, defaultCfg } from "./config";

export function generateTernCfg() {
  if (!workspace.rootPath) {
    window.showInformationMessage(
      `Please open a folder before generating an ${cfgFileName} file`
    );
    return;
  }

  const cfgFile = path.join(workspace.rootPath, cfgFileName);
  fs.open(cfgFile, "wx", (err, fd) => {
    if (err) {
      if (err.code === "EEXIST") {
        window.showErrorMessage(
          `A ${cfgFileName} file already exists in your workspace.`
        );
      } else {
        window.showErrorMessage(err.message);
      }
      return;
    }

    fs.write(fd, JSON.stringify(defaultCfg, null, 2), 0, err => {
      if (err) {
        window.showErrorMessage(err.message);
      }
    });
  });
}
