
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 1,
    "preload": [
      "chunk-2FV7G3QI.js",
      "chunk-G7OXWSTQ.js",
      "chunk-JEYFSXQR.js"
    ],
    "route": "/"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-K6OZ5UAL.js",
      "chunk-KZYW2ZDS.js"
    ],
    "route": "/login"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-G7IY352E.js",
      "chunk-KZYW2ZDS.js",
      "chunk-G7OXWSTQ.js",
      "chunk-JEYFSXQR.js"
    ],
    "route": "/audits"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-LTQNTXTF.js",
      "chunk-ZJZNGGWU.js",
      "chunk-KZYW2ZDS.js",
      "chunk-G7OXWSTQ.js",
      "chunk-JEYFSXQR.js"
    ],
    "route": "/audit/*"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-47PSWTXU.js",
      "chunk-KZYW2ZDS.js",
      "chunk-G7OXWSTQ.js",
      "chunk-JEYFSXQR.js"
    ],
    "route": "/upload"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-G7SBIEFH.js"
    ],
    "route": "/monitoring"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-VS7TBRQ5.js"
    ],
    "route": "/standards"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-XFIJVYFC.js",
      "chunk-KZYW2ZDS.js",
      "chunk-JEYFSXQR.js"
    ],
    "route": "/settings"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-552GISYP.js",
      "chunk-KZYW2ZDS.js"
    ],
    "route": "/profile"
  },
  {
    "renderMode": 1,
    "preload": [
      "chunk-UDKVRCKI.js",
      "chunk-ZJZNGGWU.js"
    ],
    "route": "/document/*/*"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 24440, hash: '6cca8899db67bcb6074b26356170467419993959b39cc5ddbacb2c069564edb1', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1519, hash: '903f79817e446151da4d49b79be6523d5b92df15b847487520844ed943f05a6d', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'styles-JM5ZLS46.css': {size: 113025, hash: 'nZuu6N3T8Qg', text: () => import('./assets-chunks/styles-JM5ZLS46_css.mjs').then(m => m.default)}
  },
};
