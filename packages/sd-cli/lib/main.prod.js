/* eslint-disable no-console */

require("@simplysm/sd-core-common");
require("element-qsa-scope");
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

require("events").EventEmitter.defaultMaxListeners = 0;

const enableProdMode = require("@angular/core").enableProdMode;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModuleNgFactory = require("SD_APP_MODULE_FACTORY").AppModuleNgFactory;

enableProdMode();

function start() {
  platformBrowserDynamic().bootstrapModuleFactory(AppModuleNgFactory).catch((err) => {
    console.error(err);
  });
}

if (process.env.SD_PLATFORM === "android") {
  document.addEventListener("deviceready", start);
}
else {
  start();
}
