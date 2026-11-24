/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

const Module = require("node:module");
const path = require("node:path");

const origResolve = Module._resolveFilename;
const distRoot = path.resolve(process.cwd(), ".tmp-test-dist");

Module._resolveFilename = function resolveWithAtAlias(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const mapped = path.join(distRoot, request.slice(2));
    return origResolve.call(this, mapped, parent, isMain, options);
  }
  return origResolve.call(this, request, parent, isMain, options);
};

