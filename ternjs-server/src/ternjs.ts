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
    doc_comment: {
      fullDocs: true,
      strong: true
    }
  }
};

export interface Loc {
  line: number;
  ch: number;
}

export interface TernjsResult {
  doc?: string;
  url?: string;
  origin?: string;
}

export interface Definition extends TernjsResult {
  start?: Loc;
  end?: Loc;
  file?: string;
  context?: string;
  contextOffset?: string;
}

export interface TypeInference extends TernjsResult {
  type?: string;
  guess?: boolean;
  name?: string;
  exprName?: string;
}

export interface Document extends TernjsResult {}

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

  private projRelativeFile(file: string) {
    const abs = path.resolve(this.projDir, file);
    file = path.relative(this.projDir, abs);
    return file;
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
    file = this.projRelativeFile(file);
    return await this.request({
      query: {
        type: "definition",
        lineCharPositions: true,
        file,
        end
      }
    });
  }

  async type(file: string, end: Loc): Promise<TypeInference> {
    file = this.projRelativeFile(file);
    return await this.request({
      query: {
        type: "type",
        lineCharPositions: true,
        preferFunction: true,
        file,
        end
      }
    });
  }

  async doc(file: string, end: Loc): Promise<Document> {
    file = this.projRelativeFile(file);
    return await this.request({
      query: {
        type: "documentation",
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

  // temporarily only supports plugins which are ternjs self-contained
  private loadPlugins() {
    const plugins = this.cfg.plugins;
    return Object.keys(plugins).reduce((opts: any, name) => {
      const found = require.resolve(`tern/plugin/${name}.js`);
      const mod = require(found);
      if (mod.hasOwnProperty("initialize")) mod.initialize(this.projDir);
      opts[name] = plugins[name];
      return opts;
    }, {});
  }

  private initialize() {
    this.mergeProjCfg();
    this.loadPlugins();

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
