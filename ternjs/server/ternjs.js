"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require("fs");
const path = require("path");
const minimatch = require("minimatch");
const glob = require("glob");
const tern = require("tern");
const cfgFileName = ".tern-project";
const defaultCfg = {
    ecmaVersion: 6,
    libs: [],
    loadEagerly: [],
    dontLoad: [],
    plugins: {
        doc_comment: true
    }
};
class Ternjs {
    constructor(projDir) {
        this.projDir = projDir;
        this.cfg = Object.assign({}, defaultCfg, {
            projectDir: projDir,
            async: true
        });
        this.initialize();
    }
    request(doc) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.srv.request(doc, (err, data) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(data);
                    }
                });
            });
        });
    }
    definition(file, end) {
        return __awaiter(this, void 0, void 0, function* () {
            const abs = path.resolve(this.projDir, file);
            file = path.relative(this.projDir, abs);
            return yield this.request({
                query: {
                    type: "definition",
                    lineCharPositions: true,
                    file,
                    end
                }
            });
        });
    }
    absPath(p) {
        return path.resolve(this.projDir, p);
    }
    mergeProjCfg() {
        const cfgFile = path.join(this.projDir, cfgFileName);
        fs.readFile(cfgFile, (err, buf) => {
            if (err) {
                return;
            }
            try {
                const cfg = JSON.parse(buf.toString());
                this.cfg = Object.assign(this.cfg, cfg);
            }
            catch (e) { }
        });
    }
    initialize() {
        this.mergeProjCfg();
        Object.assign(this.cfg, {
            getFile: (name, c) => {
                const dontLoad = this.cfg.dontLoad &&
                    this.cfg.dontLoad.some((pattern) => {
                        return minimatch(name, pattern);
                    });
                if (dontLoad) {
                    c(null, "");
                }
                else {
                    fs.readFile(path.resolve(this.projDir, name), "utf8", c);
                }
            },
            normalizeFilename: (name) => {
                const p = path.resolve(this.projDir, name);
                return path.relative(this.projDir, p);
            }
        });
        this.srv = new tern.Server(this.cfg);
        if (this.cfg.loadEagerly)
            this.cfg.loadEagerly.forEach((pat) => {
                glob.sync(pat, { cwd: this.projDir }).forEach(file => {
                    this.srv.addFile(file);
                });
            });
    }
}
exports.Ternjs = Ternjs;
//# sourceMappingURL=ternjs.js.map