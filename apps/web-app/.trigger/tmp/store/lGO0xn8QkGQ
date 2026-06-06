import {
  __commonJS,
  __esm,
  __export,
  __name,
  __require,
  __toCommonJS,
  __toESM,
  init_esm
} from "./chunk-5VFD3YHA.mjs";

// ../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js
var require_ms = __commonJS({
  "../../node_modules/.pnpm/ms@2.1.3/node_modules/ms/index.js"(exports, module) {
    init_esm();
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    __name(parse, "parse");
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    __name(fmtShort, "fmtShort");
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    __name(fmtLong, "fmtLong");
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
    __name(plural, "plural");
  }
});

// ../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/common.js"(exports, module) {
    init_esm();
    function setup(env2) {
      createDebug2.debug = createDebug2;
      createDebug2.default = createDebug2;
      createDebug2.coerce = coerce;
      createDebug2.disable = disable;
      createDebug2.enable = enable;
      createDebug2.enabled = enabled;
      createDebug2.humanize = require_ms();
      createDebug2.destroy = destroy;
      Object.keys(env2).forEach((key) => {
        createDebug2[key] = env2[key];
      });
      createDebug2.names = [];
      createDebug2.skips = [];
      createDebug2.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug2.colors[Math.abs(hash) % createDebug2.colors.length];
      }
      __name(selectColor, "selectColor");
      createDebug2.selectColor = selectColor;
      function createDebug2(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug2.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug2.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug2.formatArgs.call(self, args);
          const logFn = self.log || createDebug2.log;
          logFn.apply(self, args);
        }
        __name(debug, "debug");
        debug.namespace = namespace;
        debug.useColors = createDebug2.useColors();
        debug.color = createDebug2.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug2.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: /* @__PURE__ */ __name(() => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug2.namespaces) {
              namespacesCache = createDebug2.namespaces;
              enabledCache = createDebug2.enabled(namespace);
            }
            return enabledCache;
          }, "get"),
          set: /* @__PURE__ */ __name((v) => {
            enableOverride = v;
          }, "set")
        });
        if (typeof createDebug2.init === "function") {
          createDebug2.init(debug);
        }
        return debug;
      }
      __name(createDebug2, "createDebug");
      function extend(namespace, delimiter) {
        const newDebug = createDebug2(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      __name(extend, "extend");
      function enable(namespaces) {
        createDebug2.save(namespaces);
        createDebug2.namespaces = namespaces;
        createDebug2.names = [];
        createDebug2.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug2.skips.push(ns.slice(1));
          } else {
            createDebug2.names.push(ns);
          }
        }
      }
      __name(enable, "enable");
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      __name(matchesTemplate, "matchesTemplate");
      function disable() {
        const namespaces = [
          ...createDebug2.names,
          ...createDebug2.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug2.enable("");
        return namespaces;
      }
      __name(disable, "disable");
      function enabled(name) {
        for (const skip of createDebug2.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug2.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      __name(enabled, "enabled");
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      __name(coerce, "coerce");
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      __name(destroy, "destroy");
      createDebug2.enable(createDebug2.load());
      return createDebug2;
    }
    __name(setup, "setup");
    module.exports = setup;
  }
});

// ../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/browser.js"(exports, module) {
    init_esm();
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    __name(useColors, "useColors");
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    __name(formatArgs, "formatArgs");
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    __name(save, "save");
    function load() {
      let r;
      try {
        r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    __name(load, "load");
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    __name(localstorage, "localstorage");
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../node_modules/.pnpm/supports-color@10.2.2/node_modules/supports-color/index.js
var supports_color_exports = {};
__export(supports_color_exports, {
  createSupportsColor: () => createSupportsColor,
  default: () => supports_color_default
});
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
function envForceColor() {
  if (!("FORCE_COLOR" in env)) {
    return;
  }
  if (env.FORCE_COLOR === "true") {
    return 1;
  }
  if (env.FORCE_COLOR === "false") {
    return 0;
  }
  if (env.FORCE_COLOR.length === 0) {
    return 1;
  }
  const level = Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  if (![0, 1, 2, 3].includes(level)) {
    return;
  }
  return level;
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var env, flagForceColor, supportsColor, supports_color_default;
var init_supports_color = __esm({
  "../../node_modules/.pnpm/supports-color@10.2.2/node_modules/supports-color/index.js"() {
    init_esm();
    __name(hasFlag, "hasFlag");
    ({ env } = process2);
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      flagForceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      flagForceColor = 1;
    }
    __name(envForceColor, "envForceColor");
    __name(translateLevel, "translateLevel");
    __name(_supportsColor, "_supportsColor");
    __name(createSupportsColor, "createSupportsColor");
    supportsColor = {
      stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
      stderr: createSupportsColor({ isTTY: tty.isatty(2) })
    };
    supports_color_default = supportsColor;
  }
});

// ../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/node.js"(exports, module) {
    init_esm();
    var tty2 = __require("tty");
    var util = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor2 = (init_supports_color(), __toCommonJS(supports_color_exports));
      if (supportsColor2 && (supportsColor2.stderr || supportsColor2).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty2.isatty(process.stderr.fd);
    }
    __name(useColors, "useColors");
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    __name(formatArgs, "formatArgs");
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    __name(getDate, "getDate");
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    __name(log, "log");
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    __name(save, "save");
    function load() {
      return process.env.DEBUG;
    }
    __name(load, "load");
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
      }
    }
    __name(init, "init");
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// ../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../node_modules/.pnpm/debug@4.4.3_supports-color@10.2.2/node_modules/debug/src/index.js"(exports, module) {
    init_esm();
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node();
    }
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/json-typings.js
var require_json_typings = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/json-typings.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isJsonObject = exports.typeofJsonValue = void 0;
    function typeofJsonValue(value2) {
      let t = typeof value2;
      if (t == "object") {
        if (Array.isArray(value2))
          return "array";
        if (value2 === null)
          return "null";
      }
      return t;
    }
    __name(typeofJsonValue, "typeofJsonValue");
    exports.typeofJsonValue = typeofJsonValue;
    function isJsonObject(value2) {
      return value2 !== null && typeof value2 == "object" && !Array.isArray(value2);
    }
    __name(isJsonObject, "isJsonObject");
    exports.isJsonObject = isJsonObject;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/base64.js
var require_base64 = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/base64.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.base64encode = exports.base64decode = void 0;
    var encTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");
    var decTable = [];
    for (let i = 0; i < encTable.length; i++)
      decTable[encTable[i].charCodeAt(0)] = i;
    decTable["-".charCodeAt(0)] = encTable.indexOf("+");
    decTable["_".charCodeAt(0)] = encTable.indexOf("/");
    function base64decode(base64Str) {
      let es = base64Str.length * 3 / 4;
      if (base64Str[base64Str.length - 2] == "=")
        es -= 2;
      else if (base64Str[base64Str.length - 1] == "=")
        es -= 1;
      let bytes = new Uint8Array(es), bytePos = 0, groupPos = 0, b, p = 0;
      for (let i = 0; i < base64Str.length; i++) {
        b = decTable[base64Str.charCodeAt(i)];
        if (b === void 0) {
          switch (base64Str[i]) {
            case "=":
              groupPos = 0;
            // reset state when padding found
            case "\n":
            case "\r":
            case "	":
            case " ":
              continue;
            // skip white-space, and padding
            default:
              throw Error(`invalid base64 string.`);
          }
        }
        switch (groupPos) {
          case 0:
            p = b;
            groupPos = 1;
            break;
          case 1:
            bytes[bytePos++] = p << 2 | (b & 48) >> 4;
            p = b;
            groupPos = 2;
            break;
          case 2:
            bytes[bytePos++] = (p & 15) << 4 | (b & 60) >> 2;
            p = b;
            groupPos = 3;
            break;
          case 3:
            bytes[bytePos++] = (p & 3) << 6 | b;
            groupPos = 0;
            break;
        }
      }
      if (groupPos == 1)
        throw Error(`invalid base64 string.`);
      return bytes.subarray(0, bytePos);
    }
    __name(base64decode, "base64decode");
    exports.base64decode = base64decode;
    function base64encode(bytes) {
      let base64 = "", groupPos = 0, b, p = 0;
      for (let i = 0; i < bytes.length; i++) {
        b = bytes[i];
        switch (groupPos) {
          case 0:
            base64 += encTable[b >> 2];
            p = (b & 3) << 4;
            groupPos = 1;
            break;
          case 1:
            base64 += encTable[p | b >> 4];
            p = (b & 15) << 2;
            groupPos = 2;
            break;
          case 2:
            base64 += encTable[p | b >> 6];
            base64 += encTable[b & 63];
            groupPos = 0;
            break;
        }
      }
      if (groupPos) {
        base64 += encTable[p];
        base64 += "=";
        if (groupPos == 1)
          base64 += "=";
      }
      return base64;
    }
    __name(base64encode, "base64encode");
    exports.base64encode = base64encode;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/protobufjs-utf8.js
var require_protobufjs_utf8 = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/protobufjs-utf8.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.utf8read = void 0;
    var fromCharCodes = /* @__PURE__ */ __name((chunk) => String.fromCharCode.apply(String, chunk), "fromCharCodes");
    function utf8read(bytes) {
      if (bytes.length < 1)
        return "";
      let pos = 0, parts = [], chunk = [], i = 0, t;
      let len = bytes.length;
      while (pos < len) {
        t = bytes[pos++];
        if (t < 128)
          chunk[i++] = t;
        else if (t > 191 && t < 224)
          chunk[i++] = (t & 31) << 6 | bytes[pos++] & 63;
        else if (t > 239 && t < 365) {
          t = ((t & 7) << 18 | (bytes[pos++] & 63) << 12 | (bytes[pos++] & 63) << 6 | bytes[pos++] & 63) - 65536;
          chunk[i++] = 55296 + (t >> 10);
          chunk[i++] = 56320 + (t & 1023);
        } else
          chunk[i++] = (t & 15) << 12 | (bytes[pos++] & 63) << 6 | bytes[pos++] & 63;
        if (i > 8191) {
          parts.push(fromCharCodes(chunk));
          i = 0;
        }
      }
      if (parts.length) {
        if (i)
          parts.push(fromCharCodes(chunk.slice(0, i)));
        return parts.join("");
      }
      return fromCharCodes(chunk.slice(0, i));
    }
    __name(utf8read, "utf8read");
    exports.utf8read = utf8read;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-format-contract.js
var require_binary_format_contract = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-format-contract.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WireType = exports.mergeBinaryOptions = exports.UnknownFieldHandler = void 0;
    var UnknownFieldHandler2;
    (function(UnknownFieldHandler3) {
      UnknownFieldHandler3.symbol = Symbol.for("protobuf-ts/unknown");
      UnknownFieldHandler3.onRead = (typeName, message, fieldNo, wireType, data) => {
        let container = is(message) ? message[UnknownFieldHandler3.symbol] : message[UnknownFieldHandler3.symbol] = [];
        container.push({ no: fieldNo, wireType, data });
      };
      UnknownFieldHandler3.onWrite = (typeName, message, writer) => {
        for (let { no, wireType, data } of UnknownFieldHandler3.list(message))
          writer.tag(no, wireType).raw(data);
      };
      UnknownFieldHandler3.list = (message, fieldNo) => {
        if (is(message)) {
          let all = message[UnknownFieldHandler3.symbol];
          return fieldNo ? all.filter((uf) => uf.no == fieldNo) : all;
        }
        return [];
      };
      UnknownFieldHandler3.last = (message, fieldNo) => UnknownFieldHandler3.list(message, fieldNo).slice(-1)[0];
      const is = /* @__PURE__ */ __name((message) => message && Array.isArray(message[UnknownFieldHandler3.symbol]), "is");
    })(UnknownFieldHandler2 = exports.UnknownFieldHandler || (exports.UnknownFieldHandler = {}));
    function mergeBinaryOptions(a, b) {
      return Object.assign(Object.assign({}, a), b);
    }
    __name(mergeBinaryOptions, "mergeBinaryOptions");
    exports.mergeBinaryOptions = mergeBinaryOptions;
    var WireType2;
    (function(WireType3) {
      WireType3[WireType3["Varint"] = 0] = "Varint";
      WireType3[WireType3["Bit64"] = 1] = "Bit64";
      WireType3[WireType3["LengthDelimited"] = 2] = "LengthDelimited";
      WireType3[WireType3["StartGroup"] = 3] = "StartGroup";
      WireType3[WireType3["EndGroup"] = 4] = "EndGroup";
      WireType3[WireType3["Bit32"] = 5] = "Bit32";
    })(WireType2 = exports.WireType || (exports.WireType = {}));
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/goog-varint.js
var require_goog_varint = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/goog-varint.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.varint32read = exports.varint32write = exports.int64toString = exports.int64fromString = exports.varint64write = exports.varint64read = void 0;
    function varint64read() {
      let lowBits = 0;
      let highBits = 0;
      for (let shift = 0; shift < 28; shift += 7) {
        let b = this.buf[this.pos++];
        lowBits |= (b & 127) << shift;
        if ((b & 128) == 0) {
          this.assertBounds();
          return [lowBits, highBits];
        }
      }
      let middleByte = this.buf[this.pos++];
      lowBits |= (middleByte & 15) << 28;
      highBits = (middleByte & 112) >> 4;
      if ((middleByte & 128) == 0) {
        this.assertBounds();
        return [lowBits, highBits];
      }
      for (let shift = 3; shift <= 31; shift += 7) {
        let b = this.buf[this.pos++];
        highBits |= (b & 127) << shift;
        if ((b & 128) == 0) {
          this.assertBounds();
          return [lowBits, highBits];
        }
      }
      throw new Error("invalid varint");
    }
    __name(varint64read, "varint64read");
    exports.varint64read = varint64read;
    function varint64write(lo, hi, bytes) {
      for (let i = 0; i < 28; i = i + 7) {
        const shift = lo >>> i;
        const hasNext = !(shift >>> 7 == 0 && hi == 0);
        const byte = (hasNext ? shift | 128 : shift) & 255;
        bytes.push(byte);
        if (!hasNext) {
          return;
        }
      }
      const splitBits = lo >>> 28 & 15 | (hi & 7) << 4;
      const hasMoreBits = !(hi >> 3 == 0);
      bytes.push((hasMoreBits ? splitBits | 128 : splitBits) & 255);
      if (!hasMoreBits) {
        return;
      }
      for (let i = 3; i < 31; i = i + 7) {
        const shift = hi >>> i;
        const hasNext = !(shift >>> 7 == 0);
        const byte = (hasNext ? shift | 128 : shift) & 255;
        bytes.push(byte);
        if (!hasNext) {
          return;
        }
      }
      bytes.push(hi >>> 31 & 1);
    }
    __name(varint64write, "varint64write");
    exports.varint64write = varint64write;
    var TWO_PWR_32_DBL = (1 << 16) * (1 << 16);
    function int64fromString(dec) {
      let minus = dec[0] == "-";
      if (minus)
        dec = dec.slice(1);
      const base = 1e6;
      let lowBits = 0;
      let highBits = 0;
      function add1e6digit(begin, end) {
        const digit1e6 = Number(dec.slice(begin, end));
        highBits *= base;
        lowBits = lowBits * base + digit1e6;
        if (lowBits >= TWO_PWR_32_DBL) {
          highBits = highBits + (lowBits / TWO_PWR_32_DBL | 0);
          lowBits = lowBits % TWO_PWR_32_DBL;
        }
      }
      __name(add1e6digit, "add1e6digit");
      add1e6digit(-24, -18);
      add1e6digit(-18, -12);
      add1e6digit(-12, -6);
      add1e6digit(-6);
      return [minus, lowBits, highBits];
    }
    __name(int64fromString, "int64fromString");
    exports.int64fromString = int64fromString;
    function int64toString(bitsLow, bitsHigh) {
      if (bitsHigh >>> 0 <= 2097151) {
        return "" + (TWO_PWR_32_DBL * bitsHigh + (bitsLow >>> 0));
      }
      let low = bitsLow & 16777215;
      let mid = (bitsLow >>> 24 | bitsHigh << 8) >>> 0 & 16777215;
      let high = bitsHigh >> 16 & 65535;
      let digitA = low + mid * 6777216 + high * 6710656;
      let digitB = mid + high * 8147497;
      let digitC = high * 2;
      let base = 1e7;
      if (digitA >= base) {
        digitB += Math.floor(digitA / base);
        digitA %= base;
      }
      if (digitB >= base) {
        digitC += Math.floor(digitB / base);
        digitB %= base;
      }
      function decimalFrom1e7(digit1e7, needLeadingZeros) {
        let partial = digit1e7 ? String(digit1e7) : "";
        if (needLeadingZeros) {
          return "0000000".slice(partial.length) + partial;
        }
        return partial;
      }
      __name(decimalFrom1e7, "decimalFrom1e7");
      return decimalFrom1e7(
        digitC,
        /*needLeadingZeros=*/
        0
      ) + decimalFrom1e7(
        digitB,
        /*needLeadingZeros=*/
        digitC
      ) + // If the final 1e7 digit didn't need leading zeros, we would have
      // returned via the trivial code path at the top.
      decimalFrom1e7(
        digitA,
        /*needLeadingZeros=*/
        1
      );
    }
    __name(int64toString, "int64toString");
    exports.int64toString = int64toString;
    function varint32write(value2, bytes) {
      if (value2 >= 0) {
        while (value2 > 127) {
          bytes.push(value2 & 127 | 128);
          value2 = value2 >>> 7;
        }
        bytes.push(value2);
      } else {
        for (let i = 0; i < 9; i++) {
          bytes.push(value2 & 127 | 128);
          value2 = value2 >> 7;
        }
        bytes.push(1);
      }
    }
    __name(varint32write, "varint32write");
    exports.varint32write = varint32write;
    function varint32read() {
      let b = this.buf[this.pos++];
      let result = b & 127;
      if ((b & 128) == 0) {
        this.assertBounds();
        return result;
      }
      b = this.buf[this.pos++];
      result |= (b & 127) << 7;
      if ((b & 128) == 0) {
        this.assertBounds();
        return result;
      }
      b = this.buf[this.pos++];
      result |= (b & 127) << 14;
      if ((b & 128) == 0) {
        this.assertBounds();
        return result;
      }
      b = this.buf[this.pos++];
      result |= (b & 127) << 21;
      if ((b & 128) == 0) {
        this.assertBounds();
        return result;
      }
      b = this.buf[this.pos++];
      result |= (b & 15) << 28;
      for (let readBytes = 5; (b & 128) !== 0 && readBytes < 10; readBytes++)
        b = this.buf[this.pos++];
      if ((b & 128) != 0)
        throw new Error("invalid varint");
      this.assertBounds();
      return result >>> 0;
    }
    __name(varint32read, "varint32read");
    exports.varint32read = varint32read;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/pb-long.js
var require_pb_long = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/pb-long.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PbLong = exports.PbULong = exports.detectBi = void 0;
    var goog_varint_1 = require_goog_varint();
    var BI;
    function detectBi() {
      const dv = new DataView(new ArrayBuffer(8));
      const ok2 = globalThis.BigInt !== void 0 && typeof dv.getBigInt64 === "function" && typeof dv.getBigUint64 === "function" && typeof dv.setBigInt64 === "function" && typeof dv.setBigUint64 === "function";
      BI = ok2 ? {
        MIN: BigInt("-9223372036854775808"),
        MAX: BigInt("9223372036854775807"),
        UMIN: BigInt("0"),
        UMAX: BigInt("18446744073709551615"),
        C: BigInt,
        V: dv
      } : void 0;
    }
    __name(detectBi, "detectBi");
    exports.detectBi = detectBi;
    detectBi();
    function assertBi(bi) {
      if (!bi)
        throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support");
    }
    __name(assertBi, "assertBi");
    var RE_DECIMAL_STR = /^-?[0-9]+$/;
    var TWO_PWR_32_DBL = 4294967296;
    var HALF_2_PWR_32 = 2147483648;
    var SharedPbLong = class {
      static {
        __name(this, "SharedPbLong");
      }
      /**
       * Create a new instance with the given bits.
       */
      constructor(lo, hi) {
        this.lo = lo | 0;
        this.hi = hi | 0;
      }
      /**
       * Is this instance equal to 0?
       */
      isZero() {
        return this.lo == 0 && this.hi == 0;
      }
      /**
       * Convert to a native number.
       */
      toNumber() {
        let result = this.hi * TWO_PWR_32_DBL + (this.lo >>> 0);
        if (!Number.isSafeInteger(result))
          throw new Error("cannot convert to safe number");
        return result;
      }
    };
    var PbULong = class _PbULong extends SharedPbLong {
      static {
        __name(this, "PbULong");
      }
      /**
       * Create instance from a `string`, `number` or `bigint`.
       */
      static from(value2) {
        if (BI)
          switch (typeof value2) {
            case "string":
              if (value2 == "0")
                return this.ZERO;
              if (value2 == "")
                throw new Error("string is no integer");
              value2 = BI.C(value2);
            case "number":
              if (value2 === 0)
                return this.ZERO;
              value2 = BI.C(value2);
            case "bigint":
              if (!value2)
                return this.ZERO;
              if (value2 < BI.UMIN)
                throw new Error("signed value for ulong");
              if (value2 > BI.UMAX)
                throw new Error("ulong too large");
              BI.V.setBigUint64(0, value2, true);
              return new _PbULong(BI.V.getInt32(0, true), BI.V.getInt32(4, true));
          }
        else
          switch (typeof value2) {
            case "string":
              if (value2 == "0")
                return this.ZERO;
              value2 = value2.trim();
              if (!RE_DECIMAL_STR.test(value2))
                throw new Error("string is no integer");
              let [minus, lo, hi] = goog_varint_1.int64fromString(value2);
              if (minus)
                throw new Error("signed value for ulong");
              return new _PbULong(lo, hi);
            case "number":
              if (value2 == 0)
                return this.ZERO;
              if (!Number.isSafeInteger(value2))
                throw new Error("number is no integer");
              if (value2 < 0)
                throw new Error("signed value for ulong");
              return new _PbULong(value2, value2 / TWO_PWR_32_DBL);
          }
        throw new Error("unknown value " + typeof value2);
      }
      /**
       * Convert to decimal string.
       */
      toString() {
        return BI ? this.toBigInt().toString() : goog_varint_1.int64toString(this.lo, this.hi);
      }
      /**
       * Convert to native bigint.
       */
      toBigInt() {
        assertBi(BI);
        BI.V.setInt32(0, this.lo, true);
        BI.V.setInt32(4, this.hi, true);
        return BI.V.getBigUint64(0, true);
      }
    };
    exports.PbULong = PbULong;
    PbULong.ZERO = new PbULong(0, 0);
    var PbLong = class _PbLong extends SharedPbLong {
      static {
        __name(this, "PbLong");
      }
      /**
       * Create instance from a `string`, `number` or `bigint`.
       */
      static from(value2) {
        if (BI)
          switch (typeof value2) {
            case "string":
              if (value2 == "0")
                return this.ZERO;
              if (value2 == "")
                throw new Error("string is no integer");
              value2 = BI.C(value2);
            case "number":
              if (value2 === 0)
                return this.ZERO;
              value2 = BI.C(value2);
            case "bigint":
              if (!value2)
                return this.ZERO;
              if (value2 < BI.MIN)
                throw new Error("signed long too small");
              if (value2 > BI.MAX)
                throw new Error("signed long too large");
              BI.V.setBigInt64(0, value2, true);
              return new _PbLong(BI.V.getInt32(0, true), BI.V.getInt32(4, true));
          }
        else
          switch (typeof value2) {
            case "string":
              if (value2 == "0")
                return this.ZERO;
              value2 = value2.trim();
              if (!RE_DECIMAL_STR.test(value2))
                throw new Error("string is no integer");
              let [minus, lo, hi] = goog_varint_1.int64fromString(value2);
              if (minus) {
                if (hi > HALF_2_PWR_32 || hi == HALF_2_PWR_32 && lo != 0)
                  throw new Error("signed long too small");
              } else if (hi >= HALF_2_PWR_32)
                throw new Error("signed long too large");
              let pbl = new _PbLong(lo, hi);
              return minus ? pbl.negate() : pbl;
            case "number":
              if (value2 == 0)
                return this.ZERO;
              if (!Number.isSafeInteger(value2))
                throw new Error("number is no integer");
              return value2 > 0 ? new _PbLong(value2, value2 / TWO_PWR_32_DBL) : new _PbLong(-value2, -value2 / TWO_PWR_32_DBL).negate();
          }
        throw new Error("unknown value " + typeof value2);
      }
      /**
       * Do we have a minus sign?
       */
      isNegative() {
        return (this.hi & HALF_2_PWR_32) !== 0;
      }
      /**
       * Negate two's complement.
       * Invert all the bits and add one to the result.
       */
      negate() {
        let hi = ~this.hi, lo = this.lo;
        if (lo)
          lo = ~lo + 1;
        else
          hi += 1;
        return new _PbLong(lo, hi);
      }
      /**
       * Convert to decimal string.
       */
      toString() {
        if (BI)
          return this.toBigInt().toString();
        if (this.isNegative()) {
          let n = this.negate();
          return "-" + goog_varint_1.int64toString(n.lo, n.hi);
        }
        return goog_varint_1.int64toString(this.lo, this.hi);
      }
      /**
       * Convert to native bigint.
       */
      toBigInt() {
        assertBi(BI);
        BI.V.setInt32(0, this.lo, true);
        BI.V.setInt32(4, this.hi, true);
        return BI.V.getBigInt64(0, true);
      }
    };
    exports.PbLong = PbLong;
    PbLong.ZERO = new PbLong(0, 0);
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-reader.js
var require_binary_reader = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-reader.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BinaryReader = exports.binaryReadOptions = void 0;
    var binary_format_contract_1 = require_binary_format_contract();
    var pb_long_1 = require_pb_long();
    var goog_varint_1 = require_goog_varint();
    var defaultsRead = {
      readUnknownField: true,
      readerFactory: /* @__PURE__ */ __name((bytes) => new BinaryReader(bytes), "readerFactory")
    };
    function binaryReadOptions(options) {
      return options ? Object.assign(Object.assign({}, defaultsRead), options) : defaultsRead;
    }
    __name(binaryReadOptions, "binaryReadOptions");
    exports.binaryReadOptions = binaryReadOptions;
    var BinaryReader = class {
      static {
        __name(this, "BinaryReader");
      }
      constructor(buf, textDecoder) {
        this.varint64 = goog_varint_1.varint64read;
        this.uint32 = goog_varint_1.varint32read;
        this.buf = buf;
        this.len = buf.length;
        this.pos = 0;
        this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        this.textDecoder = textDecoder !== null && textDecoder !== void 0 ? textDecoder : new TextDecoder("utf-8", {
          fatal: true,
          ignoreBOM: true
        });
      }
      /**
       * Reads a tag - field number and wire type.
       */
      tag() {
        let tag = this.uint32(), fieldNo = tag >>> 3, wireType = tag & 7;
        if (fieldNo <= 0 || wireType < 0 || wireType > 5)
          throw new Error("illegal tag: field no " + fieldNo + " wire type " + wireType);
        return [fieldNo, wireType];
      }
      /**
       * Skip one element on the wire and return the skipped data.
       * Supports WireType.StartGroup since v2.0.0-alpha.23.
       */
      skip(wireType) {
        let start = this.pos;
        switch (wireType) {
          case binary_format_contract_1.WireType.Varint:
            while (this.buf[this.pos++] & 128) {
            }
            break;
          case binary_format_contract_1.WireType.Bit64:
            this.pos += 4;
          case binary_format_contract_1.WireType.Bit32:
            this.pos += 4;
            break;
          case binary_format_contract_1.WireType.LengthDelimited:
            let len = this.uint32();
            this.pos += len;
            break;
          case binary_format_contract_1.WireType.StartGroup:
            let t;
            while ((t = this.tag()[1]) !== binary_format_contract_1.WireType.EndGroup) {
              this.skip(t);
            }
            break;
          default:
            throw new Error("cant skip wire type " + wireType);
        }
        this.assertBounds();
        return this.buf.subarray(start, this.pos);
      }
      /**
       * Throws error if position in byte array is out of range.
       */
      assertBounds() {
        if (this.pos > this.len)
          throw new RangeError("premature EOF");
      }
      /**
       * Read a `int32` field, a signed 32 bit varint.
       */
      int32() {
        return this.uint32() | 0;
      }
      /**
       * Read a `sint32` field, a signed, zigzag-encoded 32-bit varint.
       */
      sint32() {
        let zze = this.uint32();
        return zze >>> 1 ^ -(zze & 1);
      }
      /**
       * Read a `int64` field, a signed 64-bit varint.
       */
      int64() {
        return new pb_long_1.PbLong(...this.varint64());
      }
      /**
       * Read a `uint64` field, an unsigned 64-bit varint.
       */
      uint64() {
        return new pb_long_1.PbULong(...this.varint64());
      }
      /**
       * Read a `sint64` field, a signed, zig-zag-encoded 64-bit varint.
       */
      sint64() {
        let [lo, hi] = this.varint64();
        let s = -(lo & 1);
        lo = (lo >>> 1 | (hi & 1) << 31) ^ s;
        hi = hi >>> 1 ^ s;
        return new pb_long_1.PbLong(lo, hi);
      }
      /**
       * Read a `bool` field, a variant.
       */
      bool() {
        let [lo, hi] = this.varint64();
        return lo !== 0 || hi !== 0;
      }
      /**
       * Read a `fixed32` field, an unsigned, fixed-length 32-bit integer.
       */
      fixed32() {
        return this.view.getUint32((this.pos += 4) - 4, true);
      }
      /**
       * Read a `sfixed32` field, a signed, fixed-length 32-bit integer.
       */
      sfixed32() {
        return this.view.getInt32((this.pos += 4) - 4, true);
      }
      /**
       * Read a `fixed64` field, an unsigned, fixed-length 64 bit integer.
       */
      fixed64() {
        return new pb_long_1.PbULong(this.sfixed32(), this.sfixed32());
      }
      /**
       * Read a `fixed64` field, a signed, fixed-length 64-bit integer.
       */
      sfixed64() {
        return new pb_long_1.PbLong(this.sfixed32(), this.sfixed32());
      }
      /**
       * Read a `float` field, 32-bit floating point number.
       */
      float() {
        return this.view.getFloat32((this.pos += 4) - 4, true);
      }
      /**
       * Read a `double` field, a 64-bit floating point number.
       */
      double() {
        return this.view.getFloat64((this.pos += 8) - 8, true);
      }
      /**
       * Read a `bytes` field, length-delimited arbitrary data.
       */
      bytes() {
        let len = this.uint32();
        let start = this.pos;
        this.pos += len;
        this.assertBounds();
        return this.buf.subarray(start, start + len);
      }
      /**
       * Read a `string` field, length-delimited data converted to UTF-8 text.
       */
      string() {
        return this.textDecoder.decode(this.bytes());
      }
    };
    exports.BinaryReader = BinaryReader;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/assert.js
var require_assert = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/assert.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.assertFloat32 = exports.assertUInt32 = exports.assertInt32 = exports.assertNever = exports.assert = void 0;
    function assert(condition, msg) {
      if (!condition) {
        throw new Error(msg);
      }
    }
    __name(assert, "assert");
    exports.assert = assert;
    function assertNever(value2, msg) {
      throw new Error(msg !== null && msg !== void 0 ? msg : "Unexpected object: " + value2);
    }
    __name(assertNever, "assertNever");
    exports.assertNever = assertNever;
    var FLOAT32_MAX = 34028234663852886e22;
    var FLOAT32_MIN = -34028234663852886e22;
    var UINT32_MAX = 4294967295;
    var INT32_MAX = 2147483647;
    var INT32_MIN = -2147483648;
    function assertInt32(arg) {
      if (typeof arg !== "number")
        throw new Error("invalid int 32: " + typeof arg);
      if (!Number.isInteger(arg) || arg > INT32_MAX || arg < INT32_MIN)
        throw new Error("invalid int 32: " + arg);
    }
    __name(assertInt32, "assertInt32");
    exports.assertInt32 = assertInt32;
    function assertUInt32(arg) {
      if (typeof arg !== "number")
        throw new Error("invalid uint 32: " + typeof arg);
      if (!Number.isInteger(arg) || arg > UINT32_MAX || arg < 0)
        throw new Error("invalid uint 32: " + arg);
    }
    __name(assertUInt32, "assertUInt32");
    exports.assertUInt32 = assertUInt32;
    function assertFloat32(arg) {
      if (typeof arg !== "number")
        throw new Error("invalid float 32: " + typeof arg);
      if (!Number.isFinite(arg))
        return;
      if (arg > FLOAT32_MAX || arg < FLOAT32_MIN)
        throw new Error("invalid float 32: " + arg);
    }
    __name(assertFloat32, "assertFloat32");
    exports.assertFloat32 = assertFloat32;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-writer.js
var require_binary_writer = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/binary-writer.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BinaryWriter = exports.binaryWriteOptions = void 0;
    var pb_long_1 = require_pb_long();
    var goog_varint_1 = require_goog_varint();
    var assert_1 = require_assert();
    var defaultsWrite = {
      writeUnknownFields: true,
      writerFactory: /* @__PURE__ */ __name(() => new BinaryWriter(), "writerFactory")
    };
    function binaryWriteOptions(options) {
      return options ? Object.assign(Object.assign({}, defaultsWrite), options) : defaultsWrite;
    }
    __name(binaryWriteOptions, "binaryWriteOptions");
    exports.binaryWriteOptions = binaryWriteOptions;
    var BinaryWriter = class {
      static {
        __name(this, "BinaryWriter");
      }
      constructor(textEncoder3) {
        this.stack = [];
        this.textEncoder = textEncoder3 !== null && textEncoder3 !== void 0 ? textEncoder3 : new TextEncoder();
        this.chunks = [];
        this.buf = [];
      }
      /**
       * Return all bytes written and reset this writer.
       */
      finish() {
        this.chunks.push(new Uint8Array(this.buf));
        let len = 0;
        for (let i = 0; i < this.chunks.length; i++)
          len += this.chunks[i].length;
        let bytes = new Uint8Array(len);
        let offset = 0;
        for (let i = 0; i < this.chunks.length; i++) {
          bytes.set(this.chunks[i], offset);
          offset += this.chunks[i].length;
        }
        this.chunks = [];
        return bytes;
      }
      /**
       * Start a new fork for length-delimited data like a message
       * or a packed repeated field.
       *
       * Must be joined later with `join()`.
       */
      fork() {
        this.stack.push({ chunks: this.chunks, buf: this.buf });
        this.chunks = [];
        this.buf = [];
        return this;
      }
      /**
       * Join the last fork. Write its length and bytes, then
       * return to the previous state.
       */
      join() {
        let chunk = this.finish();
        let prev = this.stack.pop();
        if (!prev)
          throw new Error("invalid state, fork stack empty");
        this.chunks = prev.chunks;
        this.buf = prev.buf;
        this.uint32(chunk.byteLength);
        return this.raw(chunk);
      }
      /**
       * Writes a tag (field number and wire type).
       *
       * Equivalent to `uint32( (fieldNo << 3 | type) >>> 0 )`.
       *
       * Generated code should compute the tag ahead of time and call `uint32()`.
       */
      tag(fieldNo, type) {
        return this.uint32((fieldNo << 3 | type) >>> 0);
      }
      /**
       * Write a chunk of raw bytes.
       */
      raw(chunk) {
        if (this.buf.length) {
          this.chunks.push(new Uint8Array(this.buf));
          this.buf = [];
        }
        this.chunks.push(chunk);
        return this;
      }
      /**
       * Write a `uint32` value, an unsigned 32 bit varint.
       */
      uint32(value2) {
        assert_1.assertUInt32(value2);
        while (value2 > 127) {
          this.buf.push(value2 & 127 | 128);
          value2 = value2 >>> 7;
        }
        this.buf.push(value2);
        return this;
      }
      /**
       * Write a `int32` value, a signed 32 bit varint.
       */
      int32(value2) {
        assert_1.assertInt32(value2);
        goog_varint_1.varint32write(value2, this.buf);
        return this;
      }
      /**
       * Write a `bool` value, a variant.
       */
      bool(value2) {
        this.buf.push(value2 ? 1 : 0);
        return this;
      }
      /**
       * Write a `bytes` value, length-delimited arbitrary data.
       */
      bytes(value2) {
        this.uint32(value2.byteLength);
        return this.raw(value2);
      }
      /**
       * Write a `string` value, length-delimited data converted to UTF-8 text.
       */
      string(value2) {
        let chunk = this.textEncoder.encode(value2);
        this.uint32(chunk.byteLength);
        return this.raw(chunk);
      }
      /**
       * Write a `float` value, 32-bit floating point number.
       */
      float(value2) {
        assert_1.assertFloat32(value2);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setFloat32(0, value2, true);
        return this.raw(chunk);
      }
      /**
       * Write a `double` value, a 64-bit floating point number.
       */
      double(value2) {
        let chunk = new Uint8Array(8);
        new DataView(chunk.buffer).setFloat64(0, value2, true);
        return this.raw(chunk);
      }
      /**
       * Write a `fixed32` value, an unsigned, fixed-length 32-bit integer.
       */
      fixed32(value2) {
        assert_1.assertUInt32(value2);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setUint32(0, value2, true);
        return this.raw(chunk);
      }
      /**
       * Write a `sfixed32` value, a signed, fixed-length 32-bit integer.
       */
      sfixed32(value2) {
        assert_1.assertInt32(value2);
        let chunk = new Uint8Array(4);
        new DataView(chunk.buffer).setInt32(0, value2, true);
        return this.raw(chunk);
      }
      /**
       * Write a `sint32` value, a signed, zigzag-encoded 32-bit varint.
       */
      sint32(value2) {
        assert_1.assertInt32(value2);
        value2 = (value2 << 1 ^ value2 >> 31) >>> 0;
        goog_varint_1.varint32write(value2, this.buf);
        return this;
      }
      /**
       * Write a `fixed64` value, a signed, fixed-length 64-bit integer.
       */
      sfixed64(value2) {
        let chunk = new Uint8Array(8);
        let view = new DataView(chunk.buffer);
        let long = pb_long_1.PbLong.from(value2);
        view.setInt32(0, long.lo, true);
        view.setInt32(4, long.hi, true);
        return this.raw(chunk);
      }
      /**
       * Write a `fixed64` value, an unsigned, fixed-length 64 bit integer.
       */
      fixed64(value2) {
        let chunk = new Uint8Array(8);
        let view = new DataView(chunk.buffer);
        let long = pb_long_1.PbULong.from(value2);
        view.setInt32(0, long.lo, true);
        view.setInt32(4, long.hi, true);
        return this.raw(chunk);
      }
      /**
       * Write a `int64` value, a signed 64-bit varint.
       */
      int64(value2) {
        let long = pb_long_1.PbLong.from(value2);
        goog_varint_1.varint64write(long.lo, long.hi, this.buf);
        return this;
      }
      /**
       * Write a `sint64` value, a signed, zig-zag-encoded 64-bit varint.
       */
      sint64(value2) {
        let long = pb_long_1.PbLong.from(value2), sign = long.hi >> 31, lo = long.lo << 1 ^ sign, hi = (long.hi << 1 | long.lo >>> 31) ^ sign;
        goog_varint_1.varint64write(lo, hi, this.buf);
        return this;
      }
      /**
       * Write a `uint64` value, an unsigned 64-bit varint.
       */
      uint64(value2) {
        let long = pb_long_1.PbULong.from(value2);
        goog_varint_1.varint64write(long.lo, long.hi, this.buf);
        return this;
      }
    };
    exports.BinaryWriter = BinaryWriter;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/json-format-contract.js
var require_json_format_contract = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/json-format-contract.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.mergeJsonOptions = exports.jsonWriteOptions = exports.jsonReadOptions = void 0;
    var defaultsWrite = {
      emitDefaultValues: false,
      enumAsInteger: false,
      useProtoFieldName: false,
      prettySpaces: 0
    };
    var defaultsRead = {
      ignoreUnknownFields: false
    };
    function jsonReadOptions(options) {
      return options ? Object.assign(Object.assign({}, defaultsRead), options) : defaultsRead;
    }
    __name(jsonReadOptions, "jsonReadOptions");
    exports.jsonReadOptions = jsonReadOptions;
    function jsonWriteOptions(options) {
      return options ? Object.assign(Object.assign({}, defaultsWrite), options) : defaultsWrite;
    }
    __name(jsonWriteOptions, "jsonWriteOptions");
    exports.jsonWriteOptions = jsonWriteOptions;
    function mergeJsonOptions(a, b) {
      var _a, _b;
      let c = Object.assign(Object.assign({}, a), b);
      c.typeRegistry = [...(_a = a === null || a === void 0 ? void 0 : a.typeRegistry) !== null && _a !== void 0 ? _a : [], ...(_b = b === null || b === void 0 ? void 0 : b.typeRegistry) !== null && _b !== void 0 ? _b : []];
      return c;
    }
    __name(mergeJsonOptions, "mergeJsonOptions");
    exports.mergeJsonOptions = mergeJsonOptions;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/message-type-contract.js
var require_message_type_contract = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/message-type-contract.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MESSAGE_TYPE = void 0;
    exports.MESSAGE_TYPE = Symbol.for("protobuf-ts/message-type");
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/lower-camel-case.js
var require_lower_camel_case = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/lower-camel-case.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.lowerCamelCase = void 0;
    function lowerCamelCase(snakeCase) {
      let capNext = false;
      const sb = [];
      for (let i = 0; i < snakeCase.length; i++) {
        let next = snakeCase.charAt(i);
        if (next == "_") {
          capNext = true;
        } else if (/\d/.test(next)) {
          sb.push(next);
          capNext = true;
        } else if (capNext) {
          sb.push(next.toUpperCase());
          capNext = false;
        } else if (i == 0) {
          sb.push(next.toLowerCase());
        } else {
          sb.push(next);
        }
      }
      return sb.join("");
    }
    __name(lowerCamelCase, "lowerCamelCase");
    exports.lowerCamelCase = lowerCamelCase;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-info.js
var require_reflection_info = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-info.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readMessageOption = exports.readFieldOption = exports.readFieldOptions = exports.normalizeFieldInfo = exports.RepeatType = exports.LongType = exports.ScalarType = void 0;
    var lower_camel_case_1 = require_lower_camel_case();
    var ScalarType;
    (function(ScalarType2) {
      ScalarType2[ScalarType2["DOUBLE"] = 1] = "DOUBLE";
      ScalarType2[ScalarType2["FLOAT"] = 2] = "FLOAT";
      ScalarType2[ScalarType2["INT64"] = 3] = "INT64";
      ScalarType2[ScalarType2["UINT64"] = 4] = "UINT64";
      ScalarType2[ScalarType2["INT32"] = 5] = "INT32";
      ScalarType2[ScalarType2["FIXED64"] = 6] = "FIXED64";
      ScalarType2[ScalarType2["FIXED32"] = 7] = "FIXED32";
      ScalarType2[ScalarType2["BOOL"] = 8] = "BOOL";
      ScalarType2[ScalarType2["STRING"] = 9] = "STRING";
      ScalarType2[ScalarType2["BYTES"] = 12] = "BYTES";
      ScalarType2[ScalarType2["UINT32"] = 13] = "UINT32";
      ScalarType2[ScalarType2["SFIXED32"] = 15] = "SFIXED32";
      ScalarType2[ScalarType2["SFIXED64"] = 16] = "SFIXED64";
      ScalarType2[ScalarType2["SINT32"] = 17] = "SINT32";
      ScalarType2[ScalarType2["SINT64"] = 18] = "SINT64";
    })(ScalarType = exports.ScalarType || (exports.ScalarType = {}));
    var LongType;
    (function(LongType2) {
      LongType2[LongType2["BIGINT"] = 0] = "BIGINT";
      LongType2[LongType2["STRING"] = 1] = "STRING";
      LongType2[LongType2["NUMBER"] = 2] = "NUMBER";
    })(LongType = exports.LongType || (exports.LongType = {}));
    var RepeatType;
    (function(RepeatType2) {
      RepeatType2[RepeatType2["NO"] = 0] = "NO";
      RepeatType2[RepeatType2["PACKED"] = 1] = "PACKED";
      RepeatType2[RepeatType2["UNPACKED"] = 2] = "UNPACKED";
    })(RepeatType = exports.RepeatType || (exports.RepeatType = {}));
    function normalizeFieldInfo(field) {
      var _a, _b, _c, _d;
      field.localName = (_a = field.localName) !== null && _a !== void 0 ? _a : lower_camel_case_1.lowerCamelCase(field.name);
      field.jsonName = (_b = field.jsonName) !== null && _b !== void 0 ? _b : lower_camel_case_1.lowerCamelCase(field.name);
      field.repeat = (_c = field.repeat) !== null && _c !== void 0 ? _c : RepeatType.NO;
      field.opt = (_d = field.opt) !== null && _d !== void 0 ? _d : field.repeat ? false : field.oneof ? false : field.kind == "message";
      return field;
    }
    __name(normalizeFieldInfo, "normalizeFieldInfo");
    exports.normalizeFieldInfo = normalizeFieldInfo;
    function readFieldOptions(messageType, fieldName, extensionName, extensionType) {
      var _a;
      const options = (_a = messageType.fields.find((m, i) => m.localName == fieldName || i == fieldName)) === null || _a === void 0 ? void 0 : _a.options;
      return options && options[extensionName] ? extensionType.fromJson(options[extensionName]) : void 0;
    }
    __name(readFieldOptions, "readFieldOptions");
    exports.readFieldOptions = readFieldOptions;
    function readFieldOption(messageType, fieldName, extensionName, extensionType) {
      var _a;
      const options = (_a = messageType.fields.find((m, i) => m.localName == fieldName || i == fieldName)) === null || _a === void 0 ? void 0 : _a.options;
      if (!options) {
        return void 0;
      }
      const optionVal = options[extensionName];
      if (optionVal === void 0) {
        return optionVal;
      }
      return extensionType ? extensionType.fromJson(optionVal) : optionVal;
    }
    __name(readFieldOption, "readFieldOption");
    exports.readFieldOption = readFieldOption;
    function readMessageOption(messageType, extensionName, extensionType) {
      const options = messageType.options;
      const optionVal = options[extensionName];
      if (optionVal === void 0) {
        return optionVal;
      }
      return extensionType ? extensionType.fromJson(optionVal) : optionVal;
    }
    __name(readMessageOption, "readMessageOption");
    exports.readMessageOption = readMessageOption;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/oneof.js
var require_oneof = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/oneof.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getSelectedOneofValue = exports.clearOneofValue = exports.setUnknownOneofValue = exports.setOneofValue = exports.getOneofValue = exports.isOneofGroup = void 0;
    function isOneofGroup(any) {
      if (typeof any != "object" || any === null || !any.hasOwnProperty("oneofKind")) {
        return false;
      }
      switch (typeof any.oneofKind) {
        case "string":
          if (any[any.oneofKind] === void 0)
            return false;
          return Object.keys(any).length == 2;
        case "undefined":
          return Object.keys(any).length == 1;
        default:
          return false;
      }
    }
    __name(isOneofGroup, "isOneofGroup");
    exports.isOneofGroup = isOneofGroup;
    function getOneofValue(oneof, kind) {
      return oneof[kind];
    }
    __name(getOneofValue, "getOneofValue");
    exports.getOneofValue = getOneofValue;
    function setOneofValue(oneof, kind, value2) {
      if (oneof.oneofKind !== void 0) {
        delete oneof[oneof.oneofKind];
      }
      oneof.oneofKind = kind;
      if (value2 !== void 0) {
        oneof[kind] = value2;
      }
    }
    __name(setOneofValue, "setOneofValue");
    exports.setOneofValue = setOneofValue;
    function setUnknownOneofValue(oneof, kind, value2) {
      if (oneof.oneofKind !== void 0) {
        delete oneof[oneof.oneofKind];
      }
      oneof.oneofKind = kind;
      if (value2 !== void 0 && kind !== void 0) {
        oneof[kind] = value2;
      }
    }
    __name(setUnknownOneofValue, "setUnknownOneofValue");
    exports.setUnknownOneofValue = setUnknownOneofValue;
    function clearOneofValue(oneof) {
      if (oneof.oneofKind !== void 0) {
        delete oneof[oneof.oneofKind];
      }
      oneof.oneofKind = void 0;
    }
    __name(clearOneofValue, "clearOneofValue");
    exports.clearOneofValue = clearOneofValue;
    function getSelectedOneofValue(oneof) {
      if (oneof.oneofKind === void 0) {
        return void 0;
      }
      return oneof[oneof.oneofKind];
    }
    __name(getSelectedOneofValue, "getSelectedOneofValue");
    exports.getSelectedOneofValue = getSelectedOneofValue;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-type-check.js
var require_reflection_type_check = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-type-check.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReflectionTypeCheck = void 0;
    var reflection_info_1 = require_reflection_info();
    var oneof_1 = require_oneof();
    var ReflectionTypeCheck = class {
      static {
        __name(this, "ReflectionTypeCheck");
      }
      constructor(info) {
        var _a;
        this.fields = (_a = info.fields) !== null && _a !== void 0 ? _a : [];
      }
      prepare() {
        if (this.data)
          return;
        const req = [], known = [], oneofs = [];
        for (let field of this.fields) {
          if (field.oneof) {
            if (!oneofs.includes(field.oneof)) {
              oneofs.push(field.oneof);
              req.push(field.oneof);
              known.push(field.oneof);
            }
          } else {
            known.push(field.localName);
            switch (field.kind) {
              case "scalar":
              case "enum":
                if (!field.opt || field.repeat)
                  req.push(field.localName);
                break;
              case "message":
                if (field.repeat)
                  req.push(field.localName);
                break;
              case "map":
                req.push(field.localName);
                break;
            }
          }
        }
        this.data = { req, known, oneofs: Object.values(oneofs) };
      }
      /**
       * Is the argument a valid message as specified by the
       * reflection information?
       *
       * Checks all field types recursively. The `depth`
       * specifies how deep into the structure the check will be.
       *
       * With a depth of 0, only the presence of fields
       * is checked.
       *
       * With a depth of 1 or more, the field types are checked.
       *
       * With a depth of 2 or more, the members of map, repeated
       * and message fields are checked.
       *
       * Message fields will be checked recursively with depth - 1.
       *
       * The number of map entries / repeated values being checked
       * is < depth.
       */
      is(message, depth, allowExcessProperties = false) {
        if (depth < 0)
          return true;
        if (message === null || message === void 0 || typeof message != "object")
          return false;
        this.prepare();
        let keys = Object.keys(message), data = this.data;
        if (keys.length < data.req.length || data.req.some((n) => !keys.includes(n)))
          return false;
        if (!allowExcessProperties) {
          if (keys.some((k) => !data.known.includes(k)))
            return false;
        }
        if (depth < 1) {
          return true;
        }
        for (const name of data.oneofs) {
          const group = message[name];
          if (!oneof_1.isOneofGroup(group))
            return false;
          if (group.oneofKind === void 0)
            continue;
          const field = this.fields.find((f) => f.localName === group.oneofKind);
          if (!field)
            return false;
          if (!this.field(group[group.oneofKind], field, allowExcessProperties, depth))
            return false;
        }
        for (const field of this.fields) {
          if (field.oneof !== void 0)
            continue;
          if (!this.field(message[field.localName], field, allowExcessProperties, depth))
            return false;
        }
        return true;
      }
      field(arg, field, allowExcessProperties, depth) {
        let repeated = field.repeat;
        switch (field.kind) {
          case "scalar":
            if (arg === void 0)
              return field.opt;
            if (repeated)
              return this.scalars(arg, field.T, depth, field.L);
            return this.scalar(arg, field.T, field.L);
          case "enum":
            if (arg === void 0)
              return field.opt;
            if (repeated)
              return this.scalars(arg, reflection_info_1.ScalarType.INT32, depth);
            return this.scalar(arg, reflection_info_1.ScalarType.INT32);
          case "message":
            if (arg === void 0)
              return true;
            if (repeated)
              return this.messages(arg, field.T(), allowExcessProperties, depth);
            return this.message(arg, field.T(), allowExcessProperties, depth);
          case "map":
            if (typeof arg != "object" || arg === null)
              return false;
            if (depth < 2)
              return true;
            if (!this.mapKeys(arg, field.K, depth))
              return false;
            switch (field.V.kind) {
              case "scalar":
                return this.scalars(Object.values(arg), field.V.T, depth, field.V.L);
              case "enum":
                return this.scalars(Object.values(arg), reflection_info_1.ScalarType.INT32, depth);
              case "message":
                return this.messages(Object.values(arg), field.V.T(), allowExcessProperties, depth);
            }
            break;
        }
        return true;
      }
      message(arg, type, allowExcessProperties, depth) {
        if (allowExcessProperties) {
          return type.isAssignable(arg, depth);
        }
        return type.is(arg, depth);
      }
      messages(arg, type, allowExcessProperties, depth) {
        if (!Array.isArray(arg))
          return false;
        if (depth < 2)
          return true;
        if (allowExcessProperties) {
          for (let i = 0; i < arg.length && i < depth; i++)
            if (!type.isAssignable(arg[i], depth - 1))
              return false;
        } else {
          for (let i = 0; i < arg.length && i < depth; i++)
            if (!type.is(arg[i], depth - 1))
              return false;
        }
        return true;
      }
      scalar(arg, type, longType) {
        let argType = typeof arg;
        switch (type) {
          case reflection_info_1.ScalarType.UINT64:
          case reflection_info_1.ScalarType.FIXED64:
          case reflection_info_1.ScalarType.INT64:
          case reflection_info_1.ScalarType.SFIXED64:
          case reflection_info_1.ScalarType.SINT64:
            switch (longType) {
              case reflection_info_1.LongType.BIGINT:
                return argType == "bigint";
              case reflection_info_1.LongType.NUMBER:
                return argType == "number" && !isNaN(arg);
              default:
                return argType == "string";
            }
          case reflection_info_1.ScalarType.BOOL:
            return argType == "boolean";
          case reflection_info_1.ScalarType.STRING:
            return argType == "string";
          case reflection_info_1.ScalarType.BYTES:
            return arg instanceof Uint8Array;
          case reflection_info_1.ScalarType.DOUBLE:
          case reflection_info_1.ScalarType.FLOAT:
            return argType == "number" && !isNaN(arg);
          default:
            return argType == "number" && Number.isInteger(arg);
        }
      }
      scalars(arg, type, depth, longType) {
        if (!Array.isArray(arg))
          return false;
        if (depth < 2)
          return true;
        if (Array.isArray(arg)) {
          for (let i = 0; i < arg.length && i < depth; i++)
            if (!this.scalar(arg[i], type, longType))
              return false;
        }
        return true;
      }
      mapKeys(map, type, depth) {
        let keys = Object.keys(map);
        switch (type) {
          case reflection_info_1.ScalarType.INT32:
          case reflection_info_1.ScalarType.FIXED32:
          case reflection_info_1.ScalarType.SFIXED32:
          case reflection_info_1.ScalarType.SINT32:
          case reflection_info_1.ScalarType.UINT32:
            return this.scalars(keys.slice(0, depth).map((k) => parseInt(k)), type, depth);
          case reflection_info_1.ScalarType.BOOL:
            return this.scalars(keys.slice(0, depth).map((k) => k == "true" ? true : k == "false" ? false : k), type, depth);
          default:
            return this.scalars(keys, type, depth, reflection_info_1.LongType.STRING);
        }
      }
    };
    exports.ReflectionTypeCheck = ReflectionTypeCheck;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-long-convert.js
var require_reflection_long_convert = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-long-convert.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectionLongConvert = void 0;
    var reflection_info_1 = require_reflection_info();
    function reflectionLongConvert(long, type) {
      switch (type) {
        case reflection_info_1.LongType.BIGINT:
          return long.toBigInt();
        case reflection_info_1.LongType.NUMBER:
          return long.toNumber();
        default:
          return long.toString();
      }
    }
    __name(reflectionLongConvert, "reflectionLongConvert");
    exports.reflectionLongConvert = reflectionLongConvert;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-json-reader.js
var require_reflection_json_reader = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-json-reader.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReflectionJsonReader = void 0;
    var json_typings_1 = require_json_typings();
    var base64_1 = require_base64();
    var reflection_info_1 = require_reflection_info();
    var pb_long_1 = require_pb_long();
    var assert_1 = require_assert();
    var reflection_long_convert_1 = require_reflection_long_convert();
    var ReflectionJsonReader = class {
      static {
        __name(this, "ReflectionJsonReader");
      }
      constructor(info) {
        this.info = info;
      }
      prepare() {
        var _a;
        if (this.fMap === void 0) {
          this.fMap = {};
          const fieldsInput = (_a = this.info.fields) !== null && _a !== void 0 ? _a : [];
          for (const field of fieldsInput) {
            this.fMap[field.name] = field;
            this.fMap[field.jsonName] = field;
            this.fMap[field.localName] = field;
          }
        }
      }
      // Cannot parse JSON <type of jsonValue> for <type name>#<fieldName>.
      assert(condition, fieldName, jsonValue) {
        if (!condition) {
          let what = json_typings_1.typeofJsonValue(jsonValue);
          if (what == "number" || what == "boolean")
            what = jsonValue.toString();
          throw new Error(`Cannot parse JSON ${what} for ${this.info.typeName}#${fieldName}`);
        }
      }
      /**
       * Reads a message from canonical JSON format into the target message.
       *
       * Repeated fields are appended. Map entries are added, overwriting
       * existing keys.
       *
       * If a message field is already present, it will be merged with the
       * new data.
       */
      read(input, message, options) {
        this.prepare();
        const oneofsHandled = [];
        for (const [jsonKey, jsonValue] of Object.entries(input)) {
          const field = this.fMap[jsonKey];
          if (!field) {
            if (!options.ignoreUnknownFields)
              throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${jsonKey}`);
            continue;
          }
          const localName = field.localName;
          let target;
          if (field.oneof) {
            if (jsonValue === null && (field.kind !== "enum" || field.T()[0] !== "google.protobuf.NullValue")) {
              continue;
            }
            if (oneofsHandled.includes(field.oneof))
              throw new Error(`Multiple members of the oneof group "${field.oneof}" of ${this.info.typeName} are present in JSON.`);
            oneofsHandled.push(field.oneof);
            target = message[field.oneof] = {
              oneofKind: localName
            };
          } else {
            target = message;
          }
          if (field.kind == "map") {
            if (jsonValue === null) {
              continue;
            }
            this.assert(json_typings_1.isJsonObject(jsonValue), field.name, jsonValue);
            const fieldObj = target[localName];
            for (const [jsonObjKey, jsonObjValue] of Object.entries(jsonValue)) {
              this.assert(jsonObjValue !== null, field.name + " map value", null);
              let val;
              switch (field.V.kind) {
                case "message":
                  val = field.V.T().internalJsonRead(jsonObjValue, options);
                  break;
                case "enum":
                  val = this.enum(field.V.T(), jsonObjValue, field.name, options.ignoreUnknownFields);
                  if (val === false)
                    continue;
                  break;
                case "scalar":
                  val = this.scalar(jsonObjValue, field.V.T, field.V.L, field.name);
                  break;
              }
              this.assert(val !== void 0, field.name + " map value", jsonObjValue);
              let key = jsonObjKey;
              if (field.K == reflection_info_1.ScalarType.BOOL)
                key = key == "true" ? true : key == "false" ? false : key;
              key = this.scalar(key, field.K, reflection_info_1.LongType.STRING, field.name).toString();
              fieldObj[key] = val;
            }
          } else if (field.repeat) {
            if (jsonValue === null)
              continue;
            this.assert(Array.isArray(jsonValue), field.name, jsonValue);
            const fieldArr = target[localName];
            for (const jsonItem of jsonValue) {
              this.assert(jsonItem !== null, field.name, null);
              let val;
              switch (field.kind) {
                case "message":
                  val = field.T().internalJsonRead(jsonItem, options);
                  break;
                case "enum":
                  val = this.enum(field.T(), jsonItem, field.name, options.ignoreUnknownFields);
                  if (val === false)
                    continue;
                  break;
                case "scalar":
                  val = this.scalar(jsonItem, field.T, field.L, field.name);
                  break;
              }
              this.assert(val !== void 0, field.name, jsonValue);
              fieldArr.push(val);
            }
          } else {
            switch (field.kind) {
              case "message":
                if (jsonValue === null && field.T().typeName != "google.protobuf.Value") {
                  this.assert(field.oneof === void 0, field.name + " (oneof member)", null);
                  continue;
                }
                target[localName] = field.T().internalJsonRead(jsonValue, options, target[localName]);
                break;
              case "enum":
                if (jsonValue === null)
                  continue;
                let val = this.enum(field.T(), jsonValue, field.name, options.ignoreUnknownFields);
                if (val === false)
                  continue;
                target[localName] = val;
                break;
              case "scalar":
                if (jsonValue === null)
                  continue;
                target[localName] = this.scalar(jsonValue, field.T, field.L, field.name);
                break;
            }
          }
        }
      }
      /**
       * Returns `false` for unrecognized string representations.
       *
       * google.protobuf.NullValue accepts only JSON `null` (or the old `"NULL_VALUE"`).
       */
      enum(type, json, fieldName, ignoreUnknownFields) {
        if (type[0] == "google.protobuf.NullValue")
          assert_1.assert(json === null || json === "NULL_VALUE", `Unable to parse field ${this.info.typeName}#${fieldName}, enum ${type[0]} only accepts null.`);
        if (json === null)
          return 0;
        switch (typeof json) {
          case "number":
            assert_1.assert(Number.isInteger(json), `Unable to parse field ${this.info.typeName}#${fieldName}, enum can only be integral number, got ${json}.`);
            return json;
          case "string":
            let localEnumName = json;
            if (type[2] && json.substring(0, type[2].length) === type[2])
              localEnumName = json.substring(type[2].length);
            let enumNumber = type[1][localEnumName];
            if (typeof enumNumber === "undefined" && ignoreUnknownFields) {
              return false;
            }
            assert_1.assert(typeof enumNumber == "number", `Unable to parse field ${this.info.typeName}#${fieldName}, enum ${type[0]} has no value for "${json}".`);
            return enumNumber;
        }
        assert_1.assert(false, `Unable to parse field ${this.info.typeName}#${fieldName}, cannot parse enum value from ${typeof json}".`);
      }
      scalar(json, type, longType, fieldName) {
        let e;
        try {
          switch (type) {
            // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
            // Either numbers or strings are accepted. Exponent notation is also accepted.
            case reflection_info_1.ScalarType.DOUBLE:
            case reflection_info_1.ScalarType.FLOAT:
              if (json === null)
                return 0;
              if (json === "NaN")
                return Number.NaN;
              if (json === "Infinity")
                return Number.POSITIVE_INFINITY;
              if (json === "-Infinity")
                return Number.NEGATIVE_INFINITY;
              if (json === "") {
                e = "empty string";
                break;
              }
              if (typeof json == "string" && json.trim().length !== json.length) {
                e = "extra whitespace";
                break;
              }
              if (typeof json != "string" && typeof json != "number") {
                break;
              }
              let float = Number(json);
              if (Number.isNaN(float)) {
                e = "not a number";
                break;
              }
              if (!Number.isFinite(float)) {
                e = "too large or small";
                break;
              }
              if (type == reflection_info_1.ScalarType.FLOAT)
                assert_1.assertFloat32(float);
              return float;
            // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
            case reflection_info_1.ScalarType.INT32:
            case reflection_info_1.ScalarType.FIXED32:
            case reflection_info_1.ScalarType.SFIXED32:
            case reflection_info_1.ScalarType.SINT32:
            case reflection_info_1.ScalarType.UINT32:
              if (json === null)
                return 0;
              let int32;
              if (typeof json == "number")
                int32 = json;
              else if (json === "")
                e = "empty string";
              else if (typeof json == "string") {
                if (json.trim().length !== json.length)
                  e = "extra whitespace";
                else
                  int32 = Number(json);
              }
              if (int32 === void 0)
                break;
              if (type == reflection_info_1.ScalarType.UINT32)
                assert_1.assertUInt32(int32);
              else
                assert_1.assertInt32(int32);
              return int32;
            // int64, fixed64, uint64: JSON value will be a decimal string. Either numbers or strings are accepted.
            case reflection_info_1.ScalarType.INT64:
            case reflection_info_1.ScalarType.SFIXED64:
            case reflection_info_1.ScalarType.SINT64:
              if (json === null)
                return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbLong.ZERO, longType);
              if (typeof json != "number" && typeof json != "string")
                break;
              return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbLong.from(json), longType);
            case reflection_info_1.ScalarType.FIXED64:
            case reflection_info_1.ScalarType.UINT64:
              if (json === null)
                return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbULong.ZERO, longType);
              if (typeof json != "number" && typeof json != "string")
                break;
              return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbULong.from(json), longType);
            // bool:
            case reflection_info_1.ScalarType.BOOL:
              if (json === null)
                return false;
              if (typeof json !== "boolean")
                break;
              return json;
            // string:
            case reflection_info_1.ScalarType.STRING:
              if (json === null)
                return "";
              if (typeof json !== "string") {
                e = "extra whitespace";
                break;
              }
              try {
                encodeURIComponent(json);
              } catch (e2) {
                e2 = "invalid UTF8";
                break;
              }
              return json;
            // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
            // Either standard or URL-safe base64 encoding with/without paddings are accepted.
            case reflection_info_1.ScalarType.BYTES:
              if (json === null || json === "")
                return new Uint8Array(0);
              if (typeof json !== "string")
                break;
              return base64_1.base64decode(json);
          }
        } catch (error) {
          e = error.message;
        }
        this.assert(false, fieldName + (e ? " - " + e : ""), json);
      }
    };
    exports.ReflectionJsonReader = ReflectionJsonReader;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-json-writer.js
var require_reflection_json_writer = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-json-writer.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReflectionJsonWriter = void 0;
    var base64_1 = require_base64();
    var pb_long_1 = require_pb_long();
    var reflection_info_1 = require_reflection_info();
    var assert_1 = require_assert();
    var ReflectionJsonWriter = class {
      static {
        __name(this, "ReflectionJsonWriter");
      }
      constructor(info) {
        var _a;
        this.fields = (_a = info.fields) !== null && _a !== void 0 ? _a : [];
      }
      /**
       * Converts the message to a JSON object, based on the field descriptors.
       */
      write(message, options) {
        const json = {}, source = message;
        for (const field of this.fields) {
          if (!field.oneof) {
            let jsonValue2 = this.field(field, source[field.localName], options);
            if (jsonValue2 !== void 0)
              json[options.useProtoFieldName ? field.name : field.jsonName] = jsonValue2;
            continue;
          }
          const group = source[field.oneof];
          if (group.oneofKind !== field.localName)
            continue;
          const opt = field.kind == "scalar" || field.kind == "enum" ? Object.assign(Object.assign({}, options), { emitDefaultValues: true }) : options;
          let jsonValue = this.field(field, group[field.localName], opt);
          assert_1.assert(jsonValue !== void 0);
          json[options.useProtoFieldName ? field.name : field.jsonName] = jsonValue;
        }
        return json;
      }
      field(field, value2, options) {
        let jsonValue = void 0;
        if (field.kind == "map") {
          assert_1.assert(typeof value2 == "object" && value2 !== null);
          const jsonObj = {};
          switch (field.V.kind) {
            case "scalar":
              for (const [entryKey, entryValue] of Object.entries(value2)) {
                const val = this.scalar(field.V.T, entryValue, field.name, false, true);
                assert_1.assert(val !== void 0);
                jsonObj[entryKey.toString()] = val;
              }
              break;
            case "message":
              const messageType = field.V.T();
              for (const [entryKey, entryValue] of Object.entries(value2)) {
                const val = this.message(messageType, entryValue, field.name, options);
                assert_1.assert(val !== void 0);
                jsonObj[entryKey.toString()] = val;
              }
              break;
            case "enum":
              const enumInfo = field.V.T();
              for (const [entryKey, entryValue] of Object.entries(value2)) {
                assert_1.assert(entryValue === void 0 || typeof entryValue == "number");
                const val = this.enum(enumInfo, entryValue, field.name, false, true, options.enumAsInteger);
                assert_1.assert(val !== void 0);
                jsonObj[entryKey.toString()] = val;
              }
              break;
          }
          if (options.emitDefaultValues || Object.keys(jsonObj).length > 0)
            jsonValue = jsonObj;
        } else if (field.repeat) {
          assert_1.assert(Array.isArray(value2));
          const jsonArr = [];
          switch (field.kind) {
            case "scalar":
              for (let i = 0; i < value2.length; i++) {
                const val = this.scalar(field.T, value2[i], field.name, field.opt, true);
                assert_1.assert(val !== void 0);
                jsonArr.push(val);
              }
              break;
            case "enum":
              const enumInfo = field.T();
              for (let i = 0; i < value2.length; i++) {
                assert_1.assert(value2[i] === void 0 || typeof value2[i] == "number");
                const val = this.enum(enumInfo, value2[i], field.name, field.opt, true, options.enumAsInteger);
                assert_1.assert(val !== void 0);
                jsonArr.push(val);
              }
              break;
            case "message":
              const messageType = field.T();
              for (let i = 0; i < value2.length; i++) {
                const val = this.message(messageType, value2[i], field.name, options);
                assert_1.assert(val !== void 0);
                jsonArr.push(val);
              }
              break;
          }
          if (options.emitDefaultValues || jsonArr.length > 0 || options.emitDefaultValues)
            jsonValue = jsonArr;
        } else {
          switch (field.kind) {
            case "scalar":
              jsonValue = this.scalar(field.T, value2, field.name, field.opt, options.emitDefaultValues);
              break;
            case "enum":
              jsonValue = this.enum(field.T(), value2, field.name, field.opt, options.emitDefaultValues, options.enumAsInteger);
              break;
            case "message":
              jsonValue = this.message(field.T(), value2, field.name, options);
              break;
          }
        }
        return jsonValue;
      }
      /**
       * Returns `null` as the default for google.protobuf.NullValue.
       */
      enum(type, value2, fieldName, optional, emitDefaultValues, enumAsInteger) {
        if (type[0] == "google.protobuf.NullValue")
          return !emitDefaultValues && !optional ? void 0 : null;
        if (value2 === void 0) {
          assert_1.assert(optional);
          return void 0;
        }
        if (value2 === 0 && !emitDefaultValues && !optional)
          return void 0;
        assert_1.assert(typeof value2 == "number");
        assert_1.assert(Number.isInteger(value2));
        if (enumAsInteger || !type[1].hasOwnProperty(value2))
          return value2;
        if (type[2])
          return type[2] + type[1][value2];
        return type[1][value2];
      }
      message(type, value2, fieldName, options) {
        if (value2 === void 0)
          return options.emitDefaultValues ? null : void 0;
        return type.internalJsonWrite(value2, options);
      }
      scalar(type, value2, fieldName, optional, emitDefaultValues) {
        if (value2 === void 0) {
          assert_1.assert(optional);
          return void 0;
        }
        const ed = emitDefaultValues || optional;
        switch (type) {
          // int32, fixed32, uint32: JSON value will be a decimal number. Either numbers or strings are accepted.
          case reflection_info_1.ScalarType.INT32:
          case reflection_info_1.ScalarType.SFIXED32:
          case reflection_info_1.ScalarType.SINT32:
            if (value2 === 0)
              return ed ? 0 : void 0;
            assert_1.assertInt32(value2);
            return value2;
          case reflection_info_1.ScalarType.FIXED32:
          case reflection_info_1.ScalarType.UINT32:
            if (value2 === 0)
              return ed ? 0 : void 0;
            assert_1.assertUInt32(value2);
            return value2;
          // float, double: JSON value will be a number or one of the special string values "NaN", "Infinity", and "-Infinity".
          // Either numbers or strings are accepted. Exponent notation is also accepted.
          case reflection_info_1.ScalarType.FLOAT:
            assert_1.assertFloat32(value2);
          case reflection_info_1.ScalarType.DOUBLE:
            if (value2 === 0)
              return ed ? 0 : void 0;
            assert_1.assert(typeof value2 == "number");
            if (Number.isNaN(value2))
              return "NaN";
            if (value2 === Number.POSITIVE_INFINITY)
              return "Infinity";
            if (value2 === Number.NEGATIVE_INFINITY)
              return "-Infinity";
            return value2;
          // string:
          case reflection_info_1.ScalarType.STRING:
            if (value2 === "")
              return ed ? "" : void 0;
            assert_1.assert(typeof value2 == "string");
            return value2;
          // bool:
          case reflection_info_1.ScalarType.BOOL:
            if (value2 === false)
              return ed ? false : void 0;
            assert_1.assert(typeof value2 == "boolean");
            return value2;
          // JSON value will be a decimal string. Either numbers or strings are accepted.
          case reflection_info_1.ScalarType.UINT64:
          case reflection_info_1.ScalarType.FIXED64:
            assert_1.assert(typeof value2 == "number" || typeof value2 == "string" || typeof value2 == "bigint");
            let ulong = pb_long_1.PbULong.from(value2);
            if (ulong.isZero() && !ed)
              return void 0;
            return ulong.toString();
          // JSON value will be a decimal string. Either numbers or strings are accepted.
          case reflection_info_1.ScalarType.INT64:
          case reflection_info_1.ScalarType.SFIXED64:
          case reflection_info_1.ScalarType.SINT64:
            assert_1.assert(typeof value2 == "number" || typeof value2 == "string" || typeof value2 == "bigint");
            let long = pb_long_1.PbLong.from(value2);
            if (long.isZero() && !ed)
              return void 0;
            return long.toString();
          // bytes: JSON value will be the data encoded as a string using standard base64 encoding with paddings.
          // Either standard or URL-safe base64 encoding with/without paddings are accepted.
          case reflection_info_1.ScalarType.BYTES:
            assert_1.assert(value2 instanceof Uint8Array);
            if (!value2.byteLength)
              return ed ? "" : void 0;
            return base64_1.base64encode(value2);
        }
      }
    };
    exports.ReflectionJsonWriter = ReflectionJsonWriter;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-scalar-default.js
var require_reflection_scalar_default = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-scalar-default.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectionScalarDefault = void 0;
    var reflection_info_1 = require_reflection_info();
    var reflection_long_convert_1 = require_reflection_long_convert();
    var pb_long_1 = require_pb_long();
    function reflectionScalarDefault(type, longType = reflection_info_1.LongType.STRING) {
      switch (type) {
        case reflection_info_1.ScalarType.BOOL:
          return false;
        case reflection_info_1.ScalarType.UINT64:
        case reflection_info_1.ScalarType.FIXED64:
          return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbULong.ZERO, longType);
        case reflection_info_1.ScalarType.INT64:
        case reflection_info_1.ScalarType.SFIXED64:
        case reflection_info_1.ScalarType.SINT64:
          return reflection_long_convert_1.reflectionLongConvert(pb_long_1.PbLong.ZERO, longType);
        case reflection_info_1.ScalarType.DOUBLE:
        case reflection_info_1.ScalarType.FLOAT:
          return 0;
        case reflection_info_1.ScalarType.BYTES:
          return new Uint8Array(0);
        case reflection_info_1.ScalarType.STRING:
          return "";
        default:
          return 0;
      }
    }
    __name(reflectionScalarDefault, "reflectionScalarDefault");
    exports.reflectionScalarDefault = reflectionScalarDefault;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-binary-reader.js
var require_reflection_binary_reader = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-binary-reader.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReflectionBinaryReader = void 0;
    var binary_format_contract_1 = require_binary_format_contract();
    var reflection_info_1 = require_reflection_info();
    var reflection_long_convert_1 = require_reflection_long_convert();
    var reflection_scalar_default_1 = require_reflection_scalar_default();
    var ReflectionBinaryReader = class {
      static {
        __name(this, "ReflectionBinaryReader");
      }
      constructor(info) {
        this.info = info;
      }
      prepare() {
        var _a;
        if (!this.fieldNoToField) {
          const fieldsInput = (_a = this.info.fields) !== null && _a !== void 0 ? _a : [];
          this.fieldNoToField = new Map(fieldsInput.map((field) => [field.no, field]));
        }
      }
      /**
       * Reads a message from binary format into the target message.
       *
       * Repeated fields are appended. Map entries are added, overwriting
       * existing keys.
       *
       * If a message field is already present, it will be merged with the
       * new data.
       */
      read(reader, message, options, length) {
        this.prepare();
        const end = length === void 0 ? reader.len : reader.pos + length;
        while (reader.pos < end) {
          const [fieldNo, wireType] = reader.tag(), field = this.fieldNoToField.get(fieldNo);
          if (!field) {
            let u = options.readUnknownField;
            if (u == "throw")
              throw new Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.info.typeName}`);
            let d = reader.skip(wireType);
            if (u !== false)
              (u === true ? binary_format_contract_1.UnknownFieldHandler.onRead : u)(this.info.typeName, message, fieldNo, wireType, d);
            continue;
          }
          let target = message, repeated = field.repeat, localName = field.localName;
          if (field.oneof) {
            target = target[field.oneof];
            if (target.oneofKind !== localName)
              target = message[field.oneof] = {
                oneofKind: localName
              };
          }
          switch (field.kind) {
            case "scalar":
            case "enum":
              let T = field.kind == "enum" ? reflection_info_1.ScalarType.INT32 : field.T;
              let L = field.kind == "scalar" ? field.L : void 0;
              if (repeated) {
                let arr = target[localName];
                if (wireType == binary_format_contract_1.WireType.LengthDelimited && T != reflection_info_1.ScalarType.STRING && T != reflection_info_1.ScalarType.BYTES) {
                  let e = reader.uint32() + reader.pos;
                  while (reader.pos < e)
                    arr.push(this.scalar(reader, T, L));
                } else
                  arr.push(this.scalar(reader, T, L));
              } else
                target[localName] = this.scalar(reader, T, L);
              break;
            case "message":
              if (repeated) {
                let arr = target[localName];
                let msg = field.T().internalBinaryRead(reader, reader.uint32(), options);
                arr.push(msg);
              } else
                target[localName] = field.T().internalBinaryRead(reader, reader.uint32(), options, target[localName]);
              break;
            case "map":
              let [mapKey, mapVal] = this.mapEntry(field, reader, options);
              target[localName][mapKey] = mapVal;
              break;
          }
        }
      }
      /**
       * Read a map field, expecting key field = 1, value field = 2
       */
      mapEntry(field, reader, options) {
        let length = reader.uint32();
        let end = reader.pos + length;
        let key = void 0;
        let val = void 0;
        while (reader.pos < end) {
          let [fieldNo, wireType] = reader.tag();
          switch (fieldNo) {
            case 1:
              if (field.K == reflection_info_1.ScalarType.BOOL)
                key = reader.bool().toString();
              else
                key = this.scalar(reader, field.K, reflection_info_1.LongType.STRING);
              break;
            case 2:
              switch (field.V.kind) {
                case "scalar":
                  val = this.scalar(reader, field.V.T, field.V.L);
                  break;
                case "enum":
                  val = reader.int32();
                  break;
                case "message":
                  val = field.V.T().internalBinaryRead(reader, reader.uint32(), options);
                  break;
              }
              break;
            default:
              throw new Error(`Unknown field ${fieldNo} (wire type ${wireType}) in map entry for ${this.info.typeName}#${field.name}`);
          }
        }
        if (key === void 0) {
          let keyRaw = reflection_scalar_default_1.reflectionScalarDefault(field.K);
          key = field.K == reflection_info_1.ScalarType.BOOL ? keyRaw.toString() : keyRaw;
        }
        if (val === void 0)
          switch (field.V.kind) {
            case "scalar":
              val = reflection_scalar_default_1.reflectionScalarDefault(field.V.T, field.V.L);
              break;
            case "enum":
              val = 0;
              break;
            case "message":
              val = field.V.T().create();
              break;
          }
        return [key, val];
      }
      scalar(reader, type, longType) {
        switch (type) {
          case reflection_info_1.ScalarType.INT32:
            return reader.int32();
          case reflection_info_1.ScalarType.STRING:
            return reader.string();
          case reflection_info_1.ScalarType.BOOL:
            return reader.bool();
          case reflection_info_1.ScalarType.DOUBLE:
            return reader.double();
          case reflection_info_1.ScalarType.FLOAT:
            return reader.float();
          case reflection_info_1.ScalarType.INT64:
            return reflection_long_convert_1.reflectionLongConvert(reader.int64(), longType);
          case reflection_info_1.ScalarType.UINT64:
            return reflection_long_convert_1.reflectionLongConvert(reader.uint64(), longType);
          case reflection_info_1.ScalarType.FIXED64:
            return reflection_long_convert_1.reflectionLongConvert(reader.fixed64(), longType);
          case reflection_info_1.ScalarType.FIXED32:
            return reader.fixed32();
          case reflection_info_1.ScalarType.BYTES:
            return reader.bytes();
          case reflection_info_1.ScalarType.UINT32:
            return reader.uint32();
          case reflection_info_1.ScalarType.SFIXED32:
            return reader.sfixed32();
          case reflection_info_1.ScalarType.SFIXED64:
            return reflection_long_convert_1.reflectionLongConvert(reader.sfixed64(), longType);
          case reflection_info_1.ScalarType.SINT32:
            return reader.sint32();
          case reflection_info_1.ScalarType.SINT64:
            return reflection_long_convert_1.reflectionLongConvert(reader.sint64(), longType);
        }
      }
    };
    exports.ReflectionBinaryReader = ReflectionBinaryReader;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-binary-writer.js
var require_reflection_binary_writer = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-binary-writer.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ReflectionBinaryWriter = void 0;
    var binary_format_contract_1 = require_binary_format_contract();
    var reflection_info_1 = require_reflection_info();
    var assert_1 = require_assert();
    var pb_long_1 = require_pb_long();
    var ReflectionBinaryWriter = class {
      static {
        __name(this, "ReflectionBinaryWriter");
      }
      constructor(info) {
        this.info = info;
      }
      prepare() {
        if (!this.fields) {
          const fieldsInput = this.info.fields ? this.info.fields.concat() : [];
          this.fields = fieldsInput.sort((a, b) => a.no - b.no);
        }
      }
      /**
       * Writes the message to binary format.
       */
      write(message, writer, options) {
        this.prepare();
        for (const field of this.fields) {
          let value2, emitDefault, repeated = field.repeat, localName = field.localName;
          if (field.oneof) {
            const group = message[field.oneof];
            if (group.oneofKind !== localName)
              continue;
            value2 = group[localName];
            emitDefault = true;
          } else {
            value2 = message[localName];
            emitDefault = false;
          }
          switch (field.kind) {
            case "scalar":
            case "enum":
              let T = field.kind == "enum" ? reflection_info_1.ScalarType.INT32 : field.T;
              if (repeated) {
                assert_1.assert(Array.isArray(value2));
                if (repeated == reflection_info_1.RepeatType.PACKED)
                  this.packed(writer, T, field.no, value2);
                else
                  for (const item of value2)
                    this.scalar(writer, T, field.no, item, true);
              } else if (value2 === void 0)
                assert_1.assert(field.opt);
              else
                this.scalar(writer, T, field.no, value2, emitDefault || field.opt);
              break;
            case "message":
              if (repeated) {
                assert_1.assert(Array.isArray(value2));
                for (const item of value2)
                  this.message(writer, options, field.T(), field.no, item);
              } else {
                this.message(writer, options, field.T(), field.no, value2);
              }
              break;
            case "map":
              assert_1.assert(typeof value2 == "object" && value2 !== null);
              for (const [key, val] of Object.entries(value2))
                this.mapEntry(writer, options, field, key, val);
              break;
          }
        }
        let u = options.writeUnknownFields;
        if (u !== false)
          (u === true ? binary_format_contract_1.UnknownFieldHandler.onWrite : u)(this.info.typeName, message, writer);
      }
      mapEntry(writer, options, field, key, value2) {
        writer.tag(field.no, binary_format_contract_1.WireType.LengthDelimited);
        writer.fork();
        let keyValue = key;
        switch (field.K) {
          case reflection_info_1.ScalarType.INT32:
          case reflection_info_1.ScalarType.FIXED32:
          case reflection_info_1.ScalarType.UINT32:
          case reflection_info_1.ScalarType.SFIXED32:
          case reflection_info_1.ScalarType.SINT32:
            keyValue = Number.parseInt(key);
            break;
          case reflection_info_1.ScalarType.BOOL:
            assert_1.assert(key == "true" || key == "false");
            keyValue = key == "true";
            break;
        }
        this.scalar(writer, field.K, 1, keyValue, true);
        switch (field.V.kind) {
          case "scalar":
            this.scalar(writer, field.V.T, 2, value2, true);
            break;
          case "enum":
            this.scalar(writer, reflection_info_1.ScalarType.INT32, 2, value2, true);
            break;
          case "message":
            this.message(writer, options, field.V.T(), 2, value2);
            break;
        }
        writer.join();
      }
      message(writer, options, handler, fieldNo, value2) {
        if (value2 === void 0)
          return;
        handler.internalBinaryWrite(value2, writer.tag(fieldNo, binary_format_contract_1.WireType.LengthDelimited).fork(), options);
        writer.join();
      }
      /**
       * Write a single scalar value.
       */
      scalar(writer, type, fieldNo, value2, emitDefault) {
        let [wireType, method, isDefault] = this.scalarInfo(type, value2);
        if (!isDefault || emitDefault) {
          writer.tag(fieldNo, wireType);
          writer[method](value2);
        }
      }
      /**
       * Write an array of scalar values in packed format.
       */
      packed(writer, type, fieldNo, value2) {
        if (!value2.length)
          return;
        assert_1.assert(type !== reflection_info_1.ScalarType.BYTES && type !== reflection_info_1.ScalarType.STRING);
        writer.tag(fieldNo, binary_format_contract_1.WireType.LengthDelimited);
        writer.fork();
        let [, method] = this.scalarInfo(type);
        for (let i = 0; i < value2.length; i++)
          writer[method](value2[i]);
        writer.join();
      }
      /**
       * Get information for writing a scalar value.
       *
       * Returns tuple:
       * [0]: appropriate WireType
       * [1]: name of the appropriate method of IBinaryWriter
       * [2]: whether the given value is a default value
       *
       * If argument `value` is omitted, [2] is always false.
       */
      scalarInfo(type, value2) {
        let t = binary_format_contract_1.WireType.Varint;
        let m;
        let i = value2 === void 0;
        let d = value2 === 0;
        switch (type) {
          case reflection_info_1.ScalarType.INT32:
            m = "int32";
            break;
          case reflection_info_1.ScalarType.STRING:
            d = i || !value2.length;
            t = binary_format_contract_1.WireType.LengthDelimited;
            m = "string";
            break;
          case reflection_info_1.ScalarType.BOOL:
            d = value2 === false;
            m = "bool";
            break;
          case reflection_info_1.ScalarType.UINT32:
            m = "uint32";
            break;
          case reflection_info_1.ScalarType.DOUBLE:
            t = binary_format_contract_1.WireType.Bit64;
            m = "double";
            break;
          case reflection_info_1.ScalarType.FLOAT:
            t = binary_format_contract_1.WireType.Bit32;
            m = "float";
            break;
          case reflection_info_1.ScalarType.INT64:
            d = i || pb_long_1.PbLong.from(value2).isZero();
            m = "int64";
            break;
          case reflection_info_1.ScalarType.UINT64:
            d = i || pb_long_1.PbULong.from(value2).isZero();
            m = "uint64";
            break;
          case reflection_info_1.ScalarType.FIXED64:
            d = i || pb_long_1.PbULong.from(value2).isZero();
            t = binary_format_contract_1.WireType.Bit64;
            m = "fixed64";
            break;
          case reflection_info_1.ScalarType.BYTES:
            d = i || !value2.byteLength;
            t = binary_format_contract_1.WireType.LengthDelimited;
            m = "bytes";
            break;
          case reflection_info_1.ScalarType.FIXED32:
            t = binary_format_contract_1.WireType.Bit32;
            m = "fixed32";
            break;
          case reflection_info_1.ScalarType.SFIXED32:
            t = binary_format_contract_1.WireType.Bit32;
            m = "sfixed32";
            break;
          case reflection_info_1.ScalarType.SFIXED64:
            d = i || pb_long_1.PbLong.from(value2).isZero();
            t = binary_format_contract_1.WireType.Bit64;
            m = "sfixed64";
            break;
          case reflection_info_1.ScalarType.SINT32:
            m = "sint32";
            break;
          case reflection_info_1.ScalarType.SINT64:
            d = i || pb_long_1.PbLong.from(value2).isZero();
            m = "sint64";
            break;
        }
        return [t, m, i || d];
      }
    };
    exports.ReflectionBinaryWriter = ReflectionBinaryWriter;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-create.js
var require_reflection_create = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-create.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectionCreate = void 0;
    var reflection_scalar_default_1 = require_reflection_scalar_default();
    var message_type_contract_1 = require_message_type_contract();
    function reflectionCreate(type) {
      const msg = type.messagePrototype ? Object.create(type.messagePrototype) : Object.defineProperty({}, message_type_contract_1.MESSAGE_TYPE, { value: type });
      for (let field of type.fields) {
        let name = field.localName;
        if (field.opt)
          continue;
        if (field.oneof)
          msg[field.oneof] = { oneofKind: void 0 };
        else if (field.repeat)
          msg[name] = [];
        else
          switch (field.kind) {
            case "scalar":
              msg[name] = reflection_scalar_default_1.reflectionScalarDefault(field.T, field.L);
              break;
            case "enum":
              msg[name] = 0;
              break;
            case "map":
              msg[name] = {};
              break;
          }
      }
      return msg;
    }
    __name(reflectionCreate, "reflectionCreate");
    exports.reflectionCreate = reflectionCreate;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-merge-partial.js
var require_reflection_merge_partial = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-merge-partial.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectionMergePartial = void 0;
    function reflectionMergePartial2(info, target, source) {
      let fieldValue, input = source, output;
      for (let field of info.fields) {
        let name = field.localName;
        if (field.oneof) {
          const group = input[field.oneof];
          if ((group === null || group === void 0 ? void 0 : group.oneofKind) == void 0) {
            continue;
          }
          fieldValue = group[name];
          output = target[field.oneof];
          output.oneofKind = group.oneofKind;
          if (fieldValue == void 0) {
            delete output[name];
            continue;
          }
        } else {
          fieldValue = input[name];
          output = target;
          if (fieldValue == void 0) {
            continue;
          }
        }
        if (field.repeat)
          output[name].length = fieldValue.length;
        switch (field.kind) {
          case "scalar":
          case "enum":
            if (field.repeat)
              for (let i = 0; i < fieldValue.length; i++)
                output[name][i] = fieldValue[i];
            else
              output[name] = fieldValue;
            break;
          case "message":
            let T = field.T();
            if (field.repeat)
              for (let i = 0; i < fieldValue.length; i++)
                output[name][i] = T.create(fieldValue[i]);
            else if (output[name] === void 0)
              output[name] = T.create(fieldValue);
            else
              T.mergePartial(output[name], fieldValue);
            break;
          case "map":
            switch (field.V.kind) {
              case "scalar":
              case "enum":
                Object.assign(output[name], fieldValue);
                break;
              case "message":
                let T2 = field.V.T();
                for (let k of Object.keys(fieldValue))
                  output[name][k] = T2.create(fieldValue[k]);
                break;
            }
            break;
        }
      }
    }
    __name(reflectionMergePartial2, "reflectionMergePartial");
    exports.reflectionMergePartial = reflectionMergePartial2;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-equals.js
var require_reflection_equals = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-equals.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.reflectionEquals = void 0;
    var reflection_info_1 = require_reflection_info();
    function reflectionEquals(info, a, b) {
      if (a === b)
        return true;
      if (!a || !b)
        return false;
      for (let field of info.fields) {
        let localName = field.localName;
        let val_a = field.oneof ? a[field.oneof][localName] : a[localName];
        let val_b = field.oneof ? b[field.oneof][localName] : b[localName];
        switch (field.kind) {
          case "enum":
          case "scalar":
            let t = field.kind == "enum" ? reflection_info_1.ScalarType.INT32 : field.T;
            if (!(field.repeat ? repeatedPrimitiveEq(t, val_a, val_b) : primitiveEq(t, val_a, val_b)))
              return false;
            break;
          case "map":
            if (!(field.V.kind == "message" ? repeatedMsgEq(field.V.T(), objectValues(val_a), objectValues(val_b)) : repeatedPrimitiveEq(field.V.kind == "enum" ? reflection_info_1.ScalarType.INT32 : field.V.T, objectValues(val_a), objectValues(val_b))))
              return false;
            break;
          case "message":
            let T = field.T();
            if (!(field.repeat ? repeatedMsgEq(T, val_a, val_b) : T.equals(val_a, val_b)))
              return false;
            break;
        }
      }
      return true;
    }
    __name(reflectionEquals, "reflectionEquals");
    exports.reflectionEquals = reflectionEquals;
    var objectValues = Object.values;
    function primitiveEq(type, a, b) {
      if (a === b)
        return true;
      if (type !== reflection_info_1.ScalarType.BYTES)
        return false;
      let ba = a;
      let bb = b;
      if (ba.length !== bb.length)
        return false;
      for (let i = 0; i < ba.length; i++)
        if (ba[i] != bb[i])
          return false;
      return true;
    }
    __name(primitiveEq, "primitiveEq");
    function repeatedPrimitiveEq(type, a, b) {
      if (a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (!primitiveEq(type, a[i], b[i]))
          return false;
      return true;
    }
    __name(repeatedPrimitiveEq, "repeatedPrimitiveEq");
    function repeatedMsgEq(type, a, b) {
      if (a.length !== b.length)
        return false;
      for (let i = 0; i < a.length; i++)
        if (!type.equals(a[i], b[i]))
          return false;
      return true;
    }
    __name(repeatedMsgEq, "repeatedMsgEq");
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/message-type.js
var require_message_type = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/message-type.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessageType = void 0;
    var message_type_contract_1 = require_message_type_contract();
    var reflection_info_1 = require_reflection_info();
    var reflection_type_check_1 = require_reflection_type_check();
    var reflection_json_reader_1 = require_reflection_json_reader();
    var reflection_json_writer_1 = require_reflection_json_writer();
    var reflection_binary_reader_1 = require_reflection_binary_reader();
    var reflection_binary_writer_1 = require_reflection_binary_writer();
    var reflection_create_1 = require_reflection_create();
    var reflection_merge_partial_1 = require_reflection_merge_partial();
    var json_typings_1 = require_json_typings();
    var json_format_contract_1 = require_json_format_contract();
    var reflection_equals_1 = require_reflection_equals();
    var binary_writer_1 = require_binary_writer();
    var binary_reader_1 = require_binary_reader();
    var baseDescriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf({}));
    var messageTypeDescriptor = baseDescriptors[message_type_contract_1.MESSAGE_TYPE] = {};
    var MessageType2 = class {
      static {
        __name(this, "MessageType");
      }
      constructor(name, fields, options) {
        this.defaultCheckDepth = 16;
        this.typeName = name;
        this.fields = fields.map(reflection_info_1.normalizeFieldInfo);
        this.options = options !== null && options !== void 0 ? options : {};
        messageTypeDescriptor.value = this;
        this.messagePrototype = Object.create(null, baseDescriptors);
        this.refTypeCheck = new reflection_type_check_1.ReflectionTypeCheck(this);
        this.refJsonReader = new reflection_json_reader_1.ReflectionJsonReader(this);
        this.refJsonWriter = new reflection_json_writer_1.ReflectionJsonWriter(this);
        this.refBinReader = new reflection_binary_reader_1.ReflectionBinaryReader(this);
        this.refBinWriter = new reflection_binary_writer_1.ReflectionBinaryWriter(this);
      }
      create(value2) {
        let message = reflection_create_1.reflectionCreate(this);
        if (value2 !== void 0) {
          reflection_merge_partial_1.reflectionMergePartial(this, message, value2);
        }
        return message;
      }
      /**
       * Clone the message.
       *
       * Unknown fields are discarded.
       */
      clone(message) {
        let copy = this.create();
        reflection_merge_partial_1.reflectionMergePartial(this, copy, message);
        return copy;
      }
      /**
       * Determines whether two message of the same type have the same field values.
       * Checks for deep equality, traversing repeated fields, oneof groups, maps
       * and messages recursively.
       * Will also return true if both messages are `undefined`.
       */
      equals(a, b) {
        return reflection_equals_1.reflectionEquals(this, a, b);
      }
      /**
       * Is the given value assignable to our message type
       * and contains no [excess properties](https://www.typescriptlang.org/docs/handbook/interfaces.html#excess-property-checks)?
       */
      is(arg, depth = this.defaultCheckDepth) {
        return this.refTypeCheck.is(arg, depth, false);
      }
      /**
       * Is the given value assignable to our message type,
       * regardless of [excess properties](https://www.typescriptlang.org/docs/handbook/interfaces.html#excess-property-checks)?
       */
      isAssignable(arg, depth = this.defaultCheckDepth) {
        return this.refTypeCheck.is(arg, depth, true);
      }
      /**
       * Copy partial data into the target message.
       */
      mergePartial(target, source) {
        reflection_merge_partial_1.reflectionMergePartial(this, target, source);
      }
      /**
       * Create a new message from binary format.
       */
      fromBinary(data, options) {
        let opt = binary_reader_1.binaryReadOptions(options);
        return this.internalBinaryRead(opt.readerFactory(data), data.byteLength, opt);
      }
      /**
       * Read a new message from a JSON value.
       */
      fromJson(json, options) {
        return this.internalJsonRead(json, json_format_contract_1.jsonReadOptions(options));
      }
      /**
       * Read a new message from a JSON string.
       * This is equivalent to `T.fromJson(JSON.parse(json))`.
       */
      fromJsonString(json, options) {
        let value2 = JSON.parse(json);
        return this.fromJson(value2, options);
      }
      /**
       * Write the message to canonical JSON value.
       */
      toJson(message, options) {
        return this.internalJsonWrite(message, json_format_contract_1.jsonWriteOptions(options));
      }
      /**
       * Convert the message to canonical JSON string.
       * This is equivalent to `JSON.stringify(T.toJson(t))`
       */
      toJsonString(message, options) {
        var _a;
        let value2 = this.toJson(message, options);
        return JSON.stringify(value2, null, (_a = options === null || options === void 0 ? void 0 : options.prettySpaces) !== null && _a !== void 0 ? _a : 0);
      }
      /**
       * Write the message to binary format.
       */
      toBinary(message, options) {
        let opt = binary_writer_1.binaryWriteOptions(options);
        return this.internalBinaryWrite(message, opt.writerFactory(), opt).finish();
      }
      /**
       * This is an internal method. If you just want to read a message from
       * JSON, use `fromJson()` or `fromJsonString()`.
       *
       * Reads JSON value and merges the fields into the target
       * according to protobuf rules. If the target is omitted,
       * a new instance is created first.
       */
      internalJsonRead(json, options, target) {
        if (json !== null && typeof json == "object" && !Array.isArray(json)) {
          let message = target !== null && target !== void 0 ? target : this.create();
          this.refJsonReader.read(json, message, options);
          return message;
        }
        throw new Error(`Unable to parse message ${this.typeName} from JSON ${json_typings_1.typeofJsonValue(json)}.`);
      }
      /**
       * This is an internal method. If you just want to write a message
       * to JSON, use `toJson()` or `toJsonString().
       *
       * Writes JSON value and returns it.
       */
      internalJsonWrite(message, options) {
        return this.refJsonWriter.write(message, options);
      }
      /**
       * This is an internal method. If you just want to write a message
       * in binary format, use `toBinary()`.
       *
       * Serializes the message in binary format and appends it to the given
       * writer. Returns passed writer.
       */
      internalBinaryWrite(message, writer, options) {
        this.refBinWriter.write(message, writer, options);
        return writer;
      }
      /**
       * This is an internal method. If you just want to read a message from
       * binary data, use `fromBinary()`.
       *
       * Reads data from binary format and merges the fields into
       * the target according to protobuf rules. If the target is
       * omitted, a new instance is created first.
       */
      internalBinaryRead(reader, length, options, target) {
        let message = target !== null && target !== void 0 ? target : this.create();
        this.refBinReader.read(reader, message, options, length);
        return message;
      }
    };
    exports.MessageType = MessageType2;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-contains-message-type.js
var require_reflection_contains_message_type = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/reflection-contains-message-type.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.containsMessageType = void 0;
    var message_type_contract_1 = require_message_type_contract();
    function containsMessageType(msg) {
      return msg[message_type_contract_1.MESSAGE_TYPE] != null;
    }
    __name(containsMessageType, "containsMessageType");
    exports.containsMessageType = containsMessageType;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/enum-object.js
var require_enum_object = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/enum-object.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listEnumNumbers = exports.listEnumNames = exports.listEnumValues = exports.isEnumObject = void 0;
    function isEnumObject(arg) {
      if (typeof arg != "object" || arg === null) {
        return false;
      }
      if (!arg.hasOwnProperty(0)) {
        return false;
      }
      for (let k of Object.keys(arg)) {
        let num = parseInt(k);
        if (!Number.isNaN(num)) {
          let nam = arg[num];
          if (nam === void 0)
            return false;
          if (arg[nam] !== num)
            return false;
        } else {
          let num2 = arg[k];
          if (num2 === void 0)
            return false;
          if (typeof num2 !== "number")
            return false;
          if (arg[num2] === void 0)
            return false;
        }
      }
      return true;
    }
    __name(isEnumObject, "isEnumObject");
    exports.isEnumObject = isEnumObject;
    function listEnumValues(enumObject) {
      if (!isEnumObject(enumObject))
        throw new Error("not a typescript enum object");
      let values = [];
      for (let [name, number] of Object.entries(enumObject))
        if (typeof number == "number")
          values.push({ name, number });
      return values;
    }
    __name(listEnumValues, "listEnumValues");
    exports.listEnumValues = listEnumValues;
    function listEnumNames(enumObject) {
      return listEnumValues(enumObject).map((val) => val.name);
    }
    __name(listEnumNames, "listEnumNames");
    exports.listEnumNames = listEnumNames;
    function listEnumNumbers(enumObject) {
      return listEnumValues(enumObject).map((val) => val.number).filter((num, index, arr) => arr.indexOf(num) == index);
    }
    __name(listEnumNumbers, "listEnumNumbers");
    exports.listEnumNumbers = listEnumNumbers;
  }
});

// ../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/index.js
var require_commonjs = __commonJS({
  "../../node_modules/.pnpm/@protobuf-ts+runtime@2.11.1/node_modules/@protobuf-ts/runtime/build/commonjs/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    var json_typings_1 = require_json_typings();
    Object.defineProperty(exports, "typeofJsonValue", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return json_typings_1.typeofJsonValue;
    }, "get") });
    Object.defineProperty(exports, "isJsonObject", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return json_typings_1.isJsonObject;
    }, "get") });
    var base64_1 = require_base64();
    Object.defineProperty(exports, "base64decode", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return base64_1.base64decode;
    }, "get") });
    Object.defineProperty(exports, "base64encode", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return base64_1.base64encode;
    }, "get") });
    var protobufjs_utf8_1 = require_protobufjs_utf8();
    Object.defineProperty(exports, "utf8read", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return protobufjs_utf8_1.utf8read;
    }, "get") });
    var binary_format_contract_1 = require_binary_format_contract();
    Object.defineProperty(exports, "WireType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_format_contract_1.WireType;
    }, "get") });
    Object.defineProperty(exports, "mergeBinaryOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_format_contract_1.mergeBinaryOptions;
    }, "get") });
    Object.defineProperty(exports, "UnknownFieldHandler", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_format_contract_1.UnknownFieldHandler;
    }, "get") });
    var binary_reader_1 = require_binary_reader();
    Object.defineProperty(exports, "BinaryReader", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_reader_1.BinaryReader;
    }, "get") });
    Object.defineProperty(exports, "binaryReadOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_reader_1.binaryReadOptions;
    }, "get") });
    var binary_writer_1 = require_binary_writer();
    Object.defineProperty(exports, "BinaryWriter", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_writer_1.BinaryWriter;
    }, "get") });
    Object.defineProperty(exports, "binaryWriteOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return binary_writer_1.binaryWriteOptions;
    }, "get") });
    var pb_long_1 = require_pb_long();
    Object.defineProperty(exports, "PbLong", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return pb_long_1.PbLong;
    }, "get") });
    Object.defineProperty(exports, "PbULong", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return pb_long_1.PbULong;
    }, "get") });
    var json_format_contract_1 = require_json_format_contract();
    Object.defineProperty(exports, "jsonReadOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return json_format_contract_1.jsonReadOptions;
    }, "get") });
    Object.defineProperty(exports, "jsonWriteOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return json_format_contract_1.jsonWriteOptions;
    }, "get") });
    Object.defineProperty(exports, "mergeJsonOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return json_format_contract_1.mergeJsonOptions;
    }, "get") });
    var message_type_contract_1 = require_message_type_contract();
    Object.defineProperty(exports, "MESSAGE_TYPE", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return message_type_contract_1.MESSAGE_TYPE;
    }, "get") });
    var message_type_1 = require_message_type();
    Object.defineProperty(exports, "MessageType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return message_type_1.MessageType;
    }, "get") });
    var reflection_info_1 = require_reflection_info();
    Object.defineProperty(exports, "ScalarType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.ScalarType;
    }, "get") });
    Object.defineProperty(exports, "LongType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.LongType;
    }, "get") });
    Object.defineProperty(exports, "RepeatType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.RepeatType;
    }, "get") });
    Object.defineProperty(exports, "normalizeFieldInfo", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.normalizeFieldInfo;
    }, "get") });
    Object.defineProperty(exports, "readFieldOptions", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.readFieldOptions;
    }, "get") });
    Object.defineProperty(exports, "readFieldOption", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.readFieldOption;
    }, "get") });
    Object.defineProperty(exports, "readMessageOption", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_info_1.readMessageOption;
    }, "get") });
    var reflection_type_check_1 = require_reflection_type_check();
    Object.defineProperty(exports, "ReflectionTypeCheck", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_type_check_1.ReflectionTypeCheck;
    }, "get") });
    var reflection_create_1 = require_reflection_create();
    Object.defineProperty(exports, "reflectionCreate", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_create_1.reflectionCreate;
    }, "get") });
    var reflection_scalar_default_1 = require_reflection_scalar_default();
    Object.defineProperty(exports, "reflectionScalarDefault", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_scalar_default_1.reflectionScalarDefault;
    }, "get") });
    var reflection_merge_partial_1 = require_reflection_merge_partial();
    Object.defineProperty(exports, "reflectionMergePartial", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_merge_partial_1.reflectionMergePartial;
    }, "get") });
    var reflection_equals_1 = require_reflection_equals();
    Object.defineProperty(exports, "reflectionEquals", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_equals_1.reflectionEquals;
    }, "get") });
    var reflection_binary_reader_1 = require_reflection_binary_reader();
    Object.defineProperty(exports, "ReflectionBinaryReader", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_binary_reader_1.ReflectionBinaryReader;
    }, "get") });
    var reflection_binary_writer_1 = require_reflection_binary_writer();
    Object.defineProperty(exports, "ReflectionBinaryWriter", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_binary_writer_1.ReflectionBinaryWriter;
    }, "get") });
    var reflection_json_reader_1 = require_reflection_json_reader();
    Object.defineProperty(exports, "ReflectionJsonReader", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_json_reader_1.ReflectionJsonReader;
    }, "get") });
    var reflection_json_writer_1 = require_reflection_json_writer();
    Object.defineProperty(exports, "ReflectionJsonWriter", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_json_writer_1.ReflectionJsonWriter;
    }, "get") });
    var reflection_contains_message_type_1 = require_reflection_contains_message_type();
    Object.defineProperty(exports, "containsMessageType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return reflection_contains_message_type_1.containsMessageType;
    }, "get") });
    var oneof_1 = require_oneof();
    Object.defineProperty(exports, "isOneofGroup", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oneof_1.isOneofGroup;
    }, "get") });
    Object.defineProperty(exports, "setOneofValue", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oneof_1.setOneofValue;
    }, "get") });
    Object.defineProperty(exports, "getOneofValue", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oneof_1.getOneofValue;
    }, "get") });
    Object.defineProperty(exports, "clearOneofValue", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oneof_1.clearOneofValue;
    }, "get") });
    Object.defineProperty(exports, "getSelectedOneofValue", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oneof_1.getSelectedOneofValue;
    }, "get") });
    var enum_object_1 = require_enum_object();
    Object.defineProperty(exports, "listEnumValues", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return enum_object_1.listEnumValues;
    }, "get") });
    Object.defineProperty(exports, "listEnumNames", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return enum_object_1.listEnumNames;
    }, "get") });
    Object.defineProperty(exports, "listEnumNumbers", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return enum_object_1.listEnumNumbers;
    }, "get") });
    Object.defineProperty(exports, "isEnumObject", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return enum_object_1.isEnumObject;
    }, "get") });
    var lower_camel_case_1 = require_lower_camel_case();
    Object.defineProperty(exports, "lowerCamelCase", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return lower_camel_case_1.lowerCamelCase;
    }, "get") });
    var assert_1 = require_assert();
    Object.defineProperty(exports, "assert", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return assert_1.assert;
    }, "get") });
    Object.defineProperty(exports, "assertNever", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return assert_1.assertNever;
    }, "get") });
    Object.defineProperty(exports, "assertInt32", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return assert_1.assertInt32;
    }, "get") });
    Object.defineProperty(exports, "assertUInt32", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return assert_1.assertUInt32;
    }, "get") });
    Object.defineProperty(exports, "assertFloat32", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return assert_1.assertFloat32;
    }, "get") });
  }
});

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/redacted.js
init_esm();
var redactedRegistry = /* @__PURE__ */ new WeakMap();
var NodeInspectSymbol = Symbol.for("nodejs.util.inspect.custom");
var proto = {
  toString() {
    return "<redacted>";
  },
  toJSON() {
    return "<redacted>";
  },
  [NodeInspectSymbol]() {
    return "<redacted>";
  }
};
var make = /* @__PURE__ */ __name((value2) => {
  const redacted = Object.create(proto);
  redactedRegistry.set(redacted, value2);
  return redacted;
}, "make");
var value = /* @__PURE__ */ __name((self) => {
  if (redactedRegistry.has(self)) {
    return redactedRegistry.get(self);
  } else {
    throw new Error("Unable to get redacted value");
  }
}, "value");

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/stream/runtime.js
init_esm();

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/version.js
init_esm();
var VERSION = "0.22.5";

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/stream/runtime.js
function detectRuntime() {
  if (typeof Deno !== "undefined") {
    return "deno";
  }
  if (typeof Bun !== "undefined") {
    return "bun";
  }
  if (typeof WebSocketPair !== "undefined") {
    return "workerd";
  }
  if (typeof process !== "undefined" && process.versions?.node !== void 0) {
    return "node";
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    return "browser";
  }
  return "unknown";
}
__name(detectRuntime, "detectRuntime");
function supportsHttp2() {
  const runtime = detectRuntime();
  switch (runtime) {
    case "node":
    case "deno":
      return true;
    case "bun":
      return false;
    case "browser":
    case "workerd":
      return false;
    default:
      return false;
  }
}
__name(supportsHttp2, "supportsHttp2");
function canSetUserAgentHeader() {
  const runtime = detectRuntime();
  switch (runtime) {
    case "node":
    case "bun":
      return true;
    default:
      return false;
  }
}
__name(canSetUserAgentHeader, "canSetUserAgentHeader");
var DEFAULT_USER_AGENT = `s2-sdk-typescript/${VERSION}`;

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/error.js
init_esm();
function getErrorCode(error) {
  if (!(error instanceof Error))
    return void 0;
  const err2 = error;
  if (typeof err2.code === "string")
    return err2.code;
  if (err2.cause && typeof err2.cause === "object") {
    const cause = err2.cause;
    if (typeof cause.code === "string") {
      return cause.code;
    }
  }
  return void 0;
}
__name(getErrorCode, "getErrorCode");
function isConnectionError(error) {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  if (msg.includes("fetch failed") || msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed")) {
    return true;
  }
  const code = getErrorCode(error);
  const connectionErrorCodes = [
    "ECONNREFUSED",
    // Connection refused
    "ENOTFOUND",
    // DNS lookup failed
    "ETIMEDOUT",
    // Connection timeout
    "ENETUNREACH",
    // Network unreachable
    "EHOSTUNREACH",
    // Host unreachable
    "ECONNRESET",
    // Connection reset by peer
    "EPIPE"
    // Broken pipe
  ];
  return typeof code === "string" && connectionErrorCodes.includes(code);
}
__name(isConnectionError, "isConnectionError");
function s2Error(error) {
  if (error instanceof S2Error) {
    return error;
  }
  if (isConnectionError(error)) {
    const code = getErrorCode(error) ?? "NETWORK_ERROR";
    if (code === "ENOTFOUND") {
      return new S2Error({
        message: `DNS resolution failed (ENOTFOUND)`,
        code,
        status: 400,
        // Client error - not retryable
        origin: "sdk"
      });
    }
    return new S2Error({
      message: `Connection failed: ${code}`,
      code,
      status: 502,
      // Bad Gateway for upstream/network issues
      origin: "sdk"
    });
  }
  if (error instanceof Error && error.name === "AbortError") {
    return new S2Error({
      message: "Request cancelled",
      status: 499,
      // Client Closed Request (nginx non-standard)
      origin: "sdk"
    });
  }
  return new S2Error({
    message: error instanceof Error ? error.message : "Unknown error",
    status: 0,
    // Non-HTTP/internal error sentinel
    origin: "sdk"
  });
}
__name(s2Error, "s2Error");
async function withS2Data(fn) {
  try {
    const res = await fn();
    if (res && typeof res === "object" && (Object.prototype.hasOwnProperty.call(res, "error") || Object.prototype.hasOwnProperty.call(res, "data") || Object.prototype.hasOwnProperty.call(res, "response"))) {
      const status = res.response?.status ?? 500;
      const statusText = res.response?.statusText;
      if (res.error) {
        const err2 = res.error;
        if (typeof err2 === "object" && "message" in err2) {
          const structured = err2;
          throw new S2Error({
            message: typeof structured.message === "string" ? structured.message : statusText ?? "Error",
            code: typeof structured.code === "string" ? structured.code : void 0,
            status,
            origin: "server"
          });
        }
        throw new S2Error({
          message: statusText ?? "Request failed",
          status,
          origin: "server"
        });
      }
      if (typeof res.data !== "undefined")
        return res.data;
      if (status === 204)
        return void 0;
      throw new S2Error({
        message: "Empty response",
        status,
        origin: "server"
      });
    }
    return res;
  } catch (error) {
    throw s2Error(error);
  }
}
__name(withS2Data, "withS2Data");
var S2Error = class extends Error {
  static {
    __name(this, "S2Error");
  }
  code;
  /** HTTP status code. 0 for non-HTTP/internal errors. */
  status;
  /** Optional structured error details for diagnostics. */
  data;
  /** Origin of the error: server (HTTP response) or sdk (local). */
  origin;
  constructor({ message, code, status, data, origin }) {
    super(message);
    this.code = code;
    this.status = typeof status === "number" ? status : 0;
    this.data = data;
    this.origin = origin ?? "sdk";
    this.name = "S2Error";
  }
};
function invariantViolation(message, details) {
  return new S2Error({
    message: `Invariant violation: ${message}`,
    code: "INTERNAL_ERROR",
    status: 0,
    origin: "sdk",
    data: details
  });
}
__name(invariantViolation, "invariantViolation");
function abortedError(message = "Request cancelled") {
  return new S2Error({
    message,
    code: "ABORTED",
    status: 499,
    origin: "sdk"
  });
}
__name(abortedError, "abortedError");
var SeqNumMismatchError = class extends S2Error {
  static {
    __name(this, "SeqNumMismatchError");
  }
  /** The expected next sequence number for the stream. */
  expectedSeqNum;
  constructor({ message, code, status, expectedSeqNum }) {
    super({
      message: `${message}
Expected sequence number: ${expectedSeqNum}`,
      code,
      status,
      origin: "server"
    });
    this.name = "SeqNumMismatchError";
    this.expectedSeqNum = expectedSeqNum;
  }
};
var FencingTokenMismatchError = class extends S2Error {
  static {
    __name(this, "FencingTokenMismatchError");
  }
  /** The expected fencing token for the stream. */
  expectedFencingToken;
  constructor({ message, code, status, expectedFencingToken }) {
    super({
      message: `${message}
Expected fencing token: ${expectedFencingToken}`,
      code,
      status,
      origin: "server"
    });
    this.name = "FencingTokenMismatchError";
    this.expectedFencingToken = expectedFencingToken;
  }
};
var RangeNotSatisfiableError = class extends S2Error {
  static {
    __name(this, "RangeNotSatisfiableError");
  }
  /** The current tail position of the stream. */
  tail;
  constructor({ code, status = 416, tail } = {}) {
    const message = tail ? `Range not satisfiable: requested position is beyond the stream tail (seq_num=${tail.seq_num}). Use 'clamp: true' to start from the tail instead.` : "Range not satisfiable: requested position is beyond the stream tail. Use 'clamp: true' to start from the tail instead.";
    super({
      message,
      code,
      status,
      origin: "server"
    });
    this.name = "RangeNotSatisfiableError";
    this.tail = tail;
  }
};
function makeServerError(response, payload) {
  const status = typeof response.status === "number" ? response.status : 500;
  if (payload && typeof payload === "object" && "message" in payload) {
    const structured = payload;
    return new S2Error({
      message: typeof structured.message === "string" ? structured.message : response.statusText ?? "Error",
      code: typeof structured.code === "string" ? structured.code : void 0,
      status,
      origin: "server"
    });
  }
  let message = void 0;
  if (typeof payload === "string" && payload.trim().length > 0) {
    message = payload;
  }
  return new S2Error({
    message: message ?? response.statusText ?? "Request failed",
    status,
    origin: "server"
  });
}
__name(makeServerError, "makeServerError");
function makeAppendPreconditionError(status, json) {
  if (json && typeof json === "object") {
    if ("seq_num_mismatch" in json) {
      const expected = Number(json.seq_num_mismatch);
      return new SeqNumMismatchError({
        message: "Append condition failed: sequence number mismatch",
        code: "APPEND_CONDITION_FAILED",
        status,
        expectedSeqNum: expected
      });
    }
    if ("fencing_token_mismatch" in json) {
      const expected = String(json.fencing_token_mismatch);
      return new FencingTokenMismatchError({
        message: "Append condition failed: fencing token mismatch",
        code: "APPEND_CONDITION_FAILED",
        status,
        expectedFencingToken: expected
      });
    }
    if ("message" in json) {
      return new S2Error({
        message: json.message ?? "Append condition failed",
        status,
        origin: "server"
      });
    }
  }
  return new S2Error({
    message: "Append condition failed",
    status,
    origin: "server"
  });
}
__name(makeAppendPreconditionError, "makeAppendPreconditionError");

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/result.js
init_esm();
function ok(value2) {
  return { ok: true, value: value2 };
}
__name(ok, "ok");
function err(error) {
  return { ok: false, error };
}
__name(err, "err");
function okClose() {
  return { ok: true };
}
__name(okClose, "okClose");
function errClose(error) {
  return { ok: false, error };
}
__name(errClose, "errClose");

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/retry.js
init_esm();
var import_debug = __toESM(require_src(), 1);

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/types.js
init_esm();

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/utils.js
init_esm();
function utf8ByteLength(str) {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 127) {
      bytes += 1;
    } else if (code <= 2047) {
      bytes += 2;
    } else if (code >= 55296 && code <= 56319) {
      if (i + 1 < str.length) {
        const next = str.charCodeAt(i + 1);
        if (next >= 56320 && next <= 57343) {
          bytes += 4;
          i++;
        } else {
          bytes += 3;
        }
      } else {
        bytes += 3;
      }
    } else if (code >= 56320 && code <= 57343) {
      bytes += 3;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}
__name(utf8ByteLength, "utf8ByteLength");
function meteredBytes(record) {
  let numHeaders = 0;
  let headersSize = 0;
  if (record.headers) {
    numHeaders = record.headers.length;
    headersSize = record.headers.reduce((sum, [k, v]) => {
      const keySize = typeof k === "string" ? utf8ByteLength(k) : k.length;
      const valueSize = typeof v === "string" ? utf8ByteLength(v) : v.length;
      return sum + keySize + valueSize;
    }, 0);
  }
  const bodySize = record.body ? typeof record.body === "string" ? utf8ByteLength(record.body) : record.body.length : 0;
  return 8 + 2 * numHeaders + headersSize + bodySize;
}
__name(meteredBytes, "meteredBytes");
function isCommandRecord(record) {
  if (!record.headers || !Array.isArray(record.headers))
    return false;
  if (record.headers.length !== 1)
    return false;
  const [name] = record.headers[0];
  if (typeof name === "string")
    return name === "";
  return name.length === 0;
}
__name(isCommandRecord, "isCommandRecord");
function computeAppendRecordFormat(record) {
  let result = "string";
  if (record.body && typeof record.body !== "string") {
    result = "bytes";
  }
  if (record.headers && Array.isArray(record.headers) && record.headers.some(([k, v]) => typeof k !== "string" || typeof v !== "string")) {
    result = "bytes";
  }
  return result;
}
__name(computeAppendRecordFormat, "computeAppendRecordFormat");

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/types.js
var textEncoder = new TextEncoder();
var AppendRecord;
(function(AppendRecord3) {
  function string(params) {
    const record = {
      body: params.body,
      headers: params.headers,
      timestamp: params.timestamp,
      meteredBytes: 0
    };
    record.meteredBytes = meteredBytes(record);
    return record;
  }
  __name(string, "string");
  AppendRecord3.string = string;
  function bytes(params) {
    const record = {
      body: params.body,
      headers: params.headers,
      timestamp: params.timestamp,
      meteredBytes: 0
    };
    record.meteredBytes = meteredBytes(record);
    return record;
  }
  __name(bytes, "bytes");
  AppendRecord3.bytes = bytes;
  function fence(fencingToken, timestamp) {
    return string({
      body: fencingToken,
      headers: [["", "fence"]],
      timestamp
    });
  }
  __name(fence, "fence");
  AppendRecord3.fence = fence;
  function trim(seqNum, timestamp) {
    const buffer = new Uint8Array(8);
    const view = new DataView(buffer.buffer);
    view.setBigUint64(0, BigInt(seqNum), false);
    return bytes({
      body: buffer,
      headers: [[textEncoder.encode(""), textEncoder.encode("trim")]],
      timestamp
    });
  }
  __name(trim, "trim");
  AppendRecord3.trim = trim;
})(AppendRecord || (AppendRecord = {}));
var MAX_APPEND_RECORDS = 1e3;
var MAX_APPEND_BYTES = 1024 * 1024;
var AppendInput;
(function(AppendInput3) {
  function create(records, options) {
    if (records.length === 0) {
      throw new S2Error({
        message: "AppendInput must contain at least one record",
        origin: "sdk"
      });
    }
    if (records.length > MAX_APPEND_RECORDS) {
      throw new S2Error({
        message: `AppendInput cannot contain more than ${MAX_APPEND_RECORDS} records (got ${records.length})`,
        origin: "sdk"
      });
    }
    const totalBytes = records.reduce((sum, r) => sum + r.meteredBytes, 0);
    if (totalBytes > MAX_APPEND_BYTES) {
      throw new S2Error({
        message: `AppendInput exceeds maximum of ${MAX_APPEND_BYTES} bytes (got ${totalBytes} bytes)`,
        origin: "sdk"
      });
    }
    if (options?.fencingToken !== void 0) {
      const tokenBytes = utf8ByteLength(options.fencingToken);
      if (tokenBytes > 36) {
        throw new S2Error({
          message: "fencing token must not exceed 36 bytes in length",
          origin: "sdk",
          status: 422
        });
      }
    }
    return {
      records,
      matchSeqNum: options?.matchSeqNum === void 0 ? void 0 : Math.floor(options.matchSeqNum),
      fencingToken: options?.fencingToken,
      meteredBytes: totalBytes
    };
  }
  __name(create, "create");
  AppendInput3.create = create;
})(AppendInput || (AppendInput = {}));

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/stream/types.js
init_esm();
var BatchSubmitTicket = class {
  static {
    __name(this, "BatchSubmitTicket");
  }
  promise;
  bytes;
  numRecords;
  constructor(promise, bytes, numRecords) {
    this.promise = promise;
    this.bytes = bytes;
    this.numRecords = numRecords;
  }
  /**
   * Returns a promise that resolves with the AppendAck once the batch is durable.
   */
  ack() {
    return this.promise;
  }
};

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/retry.js
var debugWith = (0, import_debug.default)("s2:retry:with");
var debugRead = (0, import_debug.default)("s2:retry:read");
var debugSession = (0, import_debug.default)("s2:retry:session");
function hasErrorCode(err2, code) {
  return typeof err2 === "object" && err2 !== null && "code" in err2 && err2.code === code;
}
__name(hasErrorCode, "hasErrorCode");
function toSDKStreamPosition(pos) {
  return {
    seqNum: pos.seq_num,
    timestamp: new Date(pos.timestamp)
  };
}
__name(toSDKStreamPosition, "toSDKStreamPosition");
function toSDKReadRecord(record, format) {
  return {
    seqNum: record.seq_num,
    timestamp: new Date(record.timestamp),
    body: record.body ?? (format === "string" ? "" : new Uint8Array()),
    headers: record.headers ?? []
  };
}
__name(toSDKReadRecord, "toSDKReadRecord");
var DEFAULT_RETRY_CONFIG = {
  maxAttempts: 3,
  minBaseDelayMillis: 100,
  maxBaseDelayMillis: 1e3,
  appendRetryPolicy: "all",
  requestTimeoutMillis: 5e3,
  // 5 seconds
  connectionTimeoutMillis: 3e3
  // 3 seconds
};
var RETRYABLE_STATUS_CODES = /* @__PURE__ */ new Set([
  408,
  // request_timeout
  429,
  // too_many_requests
  500,
  // internal_server_error
  502,
  // bad_gateway
  503,
  // service_unavailable
  504
  // gateway_timeout
]);
function isRetryable(error) {
  if (!error.status)
    return false;
  if (RETRYABLE_STATUS_CODES.has(error.status)) {
    return true;
  }
  if (error.status >= 400 && error.status < 500) {
    return false;
  }
  return false;
}
__name(isRetryable, "isRetryable");
function calculateDelay(attempt, minBaseDelayMillis, maxBaseDelayMillis) {
  const baseDelay = Math.min(minBaseDelayMillis * Math.pow(2, attempt), maxBaseDelayMillis);
  const jitter = Math.random() * baseDelay;
  return Math.floor(baseDelay + jitter);
}
__name(calculateDelay, "calculateDelay");
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
__name(sleep, "sleep");
async function withRetries(retryConfig, fn, isPolicyCompliant = () => true) {
  const config = {
    ...DEFAULT_RETRY_CONFIG,
    ...retryConfig
  };
  if (config.maxAttempts < 1)
    config.maxAttempts = 1;
  let lastError = void 0;
  for (let attemptNo = 1; attemptNo <= config.maxAttempts; attemptNo++) {
    try {
      const result = await fn();
      if (attemptNo > 1) {
        debugWith("succeeded after %d retries", attemptNo - 1);
      }
      return result;
    } catch (error) {
      if (!(error instanceof S2Error)) {
        debugWith("non-S2Error thrown, rethrowing immediately: %s", error);
        throw error;
      }
      lastError = error;
      if (attemptNo === config.maxAttempts) {
        debugWith("max attempts exhausted, throwing error");
        break;
      }
      if (!isPolicyCompliant(config, lastError) || !isRetryable(lastError)) {
        debugWith("error not retryable, throwing immediately");
        throw error;
      }
      const delay = calculateDelay(attemptNo - 1, config.minBaseDelayMillis, config.maxBaseDelayMillis);
      debugWith("retryable error, backing off for %dms, status=%s", delay, error.status);
      await sleep(delay);
    }
  }
  throw lastError;
}
__name(withRetries, "withRetries");
var RetryReadSession = class _RetryReadSession extends ReadableStream {
  static {
    __name(this, "RetryReadSession");
  }
  _nextReadPosition = void 0;
  _lastObservedTail = void 0;
  _lastTailAtMs = void 0;
  _recordsRead = 0;
  _bytesRead = 0;
  static async create(generator, args = {}, config) {
    const retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
    let attempt = 0;
    let lastError;
    while (true) {
      try {
        const session = await generator(args);
        return new _RetryReadSession(args, generator, config, session);
      } catch (err2) {
        const error = s2Error(err2);
        lastError = error;
        const effectiveMax = Math.max(1, retryConfig.maxAttempts);
        if (isRetryable(error) && attempt < effectiveMax - 1) {
          const delay = calculateDelay(attempt, retryConfig.minBaseDelayMillis, retryConfig.maxBaseDelayMillis);
          debugRead("connection error in create, will retry after %dms, status=%s", delay, error.status);
          await sleep(delay);
          attempt++;
          continue;
        }
        throw lastError;
      }
    }
  }
  constructor(args, generator, config, initialSession) {
    const retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
    const format = args?.as ?? "string";
    let session = initialSession;
    super({
      start: /* @__PURE__ */ __name(async (controller) => {
        let nextArgs = { ...args };
        const baselineCount = args?.count;
        const baselineBytes = args?.bytes;
        const baselineWait = args?.wait;
        let attempt = 0;
        while (true) {
          if (!session) {
            debugRead("starting read session with args: %o", nextArgs);
            try {
              session = await generator(nextArgs);
            } catch (err2) {
              const error = s2Error(err2);
              const effectiveMax = Math.max(1, retryConfig.maxAttempts);
              if (isRetryable(error) && attempt < effectiveMax - 1) {
                const delay = calculateDelay(attempt, retryConfig.minBaseDelayMillis, retryConfig.maxBaseDelayMillis);
                debugRead("connection error, will retry after %dms, status=%s", delay, error.status);
                await sleep(delay);
                attempt++;
                continue;
              }
              debugRead("connection error not retryable: %s", error);
              controller.error(error);
              return;
            }
          }
          const reader = session.getReader();
          while (true) {
            const { done, value: result } = await reader.read();
            try {
              const tail = session.lastObservedTail?.();
              if (tail) {
                this._lastObservedTail = tail;
                this._lastTailAtMs = performance.now();
              }
            } catch {
            }
            if (done) {
              reader.releaseLock();
              controller.close();
              return;
            }
            if (!result.ok) {
              reader.releaseLock();
              const error = result.error;
              const effectiveMax = Math.max(1, retryConfig.maxAttempts);
              if (isRetryable(error) && attempt < effectiveMax - 1) {
                if (this._nextReadPosition) {
                  nextArgs.seq_num = this._nextReadPosition.seq_num;
                  delete nextArgs.timestamp;
                  delete nextArgs.tail_offset;
                }
                const delay = calculateDelay(attempt, retryConfig.minBaseDelayMillis, retryConfig.maxBaseDelayMillis);
                if (baselineCount !== void 0) {
                  nextArgs.count = Math.max(0, baselineCount - this._recordsRead);
                }
                if (baselineBytes !== void 0) {
                  nextArgs.bytes = Math.max(0, baselineBytes - this._bytesRead);
                }
                if (baselineWait !== void 0) {
                  if (this._lastTailAtMs !== void 0) {
                    const elapsedSeconds = (performance.now() - this._lastTailAtMs) / 1e3;
                    nextArgs.wait = Math.max(0, Math.floor(baselineWait - (elapsedSeconds + delay / 1e3)));
                  } else {
                    nextArgs.wait = baselineWait;
                  }
                }
                try {
                  await session.cancel?.("retry");
                } catch {
                }
                session = void 0;
                debugRead("will retry after %dms, status=%s", delay, error.status);
                await sleep(delay);
                attempt++;
                break;
              }
              debugRead("error in retry loop: %s", error);
              controller.error(error);
              return;
            }
            const record = result.value;
            this._nextReadPosition = {
              seq_num: record.seq_num + 1,
              timestamp: record.timestamp
            };
            this._recordsRead++;
            this._bytesRead += meteredBytes(record);
            attempt = 0;
            if (args?.ignore_command_records && isCommandRecord(record)) {
              continue;
            }
            controller.enqueue(toSDKReadRecord(record, format));
          }
        }
      }, "start"),
      cancel: /* @__PURE__ */ __name(async (reason) => {
        try {
          await session?.cancel(reason);
        } catch (err2) {
          if (!hasErrorCode(err2, "ERR_INVALID_STATE")) {
            throw err2;
          }
        }
      }, "cancel")
    });
  }
  async [Symbol.asyncDispose]() {
    await this.cancel("disposed");
  }
  // Polyfill for older browsers / Node.js environments
  [Symbol.asyncIterator]() {
    const proto2 = ReadableStream.prototype;
    const fn = proto2[Symbol.asyncIterator];
    if (typeof fn === "function") {
      try {
        return fn.call(this);
      } catch {
      }
    }
    const reader = this.getReader();
    return {
      next: /* @__PURE__ */ __name(async () => {
        const r = await reader.read();
        if (r.done) {
          reader.releaseLock();
          return { done: true, value: void 0 };
        }
        return { done: false, value: r.value };
      }, "next"),
      throw: /* @__PURE__ */ __name(async (e) => {
        try {
          await reader.cancel(e);
        } catch (err2) {
          if (!hasErrorCode(err2, "ERR_INVALID_STATE"))
            throw err2;
        }
        reader.releaseLock();
        return { done: true, value: void 0 };
      }, "throw"),
      return: /* @__PURE__ */ __name(async () => {
        try {
          await reader.cancel("done");
        } catch (err2) {
          if (!hasErrorCode(err2, "ERR_INVALID_STATE"))
            throw err2;
        }
        reader.releaseLock();
        return { done: true, value: void 0 };
      }, "return"),
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  lastObservedTail() {
    return this._lastObservedTail ? toSDKStreamPosition(this._lastObservedTail) : void 0;
  }
  nextReadPosition() {
    return this._nextReadPosition ? toSDKStreamPosition(this._nextReadPosition) : void 0;
  }
};
var MIN_MAX_INFLIGHT_BYTES = 1 * 1024 * 1024;
var DEFAULT_MAX_INFLIGHT_BYTES = 3 * 1024 * 1024;
var RetryAppendSession = class _RetryAppendSession {
  static {
    __name(this, "RetryAppendSession");
  }
  generator;
  sessionOptions;
  requestTimeoutMillis;
  maxQueuedBytes;
  maxInflightBatches;
  retryConfig;
  inflight = [];
  capacityWaiters = [];
  // Queue of waiters for capacity
  session;
  queuedBytes = 0;
  pendingBytes = 0;
  pendingBatches = 0;
  consecutiveFailures = 0;
  currentAttempt = 0;
  pumpPromise;
  pumpStopped = false;
  closing = false;
  pumpWakeup;
  closed = false;
  fatalError;
  _lastAckedPosition;
  acksController;
  readable;
  writable;
  streamName;
  /**
   * If the session has failed, returns the original fatal error that caused
   * the pump to stop. Returns undefined when the session has not failed.
   */
  failureCause() {
    return this.fatalError;
  }
  constructor(generator, sessionOptions, config, streamName) {
    this.generator = generator;
    this.sessionOptions = sessionOptions;
    this.streamName = streamName ?? "unknown";
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...config
    };
    this.requestTimeoutMillis = this.retryConfig.requestTimeoutMillis;
    this.maxQueuedBytes = Math.max(MIN_MAX_INFLIGHT_BYTES, this.sessionOptions?.maxInflightBytes ?? DEFAULT_MAX_INFLIGHT_BYTES);
    this.maxInflightBatches = this.sessionOptions?.maxInflightBatches !== void 0 ? Math.max(1, this.sessionOptions.maxInflightBatches) : void 0;
    this.readable = new ReadableStream({
      start: /* @__PURE__ */ __name((controller) => {
        this.acksController = controller;
      }, "start")
    });
    this.writable = new WritableStream({
      write: /* @__PURE__ */ __name(async (chunk) => {
        if (this.closed || this.closing) {
          throw new S2Error({ message: "AppendSession is closed" });
        }
        const ticket = await this.submit(chunk);
        ticket.ack().catch(() => {
        });
      }, "write"),
      close: /* @__PURE__ */ __name(async () => {
        await this.close();
      }, "close"),
      abort: /* @__PURE__ */ __name(async (reason) => {
        const error = abortedError(`AppendSession aborted: ${reason}`);
        await this.abort(error);
      }, "abort")
    });
  }
  static async create(generator, sessionOptions, config, streamName) {
    return new _RetryAppendSession(generator, sessionOptions, config, streamName);
  }
  /**
   * Wait for capacity to be available for the given batch size.
   * Call this before submit() to apply backpressure based on maxInflightBatches/maxInflightBytes.
   *
   * @param bytes - Size in bytes (use meteredBytes() to calculate)
   * @param numBatches - Number of batches (default: 1)
   * @returns Promise that resolves when capacity is available
   */
  async waitForCapacity(bytes, numBatches = 1) {
    debugSession("[%s] [CAPACITY] checking for %d bytes, %d batches: queuedBytes=%d, pendingBytes=%d, maxQueuedBytes=%d, inflight=%d, pendingBatches=%d, maxInflightBatches=%s", this.streamName, bytes, numBatches, this.queuedBytes, this.pendingBytes, this.maxQueuedBytes, this.inflight.length, this.pendingBatches, this.maxInflightBatches ?? "unlimited");
    while (true) {
      if (this.fatalError) {
        debugSession("[%s] [CAPACITY] fatal error detected, rejecting: %s", this.streamName, this.fatalError.message);
        throw this.fatalError;
      }
      if (this.queuedBytes + this.pendingBytes + bytes <= this.maxQueuedBytes) {
        if (this.maxInflightBatches === void 0 || this.inflight.length + this.pendingBatches + numBatches <= this.maxInflightBatches) {
          debugSession("[%s] [CAPACITY] capacity available, adding %d to pendingBytes and %d to pendingBatches", this.streamName, bytes, numBatches);
          this.pendingBytes += bytes;
          this.pendingBatches += numBatches;
          return;
        }
      }
      debugSession("[%s] [CAPACITY] no capacity, waiting for release", this.streamName);
      await new Promise((resolve) => {
        this.capacityWaiters.push({
          resolve,
          bytes,
          batches: numBatches
        });
      });
      debugSession("[%s] [CAPACITY] woke up, rechecking", this.streamName);
    }
  }
  /**
   * Submit an append request.
   * Returns a promise that resolves to a submit ticket once the batch is enqueued (has capacity).
   * The ticket's ack() can be awaited to get the AppendAck once the batch is durable.
   * This method applies backpressure and will block if capacity limits are reached.
   */
  async submit(input) {
    if (this.closed || this.closing) {
      return Promise.reject(new S2Error({ message: "AppendSession is closed" }));
    }
    const batchMeteredSize = input.meteredBytes;
    this.ensurePump();
    await this.waitForCapacity(batchMeteredSize, 1);
    this.pendingBytes = Math.max(0, this.pendingBytes - batchMeteredSize);
    this.pendingBatches = Math.max(0, this.pendingBatches - 1);
    const innerPromise = this.submitInternal(input, batchMeteredSize).then((result) => {
      if (result.ok) {
        return result.value;
      } else {
        throw result.error;
      }
    });
    innerPromise.catch(() => {
    });
    return new BatchSubmitTicket(innerPromise, batchMeteredSize, input.records.length);
  }
  /**
   * Internal submit that returns discriminated union.
   * Creates inflight entry and starts pump if needed.
   */
  submitInternal(input, batchMeteredSize) {
    if (this.fatalError) {
      debugSession("[%s] [SUBMIT] rejecting due to fatal error: %s", this.streamName, this.fatalError.message);
      return Promise.resolve(err(this.fatalError));
    }
    return new Promise((resolve) => {
      const entry = {
        input,
        expectedCount: input.records.length,
        innerPromise: new Promise(() => {
        }),
        // Never-resolving placeholder
        maybeResolve: resolve,
        needsSubmit: true
        // Mark for pump to submit
      };
      debugSession("[%s] [SUBMIT] enqueueing %d records (%d bytes), match_seq_num=%s: inflight=%d->%d, queuedBytes=%d->%d", this.streamName, input.records.length, batchMeteredSize, input.matchSeqNum ?? "none", this.inflight.length, this.inflight.length + 1, this.queuedBytes, this.queuedBytes + batchMeteredSize);
      this.inflight.push(entry);
      this.queuedBytes += batchMeteredSize;
      if (this.pumpWakeup) {
        this.pumpWakeup();
      }
      this.ensurePump();
    });
  }
  /**
   * Release capacity and wake waiter if present.
   */
  releaseCapacity(bytes) {
    debugSession("[%s] [CAPACITY] releasing %d bytes: queuedBytes=%d->%d, pendingBytes=%d, pendingBatches=%d, numWaiters=%d", this.streamName, bytes, this.queuedBytes, this.queuedBytes - bytes, this.pendingBytes, this.pendingBatches, this.capacityWaiters.length);
    this.queuedBytes -= bytes;
    this.wakeCapacityWaiters();
  }
  wakeCapacityWaiters() {
    if (this.capacityWaiters.length === 0) {
      return;
    }
    let availableBytes = Math.max(0, this.maxQueuedBytes - (this.queuedBytes + this.pendingBytes));
    let availableBatches = this.maxInflightBatches === void 0 ? Number.POSITIVE_INFINITY : Math.max(0, this.maxInflightBatches - (this.inflight.length + this.pendingBatches));
    while (this.capacityWaiters.length > 0) {
      const next = this.capacityWaiters[0];
      const needsBytes = next.bytes;
      const needsBatches = next.batches;
      const hasBatchCapacity = this.maxInflightBatches === void 0 || needsBatches <= availableBatches;
      if (needsBytes <= availableBytes && hasBatchCapacity) {
        this.capacityWaiters.shift();
        availableBytes -= needsBytes;
        if (this.maxInflightBatches !== void 0) {
          availableBatches -= needsBatches;
        }
        debugSession("[%s] [CAPACITY] waking waiter (bytes=%d, batches=%d)", this.streamName, needsBytes, needsBatches);
        next.resolve();
        continue;
      }
      break;
    }
  }
  /**
   * Ensure pump loop is running.
   */
  ensurePump() {
    if (this.pumpPromise || this.pumpStopped) {
      return;
    }
    this.pumpPromise = this.runPump().catch((e) => {
      debugSession("[%s] pump crashed unexpectedly: %s", this.streamName, e);
    });
  }
  /**
   * Main pump loop: processes inflight queue, handles acks, retries, and recovery.
   */
  async runPump() {
    debugSession("[%s] pump started", this.streamName);
    while (true) {
      debugSession("[%s] [PUMP] loop: inflight=%d, queuedBytes=%d, pendingBytes=%d, pendingBatches=%d, closing=%s, pumpStopped=%s", this.streamName, this.inflight.length, this.queuedBytes, this.pendingBytes, this.pendingBatches, this.closing, this.pumpStopped);
      if (this.pumpStopped) {
        debugSession("[%s] [PUMP] stopped by flag", this.streamName);
        return;
      }
      if (this.closing && this.inflight.length === 0 && this.capacityWaiters.length === 0) {
        debugSession("[%s] [PUMP] closing and queue empty, stopping", this.streamName);
        this.pumpStopped = true;
        return;
      }
      if (this.inflight.length === 0) {
        debugSession("[%s] [PUMP] no entries, parking until wakeup", this.streamName);
        await new Promise((resolve) => {
          this.pumpWakeup = resolve;
        });
        this.pumpWakeup = void 0;
        continue;
      }
      const head = this.inflight[0];
      debugSession("[%s] [PUMP] processing head: expectedCount=%d, meteredBytes=%d, match_seq_num=%s", this.streamName, head.expectedCount, head.input.meteredBytes, head.input.matchSeqNum ?? "none");
      debugSession("[%s] [PUMP] ensuring session exists", this.streamName);
      await this.ensureSession();
      if (!this.session) {
        this.consecutiveFailures++;
        const delay = calculateDelay(this.consecutiveFailures - 1, this.retryConfig.minBaseDelayMillis, this.retryConfig.maxBaseDelayMillis);
        debugSession("[%s] [PUMP] session creation failed, backing off for %dms", this.streamName, delay);
        await sleep(delay);
        continue;
      }
      for (const entry of this.inflight) {
        if (!entry.innerPromise || entry.needsSubmit) {
          debugSession("[%s] [PUMP] submitting entry to inner session (%d records, %d bytes, match_seq_num=%s)", this.streamName, entry.expectedCount, entry.input.meteredBytes, entry.input.matchSeqNum ?? "none");
          const attemptStarted = performance.now();
          entry.attemptStartedMonotonicMs = attemptStarted;
          entry.innerPromise = this.session.submit(entry.input);
          delete entry.needsSubmit;
        }
      }
      debugSession("[%s] [PUMP] waiting for head result", this.streamName);
      const result = await this.waitForHead(head);
      debugSession("[%s] [PUMP] got result: kind=%s", this.streamName, result.kind);
      let appendResult;
      if (result.kind === "timeout") {
        const attemptElapsed = head.attemptStartedMonotonicMs != null ? Math.round(performance.now() - head.attemptStartedMonotonicMs) : void 0;
        const error = new S2Error({
          message: `Request timeout after ${attemptElapsed ?? "unknown"}ms (${head.expectedCount} records, ${head.input.meteredBytes} bytes)`,
          status: 408,
          code: "REQUEST_TIMEOUT",
          origin: "sdk"
        });
        debugSession("[%s] ack timeout for head entry: %s", this.streamName, error.message);
        appendResult = err(error);
      } else {
        appendResult = result.value;
      }
      if (appendResult.ok) {
        const ack = appendResult.value;
        debugSession("[%s] [PUMP] success, got ack: seq_num=%d-%d", this.streamName, ack.start.seqNum, ack.end.seqNum);
        const ackCount = ack.end.seqNum - ack.start.seqNum;
        if (ackCount !== head.expectedCount) {
          const error = invariantViolation(`Ack count mismatch: expected ${head.expectedCount}, got ${ackCount}`);
          debugSession("[%s] invariant violation: %s", this.streamName, error.message);
          await this.abort(error);
          return;
        }
        if (this._lastAckedPosition) {
          const prevEnd = this._lastAckedPosition.end.seqNum;
          const currentEnd = ack.end.seqNum;
          if (currentEnd <= prevEnd) {
            const error = invariantViolation(`Sequence number not strictly increasing: previous=${prevEnd}, current=${currentEnd}`);
            debugSession("[%s] invariant violation: %s", this.streamName, error.message);
            await this.abort(error);
            return;
          }
        }
        this._lastAckedPosition = ack;
        if (head.maybeResolve) {
          head.maybeResolve(ok(ack));
        }
        try {
          this.acksController?.enqueue(ack);
        } catch (e) {
          debugSession("[%s] failed to enqueue ack: %s", this.streamName, e);
        }
        debugSession("[%s] [PUMP] removing head from inflight, releasing %d bytes", this.streamName, head.input.meteredBytes);
        this.inflight.shift();
        this.releaseCapacity(head.input.meteredBytes);
        this.consecutiveFailures = 0;
        this.currentAttempt = 0;
      } else {
        const error = appendResult.error;
        debugSession("[%s] [PUMP] error: status=%s, message=%s", this.streamName, error.status, error.message);
        if (!isRetryable(error)) {
          debugSession("[%s] error not retryable, aborting", this.streamName);
          await this.abort(error);
          return;
        }
        if (this.retryConfig.appendRetryPolicy === "noSideEffects" && !this.isIdempotent(head)) {
          debugSession("[%s] error not policy-compliant (noSideEffects), aborting", this.streamName);
          await this.abort(error);
          return;
        }
        const effectiveMax = Math.max(1, this.retryConfig.maxAttempts);
        const allowedRetries = effectiveMax - 1;
        if (this.currentAttempt >= allowedRetries) {
          debugSession("[%s] max attempts reached (%d), aborting", this.streamName, effectiveMax);
          const wrappedError = new S2Error({
            message: `Max attempts (${effectiveMax}) exhausted: ${error.message}`,
            status: error.status,
            code: error.code
          });
          await this.abort(wrappedError);
          return;
        }
        this.consecutiveFailures++;
        this.currentAttempt++;
        debugSession("[%s] performing recovery (retry %d/%d)", this.streamName, this.currentAttempt, allowedRetries);
        await this.recover();
      }
    }
  }
  /**
   * Wait for head entry's innerPromise with timeout.
   * Returns either the settled result or a timeout indicator.
   *
   * Per-attempt ack timeout semantics:
   * - The deadline is computed from the current attempt's start time using a
   *   monotonic clock (performance.now) to avoid issues with wall clock adjustments.
   * - Each retry gets a fresh timeout window (attemptStartedMonotonicMs is reset
   *   during recovery).
   * - If attempt start is missing (for backward compatibility), we measure
   *   from "now" with the full timeout window.
   */
  async waitForHead(head) {
    const attemptStart = head.attemptStartedMonotonicMs ?? performance.now();
    const deadline = attemptStart + this.requestTimeoutMillis;
    const remaining = Math.max(0, deadline - performance.now());
    let timer;
    const timeoutP = new Promise((resolve) => {
      timer = setTimeout(() => resolve({ kind: "timeout" }), remaining);
    });
    const settledP = head.innerPromise.then((result) => ({
      kind: "settled",
      value: result
    }));
    try {
      return await Promise.race([settledP, timeoutP]);
    } finally {
      if (timer)
        clearTimeout(timer);
    }
  }
  /**
   * Recover from transient error: recreate session and resubmit all inflight entries.
   */
  async recover() {
    debugSession("[%s] starting recovery", this.streamName);
    const delay = calculateDelay(this.consecutiveFailures - 1, this.retryConfig.minBaseDelayMillis, this.retryConfig.maxBaseDelayMillis);
    debugSession("[%s] backing off for %dms", this.streamName, delay);
    await sleep(delay);
    if (this.session) {
      try {
        const closeResult = await this.session.close();
        if (!closeResult.ok) {
          debugSession("[%s] error closing old session during recovery: %s", this.streamName, closeResult.error.message);
        }
      } catch (e) {
        debugSession("[%s] exception closing old session: %s", this.streamName, e);
      }
      this.session = void 0;
    }
    await this.ensureSession();
    if (!this.session) {
      debugSession("[%s] failed to create new session during recovery", this.streamName);
      return;
    }
    const session = this.session;
    debugSession("[%s] resubmitting %d inflight entries", this.streamName, this.inflight.length);
    for (const entry of this.inflight) {
      entry.innerPromise.catch(() => {
      });
      const attemptStarted = performance.now();
      entry.attemptStartedMonotonicMs = attemptStarted;
      entry.innerPromise = session.submit(entry.input);
      debugSession("[%s] resubmitted entry (%d records, %d bytes, match_seq_num=%s)", this.streamName, entry.expectedCount, entry.input.meteredBytes, entry.input.matchSeqNum ?? "none");
    }
    debugSession("[%s] recovery complete", this.streamName);
  }
  /**
   * Check if append can be retried under noSideEffects policy.
   * For appends, idempotency requires match_seq_num.
   */
  isIdempotent(entry) {
    return entry.input.matchSeqNum !== void 0;
  }
  /**
   * Ensure session exists, creating it if necessary.
   */
  async ensureSession() {
    if (this.session) {
      return;
    }
    try {
      debugSession("[%s] creating new transport session", this.streamName);
      this.session = await this.generator(this.sessionOptions);
      debugSession("[%s] transport session created", this.streamName);
    } catch (e) {
      const error = s2Error(e);
      debugSession("[%s] failed to create session: %s", this.streamName, error.message);
    }
  }
  /**
   * Abort the session with a fatal error.
   */
  async abort(error) {
    if (this.pumpStopped) {
      return;
    }
    debugSession("[%s] aborting session: %s", this.streamName, error.message);
    this.fatalError = error;
    this.pumpStopped = true;
    debugSession("[%s] rejecting %d inflight entries", this.streamName, this.inflight.length);
    for (const entry of this.inflight) {
      if (entry.maybeResolve) {
        entry.maybeResolve(err(error));
      }
    }
    this.inflight.length = 0;
    this.queuedBytes = 0;
    this.pendingBytes = 0;
    this.pendingBatches = 0;
    try {
      this.acksController?.error(error);
    } catch (e) {
      debugSession("[%s] failed to error acks controller: %s", this.streamName, e);
    }
    for (const waiter of this.capacityWaiters) {
      waiter.resolve();
    }
    this.capacityWaiters = [];
    if (this.session) {
      debugSession("[%s] closing inner session", this.streamName);
      try {
        await this.session.close();
      } catch (e) {
        debugSession("[%s] error closing session during abort: %s", this.streamName, e);
      }
      this.session = void 0;
    }
  }
  /**
   * Close the append session.
   * Waits for all pending appends to complete before resolving.
   * Does not interrupt recovery - allows it to complete.
   */
  async close() {
    if (this.closed) {
      if (this.fatalError) {
        throw this.fatalError;
      }
      return;
    }
    debugSession("[%s] close requested", this.streamName);
    this.closing = true;
    if (this.pumpWakeup) {
      this.pumpWakeup();
    }
    if (this.pumpPromise) {
      debugSession("[%s] [CLOSE] awaiting pump to drain inflight queue", this.streamName);
      await this.pumpPromise;
    }
    if (this.session) {
      try {
        const result = await this.session.close();
        if (!result.ok) {
          debugSession("[%s] error closing inner session: %s", this.streamName, result.error.message);
        }
      } catch (e) {
        debugSession("[%s] exception closing inner session: %s", this.streamName, e);
      }
      this.session = void 0;
    }
    try {
      this.acksController?.close();
    } catch (e) {
      debugSession("[%s] error closing acks controller: %s", this.streamName, e);
    }
    this.closed = true;
    if (this.fatalError) {
      throw this.fatalError;
    }
    debugSession("[%s] close complete", this.streamName);
  }
  async [Symbol.asyncDispose]() {
    await this.close();
  }
  /**
   * Get a stream of acknowledgements for appends.
   */
  acks() {
    return this.readable;
  }
  /**
   * Get the last acknowledged position.
   */
  lastAckedPosition() {
    return this._lastAckedPosition;
  }
};

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/generated/proto/s2.js
init_esm();
var import_runtime10 = __toESM(require_commonjs(), 1);
var import_runtime11 = __toESM(require_commonjs(), 1);
var import_runtime12 = __toESM(require_commonjs(), 1);
var import_runtime13 = __toESM(require_commonjs(), 1);
var StreamPosition$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "StreamPosition$Type");
  }
  constructor() {
    super("s2.v1.StreamPosition", [
      {
        no: 1,
        name: "seq_num",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "timestamp",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.seqNum = 0n;
    message.timestamp = 0n;
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 seq_num */
        1:
          message.seqNum = reader.uint64().toBigInt();
          break;
        case /* uint64 timestamp */
        2:
          message.timestamp = reader.uint64().toBigInt();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.seqNum !== 0n)
      writer.tag(1, import_runtime10.WireType.Varint).uint64(message.seqNum);
    if (message.timestamp !== 0n)
      writer.tag(2, import_runtime10.WireType.Varint).uint64(message.timestamp);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var StreamPosition = new StreamPosition$Type();
var Header$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "Header$Type");
  }
  constructor() {
    super("s2.v1.Header", [
      {
        no: 1,
        name: "name",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      },
      {
        no: 2,
        name: "value",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.name = new Uint8Array(0);
    message.value = new Uint8Array(0);
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* bytes name */
        1:
          message.name = reader.bytes();
          break;
        case /* bytes value */
        2:
          message.value = reader.bytes();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.name.length)
      writer.tag(1, import_runtime10.WireType.LengthDelimited).bytes(message.name);
    if (message.value.length)
      writer.tag(2, import_runtime10.WireType.LengthDelimited).bytes(message.value);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var Header = new Header$Type();
var AppendRecord$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "AppendRecord$Type");
  }
  constructor() {
    super("s2.v1.AppendRecord", [
      {
        no: 1,
        name: "timestamp",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 2, name: "headers", kind: "message", repeat: 2, T: /* @__PURE__ */ __name(() => Header, "T") },
      {
        no: 3,
        name: "body",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.headers = [];
    message.body = new Uint8Array(0);
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* optional uint64 timestamp */
        1:
          message.timestamp = reader.uint64().toBigInt();
          break;
        case /* repeated s2.v1.Header headers */
        2:
          message.headers.push(Header.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* bytes body */
        3:
          message.body = reader.bytes();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.timestamp !== void 0)
      writer.tag(1, import_runtime10.WireType.Varint).uint64(message.timestamp);
    for (let i = 0; i < message.headers.length; i++)
      Header.internalBinaryWrite(message.headers[i], writer.tag(2, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.body.length)
      writer.tag(3, import_runtime10.WireType.LengthDelimited).bytes(message.body);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var AppendRecord2 = new AppendRecord$Type();
var AppendInput$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "AppendInput$Type");
  }
  constructor() {
    super("s2.v1.AppendInput", [
      { no: 1, name: "records", kind: "message", repeat: 2, T: /* @__PURE__ */ __name(() => AppendRecord2, "T") },
      {
        no: 2,
        name: "match_seq_num",
        kind: "scalar",
        opt: true,
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 3,
        name: "fencing_token",
        kind: "scalar",
        opt: true,
        T: 9
        /*ScalarType.STRING*/
      }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.records = [];
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated s2.v1.AppendRecord records */
        1:
          message.records.push(AppendRecord2.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* optional uint64 match_seq_num */
        2:
          message.matchSeqNum = reader.uint64().toBigInt();
          break;
        case /* optional string fencing_token */
        3:
          message.fencingToken = reader.string();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.records.length; i++)
      AppendRecord2.internalBinaryWrite(message.records[i], writer.tag(1, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.matchSeqNum !== void 0)
      writer.tag(2, import_runtime10.WireType.Varint).uint64(message.matchSeqNum);
    if (message.fencingToken !== void 0)
      writer.tag(3, import_runtime10.WireType.LengthDelimited).string(message.fencingToken);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var AppendInput2 = new AppendInput$Type();
var AppendAck$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "AppendAck$Type");
  }
  constructor() {
    super("s2.v1.AppendAck", [
      { no: 1, name: "start", kind: "message", T: /* @__PURE__ */ __name(() => StreamPosition, "T") },
      { no: 2, name: "end", kind: "message", T: /* @__PURE__ */ __name(() => StreamPosition, "T") },
      { no: 3, name: "tail", kind: "message", T: /* @__PURE__ */ __name(() => StreamPosition, "T") }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* s2.v1.StreamPosition start */
        1:
          message.start = StreamPosition.internalBinaryRead(reader, reader.uint32(), options, message.start);
          break;
        case /* s2.v1.StreamPosition end */
        2:
          message.end = StreamPosition.internalBinaryRead(reader, reader.uint32(), options, message.end);
          break;
        case /* s2.v1.StreamPosition tail */
        3:
          message.tail = StreamPosition.internalBinaryRead(reader, reader.uint32(), options, message.tail);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.start)
      StreamPosition.internalBinaryWrite(message.start, writer.tag(1, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.end)
      StreamPosition.internalBinaryWrite(message.end, writer.tag(2, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.tail)
      StreamPosition.internalBinaryWrite(message.tail, writer.tag(3, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var AppendAck = new AppendAck$Type();
var SequencedRecord$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "SequencedRecord$Type");
  }
  constructor() {
    super("s2.v1.SequencedRecord", [
      {
        no: 1,
        name: "seq_num",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      {
        no: 2,
        name: "timestamp",
        kind: "scalar",
        T: 4,
        L: 0
        /*LongType.BIGINT*/
      },
      { no: 3, name: "headers", kind: "message", repeat: 2, T: /* @__PURE__ */ __name(() => Header, "T") },
      {
        no: 4,
        name: "body",
        kind: "scalar",
        T: 12
        /*ScalarType.BYTES*/
      }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.seqNum = 0n;
    message.timestamp = 0n;
    message.headers = [];
    message.body = new Uint8Array(0);
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* uint64 seq_num */
        1:
          message.seqNum = reader.uint64().toBigInt();
          break;
        case /* uint64 timestamp */
        2:
          message.timestamp = reader.uint64().toBigInt();
          break;
        case /* repeated s2.v1.Header headers */
        3:
          message.headers.push(Header.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* bytes body */
        4:
          message.body = reader.bytes();
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    if (message.seqNum !== 0n)
      writer.tag(1, import_runtime10.WireType.Varint).uint64(message.seqNum);
    if (message.timestamp !== 0n)
      writer.tag(2, import_runtime10.WireType.Varint).uint64(message.timestamp);
    for (let i = 0; i < message.headers.length; i++)
      Header.internalBinaryWrite(message.headers[i], writer.tag(3, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.body.length)
      writer.tag(4, import_runtime10.WireType.LengthDelimited).bytes(message.body);
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var SequencedRecord = new SequencedRecord$Type();
var ReadBatch$Type = class extends import_runtime13.MessageType {
  static {
    __name(this, "ReadBatch$Type");
  }
  constructor() {
    super("s2.v1.ReadBatch", [
      { no: 1, name: "records", kind: "message", repeat: 2, T: /* @__PURE__ */ __name(() => SequencedRecord, "T") },
      { no: 2, name: "tail", kind: "message", T: /* @__PURE__ */ __name(() => StreamPosition, "T") }
    ]);
  }
  create(value2) {
    const message = globalThis.Object.create(this.messagePrototype);
    message.records = [];
    if (value2 !== void 0)
      (0, import_runtime12.reflectionMergePartial)(this, message, value2);
    return message;
  }
  internalBinaryRead(reader, length, options, target) {
    let message = target ?? this.create(), end = reader.pos + length;
    while (reader.pos < end) {
      let [fieldNo, wireType] = reader.tag();
      switch (fieldNo) {
        case /* repeated s2.v1.SequencedRecord records */
        1:
          message.records.push(SequencedRecord.internalBinaryRead(reader, reader.uint32(), options));
          break;
        case /* optional s2.v1.StreamPosition tail */
        2:
          message.tail = StreamPosition.internalBinaryRead(reader, reader.uint32(), options, message.tail);
          break;
        default:
          let u = options.readUnknownField;
          if (u === "throw")
            throw new globalThis.Error(`Unknown field ${fieldNo} (wire type ${wireType}) for ${this.typeName}`);
          let d = reader.skip(wireType);
          if (u !== false)
            (u === true ? import_runtime11.UnknownFieldHandler.onRead : u)(this.typeName, message, fieldNo, wireType, d);
      }
    }
    return message;
  }
  internalBinaryWrite(message, writer, options) {
    for (let i = 0; i < message.records.length; i++)
      SequencedRecord.internalBinaryWrite(message.records[i], writer.tag(1, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    if (message.tail)
      StreamPosition.internalBinaryWrite(message.tail, writer.tag(2, import_runtime10.WireType.LengthDelimited).fork(), options).join();
    let u = options.writeUnknownFields;
    if (u !== false)
      (u == true ? import_runtime11.UnknownFieldHandler.onWrite : u)(this.typeName, message, writer);
    return writer;
  }
};
var ReadBatch = new ReadBatch$Type();

// ../../node_modules/.pnpm/@s2-dev+streamstore@0.22.5_supports-color@10.2.2/node_modules/@s2-dev/streamstore/dist/esm/lib/stream/transport/proto.js
init_esm();
var textEncoder2 = new TextEncoder();
var MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
function bigintToSafeNumber(value2, field) {
  if (value2 > MAX_SAFE_BIGINT) {
    throw new S2Error({
      message: `${field} exceeds JavaScript Number.MAX_SAFE_INTEGER (${Number.MAX_SAFE_INTEGER}); use protobuf transport with bigint support or ensure values stay within 53-bit range`,
      code: "UNSAFE_INTEGER",
      status: 0,
      origin: "sdk"
    });
  }
  return Number(value2);
}
__name(bigintToSafeNumber, "bigintToSafeNumber");
var toBytes = /* @__PURE__ */ __name((value2) => {
  if (value2 === void 0 || value2 === null) {
    return new Uint8Array();
  }
  return typeof value2 === "string" ? textEncoder2.encode(value2) : value2;
}, "toBytes");
var toProtoHeaders = /* @__PURE__ */ __name((headers) => {
  if (!headers) {
    return [];
  }
  return headers.map(([name, value2]) => ({
    name: toBytes(name),
    value: toBytes(value2)
  }));
}, "toProtoHeaders");
var toProtoAppendRecord = /* @__PURE__ */ __name((record) => {
  let timestamp;
  if (record.timestamp !== void 0) {
    const ms = typeof record.timestamp === "number" ? record.timestamp : record.timestamp.getTime();
    timestamp = BigInt(ms);
  }
  return {
    timestamp,
    headers: toProtoHeaders(record.headers),
    body: toBytes(record.body)
  };
}, "toProtoAppendRecord");
var fromProtoPosition = /* @__PURE__ */ __name((position) => {
  if (!position) {
    return void 0;
  }
  return {
    seq_num: bigintToSafeNumber(position.seqNum, "StreamPosition.seqNum"),
    timestamp: Number(position.timestamp)
  };
}, "fromProtoPosition");
var toSDKStreamPosition2 = /* @__PURE__ */ __name((pos) => {
  return {
    seqNum: pos.seq_num,
    timestamp: new Date(pos.timestamp)
  };
}, "toSDKStreamPosition");
var fromProtoSequencedRecord = /* @__PURE__ */ __name((record) => {
  return {
    seq_num: bigintToSafeNumber(record.seqNum, "SequencedRecord.seqNum"),
    timestamp: Number(record.timestamp),
    headers: record.headers?.map((header) => [header.name, header.value]) ?? [],
    body: record.body
  };
}, "fromProtoSequencedRecord");
function convertProtoRecord(record, format, textDecoder = new TextDecoder()) {
  if (record.seqNum === void 0 || record.timestamp === void 0) {
    throw new S2Error({
      message: "Malformed SequencedRecord: missing required seqNum or timestamp",
      status: 500,
      origin: "sdk"
    });
  }
  if (format === "bytes") {
    return {
      seq_num: bigintToSafeNumber(record.seqNum, "SequencedRecord.seqNum"),
      timestamp: bigintToSafeNumber(record.timestamp, "SequencedRecord.timestamp"),
      headers: record.headers?.map((h) => [h.name ?? new Uint8Array(), h.value ?? new Uint8Array()]),
      body: record.body
    };
  }
  const headerEntries = record.headers?.map((h) => [
    h.name ? textDecoder.decode(h.name) : "",
    h.value ? textDecoder.decode(h.value) : ""
  ]);
  return {
    seq_num: bigintToSafeNumber(record.seqNum, "SequencedRecord.seqNum"),
    timestamp: bigintToSafeNumber(record.timestamp, "SequencedRecord.timestamp"),
    headers: headerEntries,
    body: record.body ? textDecoder.decode(record.body) : void 0
  };
}
__name(convertProtoRecord, "convertProtoRecord");
var buildProtoAppendInput = /* @__PURE__ */ __name((input) => {
  return AppendInput2.create({
    records: [...input.records].map((record) => toProtoAppendRecord(record)),
    fencingToken: input.fencingToken === null ? void 0 : input.fencingToken ?? void 0,
    matchSeqNum: input.matchSeqNum !== void 0 ? BigInt(input.matchSeqNum) : void 0
  });
}, "buildProtoAppendInput");
var ensureUint8Array = /* @__PURE__ */ __name((data) => {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}, "ensureUint8Array");
var encodeProtoAppendInput = /* @__PURE__ */ __name((input) => {
  return AppendInput2.toBinary(buildProtoAppendInput(input));
}, "encodeProtoAppendInput");
var decodeProtoAppendAck = /* @__PURE__ */ __name((data) => {
  return AppendAck.fromBinary(ensureUint8Array(data));
}, "decodeProtoAppendAck");
var protoAppendAckToJson = /* @__PURE__ */ __name((ack) => {
  const start = fromProtoPosition(ack.start);
  const end = fromProtoPosition(ack.end);
  if (!start || !end) {
    throw new S2Error({
      message: "AppendAck missing start or end positions",
      status: 500,
      origin: "sdk"
    });
  }
  const tail = fromProtoPosition(ack.tail) ?? end;
  return {
    start: toSDKStreamPosition2(start),
    end: toSDKStreamPosition2(end),
    tail: toSDKStreamPosition2(tail)
  };
}, "protoAppendAckToJson");
var decodeProtoReadBatch = /* @__PURE__ */ __name((data) => {
  const protoBatch = ReadBatch.fromBinary(ensureUint8Array(data));
  return {
    records: protoBatch.records.map((record) => fromProtoSequencedRecord(record)),
    tail: fromProtoPosition(protoBatch.tail)
  };
}, "decodeProtoReadBatch");

export {
  require_ms,
  supports_color_exports,
  init_supports_color,
  require_src,
  make,
  value,
  supportsHttp2,
  canSetUserAgentHeader,
  DEFAULT_USER_AGENT,
  s2Error,
  withS2Data,
  S2Error,
  RangeNotSatisfiableError,
  makeServerError,
  makeAppendPreconditionError,
  meteredBytes,
  isCommandRecord,
  computeAppendRecordFormat,
  AppendRecord,
  AppendInput,
  ok,
  err,
  okClose,
  errClose,
  withRetries,
  RetryReadSession,
  RetryAppendSession,
  AppendAck,
  ReadBatch,
  bigintToSafeNumber,
  convertProtoRecord,
  encodeProtoAppendInput,
  decodeProtoAppendAck,
  protoAppendAckToJson,
  decodeProtoReadBatch
};
//# sourceMappingURL=chunk-RJTEW7RB.mjs.map
