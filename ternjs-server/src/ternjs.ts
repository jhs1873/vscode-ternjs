import * as fs from "fs";
import * as path from "path";
import * as minimatch from "minimatch";
import * as glob from "glob";

const tern = require("tern");

const cfgFileName = ".tern-project";

const defaultCfg: any = {
  ecmaVersion: 6,
  libs: [],
  loadEagerly: [],
  dontLoad: [],
  plugins: {
    doc_comment: true
  }
};

export interface Loc {
  line: number;
  ch: number;
}

export interface Definition {
  start?: Loc;
  end?: Loc;
  file?: string;
  context?: string;
  contextOffset?: string;
  doc?: string;
  url?: string;
  origin?: string;
}

export class Ternjs {
  private srv: any;
  private projDir: string;
  private cfg: any;

  constructor(projDir: string) {
    this.projDir = projDir;
    this.cfg = Object.assign({}, defaultCfg, {
      projectDir: projDir,
      async: true
    });
    this.initialize();
  }

  async request(doc: any) {
    return new Promise<any>((resolve, reject) => {
      this.srv.request(doc, (err: Error, data: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  async definition(file: string, end: Loc): Promise<Definition> {
    const abs = path.resolve(this.projDir, file);
    file = path.relative(this.projDir, abs);
    return await this.request({
      query: {
        type: "definition",
        lineCharPositions: true,
        file,
        end
      }
    });
  }

  absPath(p: string) {
    return path.resolve(this.projDir, p);
  }

  private mergeProjCfg() {
    const cfgFile = path.join(this.projDir, cfgFileName);
    fs.readFile(cfgFile, (err, buf) => {
      if (err) {
        return;
      }
      try {
        const cfg = JSON.parse(buf.toString());
        this.cfg = Object.assign(this.cfg, cfg);
      } catch (e) {}
    });
  }

  private initialize() {
    this.mergeProjCfg();

    Object.assign(this.cfg, {
      getFile: (name: string, c: any) => {
        const dontLoad =
          this.cfg.dontLoad &&
          this.cfg.dontLoad.some((pattern: string) => {
            return minimatch(name, pattern);
          });
        if (dontLoad) {
          c(null, "");
        } else {
          fs.readFile(path.resolve(this.projDir, name), "utf8", c);
        }
      },
      normalizeFilename: (name: string) => {
        const p = path.resolve(this.projDir, name);
        return path.relative(this.projDir, p);
      }
    });

    this.srv = new tern.Server(this.cfg);
    if (this.cfg.loadEagerly)
      this.cfg.loadEagerly.forEach((pat: string) => {
        glob.sync(pat, { cwd: this.projDir }).forEach(file => {
          this.srv.addFile(file);
        });
      });
  }
}
