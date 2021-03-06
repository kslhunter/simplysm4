/* eslint-disable no-console */

require("@simplysm/sd-core-common");
require("element-qsa-scope");
require("core-js/proposals/reflect-metadata");
require("zone.js/dist/zone");

require("events").EventEmitter.defaultMaxListeners = 0;

const { SdServiceFactoryProvider } = require("@simplysm/sd-angular");
const ApplicationRef = require("@angular/core").ApplicationRef;
const platformBrowserDynamic = require("@angular/platform-browser-dynamic").platformBrowserDynamic;
const AppModule = require("SD_APP_MODULE").AppModule;

// eslint-disable-next-line init-declarations
let ngModuleRef;

function dispose() {
  const serviceProvider = ngModuleRef.injector.get(SdServiceFactoryProvider, null);
  if (serviceProvider) {
    serviceProvider.disconnectAll().catch((err) => {
      console.error(err);
    });
  }

  const appRef = ngModuleRef.injector.get(ApplicationRef);

  // 새 엘리먼트 넣기
  console.log("[해제] 새 루트 엘리먼트 준비");
  const prevEl = appRef.components[0].location.nativeElement;

  const newEl = document.createElement(prevEl.tagName);
  prevEl.parentNode.insertBefore(newEl, prevEl);

  // 이전 스타일 삭제
  console.log("[해제] 이전 스타일 삭제");
  const prevNgStyleEls = Array.from(document.head.querySelectorAll(":scope > style"))
    .filter((styleEl) => styleEl.innerText.indexOf("_ng") !== -1);

  for (const prevNgStyleEl of prevNgStyleEls) {
    document.head.removeChild(prevNgStyleEl);
  }

  // 이전 ngModule 지우기
  console.log("[해제] 이전 모듈 제거");
  try {
    ngModuleRef.destroy();
  }
  catch (err) {
    console.error(err);
  }

  // 이전 엘리먼트 삭제
  console.log("[해제] 이전 루트 엘리먼트 삭제");
  if (prevEl.parentNode) {
    prevEl.parentNode.removeChild(prevEl);
  }

  console.log("[해제] 완료");
}

function bootstrap() {
  platformBrowserDynamic().bootstrapModule(AppModule)
    .then((mod) => {
      ngModuleRef = mod;
    })
    .catch((err) => {
      console.error(err);
    });
}

function start() {
  module.hot.dispose(dispose);
  module.hot.accept();

  bootstrap();
}

if (process.env.SD_PLATFORM === "android") {
  document.addEventListener("deviceready", start);
}
else {
  start();
}
