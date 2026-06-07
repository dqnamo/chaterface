import {
  createParser
} from "./chunk-HZ3XIZM7.mjs";
import {
  __commonJS,
  __name,
  __toESM,
  init_esm
} from "./chunk-5VFD3YHA.mjs";

// ../../node_modules/.pnpm/cookie@1.1.1/node_modules/cookie/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/.pnpm/cookie@1.1.1/node_modules/cookie/dist/index.js"(exports) {
    "use strict";
    init_esm();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.parseCookie = parseCookie2;
    exports.parse = parseCookie2;
    exports.stringifyCookie = stringifyCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    exports.parseSetCookie = parseSetCookie;
    exports.stringifySetCookie = stringifySetCookie;
    exports.serialize = stringifySetCookie;
    var cookieNameRegExp = /^[\u0021-\u003A\u003C\u003E-\u007E]+$/;
    var cookieValueRegExp = /^[\u0021-\u003A\u003C-\u007E]*$/;
    var domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    var pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;
    var maxAgeRegExp = /^-?\d+$/;
    var __toString = Object.prototype.toString;
    var NullObject = /* @__PURE__ */ (() => {
      const C = /* @__PURE__ */ __name(function() {
      }, "C");
      C.prototype = /* @__PURE__ */ Object.create(null);
      return C;
    })();
    function parseCookie2(str, options) {
      const obj = new NullObject();
      const len = str.length;
      if (len < 2)
        return obj;
      const dec = options?.decode || decode;
      let index = 0;
      do {
        const eqIdx = eqIndex(str, index, len);
        if (eqIdx === -1)
          break;
        const endIdx = endIndex(str, index, len);
        if (eqIdx > endIdx) {
          index = str.lastIndexOf(";", eqIdx - 1) + 1;
          continue;
        }
        const key = valueSlice(str, index, eqIdx);
        if (obj[key] === void 0) {
          obj[key] = dec(valueSlice(str, eqIdx + 1, endIdx));
        }
        index = endIdx + 1;
      } while (index < len);
      return obj;
    }
    __name(parseCookie2, "parseCookie");
    function stringifyCookie(cookie, options) {
      const enc = options?.encode || encodeURIComponent;
      const cookieStrings = [];
      for (const name of Object.keys(cookie)) {
        const val = cookie[name];
        if (val === void 0)
          continue;
        if (!cookieNameRegExp.test(name)) {
          throw new TypeError(`cookie name is invalid: ${name}`);
        }
        const value = enc(val);
        if (!cookieValueRegExp.test(value)) {
          throw new TypeError(`cookie val is invalid: ${val}`);
        }
        cookieStrings.push(`${name}=${value}`);
      }
      return cookieStrings.join("; ");
    }
    __name(stringifyCookie, "stringifyCookie");
    function stringifySetCookie(_name, _val, _opts) {
      const cookie = typeof _name === "object" ? _name : { ..._opts, name: _name, value: String(_val) };
      const options = typeof _val === "object" ? _val : _opts;
      const enc = options?.encode || encodeURIComponent;
      if (!cookieNameRegExp.test(cookie.name)) {
        throw new TypeError(`argument name is invalid: ${cookie.name}`);
      }
      const value = cookie.value ? enc(cookie.value) : "";
      if (!cookieValueRegExp.test(value)) {
        throw new TypeError(`argument val is invalid: ${cookie.value}`);
      }
      let str = cookie.name + "=" + value;
      if (cookie.maxAge !== void 0) {
        if (!Number.isInteger(cookie.maxAge)) {
          throw new TypeError(`option maxAge is invalid: ${cookie.maxAge}`);
        }
        str += "; Max-Age=" + cookie.maxAge;
      }
      if (cookie.domain) {
        if (!domainValueRegExp.test(cookie.domain)) {
          throw new TypeError(`option domain is invalid: ${cookie.domain}`);
        }
        str += "; Domain=" + cookie.domain;
      }
      if (cookie.path) {
        if (!pathValueRegExp.test(cookie.path)) {
          throw new TypeError(`option path is invalid: ${cookie.path}`);
        }
        str += "; Path=" + cookie.path;
      }
      if (cookie.expires) {
        if (!isDate(cookie.expires) || !Number.isFinite(cookie.expires.valueOf())) {
          throw new TypeError(`option expires is invalid: ${cookie.expires}`);
        }
        str += "; Expires=" + cookie.expires.toUTCString();
      }
      if (cookie.httpOnly) {
        str += "; HttpOnly";
      }
      if (cookie.secure) {
        str += "; Secure";
      }
      if (cookie.partitioned) {
        str += "; Partitioned";
      }
      if (cookie.priority) {
        const priority = typeof cookie.priority === "string" ? cookie.priority.toLowerCase() : void 0;
        switch (priority) {
          case "low":
            str += "; Priority=Low";
            break;
          case "medium":
            str += "; Priority=Medium";
            break;
          case "high":
            str += "; Priority=High";
            break;
          default:
            throw new TypeError(`option priority is invalid: ${cookie.priority}`);
        }
      }
      if (cookie.sameSite) {
        const sameSite = typeof cookie.sameSite === "string" ? cookie.sameSite.toLowerCase() : cookie.sameSite;
        switch (sameSite) {
          case true:
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError(`option sameSite is invalid: ${cookie.sameSite}`);
        }
      }
      return str;
    }
    __name(stringifySetCookie, "stringifySetCookie");
    function parseSetCookie(str, options) {
      const dec = options?.decode || decode;
      const len = str.length;
      const endIdx = endIndex(str, 0, len);
      const eqIdx = eqIndex(str, 0, endIdx);
      const setCookie = eqIdx === -1 ? { name: "", value: dec(valueSlice(str, 0, endIdx)) } : {
        name: valueSlice(str, 0, eqIdx),
        value: dec(valueSlice(str, eqIdx + 1, endIdx))
      };
      let index = endIdx + 1;
      while (index < len) {
        const endIdx2 = endIndex(str, index, len);
        const eqIdx2 = eqIndex(str, index, endIdx2);
        const attr = eqIdx2 === -1 ? valueSlice(str, index, endIdx2) : valueSlice(str, index, eqIdx2);
        const val = eqIdx2 === -1 ? void 0 : valueSlice(str, eqIdx2 + 1, endIdx2);
        switch (attr.toLowerCase()) {
          case "httponly":
            setCookie.httpOnly = true;
            break;
          case "secure":
            setCookie.secure = true;
            break;
          case "partitioned":
            setCookie.partitioned = true;
            break;
          case "domain":
            setCookie.domain = val;
            break;
          case "path":
            setCookie.path = val;
            break;
          case "max-age":
            if (val && maxAgeRegExp.test(val))
              setCookie.maxAge = Number(val);
            break;
          case "expires":
            if (!val)
              break;
            const date2 = new Date(val);
            if (Number.isFinite(date2.valueOf()))
              setCookie.expires = date2;
            break;
          case "priority":
            if (!val)
              break;
            const priority = val.toLowerCase();
            if (priority === "low" || priority === "medium" || priority === "high") {
              setCookie.priority = priority;
            }
            break;
          case "samesite":
            if (!val)
              break;
            const sameSite = val.toLowerCase();
            if (sameSite === "lax" || sameSite === "strict" || sameSite === "none") {
              setCookie.sameSite = sameSite;
            }
            break;
        }
        index = endIdx2 + 1;
      }
      return setCookie;
    }
    __name(parseSetCookie, "parseSetCookie");
    function endIndex(str, min, len) {
      const index = str.indexOf(";", min);
      return index === -1 ? len : index;
    }
    __name(endIndex, "endIndex");
    function eqIndex(str, min, max) {
      const index = str.indexOf("=", min);
      return index < max ? index : -1;
    }
    __name(eqIndex, "eqIndex");
    function valueSlice(str, min, max) {
      let start = min;
      let end = max;
      do {
        const code = str.charCodeAt(start);
        if (code !== 32 && code !== 9)
          break;
      } while (++start < end);
      while (end > start) {
        const code = str.charCodeAt(end - 1);
        if (code !== 32 && code !== 9)
          break;
        end--;
      }
      return str.slice(start, end);
    }
    __name(valueSlice, "valueSlice");
    function decode(str) {
      if (str.indexOf("%") === -1)
        return str;
      try {
        return decodeURIComponent(str);
      } catch (e) {
        return str;
      }
    }
    __name(decode, "decode");
    function isDate(val) {
      return __toString.call(val) === "[object Date]";
    }
    __name(isDate, "isDate");
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.production.js
var require_react_jsx_runtime_production = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.production.js"(exports) {
    "use strict";
    init_esm();
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    function jsxProd(type, config, maybeKey) {
      var key = null;
      void 0 !== maybeKey && (key = "" + maybeKey);
      void 0 !== config.key && (key = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      config = maybeKey.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== config ? config : null,
        props: maybeKey
      };
    }
    __name(jsxProd, "jsxProd");
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsx = jsxProd;
    exports.jsxs = jsxProd;
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    init_esm();
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = Symbol.for("react.memo");
    var REACT_LAZY_TYPE = Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    __name(getIteratorFn, "getIteratorFn");
    var ReactNoopUpdateQueue = {
      isMounted: /* @__PURE__ */ __name(function() {
        return false;
      }, "isMounted"),
      enqueueForceUpdate: /* @__PURE__ */ __name(function() {
      }, "enqueueForceUpdate"),
      enqueueReplaceState: /* @__PURE__ */ __name(function() {
      }, "enqueueReplaceState"),
      enqueueSetState: /* @__PURE__ */ __name(function() {
      }, "enqueueSetState")
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    __name(Component, "Component");
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    __name(ComponentDummy, "ComponentDummy");
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    __name(PureComponent, "PureComponent");
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    __name(noop, "noop");
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    __name(ReactElement, "ReactElement");
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    __name(cloneAndReplaceKey, "cloneAndReplaceKey");
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    __name(isValidElement, "isValidElement");
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    __name(escape, "escape");
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    __name(getElementKey, "getElementKey");
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    __name(resolveThenable, "resolveThenable");
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i2 = 0; i2 < children.length; i2++)
          nameSoFar = children[i2], type = nextNamePrefix + getElementKey(nameSoFar, i2), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i2 = getIteratorFn(children), "function" === typeof i2)
        for (children = i2.call(children), i2 = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i2++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    __name(mapIntoArray, "mapIntoArray");
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    __name(mapChildren, "mapChildren");
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    __name(lazyInitializer, "lazyInitializer");
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: /* @__PURE__ */ __name(function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      }, "forEach"),
      count: /* @__PURE__ */ __name(function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      }, "count"),
      toArray: /* @__PURE__ */ __name(function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      }, "toArray"),
      only: /* @__PURE__ */ __name(function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }, "only")
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = Children;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: /* @__PURE__ */ __name(function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }, "c")
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i2 = 0; i2 < propName; i2++)
          childArray[i2] = arguments[i2 + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i2 = 0; i2 < childrenLength; i2++)
          childArray[i2] = arguments[i2 + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create2, deps) {
      return ReactSharedInternals.H.useEffect(create2, deps);
    };
    exports.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create2, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create2, deps);
    };
    exports.useInsertionEffect = function(create2, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create2, deps);
    };
    exports.useLayoutEffect = function(create2, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create2, deps);
    };
    exports.useMemo = function(create2, deps) {
      return ReactSharedInternals.H.useMemo(create2, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init4) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init4);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe2, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe2,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.2.0";
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react.development.js"(exports, module) {
    "use strict";
    init_esm();
    "production" !== process.env.NODE_ENV && function() {
      function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: /* @__PURE__ */ __name(function() {
            console.warn(
              "%s(...) is deprecated in plain JavaScript React classes. %s",
              info[0],
              info[1]
            );
          }, "get")
        });
      }
      __name(defineDeprecationWarning, "defineDeprecationWarning");
      function getIteratorFn(maybeIterable) {
        if (null === maybeIterable || "object" !== typeof maybeIterable)
          return null;
        maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
        return "function" === typeof maybeIterable ? maybeIterable : null;
      }
      __name(getIteratorFn, "getIteratorFn");
      function warnNoop(publicInstance, callerName) {
        publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
        var warningKey = publicInstance + "." + callerName;
        didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error(
          "Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.",
          callerName,
          publicInstance
        ), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
      }
      __name(warnNoop, "warnNoop");
      function Component(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      __name(Component, "Component");
      function ComponentDummy() {
      }
      __name(ComponentDummy, "ComponentDummy");
      function PureComponent(props, context, updater) {
        this.props = props;
        this.context = context;
        this.refs = emptyObject;
        this.updater = updater || ReactNoopUpdateQueue;
      }
      __name(PureComponent, "PureComponent");
      function noop() {
      }
      __name(noop, "noop");
      function testStringCoercion(value) {
        return "" + value;
      }
      __name(testStringCoercion, "testStringCoercion");
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      __name(checkKeyStringCoercion, "checkKeyStringCoercion");
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      __name(getComponentNameFromType, "getComponentNameFromType");
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      __name(getTaskName, "getTaskName");
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      __name(getOwner, "getOwner");
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      __name(UnknownOwner, "UnknownOwner");
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      __name(hasValidKey, "hasValidKey");
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        __name(warnAboutAccessingKey, "warnAboutAccessingKey");
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      __name(defineKeyPropWarningGetter, "defineKeyPropWarningGetter");
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      __name(elementRefGetterWithDeprecationWarning, "elementRefGetterWithDeprecationWarning");
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      __name(ReactElement, "ReactElement");
      function cloneAndReplaceKey(oldElement, newKey) {
        newKey = ReactElement(
          oldElement.type,
          newKey,
          oldElement.props,
          oldElement._owner,
          oldElement._debugStack,
          oldElement._debugTask
        );
        oldElement._store && (newKey._store.validated = oldElement._store.validated);
        return newKey;
      }
      __name(cloneAndReplaceKey, "cloneAndReplaceKey");
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      __name(validateChildKeys, "validateChildKeys");
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      __name(isValidElement, "isValidElement");
      function escape(key) {
        var escaperLookup = { "=": "=0", ":": "=2" };
        return "$" + key.replace(/[=:]/g, function(match) {
          return escaperLookup[match];
        });
      }
      __name(escape, "escape");
      function getElementKey(element, index) {
        return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
      }
      __name(getElementKey, "getElementKey");
      function resolveThenable(thenable) {
        switch (thenable.status) {
          case "fulfilled":
            return thenable.value;
          case "rejected":
            throw thenable.reason;
          default:
            switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
              function(fulfilledValue) {
                "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
              },
              function(error) {
                "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            )), thenable.status) {
              case "fulfilled":
                return thenable.value;
              case "rejected":
                throw thenable.reason;
            }
        }
        throw thenable;
      }
      __name(resolveThenable, "resolveThenable");
      function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
        var type = typeof children;
        if ("undefined" === type || "boolean" === type) children = null;
        var invokeCallback = false;
        if (null === children) invokeCallback = true;
        else
          switch (type) {
            case "bigint":
            case "string":
            case "number":
              invokeCallback = true;
              break;
            case "object":
              switch (children.$$typeof) {
                case REACT_ELEMENT_TYPE:
                case REACT_PORTAL_TYPE:
                  invokeCallback = true;
                  break;
                case REACT_LAZY_TYPE:
                  return invokeCallback = children._init, mapIntoArray(
                    invokeCallback(children._payload),
                    array,
                    escapedPrefix,
                    nameSoFar,
                    callback
                  );
              }
          }
        if (invokeCallback) {
          invokeCallback = children;
          callback = callback(invokeCallback);
          var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
          isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
            return c;
          })) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(
            callback,
            escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(
              userProvidedKeyEscapeRegex,
              "$&/"
            ) + "/") + childKey
          ), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
          return 1;
        }
        invokeCallback = 0;
        childKey = "" === nameSoFar ? "." : nameSoFar + ":";
        if (isArrayImpl(children))
          for (var i2 = 0; i2 < children.length; i2++)
            nameSoFar = children[i2], type = childKey + getElementKey(nameSoFar, i2), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if (i2 = getIteratorFn(children), "function" === typeof i2)
          for (i2 === children.entries && (didWarnAboutMaps || console.warn(
            "Using Maps as children is not supported. Use an array of keyed ReactElements instead."
          ), didWarnAboutMaps = true), children = i2.call(children), i2 = 0; !(nameSoFar = children.next()).done; )
            nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i2++), invokeCallback += mapIntoArray(
              nameSoFar,
              array,
              escapedPrefix,
              type,
              callback
            );
        else if ("object" === type) {
          if ("function" === typeof children.then)
            return mapIntoArray(
              resolveThenable(children),
              array,
              escapedPrefix,
              nameSoFar,
              callback
            );
          array = String(children);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        return invokeCallback;
      }
      __name(mapIntoArray, "mapIntoArray");
      function mapChildren(children, func, context) {
        if (null == children) return children;
        var result = [], count = 0;
        mapIntoArray(children, result, "", "", function(child) {
          return func.call(context, child, count++);
        });
        return result;
      }
      __name(mapChildren, "mapChildren");
      function lazyInitializer(payload) {
        if (-1 === payload._status) {
          var ioInfo = payload._ioInfo;
          null != ioInfo && (ioInfo.start = ioInfo.end = performance.now());
          ioInfo = payload._result;
          var thenable = ioInfo();
          thenable.then(
            function(moduleObject) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 1;
                payload._result = moduleObject;
                var _ioInfo = payload._ioInfo;
                null != _ioInfo && (_ioInfo.end = performance.now());
                void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
              }
            },
            function(error) {
              if (0 === payload._status || -1 === payload._status) {
                payload._status = 2;
                payload._result = error;
                var _ioInfo2 = payload._ioInfo;
                null != _ioInfo2 && (_ioInfo2.end = performance.now());
                void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
              }
            }
          );
          ioInfo = payload._ioInfo;
          if (null != ioInfo) {
            ioInfo.value = thenable;
            var displayName = thenable.displayName;
            "string" === typeof displayName && (ioInfo.name = displayName);
          }
          -1 === payload._status && (payload._status = 0, payload._result = thenable);
        }
        if (1 === payload._status)
          return ioInfo = payload._result, void 0 === ioInfo && console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?",
            ioInfo
          ), "default" in ioInfo || console.error(
            "lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))",
            ioInfo
          ), ioInfo.default;
        throw payload._result;
      }
      __name(lazyInitializer, "lazyInitializer");
      function resolveDispatcher() {
        var dispatcher = ReactSharedInternals.H;
        null === dispatcher && console.error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
        return dispatcher;
      }
      __name(resolveDispatcher, "resolveDispatcher");
      function releaseAsyncTransition() {
        ReactSharedInternals.asyncTransitions--;
      }
      __name(releaseAsyncTransition, "releaseAsyncTransition");
      function enqueueTask(task) {
        if (null === enqueueTaskImpl)
          try {
            var requireString = ("require" + Math.random()).slice(0, 7);
            enqueueTaskImpl = (module && module[requireString]).call(
              module,
              "timers"
            ).setImmediate;
          } catch (_err) {
            enqueueTaskImpl = /* @__PURE__ */ __name(function(callback) {
              false === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = true, "undefined" === typeof MessageChannel && console.error(
                "This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."
              ));
              var channel = new MessageChannel();
              channel.port1.onmessage = callback;
              channel.port2.postMessage(void 0);
            }, "enqueueTaskImpl");
          }
        return enqueueTaskImpl(task);
      }
      __name(enqueueTask, "enqueueTask");
      function aggregateErrors(errors) {
        return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
      }
      __name(aggregateErrors, "aggregateErrors");
      function popActScope(prevActQueue, prevActScopeDepth) {
        prevActScopeDepth !== actScopeDepth - 1 && console.error(
          "You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. "
        );
        actScopeDepth = prevActScopeDepth;
      }
      __name(popActScope, "popActScope");
      function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
        var queue = ReactSharedInternals.actQueue;
        if (null !== queue)
          if (0 !== queue.length)
            try {
              flushActQueue(queue);
              enqueueTask(function() {
                return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
              });
              return;
            } catch (error) {
              ReactSharedInternals.thrownErrors.push(error);
            }
          else ReactSharedInternals.actQueue = null;
        0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
      }
      __name(recursivelyFlushAsyncActWork, "recursivelyFlushAsyncActWork");
      function flushActQueue(queue) {
        if (!isFlushing) {
          isFlushing = true;
          var i2 = 0;
          try {
            for (; i2 < queue.length; i2++) {
              var callback = queue[i2];
              do {
                ReactSharedInternals.didUsePromise = false;
                var continuation = callback(false);
                if (null !== continuation) {
                  if (ReactSharedInternals.didUsePromise) {
                    queue[i2] = callback;
                    queue.splice(0, i2);
                    return;
                  }
                  callback = continuation;
                } else break;
              } while (1);
            }
            queue.length = 0;
          } catch (error) {
            queue.splice(0, i2 + 1), ReactSharedInternals.thrownErrors.push(error);
          } finally {
            isFlushing = false;
          }
        }
      }
      __name(flushActQueue, "flushActQueue");
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
      var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
        isMounted: /* @__PURE__ */ __name(function() {
          return false;
        }, "isMounted"),
        enqueueForceUpdate: /* @__PURE__ */ __name(function(publicInstance) {
          warnNoop(publicInstance, "forceUpdate");
        }, "enqueueForceUpdate"),
        enqueueReplaceState: /* @__PURE__ */ __name(function(publicInstance) {
          warnNoop(publicInstance, "replaceState");
        }, "enqueueReplaceState"),
        enqueueSetState: /* @__PURE__ */ __name(function(publicInstance) {
          warnNoop(publicInstance, "setState");
        }, "enqueueSetState")
      }, assign = Object.assign, emptyObject = {};
      Object.freeze(emptyObject);
      Component.prototype.isReactComponent = {};
      Component.prototype.setState = function(partialState, callback) {
        if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
          throw Error(
            "takes an object of state variables to update or a function which returns an object of state variables."
          );
        this.updater.enqueueSetState(this, partialState, callback, "setState");
      };
      Component.prototype.forceUpdate = function(callback) {
        this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
      };
      var deprecatedAPIs = {
        isMounted: [
          "isMounted",
          "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
        ],
        replaceState: [
          "replaceState",
          "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
        ]
      };
      for (fnName in deprecatedAPIs)
        deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
      ComponentDummy.prototype = Component.prototype;
      deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
      deprecatedAPIs.constructor = PureComponent;
      assign(deprecatedAPIs, Component.prototype);
      deprecatedAPIs.isPureReactComponent = true;
      var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
        H: null,
        A: null,
        T: null,
        S: null,
        actQueue: null,
        asyncTransitions: 0,
        isBatchingLegacy: false,
        didScheduleLegacyUpdate: false,
        didUsePromise: false,
        thrownErrors: [],
        getCurrentStack: null,
        recentlyCreatedOwnerStacks: 0
      }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      deprecatedAPIs = {
        react_stack_bottom_frame: /* @__PURE__ */ __name(function(callStackForError) {
          return callStackForError();
        }, "react_stack_bottom_frame")
      };
      var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(
        deprecatedAPIs,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
        if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
          var event = new window.ErrorEvent("error", {
            bubbles: true,
            cancelable: true,
            message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
            error
          });
          if (!window.dispatchEvent(event)) return;
        } else if ("object" === typeof process && "function" === typeof process.emit) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
        queueMicrotask(function() {
          return queueMicrotask(callback);
        });
      } : enqueueTask;
      deprecatedAPIs = Object.freeze({
        __proto__: null,
        c: /* @__PURE__ */ __name(function(size) {
          return resolveDispatcher().useMemoCache(size);
        }, "c")
      });
      var fnName = {
        map: mapChildren,
        forEach: /* @__PURE__ */ __name(function(children, forEachFunc, forEachContext) {
          mapChildren(
            children,
            function() {
              forEachFunc.apply(this, arguments);
            },
            forEachContext
          );
        }, "forEach"),
        count: /* @__PURE__ */ __name(function(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }, "count"),
        toArray: /* @__PURE__ */ __name(function(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }, "toArray"),
        only: /* @__PURE__ */ __name(function(children) {
          if (!isValidElement(children))
            throw Error(
              "React.Children.only expected to receive a single React element child."
            );
          return children;
        }, "only")
      };
      exports.Activity = REACT_ACTIVITY_TYPE;
      exports.Children = fnName;
      exports.Component = Component;
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.Profiler = REACT_PROFILER_TYPE;
      exports.PureComponent = PureComponent;
      exports.StrictMode = REACT_STRICT_MODE_TYPE;
      exports.Suspense = REACT_SUSPENSE_TYPE;
      exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
      exports.__COMPILER_RUNTIME = deprecatedAPIs;
      exports.act = function(callback) {
        var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
        actScopeDepth++;
        var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = false;
        try {
          var result = callback();
        } catch (error) {
          ReactSharedInternals.thrownErrors.push(error);
        }
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        if (null !== result && "object" === typeof result && "function" === typeof result.then) {
          var thenable = result;
          queueSeveralMicrotasks(function() {
            didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
              "You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"
            ));
          });
          return {
            then: /* @__PURE__ */ __name(function(resolve, reject) {
              didAwaitActCall = true;
              thenable.then(
                function(returnValue) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  if (0 === prevActScopeDepth) {
                    try {
                      flushActQueue(queue), enqueueTask(function() {
                        return recursivelyFlushAsyncActWork(
                          returnValue,
                          resolve,
                          reject
                        );
                      });
                    } catch (error$0) {
                      ReactSharedInternals.thrownErrors.push(error$0);
                    }
                    if (0 < ReactSharedInternals.thrownErrors.length) {
                      var _thrownError = aggregateErrors(
                        ReactSharedInternals.thrownErrors
                      );
                      ReactSharedInternals.thrownErrors.length = 0;
                      reject(_thrownError);
                    }
                  } else resolve(returnValue);
                },
                function(error) {
                  popActScope(prevActQueue, prevActScopeDepth);
                  0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(
                    ReactSharedInternals.thrownErrors
                  ), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
                }
              );
            }, "then")
          };
        }
        var returnValue$jscomp$0 = result;
        popActScope(prevActQueue, prevActScopeDepth);
        0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error(
            "A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"
          ));
        }), ReactSharedInternals.actQueue = null);
        if (0 < ReactSharedInternals.thrownErrors.length)
          throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
        return {
          then: /* @__PURE__ */ __name(function(resolve, reject) {
            didAwaitActCall = true;
            0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
              return recursivelyFlushAsyncActWork(
                returnValue$jscomp$0,
                resolve,
                reject
              );
            })) : resolve(returnValue$jscomp$0);
          }, "then")
        };
      };
      exports.cache = function(fn) {
        return function() {
          return fn.apply(null, arguments);
        };
      };
      exports.cacheSignal = function() {
        return null;
      };
      exports.captureOwnerStack = function() {
        var getCurrentStack = ReactSharedInternals.getCurrentStack;
        return null === getCurrentStack ? null : getCurrentStack();
      };
      exports.cloneElement = function(element, config, children) {
        if (null === element || void 0 === element)
          throw Error(
            "The argument must be a React element, but you passed " + element + "."
          );
        var props = assign({}, element.props), key = element.key, owner = element._owner;
        if (null != config) {
          var JSCompiler_inline_result;
          a: {
            if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(
              config,
              "ref"
            ).get) && JSCompiler_inline_result.isReactWarning) {
              JSCompiler_inline_result = false;
              break a;
            }
            JSCompiler_inline_result = void 0 !== config.ref;
          }
          JSCompiler_inline_result && (owner = getOwner());
          hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
          for (propName in config)
            !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
        }
        var propName = arguments.length - 2;
        if (1 === propName) props.children = children;
        else if (1 < propName) {
          JSCompiler_inline_result = Array(propName);
          for (var i2 = 0; i2 < propName; i2++)
            JSCompiler_inline_result[i2] = arguments[i2 + 2];
          props.children = JSCompiler_inline_result;
        }
        props = ReactElement(
          element.type,
          key,
          props,
          owner,
          element._debugStack,
          element._debugTask
        );
        for (key = 2; key < arguments.length; key++)
          validateChildKeys(arguments[key]);
        return props;
      };
      exports.createContext = function(defaultValue) {
        defaultValue = {
          $$typeof: REACT_CONTEXT_TYPE,
          _currentValue: defaultValue,
          _currentValue2: defaultValue,
          _threadCount: 0,
          Provider: null,
          Consumer: null
        };
        defaultValue.Provider = defaultValue;
        defaultValue.Consumer = {
          $$typeof: REACT_CONSUMER_TYPE,
          _context: defaultValue
        };
        defaultValue._currentRenderer = null;
        defaultValue._currentRenderer2 = null;
        return defaultValue;
      };
      exports.createElement = function(type, config, children) {
        for (var i2 = 2; i2 < arguments.length; i2++)
          validateChildKeys(arguments[i2]);
        i2 = {};
        var key = null;
        if (null != config)
          for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn(
            "Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform"
          )), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
            hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i2[propName] = config[propName]);
        var childrenLength = arguments.length - 2;
        if (1 === childrenLength) i2.children = children;
        else if (1 < childrenLength) {
          for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++)
            childArray[_i] = arguments[_i + 2];
          Object.freeze && Object.freeze(childArray);
          i2.children = childArray;
        }
        if (type && type.defaultProps)
          for (propName in childrenLength = type.defaultProps, childrenLength)
            void 0 === i2[propName] && (i2[propName] = childrenLength[propName]);
        key && defineKeyPropWarningGetter(
          i2,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return ReactElement(
          type,
          key,
          i2,
          getOwner(),
          propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.createRef = function() {
        var refObject = { current: null };
        Object.seal(refObject);
        return refObject;
      };
      exports.forwardRef = function(render) {
        null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error(
          "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))."
        ) : "function" !== typeof render ? console.error(
          "forwardRef requires a render function but was given %s.",
          null === render ? "null" : typeof render
        ) : 0 !== render.length && 2 !== render.length && console.error(
          "forwardRef render functions accept exactly two parameters: props and ref. %s",
          1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined."
        );
        null != render && null != render.defaultProps && console.error(
          "forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?"
        );
        var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
        Object.defineProperty(elementType, "displayName", {
          enumerable: false,
          configurable: true,
          get: /* @__PURE__ */ __name(function() {
            return ownName;
          }, "get"),
          set: /* @__PURE__ */ __name(function(name) {
            ownName = name;
            render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
          }, "set")
        });
        return elementType;
      };
      exports.isValidElement = isValidElement;
      exports.lazy = function(ctor) {
        ctor = { _status: -1, _result: ctor };
        var lazyType = {
          $$typeof: REACT_LAZY_TYPE,
          _payload: ctor,
          _init: lazyInitializer
        }, ioInfo = {
          name: "lazy",
          start: -1,
          end: -1,
          value: null,
          owner: null,
          debugStack: Error("react-stack-top-frame"),
          debugTask: console.createTask ? console.createTask("lazy()") : null
        };
        ctor._ioInfo = ioInfo;
        lazyType._debugInfo = [{ awaited: ioInfo }];
        return lazyType;
      };
      exports.memo = function(type, compare) {
        null == type && console.error(
          "memo: The first argument must be a component. Instead received: %s",
          null === type ? "null" : typeof type
        );
        compare = {
          $$typeof: REACT_MEMO_TYPE,
          type,
          compare: void 0 === compare ? null : compare
        };
        var ownName;
        Object.defineProperty(compare, "displayName", {
          enumerable: false,
          configurable: true,
          get: /* @__PURE__ */ __name(function() {
            return ownName;
          }, "get"),
          set: /* @__PURE__ */ __name(function(name) {
            ownName = name;
            type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
          }, "set")
        });
        return compare;
      };
      exports.startTransition = function(scope) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        currentTransition._updatedFibers = /* @__PURE__ */ new Set();
        ReactSharedInternals.T = currentTransition;
        try {
          var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
          null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
          "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
        } catch (error) {
          reportGlobalError(error);
        } finally {
          null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn(
            "Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."
          )), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error(
            "We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."
          ), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
        }
      };
      exports.unstable_useCacheRefresh = function() {
        return resolveDispatcher().useCacheRefresh();
      };
      exports.use = function(usable) {
        return resolveDispatcher().use(usable);
      };
      exports.useActionState = function(action, initialState, permalink) {
        return resolveDispatcher().useActionState(
          action,
          initialState,
          permalink
        );
      };
      exports.useCallback = function(callback, deps) {
        return resolveDispatcher().useCallback(callback, deps);
      };
      exports.useContext = function(Context) {
        var dispatcher = resolveDispatcher();
        Context.$$typeof === REACT_CONSUMER_TYPE && console.error(
          "Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?"
        );
        return dispatcher.useContext(Context);
      };
      exports.useDebugValue = function(value, formatterFn) {
        return resolveDispatcher().useDebugValue(value, formatterFn);
      };
      exports.useDeferredValue = function(value, initialValue) {
        return resolveDispatcher().useDeferredValue(value, initialValue);
      };
      exports.useEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useEffect(create2, deps);
      };
      exports.useEffectEvent = function(callback) {
        return resolveDispatcher().useEffectEvent(callback);
      };
      exports.useId = function() {
        return resolveDispatcher().useId();
      };
      exports.useImperativeHandle = function(ref, create2, deps) {
        return resolveDispatcher().useImperativeHandle(ref, create2, deps);
      };
      exports.useInsertionEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useInsertionEffect(create2, deps);
      };
      exports.useLayoutEffect = function(create2, deps) {
        null == create2 && console.warn(
          "React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?"
        );
        return resolveDispatcher().useLayoutEffect(create2, deps);
      };
      exports.useMemo = function(create2, deps) {
        return resolveDispatcher().useMemo(create2, deps);
      };
      exports.useOptimistic = function(passthrough, reducer) {
        return resolveDispatcher().useOptimistic(passthrough, reducer);
      };
      exports.useReducer = function(reducer, initialArg, init4) {
        return resolveDispatcher().useReducer(reducer, initialArg, init4);
      };
      exports.useRef = function(initialValue) {
        return resolveDispatcher().useRef(initialValue);
      };
      exports.useState = function(initialState) {
        return resolveDispatcher().useState(initialState);
      };
      exports.useSyncExternalStore = function(subscribe2, getSnapshot, getServerSnapshot) {
        return resolveDispatcher().useSyncExternalStore(
          subscribe2,
          getSnapshot,
          getServerSnapshot
        );
      };
      exports.useTransition = function() {
        return resolveDispatcher().useTransition();
      };
      exports.version = "19.2.0";
      "undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
    }();
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/index.js
var require_react = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/index.js"(exports, module) {
    "use strict";
    init_esm();
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_production();
    } else {
      module.exports = require_react_development();
    }
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/cjs/react-jsx-runtime.development.js"(exports) {
    "use strict";
    init_esm();
    "production" !== process.env.NODE_ENV && function() {
      function getComponentNameFromType(type) {
        if (null == type) return null;
        if ("function" === typeof type)
          return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
        if ("string" === typeof type) return type;
        switch (type) {
          case REACT_FRAGMENT_TYPE:
            return "Fragment";
          case REACT_PROFILER_TYPE:
            return "Profiler";
          case REACT_STRICT_MODE_TYPE:
            return "StrictMode";
          case REACT_SUSPENSE_TYPE:
            return "Suspense";
          case REACT_SUSPENSE_LIST_TYPE:
            return "SuspenseList";
          case REACT_ACTIVITY_TYPE:
            return "Activity";
        }
        if ("object" === typeof type)
          switch ("number" === typeof type.tag && console.error(
            "Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."
          ), type.$$typeof) {
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_CONTEXT_TYPE:
              return type.displayName || "Context";
            case REACT_CONSUMER_TYPE:
              return (type._context.displayName || "Context") + ".Consumer";
            case REACT_FORWARD_REF_TYPE:
              var innerType = type.render;
              type = type.displayName;
              type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
              return type;
            case REACT_MEMO_TYPE:
              return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
            case REACT_LAZY_TYPE:
              innerType = type._payload;
              type = type._init;
              try {
                return getComponentNameFromType(type(innerType));
              } catch (x) {
              }
          }
        return null;
      }
      __name(getComponentNameFromType, "getComponentNameFromType");
      function testStringCoercion(value) {
        return "" + value;
      }
      __name(testStringCoercion, "testStringCoercion");
      function checkKeyStringCoercion(value) {
        try {
          testStringCoercion(value);
          var JSCompiler_inline_result = false;
        } catch (e) {
          JSCompiler_inline_result = true;
        }
        if (JSCompiler_inline_result) {
          JSCompiler_inline_result = console;
          var JSCompiler_temp_const = JSCompiler_inline_result.error;
          var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
          JSCompiler_temp_const.call(
            JSCompiler_inline_result,
            "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.",
            JSCompiler_inline_result$jscomp$0
          );
          return testStringCoercion(value);
        }
      }
      __name(checkKeyStringCoercion, "checkKeyStringCoercion");
      function getTaskName(type) {
        if (type === REACT_FRAGMENT_TYPE) return "<>";
        if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE)
          return "<...>";
        try {
          var name = getComponentNameFromType(type);
          return name ? "<" + name + ">" : "<...>";
        } catch (x) {
          return "<...>";
        }
      }
      __name(getTaskName, "getTaskName");
      function getOwner() {
        var dispatcher = ReactSharedInternals.A;
        return null === dispatcher ? null : dispatcher.getOwner();
      }
      __name(getOwner, "getOwner");
      function UnknownOwner() {
        return Error("react-stack-top-frame");
      }
      __name(UnknownOwner, "UnknownOwner");
      function hasValidKey(config) {
        if (hasOwnProperty.call(config, "key")) {
          var getter = Object.getOwnPropertyDescriptor(config, "key").get;
          if (getter && getter.isReactWarning) return false;
        }
        return void 0 !== config.key;
      }
      __name(hasValidKey, "hasValidKey");
      function defineKeyPropWarningGetter(props, displayName) {
        function warnAboutAccessingKey() {
          specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error(
            "%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)",
            displayName
          ));
        }
        __name(warnAboutAccessingKey, "warnAboutAccessingKey");
        warnAboutAccessingKey.isReactWarning = true;
        Object.defineProperty(props, "key", {
          get: warnAboutAccessingKey,
          configurable: true
        });
      }
      __name(defineKeyPropWarningGetter, "defineKeyPropWarningGetter");
      function elementRefGetterWithDeprecationWarning() {
        var componentName = getComponentNameFromType(this.type);
        didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error(
          "Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."
        ));
        componentName = this.props.ref;
        return void 0 !== componentName ? componentName : null;
      }
      __name(elementRefGetterWithDeprecationWarning, "elementRefGetterWithDeprecationWarning");
      function ReactElement(type, key, props, owner, debugStack, debugTask) {
        var refProp = props.ref;
        type = {
          $$typeof: REACT_ELEMENT_TYPE,
          type,
          key,
          props,
          _owner: owner
        };
        null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
          enumerable: false,
          get: elementRefGetterWithDeprecationWarning
        }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
        type._store = {};
        Object.defineProperty(type._store, "validated", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: 0
        });
        Object.defineProperty(type, "_debugInfo", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: null
        });
        Object.defineProperty(type, "_debugStack", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugStack
        });
        Object.defineProperty(type, "_debugTask", {
          configurable: false,
          enumerable: false,
          writable: true,
          value: debugTask
        });
        Object.freeze && (Object.freeze(type.props), Object.freeze(type));
        return type;
      }
      __name(ReactElement, "ReactElement");
      function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
        var children = config.children;
        if (void 0 !== children)
          if (isStaticChildren)
            if (isArrayImpl(children)) {
              for (isStaticChildren = 0; isStaticChildren < children.length; isStaticChildren++)
                validateChildKeys(children[isStaticChildren]);
              Object.freeze && Object.freeze(children);
            } else
              console.error(
                "React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead."
              );
          else validateChildKeys(children);
        if (hasOwnProperty.call(config, "key")) {
          children = getComponentNameFromType(type);
          var keys = Object.keys(config).filter(function(k) {
            return "key" !== k;
          });
          isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
          didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(
            'A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />',
            isStaticChildren,
            children,
            keys,
            children
          ), didWarnAboutKeySpread[children + isStaticChildren] = true);
        }
        children = null;
        void 0 !== maybeKey && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
        hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
        if ("key" in config) {
          maybeKey = {};
          for (var propName in config)
            "key" !== propName && (maybeKey[propName] = config[propName]);
        } else maybeKey = config;
        children && defineKeyPropWarningGetter(
          maybeKey,
          "function" === typeof type ? type.displayName || type.name || "Unknown" : type
        );
        return ReactElement(
          type,
          children,
          maybeKey,
          getOwner(),
          debugStack,
          debugTask
        );
      }
      __name(jsxDEVImpl, "jsxDEVImpl");
      function validateChildKeys(node) {
        isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
      }
      __name(validateChildKeys, "validateChildKeys");
      function isValidElement(object) {
        return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      __name(isValidElement, "isValidElement");
      var React = require_react(), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
        return null;
      };
      React = {
        react_stack_bottom_frame: /* @__PURE__ */ __name(function(callStackForError) {
          return callStackForError();
        }, "react_stack_bottom_frame")
      };
      var specialPropKeyWarningShown;
      var didWarnAboutElementRef = {};
      var unknownOwnerDebugStack = React.react_stack_bottom_frame.bind(
        React,
        UnknownOwner
      )();
      var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
      var didWarnAboutKeySpread = {};
      exports.Fragment = REACT_FRAGMENT_TYPE;
      exports.jsx = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          false,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
      exports.jsxs = function(type, config, maybeKey) {
        var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
        return jsxDEVImpl(
          type,
          config,
          maybeKey,
          true,
          trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack,
          trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask
        );
      };
    }();
  }
});

// ../../node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "../../node_modules/.pnpm/react@19.2.0/node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    init_esm();
    if (process.env.NODE_ENV === "production") {
      module.exports = require_react_jsx_runtime_production();
    } else {
      module.exports = require_react_jsx_runtime_development();
    }
  }
});

// trigger/sync-agent-auth.ts
init_esm();

// ../../packages/db/src/admin.ts
init_esm();

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/validate.js
init_esm();

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/regex.js
init_esm();
var regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/validate.js
function validate(uuid) {
  return typeof uuid === "string" && regex_default.test(uuid);
}
__name(validate, "validate");
var validate_default = validate;

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/stringify.js
init_esm();
var byteToHex = [];
for (let i2 = 0; i2 < 256; ++i2) {
  byteToHex.push((i2 + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
__name(unsafeStringify, "unsafeStringify");

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/rng.js
init_esm();
import { randomFillSync } from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
__name(rng, "rng");

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/v4.js
init_esm();

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/native.js
init_esm();
import { randomUUID } from "crypto";
var native_default = { randomUUID };

// ../../node_modules/.pnpm/uuid@11.1.1/node_modules/uuid/dist/esm/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    if (offset < 0 || offset + 16 > buf.length) {
      throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
    }
    for (let i2 = 0; i2 < 16; ++i2) {
      buf[offset + i2] = rnds[i2];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
__name(v4, "v4");
var v4_default = v4;

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/Reactor.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/weakHash.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/weakHashLegacy.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/instaql.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/datalog.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/store.js
init_esm();

// ../../node_modules/.pnpm/mutative@1.3.0/node_modules/mutative/dist/mutative.esm.mjs
init_esm();
var Operation = {
  Remove: "remove",
  Replace: "replace",
  Add: "add"
};
var PROXY_DRAFT = Symbol.for("__MUTATIVE_PROXY_DRAFT__");
var RAW_RETURN_SYMBOL = Symbol("__MUTATIVE_RAW_RETURN_SYMBOL__");
var iteratorSymbol = Symbol.iterator;
var dataTypes = {
  mutable: "mutable",
  immutable: "immutable"
};
var internal = {};
function has(target, key) {
  return target instanceof Map ? target.has(key) : Object.prototype.hasOwnProperty.call(target, key);
}
__name(has, "has");
function getDescriptor(target, key) {
  if (key in target) {
    let prototype = Reflect.getPrototypeOf(target);
    while (prototype) {
      const descriptor = Reflect.getOwnPropertyDescriptor(prototype, key);
      if (descriptor)
        return descriptor;
      prototype = Reflect.getPrototypeOf(prototype);
    }
  }
  return;
}
__name(getDescriptor, "getDescriptor");
function isBaseSetInstance(obj) {
  return Object.getPrototypeOf(obj) === Set.prototype;
}
__name(isBaseSetInstance, "isBaseSetInstance");
function isBaseMapInstance(obj) {
  return Object.getPrototypeOf(obj) === Map.prototype;
}
__name(isBaseMapInstance, "isBaseMapInstance");
function latest(proxyDraft) {
  var _a;
  return (_a = proxyDraft.copy) !== null && _a !== void 0 ? _a : proxyDraft.original;
}
__name(latest, "latest");
function isDraft(target) {
  return !!getProxyDraft(target);
}
__name(isDraft, "isDraft");
function getProxyDraft(value) {
  if (typeof value !== "object")
    return null;
  return value === null || value === void 0 ? void 0 : value[PROXY_DRAFT];
}
__name(getProxyDraft, "getProxyDraft");
function getValue(value) {
  var _a;
  const proxyDraft = getProxyDraft(value);
  return proxyDraft ? (_a = proxyDraft.copy) !== null && _a !== void 0 ? _a : proxyDraft.original : value;
}
__name(getValue, "getValue");
function isDraftable(value, options) {
  if (!value || typeof value !== "object")
    return false;
  let markResult;
  return Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value) || value instanceof Map || value instanceof Set || !!(options === null || options === void 0 ? void 0 : options.mark) && ((markResult = options.mark(value, dataTypes)) === dataTypes.immutable || typeof markResult === "function");
}
__name(isDraftable, "isDraftable");
function getPath(target, path = []) {
  if (Object.hasOwnProperty.call(target, "key")) {
    const parentCopy = target.parent.copy;
    const proxyDraft = getProxyDraft(get(parentCopy, target.key));
    if (proxyDraft !== null && (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== target.original) {
      return null;
    }
    const isSet = target.parent.type === 3;
    const key = isSet ? Array.from(target.parent.setMap.keys()).indexOf(target.key) : target.key;
    if (!(isSet && parentCopy.size > key || has(parentCopy, key)))
      return null;
    path.push(key);
  }
  if (target.parent) {
    return getPath(target.parent, path);
  }
  path.reverse();
  try {
    resolvePath(target.copy, path);
  } catch (e) {
    return null;
  }
  return path;
}
__name(getPath, "getPath");
function getType(target) {
  if (Array.isArray(target))
    return 1;
  if (target instanceof Map)
    return 2;
  if (target instanceof Set)
    return 3;
  return 0;
}
__name(getType, "getType");
function get(target, key) {
  return getType(target) === 2 ? target.get(key) : target[key];
}
__name(get, "get");
function set(target, key, value) {
  const type = getType(target);
  if (type === 2) {
    target.set(key, value);
  } else {
    target[key] = value;
  }
}
__name(set, "set");
function peek(target, key) {
  const state = getProxyDraft(target);
  const source = state ? latest(state) : target;
  return source[key];
}
__name(peek, "peek");
function isEqual(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
__name(isEqual, "isEqual");
function revokeProxy(proxyDraft) {
  if (!proxyDraft)
    return;
  while (proxyDraft.finalities.revoke.length > 0) {
    const revoke = proxyDraft.finalities.revoke.pop();
    revoke();
  }
}
__name(revokeProxy, "revokeProxy");
function escapePath(path, pathAsArray) {
  return pathAsArray ? path : [""].concat(path).map((_item) => {
    const item = `${_item}`;
    if (item.indexOf("/") === -1 && item.indexOf("~") === -1)
      return item;
    return item.replace(/~/g, "~0").replace(/\//g, "~1");
  }).join("/");
}
__name(escapePath, "escapePath");
function resolvePath(base, path) {
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    base = get(getType(base) === 3 ? Array.from(base) : base, key);
    if (typeof base !== "object") {
      throw new Error(`Cannot resolve patch at '${path.join("/")}'.`);
    }
  }
  return base;
}
__name(resolvePath, "resolvePath");
function strictCopy(target) {
  const copy = Object.create(Object.getPrototypeOf(target));
  Reflect.ownKeys(target).forEach((key) => {
    let desc = Reflect.getOwnPropertyDescriptor(target, key);
    if (desc.enumerable && desc.configurable && desc.writable) {
      copy[key] = target[key];
      return;
    }
    if (!desc.writable) {
      desc.writable = true;
      desc.configurable = true;
    }
    if (desc.get || desc.set)
      desc = {
        configurable: true,
        writable: true,
        enumerable: desc.enumerable,
        value: target[key]
      };
    Reflect.defineProperty(copy, key, desc);
  });
  return copy;
}
__name(strictCopy, "strictCopy");
var propIsEnum = Object.prototype.propertyIsEnumerable;
function shallowCopy(original, options) {
  let markResult;
  if (Array.isArray(original)) {
    return Array.prototype.concat.call(original);
  } else if (original instanceof Set) {
    if (!isBaseSetInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original.values());
    }
    return Set.prototype.difference ? Set.prototype.difference.call(original, /* @__PURE__ */ new Set()) : new Set(original.values());
  } else if (original instanceof Map) {
    if (!isBaseMapInstance(original)) {
      const SubClass = Object.getPrototypeOf(original).constructor;
      return new SubClass(original);
    }
    return new Map(original);
  } else if ((options === null || options === void 0 ? void 0 : options.mark) && (markResult = options.mark(original, dataTypes), markResult !== void 0) && markResult !== dataTypes.mutable) {
    if (markResult === dataTypes.immutable) {
      return strictCopy(original);
    } else if (typeof markResult === "function") {
      if (options.enablePatches || options.enableAutoFreeze) {
        throw new Error(`You can't use mark and patches or auto freeze together.`);
      }
      return markResult();
    }
    throw new Error(`Unsupported mark result: ${markResult}`);
  } else if (typeof original === "object" && Object.getPrototypeOf(original) === Object.prototype) {
    const copy = {};
    Object.keys(original).forEach((key) => {
      copy[key] = original[key];
    });
    Object.getOwnPropertySymbols(original).forEach((key) => {
      if (propIsEnum.call(original, key)) {
        copy[key] = original[key];
      }
    });
    return copy;
  } else {
    throw new Error(`Please check mark() to ensure that it is a stable marker draftable function.`);
  }
}
__name(shallowCopy, "shallowCopy");
function ensureShallowCopy(target) {
  if (target.copy)
    return;
  target.copy = shallowCopy(target.original, target.options);
}
__name(ensureShallowCopy, "ensureShallowCopy");
function deepClone(target) {
  if (!isDraftable(target))
    return getValue(target);
  if (Array.isArray(target))
    return target.map(deepClone);
  if (target instanceof Map) {
    const iterable = Array.from(target.entries()).map(([k, v]) => [
      k,
      deepClone(v)
    ]);
    if (!isBaseMapInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Map(iterable);
  }
  if (target instanceof Set) {
    const iterable = Array.from(target).map(deepClone);
    if (!isBaseSetInstance(target)) {
      const SubClass = Object.getPrototypeOf(target).constructor;
      return new SubClass(iterable);
    }
    return new Set(iterable);
  }
  const copy = Object.create(Object.getPrototypeOf(target));
  for (const key in target)
    copy[key] = deepClone(target[key]);
  return copy;
}
__name(deepClone, "deepClone");
function cloneIfNeeded(target) {
  return isDraft(target) ? deepClone(target) : target;
}
__name(cloneIfNeeded, "cloneIfNeeded");
function markChanged(proxyDraft) {
  var _a;
  proxyDraft.assignedMap = (_a = proxyDraft.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
  if (!proxyDraft.operated) {
    proxyDraft.operated = true;
    if (proxyDraft.parent) {
      markChanged(proxyDraft.parent);
    }
  }
}
__name(markChanged, "markChanged");
function throwFrozenError() {
  throw new Error("Cannot modify frozen object");
}
__name(throwFrozenError, "throwFrozenError");
function deepFreeze(target, subKey, updatedValues, stack, keys) {
  {
    updatedValues = updatedValues !== null && updatedValues !== void 0 ? updatedValues : /* @__PURE__ */ new WeakMap();
    stack = stack !== null && stack !== void 0 ? stack : [];
    keys = keys !== null && keys !== void 0 ? keys : [];
    const value = updatedValues.has(target) ? updatedValues.get(target) : target;
    if (stack.length > 0) {
      const index = stack.indexOf(value);
      if (value && typeof value === "object" && index !== -1) {
        if (stack[0] === value) {
          throw new Error(`Forbids circular reference`);
        }
        throw new Error(`Forbids circular reference: ~/${keys.slice(0, index).map((key, index2) => {
          if (typeof key === "symbol")
            return `[${key.toString()}]`;
          const parent = stack[index2];
          if (typeof key === "object" && (parent instanceof Map || parent instanceof Set))
            return Array.from(parent.keys()).indexOf(key);
          return key;
        }).join("/")}`);
      }
      stack.push(value);
      keys.push(subKey);
    } else {
      stack.push(value);
    }
  }
  if (Object.isFrozen(target) || isDraft(target)) {
    {
      stack.pop();
      keys.pop();
    }
    return;
  }
  const type = getType(target);
  switch (type) {
    case 2:
      for (const [key, value] of target) {
        deepFreeze(key, key, updatedValues, stack, keys);
        deepFreeze(value, key, updatedValues, stack, keys);
      }
      target.set = target.clear = target.delete = throwFrozenError;
      break;
    case 3:
      for (const value of target) {
        deepFreeze(value, value, updatedValues, stack, keys);
      }
      target.add = target.clear = target.delete = throwFrozenError;
      break;
    case 1:
      Object.freeze(target);
      let index = 0;
      for (const value of target) {
        deepFreeze(value, index, updatedValues, stack, keys);
        index += 1;
      }
      break;
    default:
      Object.freeze(target);
      Object.keys(target).forEach((name) => {
        const value = target[name];
        deepFreeze(value, name, updatedValues, stack, keys);
      });
  }
  {
    stack.pop();
    keys.pop();
  }
}
__name(deepFreeze, "deepFreeze");
function forEach(target, iter) {
  const type = getType(target);
  if (type === 0) {
    Reflect.ownKeys(target).forEach((key) => {
      iter(key, target[key], target);
    });
  } else if (type === 1) {
    let index = 0;
    for (const entry of target) {
      iter(index, entry, target);
      index += 1;
    }
  } else {
    target.forEach((entry, index) => iter(index, entry, target));
  }
}
__name(forEach, "forEach");
function handleValue(target, handledSet, options) {
  if (isDraft(target) || !isDraftable(target, options) || handledSet.has(target) || Object.isFrozen(target))
    return;
  const isSet = target instanceof Set;
  const setMap = isSet ? /* @__PURE__ */ new Map() : void 0;
  handledSet.add(target);
  forEach(target, (key, value) => {
    var _a;
    if (isDraft(value)) {
      const proxyDraft = getProxyDraft(value);
      ensureShallowCopy(proxyDraft);
      const updatedValue = ((_a = proxyDraft.assignedMap) === null || _a === void 0 ? void 0 : _a.size) || proxyDraft.operated ? proxyDraft.copy : proxyDraft.original;
      set(isSet ? setMap : target, key, updatedValue);
    } else {
      handleValue(value, handledSet, options);
    }
  });
  if (setMap) {
    const set2 = target;
    const values = Array.from(set2);
    set2.clear();
    values.forEach((value) => {
      set2.add(setMap.has(value) ? setMap.get(value) : value);
    });
  }
}
__name(handleValue, "handleValue");
function finalizeAssigned(proxyDraft, key) {
  const copy = proxyDraft.type === 3 ? proxyDraft.setMap : proxyDraft.copy;
  if (proxyDraft.finalities.revoke.length > 1 && proxyDraft.assignedMap.get(key) && copy) {
    handleValue(get(copy, key), proxyDraft.finalities.handledSet, proxyDraft.options);
  }
}
__name(finalizeAssigned, "finalizeAssigned");
function finalizeSetValue(target) {
  if (target.type === 3 && target.copy) {
    target.copy.clear();
    target.setMap.forEach((value) => {
      target.copy.add(getValue(value));
    });
  }
}
__name(finalizeSetValue, "finalizeSetValue");
function finalizePatches(target, generatePatches2, patches, inversePatches) {
  const shouldFinalize = target.operated && target.assignedMap && target.assignedMap.size > 0 && !target.finalized;
  if (shouldFinalize) {
    if (patches && inversePatches) {
      const basePath = getPath(target);
      if (basePath) {
        generatePatches2(target, basePath, patches, inversePatches);
      }
    }
    target.finalized = true;
  }
}
__name(finalizePatches, "finalizePatches");
function markFinalization(target, key, value, generatePatches2) {
  const proxyDraft = getProxyDraft(value);
  if (proxyDraft) {
    if (!proxyDraft.callbacks) {
      proxyDraft.callbacks = [];
    }
    proxyDraft.callbacks.push((patches, inversePatches) => {
      var _a;
      const copy = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get(copy, key), value)) {
        let updatedValue = proxyDraft.original;
        if (proxyDraft.copy) {
          updatedValue = proxyDraft.copy;
        }
        finalizeSetValue(target);
        finalizePatches(target, generatePatches2, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues = (_a = target.options.updatedValues) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft.original);
        }
        set(copy, key, updatedValue);
      }
    });
    if (target.options.enableAutoFreeze) {
      if (proxyDraft.finalities !== target.finalities) {
        target.options.enableAutoFreeze = false;
      }
    }
  }
  if (isDraftable(value, target.options)) {
    target.finalities.draft.push(() => {
      const copy = target.type === 3 ? target.setMap : target.copy;
      if (isEqual(get(copy, key), value)) {
        finalizeAssigned(target, key);
      }
    });
  }
}
__name(markFinalization, "markFinalization");
function generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray) {
  let { original, assignedMap, options } = proxyState;
  let copy = proxyState.copy;
  if (copy.length < original.length) {
    [original, copy] = [copy, original];
    [patches, inversePatches] = [inversePatches, patches];
  }
  for (let index = 0; index < original.length; index += 1) {
    if (assignedMap.get(index.toString()) && copy[index] !== original[index]) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Replace,
        path,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(copy[index])
      });
      inversePatches.push({
        op: Operation.Replace,
        path,
        // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
        value: cloneIfNeeded(original[index])
      });
    }
  }
  for (let index = original.length; index < copy.length; index += 1) {
    const _path = basePath.concat([index]);
    const path = escapePath(_path, pathAsArray);
    patches.push({
      op: Operation.Add,
      path,
      // If it is a draft, it needs to be deep cloned, and it may also be non-draft.
      value: cloneIfNeeded(copy[index])
    });
  }
  if (original.length < copy.length) {
    const { arrayLengthAssignment = true } = options.enablePatches;
    if (arrayLengthAssignment) {
      const _path = basePath.concat(["length"]);
      const path = escapePath(_path, pathAsArray);
      inversePatches.push({
        op: Operation.Replace,
        path,
        value: original.length
      });
    } else {
      for (let index = copy.length; original.length < index; index -= 1) {
        const _path = basePath.concat([index - 1]);
        const path = escapePath(_path, pathAsArray);
        inversePatches.push({
          op: Operation.Remove,
          path
        });
      }
    }
  }
}
__name(generateArrayPatches, "generateArrayPatches");
function generatePatchesFromAssigned({ original, copy, assignedMap }, basePath, patches, inversePatches, pathAsArray) {
  assignedMap.forEach((assignedValue, key) => {
    const originalValue = get(original, key);
    const value = cloneIfNeeded(get(copy, key));
    const op = !assignedValue ? Operation.Remove : has(original, key) ? Operation.Replace : Operation.Add;
    if (isEqual(originalValue, value) && op === Operation.Replace)
      return;
    const _path = basePath.concat(key);
    const path = escapePath(_path, pathAsArray);
    patches.push(op === Operation.Remove ? { op, path } : { op, path, value });
    inversePatches.push(op === Operation.Add ? { op: Operation.Remove, path } : op === Operation.Remove ? { op: Operation.Add, path, value: originalValue } : { op: Operation.Replace, path, value: originalValue });
  });
}
__name(generatePatchesFromAssigned, "generatePatchesFromAssigned");
function generateSetPatches({ original, copy }, basePath, patches, inversePatches, pathAsArray) {
  let index = 0;
  original.forEach((value) => {
    if (!copy.has(value)) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Remove,
        path,
        value
      });
      inversePatches.unshift({
        op: Operation.Add,
        path,
        value
      });
    }
    index += 1;
  });
  index = 0;
  copy.forEach((value) => {
    if (!original.has(value)) {
      const _path = basePath.concat([index]);
      const path = escapePath(_path, pathAsArray);
      patches.push({
        op: Operation.Add,
        path,
        value
      });
      inversePatches.unshift({
        op: Operation.Remove,
        path,
        value
      });
    }
    index += 1;
  });
}
__name(generateSetPatches, "generateSetPatches");
function generatePatches(proxyState, basePath, patches, inversePatches) {
  const { pathAsArray = true } = proxyState.options.enablePatches;
  switch (proxyState.type) {
    case 0:
    case 2:
      return generatePatchesFromAssigned(proxyState, basePath, patches, inversePatches, pathAsArray);
    case 1:
      return generateArrayPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
    case 3:
      return generateSetPatches(proxyState, basePath, patches, inversePatches, pathAsArray);
  }
}
__name(generatePatches, "generatePatches");
var readable = false;
var checkReadable = /* @__PURE__ */ __name((value, options, ignoreCheckDraftable = false) => {
  if (typeof value === "object" && value !== null && (!isDraftable(value, options) || ignoreCheckDraftable) && !readable) {
    throw new Error(`Strict mode: Mutable data cannot be accessed directly, please use 'unsafe(callback)' wrap.`);
  }
}, "checkReadable");
var mapHandler = {
  get size() {
    const current2 = latest(getProxyDraft(this));
    return current2.size;
  },
  has(key) {
    return latest(getProxyDraft(this)).has(key);
  },
  set(key, value) {
    const target = getProxyDraft(this);
    const source = latest(target);
    if (!source.has(key) || !isEqual(source.get(key), value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key, true);
      target.copy.set(key, value);
      markFinalization(target, key, value, generatePatches);
    }
    return this;
  },
  delete(key) {
    if (!this.has(key)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    if (target.original.has(key)) {
      target.assignedMap.set(key, false);
    } else {
      target.assignedMap.delete(key);
    }
    target.copy.delete(key);
    return true;
  },
  clear() {
    const target = getProxyDraft(this);
    if (!this.size)
      return;
    ensureShallowCopy(target);
    markChanged(target);
    target.assignedMap = /* @__PURE__ */ new Map();
    for (const [key] of target.original) {
      target.assignedMap.set(key, false);
    }
    target.copy.clear();
  },
  forEach(callback, thisArg) {
    const target = getProxyDraft(this);
    latest(target).forEach((_value, _key) => {
      callback.call(thisArg, this.get(_key), _key, this);
    });
  },
  get(key) {
    var _a, _b;
    const target = getProxyDraft(this);
    const value = latest(target).get(key);
    const mutable = ((_b = (_a = target.options).mark) === null || _b === void 0 ? void 0 : _b.call(_a, value, dataTypes)) === dataTypes.mutable;
    if (target.options.strict) {
      checkReadable(value, target.options, mutable);
    }
    if (mutable) {
      return value;
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value !== target.original.get(key)) {
      return value;
    }
    const draft = internal.createDraft({
      original: value,
      parentDraft: target,
      key,
      finalities: target.finalities,
      options: target.options
    });
    ensureShallowCopy(target);
    target.copy.set(key, draft);
    return draft;
  },
  keys() {
    return latest(getProxyDraft(this)).keys();
  },
  values() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.values(),
      next: /* @__PURE__ */ __name(() => {
        const result = iterator.next();
        if (result.done)
          return result;
        const value = this.get(result.value);
        return {
          done: false,
          value
        };
      }, "next")
    };
  },
  entries() {
    const iterator = this.keys();
    return {
      [iteratorSymbol]: () => this.entries(),
      next: /* @__PURE__ */ __name(() => {
        const result = iterator.next();
        if (result.done)
          return result;
        const value = this.get(result.value);
        return {
          done: false,
          value: [result.value, value]
        };
      }, "next")
    };
  },
  [iteratorSymbol]() {
    return this.entries();
  }
};
var mapHandlerKeys = Reflect.ownKeys(mapHandler);
var getNextIterator = /* @__PURE__ */ __name((target, iterator, { isValuesIterator }) => () => {
  var _a, _b;
  const result = iterator.next();
  if (result.done)
    return result;
  const key = result.value;
  let value = target.setMap.get(key);
  const currentDraft = getProxyDraft(value);
  const mutable = ((_b = (_a = target.options).mark) === null || _b === void 0 ? void 0 : _b.call(_a, value, dataTypes)) === dataTypes.mutable;
  if (target.options.strict) {
    checkReadable(key, target.options, mutable);
  }
  if (!mutable && !currentDraft && isDraftable(key, target.options) && !target.finalized && target.original.has(key)) {
    const proxy = internal.createDraft({
      original: key,
      parentDraft: target,
      key,
      finalities: target.finalities,
      options: target.options
    });
    target.setMap.set(key, proxy);
    value = proxy;
  } else if (currentDraft) {
    value = currentDraft.proxy;
  }
  return {
    done: false,
    value: isValuesIterator ? value : [value, value]
  };
}, "getNextIterator");
var setHandler = {
  get size() {
    const target = getProxyDraft(this);
    return target.setMap.size;
  },
  has(value) {
    const target = getProxyDraft(this);
    if (target.setMap.has(value))
      return true;
    ensureShallowCopy(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original))
      return true;
    return false;
  },
  add(value) {
    const target = getProxyDraft(this);
    if (!this.has(value)) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(value, true);
      target.setMap.set(value, value);
      markFinalization(target, value, value, generatePatches);
    }
    return this;
  },
  delete(value) {
    if (!this.has(value)) {
      return false;
    }
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    const valueProxyDraft = getProxyDraft(value);
    if (valueProxyDraft && target.setMap.has(valueProxyDraft.original)) {
      target.assignedMap.set(valueProxyDraft.original, false);
      return target.setMap.delete(valueProxyDraft.original);
    }
    if (!valueProxyDraft && target.setMap.has(value)) {
      target.assignedMap.set(value, false);
    } else {
      target.assignedMap.delete(value);
    }
    return target.setMap.delete(value);
  },
  clear() {
    if (!this.size)
      return;
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    markChanged(target);
    for (const value of target.original) {
      target.assignedMap.set(value, false);
    }
    target.setMap.clear();
  },
  values() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.values(),
      next: getNextIterator(target, iterator, { isValuesIterator: true })
    };
  },
  entries() {
    const target = getProxyDraft(this);
    ensureShallowCopy(target);
    const iterator = target.setMap.keys();
    return {
      [Symbol.iterator]: () => this.entries(),
      next: getNextIterator(target, iterator, {
        isValuesIterator: false
      })
    };
  },
  keys() {
    return this.values();
  },
  [iteratorSymbol]() {
    return this.values();
  },
  forEach(callback, thisArg) {
    const iterator = this.values();
    let result = iterator.next();
    while (!result.done) {
      callback.call(thisArg, result.value, result.value, this);
      result = iterator.next();
    }
  }
};
if (Set.prototype.difference) {
  Object.assign(setHandler, {
    intersection(other) {
      return Set.prototype.intersection.call(new Set(this.values()), other);
    },
    union(other) {
      return Set.prototype.union.call(new Set(this.values()), other);
    },
    difference(other) {
      return Set.prototype.difference.call(new Set(this.values()), other);
    },
    symmetricDifference(other) {
      return Set.prototype.symmetricDifference.call(new Set(this.values()), other);
    },
    isSubsetOf(other) {
      return Set.prototype.isSubsetOf.call(new Set(this.values()), other);
    },
    isSupersetOf(other) {
      return Set.prototype.isSupersetOf.call(new Set(this.values()), other);
    },
    isDisjointFrom(other) {
      return Set.prototype.isDisjointFrom.call(new Set(this.values()), other);
    }
  });
}
var setHandlerKeys = Reflect.ownKeys(setHandler);
var proxyHandler = {
  get(target, key, receiver) {
    var _a, _b;
    const copy = (_a = target.copy) === null || _a === void 0 ? void 0 : _a[key];
    if (copy && target.finalities.draftsCache.has(copy)) {
      return copy;
    }
    if (key === PROXY_DRAFT)
      return target;
    let markResult;
    if (target.options.mark) {
      const value2 = key === "size" && (target.original instanceof Map || target.original instanceof Set) ? Reflect.get(target.original, key) : Reflect.get(target.original, key, receiver);
      markResult = target.options.mark(value2, dataTypes);
      if (markResult === dataTypes.mutable) {
        if (target.options.strict) {
          checkReadable(value2, target.options, true);
        }
        return value2;
      }
    }
    const source = latest(target);
    if (source instanceof Map && mapHandlerKeys.includes(key)) {
      if (key === "size") {
        return Object.getOwnPropertyDescriptor(mapHandler, "size").get.call(target.proxy);
      }
      const handle = mapHandler[key];
      return handle.bind(target.proxy);
    }
    if (source instanceof Set && setHandlerKeys.includes(key)) {
      if (key === "size") {
        return Object.getOwnPropertyDescriptor(setHandler, "size").get.call(target.proxy);
      }
      const handle = setHandler[key];
      return handle.bind(target.proxy);
    }
    if (!has(source, key)) {
      const desc = getDescriptor(source, key);
      return desc ? `value` in desc ? desc.value : (
        // !case: support for getter
        (_b = desc.get) === null || _b === void 0 ? void 0 : _b.call(target.proxy)
      ) : void 0;
    }
    const value = source[key];
    if (target.options.strict) {
      checkReadable(value, target.options);
    }
    if (target.finalized || !isDraftable(value, target.options)) {
      return value;
    }
    if (value === peek(target.original, key)) {
      ensureShallowCopy(target);
      target.copy[key] = createDraft({
        original: target.original[key],
        parentDraft: target,
        key: target.type === 1 ? Number(key) : key,
        finalities: target.finalities,
        options: target.options
      });
      if (typeof markResult === "function") {
        const subProxyDraft = getProxyDraft(target.copy[key]);
        ensureShallowCopy(subProxyDraft);
        markChanged(subProxyDraft);
        return subProxyDraft.copy;
      }
      return target.copy[key];
    }
    if (isDraft(value)) {
      target.finalities.draftsCache.add(value);
    }
    return value;
  },
  set(target, key, value) {
    var _a;
    if (target.type === 3 || target.type === 2) {
      throw new Error(`Map/Set draft does not support any property assignment.`);
    }
    let _key;
    if (target.type === 1 && key !== "length" && !(Number.isInteger(_key = Number(key)) && _key >= 0 && (key === 0 || _key === 0 || String(_key) === String(key)))) {
      throw new Error(`Only supports setting array indices and the 'length' property.`);
    }
    const desc = getDescriptor(latest(target), key);
    if (desc === null || desc === void 0 ? void 0 : desc.set) {
      desc.set.call(target.proxy, value);
      return true;
    }
    const current2 = peek(latest(target), key);
    const currentProxyDraft = getProxyDraft(current2);
    if (currentProxyDraft && isEqual(currentProxyDraft.original, value)) {
      target.copy[key] = value;
      target.assignedMap = (_a = target.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
      target.assignedMap.set(key, false);
      return true;
    }
    if (isEqual(value, current2) && (value !== void 0 || has(target.original, key)))
      return true;
    ensureShallowCopy(target);
    markChanged(target);
    if (has(target.original, key) && isEqual(value, target.original[key])) {
      target.assignedMap.delete(key);
    } else {
      target.assignedMap.set(key, true);
    }
    target.copy[key] = value;
    markFinalization(target, key, value, generatePatches);
    return true;
  },
  has(target, key) {
    return key in latest(target);
  },
  ownKeys(target) {
    return Reflect.ownKeys(latest(target));
  },
  getOwnPropertyDescriptor(target, key) {
    const source = latest(target);
    const descriptor = Reflect.getOwnPropertyDescriptor(source, key);
    if (!descriptor)
      return descriptor;
    return {
      writable: true,
      configurable: target.type !== 1 || key !== "length",
      enumerable: descriptor.enumerable,
      value: source[key]
    };
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(target.original);
  },
  setPrototypeOf() {
    throw new Error(`Cannot call 'setPrototypeOf()' on drafts`);
  },
  defineProperty() {
    throw new Error(`Cannot call 'defineProperty()' on drafts`);
  },
  deleteProperty(target, key) {
    var _a;
    if (target.type === 1) {
      return proxyHandler.set.call(this, target, key, void 0, target.proxy);
    }
    if (peek(target.original, key) !== void 0 || key in target.original) {
      ensureShallowCopy(target);
      markChanged(target);
      target.assignedMap.set(key, false);
    } else {
      target.assignedMap = (_a = target.assignedMap) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new Map();
      target.assignedMap.delete(key);
    }
    if (target.copy)
      delete target.copy[key];
    return true;
  }
};
function createDraft(createDraftOptions) {
  const { original, parentDraft, key, finalities, options } = createDraftOptions;
  const type = getType(original);
  const proxyDraft = {
    type,
    finalized: false,
    parent: parentDraft,
    original,
    copy: null,
    proxy: null,
    finalities,
    options,
    // Mapping of draft Set items to their corresponding draft values.
    setMap: type === 3 ? new Map(original.entries()) : void 0
  };
  if (key || "key" in createDraftOptions) {
    proxyDraft.key = key;
  }
  const { proxy, revoke } = Proxy.revocable(type === 1 ? Object.assign([], proxyDraft) : proxyDraft, proxyHandler);
  finalities.revoke.push(revoke);
  proxyDraft.proxy = proxy;
  if (parentDraft) {
    const target = parentDraft;
    target.finalities.draft.push((patches, inversePatches) => {
      var _a, _b;
      const oldProxyDraft = getProxyDraft(proxy);
      let copy = target.type === 3 ? target.setMap : target.copy;
      const draft = get(copy, key);
      const proxyDraft2 = getProxyDraft(draft);
      if (proxyDraft2) {
        let updatedValue = proxyDraft2.original;
        if (proxyDraft2.operated) {
          updatedValue = getValue(draft);
        }
        finalizeSetValue(proxyDraft2);
        finalizePatches(proxyDraft2, generatePatches, patches, inversePatches);
        if (target.options.enableAutoFreeze) {
          target.options.updatedValues = (_a = target.options.updatedValues) !== null && _a !== void 0 ? _a : /* @__PURE__ */ new WeakMap();
          target.options.updatedValues.set(updatedValue, proxyDraft2.original);
        }
        set(copy, key, updatedValue);
      }
      (_b = oldProxyDraft.callbacks) === null || _b === void 0 ? void 0 : _b.forEach((callback) => {
        callback(patches, inversePatches);
      });
    });
  } else {
    const target = getProxyDraft(proxy);
    target.finalities.draft.push((patches, inversePatches) => {
      finalizeSetValue(target);
      finalizePatches(target, generatePatches, patches, inversePatches);
    });
  }
  return proxy;
}
__name(createDraft, "createDraft");
internal.createDraft = createDraft;
function finalizeDraft(result, returnedValue, patches, inversePatches, enableAutoFreeze) {
  var _a;
  const proxyDraft = getProxyDraft(result);
  const original = (_a = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== null && _a !== void 0 ? _a : result;
  const hasReturnedValue = !!returnedValue.length;
  if (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated) {
    while (proxyDraft.finalities.draft.length > 0) {
      const finalize = proxyDraft.finalities.draft.pop();
      finalize(patches, inversePatches);
    }
  }
  const state = hasReturnedValue ? returnedValue[0] : proxyDraft ? proxyDraft.operated ? proxyDraft.copy : proxyDraft.original : result;
  if (proxyDraft)
    revokeProxy(proxyDraft);
  if (enableAutoFreeze) {
    deepFreeze(state, state, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options.updatedValues);
  }
  return [
    state,
    patches && hasReturnedValue ? [{ op: Operation.Replace, path: [], value: returnedValue[0] }] : patches,
    inversePatches && hasReturnedValue ? [{ op: Operation.Replace, path: [], value: original }] : inversePatches
  ];
}
__name(finalizeDraft, "finalizeDraft");
function draftify(baseState, options) {
  var _a;
  const finalities = {
    draft: [],
    revoke: [],
    handledSet: /* @__PURE__ */ new WeakSet(),
    draftsCache: /* @__PURE__ */ new WeakSet()
  };
  let patches;
  let inversePatches;
  if (options.enablePatches) {
    patches = [];
    inversePatches = [];
  }
  const isMutable = ((_a = options.mark) === null || _a === void 0 ? void 0 : _a.call(options, baseState, dataTypes)) === dataTypes.mutable || !isDraftable(baseState, options);
  const draft = isMutable ? baseState : createDraft({
    original: baseState,
    parentDraft: null,
    finalities,
    options
  });
  return [
    draft,
    (returnedValue = []) => {
      const [finalizedState, finalizedPatches, finalizedInversePatches] = finalizeDraft(draft, returnedValue, patches, inversePatches, options.enableAutoFreeze);
      return options.enablePatches ? [finalizedState, finalizedPatches, finalizedInversePatches] : finalizedState;
    }
  ];
}
__name(draftify, "draftify");
function handleReturnValue(options) {
  const { rootDraft, value, useRawReturn = false, isRoot = true } = options;
  forEach(value, (key, item, source) => {
    const proxyDraft = getProxyDraft(item);
    if (proxyDraft && rootDraft && proxyDraft.finalities === rootDraft.finalities) {
      options.isContainDraft = true;
      const currentValue = proxyDraft.original;
      if (source instanceof Set) {
        const arr = Array.from(source);
        source.clear();
        arr.forEach((_item) => source.add(key === _item ? currentValue : _item));
      } else {
        set(source, key, currentValue);
      }
    } else if (typeof item === "object" && item !== null) {
      options.value = item;
      options.isRoot = false;
      handleReturnValue(options);
    }
  });
  if (isRoot) {
    if (!options.isContainDraft)
      console.warn(`The return value does not contain any draft, please use 'rawReturn()' to wrap the return value to improve performance.`);
    if (useRawReturn) {
      console.warn(`The return value contains drafts, please don't use 'rawReturn()' to wrap the return value.`);
    }
  }
}
__name(handleReturnValue, "handleReturnValue");
function getCurrent(target) {
  var _a;
  const proxyDraft = getProxyDraft(target);
  if (!isDraftable(target, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options))
    return target;
  const type = getType(target);
  if (proxyDraft && !proxyDraft.operated)
    return proxyDraft.original;
  let currentValue;
  function ensureShallowCopy2() {
    currentValue = type === 2 ? !isBaseMapInstance(target) ? new (Object.getPrototypeOf(target)).constructor(target) : new Map(target) : type === 3 ? Array.from(proxyDraft.setMap.values()) : shallowCopy(target, proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.options);
  }
  __name(ensureShallowCopy2, "ensureShallowCopy");
  if (proxyDraft) {
    proxyDraft.finalized = true;
    try {
      ensureShallowCopy2();
    } finally {
      proxyDraft.finalized = false;
    }
  } else {
    currentValue = target;
  }
  forEach(currentValue, (key, value) => {
    if (proxyDraft && isEqual(get(proxyDraft.original, key), value))
      return;
    const newValue = getCurrent(value);
    if (newValue !== value) {
      if (currentValue === target)
        ensureShallowCopy2();
      set(currentValue, key, newValue);
    }
  });
  if (type === 3) {
    const value = (_a = proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.original) !== null && _a !== void 0 ? _a : currentValue;
    return !isBaseSetInstance(value) ? new (Object.getPrototypeOf(value)).constructor(currentValue) : new Set(currentValue);
  }
  return currentValue;
}
__name(getCurrent, "getCurrent");
function current(target) {
  if (!isDraft(target)) {
    throw new Error(`current() is only used for Draft, parameter: ${target}`);
  }
  return getCurrent(target);
}
__name(current, "current");
var makeCreator = /* @__PURE__ */ __name((arg) => {
  if (arg !== void 0 && Object.prototype.toString.call(arg) !== "[object Object]") {
    throw new Error(`Invalid options: ${String(arg)}, 'options' should be an object.`);
  }
  return /* @__PURE__ */ __name(function create2(arg0, arg1, arg2) {
    var _a, _b, _c;
    if (typeof arg0 === "function" && typeof arg1 !== "function") {
      return function(base2, ...args) {
        return create2(base2, (draft2) => arg0.call(this, draft2, ...args), arg1);
      };
    }
    const base = arg0;
    const mutate = arg1;
    let options = arg2;
    if (typeof arg1 !== "function") {
      options = arg1;
    }
    if (options !== void 0 && Object.prototype.toString.call(options) !== "[object Object]") {
      throw new Error(`Invalid options: ${options}, 'options' should be an object.`);
    }
    options = Object.assign(Object.assign({}, arg), options);
    const state = isDraft(base) ? current(base) : base;
    const mark = Array.isArray(options.mark) ? (value, types) => {
      for (const mark2 of options.mark) {
        if (typeof mark2 !== "function") {
          throw new Error(`Invalid mark: ${mark2}, 'mark' should be a function.`);
        }
        const result2 = mark2(value, types);
        if (result2) {
          return result2;
        }
      }
      return;
    } : options.mark;
    const enablePatches = (_a = options.enablePatches) !== null && _a !== void 0 ? _a : false;
    const strict = (_b = options.strict) !== null && _b !== void 0 ? _b : false;
    const enableAutoFreeze = (_c = options.enableAutoFreeze) !== null && _c !== void 0 ? _c : false;
    const _options = {
      enableAutoFreeze,
      mark,
      strict,
      enablePatches
    };
    if (!isDraftable(state, _options) && typeof state === "object" && state !== null) {
      throw new Error(`Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`);
    }
    const [draft, finalize] = draftify(state, _options);
    if (typeof arg1 !== "function") {
      if (!isDraftable(state, _options)) {
        throw new Error(`Invalid base state: create() only supports plain objects, arrays, Set, Map or using mark() to mark the state as immutable.`);
      }
      return [draft, finalize];
    }
    let result;
    try {
      result = mutate(draft);
    } catch (error) {
      revokeProxy(getProxyDraft(draft));
      throw error;
    }
    const returnValue = /* @__PURE__ */ __name((value) => {
      const proxyDraft = getProxyDraft(draft);
      if (!isDraft(value)) {
        if (value !== void 0 && !isEqual(value, draft) && (proxyDraft === null || proxyDraft === void 0 ? void 0 : proxyDraft.operated)) {
          throw new Error(`Either the value is returned as a new non-draft value, or only the draft is modified without returning any value.`);
        }
        const rawReturnValue = value === null || value === void 0 ? void 0 : value[RAW_RETURN_SYMBOL];
        if (rawReturnValue) {
          const _value = rawReturnValue[0];
          if (_options.strict && typeof value === "object" && value !== null) {
            handleReturnValue({
              rootDraft: proxyDraft,
              value,
              useRawReturn: true
            });
          }
          return finalize([_value]);
        }
        if (value !== void 0) {
          if (typeof value === "object" && value !== null) {
            handleReturnValue({ rootDraft: proxyDraft, value });
          }
          return finalize([value]);
        }
      }
      if (value === draft || value === void 0) {
        return finalize([]);
      }
      const returnedProxyDraft = getProxyDraft(value);
      if (_options === returnedProxyDraft.options) {
        if (returnedProxyDraft.operated) {
          throw new Error(`Cannot return a modified child draft.`);
        }
        return finalize([current(value)]);
      }
      return finalize([value]);
    }, "returnValue");
    if (result instanceof Promise) {
      return result.then(returnValue, (error) => {
        revokeProxy(getProxyDraft(draft));
        throw error;
      });
    }
    return returnValue(result);
  }, "create");
}, "makeCreator");
var create = makeCreator();
var constructorString = Object.prototype.constructor.toString();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/object.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/dates.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/pgtime.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/id.js
init_esm();
function id() {
  return v4_default();
}
__name(id, "id");
var id_default = id;

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/strings.js
init_esm();
function fallbackCompareStrings(a, b) {
  return a.localeCompare(b);
}
__name(fallbackCompareStrings, "fallbackCompareStrings");
function makeCompareStringsFn() {
  let compareStrings = fallbackCompareStrings;
  if (typeof Intl === "object" && Intl.hasOwnProperty("Collator")) {
    try {
      const collator = Intl.Collator("en-US");
      compareStrings = collator.compare;
    } catch (_e) {
    }
  }
  return compareStrings;
}
__name(makeCompareStringsFn, "makeCompareStringsFn");
var stringCompare = makeCompareStringsFn();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/warningToggle.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/instaml.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/instatx.js
init_esm();
function getAllTransactionChunkKeys() {
  const v = 1;
  const _dummy = {
    __etype: v,
    __ops: v,
    create: v,
    update: v,
    link: v,
    unlink: v,
    delete: v,
    merge: v,
    ruleParams: v
  };
  return new Set(Object.keys(_dummy));
}
__name(getAllTransactionChunkKeys, "getAllTransactionChunkKeys");
var allTransactionChunkKeys = getAllTransactionChunkKeys();
function transactionChunk(etype, id2, prevOps) {
  const target = {
    __etype: etype,
    __ops: prevOps
  };
  return new Proxy(target, {
    get: /* @__PURE__ */ __name((_target, cmd) => {
      if (cmd === "__ops")
        return prevOps;
      if (cmd === "__etype")
        return etype;
      if (!allTransactionChunkKeys.has(cmd)) {
        return void 0;
      }
      return (args, opts) => {
        return transactionChunk(etype, id2, [
          ...prevOps,
          opts ? [cmd, etype, id2, args, opts] : [cmd, etype, id2, args]
        ]);
      };
    }, "get")
  });
}
__name(transactionChunk, "transactionChunk");
function lookup(attribute, value) {
  return `lookup__${attribute}__${JSON.stringify(value)}`;
}
__name(lookup, "lookup");
function isLookup(k) {
  return k.startsWith("lookup__");
}
__name(isLookup, "isLookup");
function parseLookup(k) {
  const [_, attribute, ...vJSON] = k.split("__");
  return [attribute, JSON.parse(vJSON.join("__"))];
}
__name(parseLookup, "parseLookup");
function etypeChunk(etype) {
  return new Proxy({
    __etype: etype
  }, {
    get(_target, cmd) {
      if (cmd === "lookup") {
        return (attrName, value) => transactionChunk(etype, parseLookup(lookup(attrName, value)), []);
      }
      if (cmd === "__etype")
        return etype;
      const id2 = cmd;
      if (isLookup(id2)) {
        return transactionChunk(etype, parseLookup(id2), []);
      }
      return transactionChunk(etype, id2, []);
    }
  });
}
__name(etypeChunk, "etypeChunk");
function txInit() {
  return new Proxy({}, {
    get(_target, ns) {
      return etypeChunk(ns);
    }
  });
}
__name(txInit, "txInit");
var tx = txInit();
function getOps(x) {
  return x.__ops;
}
__name(getOps, "getOps");

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/instaml.js
var lookupProps = { "unique?": true, "index?": true };
var refLookupProps = {
  ...lookupProps,
  cardinality: "one"
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/IndexedDBStorage.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/PersistedObject.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/WindowNetworkListener.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/authAPI.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/fetch.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/InstantError.js
init_esm();
var InstantError = class _InstantError extends Error {
  static {
    __name(this, "InstantError");
  }
  hint;
  traceId;
  constructor(message, hint, traceId) {
    super(message);
    this.hint = hint;
    if (traceId) {
      this.traceId = traceId;
    }
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _InstantError);
    }
    this.name = "InstantError";
  }
  get [Symbol.toStringTag]() {
    return "InstantError";
  }
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/fetch.js
var InstantAPIError = class _InstantAPIError extends InstantError {
  static {
    __name(this, "InstantAPIError");
  }
  body;
  status;
  constructor(error) {
    const message = error.body?.message || `API Error (${error.status})`;
    super(message, error.body.hint, error.body?.traceId || error.body["trace-id"]);
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, _InstantAPIError);
    }
    this.name = "InstantAPIError";
    this.status = error.status;
    this.body = error.body;
  }
  get [Symbol.toStringTag]() {
    return "InstantAPIError";
  }
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/StorageAPI.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/flags.js
init_esm();
var devBackend = false;
var instantLogs = false;
var devtoolLocalDashboard = false;
if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
  devBackend = !!window.localStorage.getItem("devBackend");
  instantLogs = !!window.localStorage.getItem("__instantLogging");
  devtoolLocalDashboard = !!window.localStorage.getItem("__devtoolLocalDash");
}

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/presence.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/pick.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/Deferred.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/model/instaqlResult.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/linkIndex.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/version.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+version@1.0.43/node_modules/@instantdb/version/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+version@1.0.43/node_modules/@instantdb/version/dist/esm/version.js
init_esm();
var version = "v1.0.43";

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/version.js
var version_default = version;

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/log.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/queryValidation.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/schemaTypes.js
init_esm();
var DataAttrDef = class _DataAttrDef {
  static {
    __name(this, "DataAttrDef");
  }
  valueType;
  required;
  isIndexed;
  config;
  metadata = {};
  constructor(valueType, required, isIndexed, config = { indexed: false, unique: false }) {
    this.valueType = valueType;
    this.required = required;
    this.isIndexed = isIndexed;
    this.config = config;
  }
  /**
   * @deprecated Only use this temporarily for attributes that you want
   * to treat as required in frontend code but can’t yet mark as required
   * and enforced for backend
   */
  clientRequired() {
    return new _DataAttrDef(this.valueType, false, this.isIndexed, this.config);
  }
  optional() {
    return new _DataAttrDef(this.valueType, false, this.isIndexed, this.config);
  }
  unique() {
    return new _DataAttrDef(this.valueType, this.required, this.isIndexed, {
      ...this.config,
      unique: true
    });
  }
  indexed() {
    return new _DataAttrDef(this.valueType, this.required, true, {
      ...this.config,
      indexed: true
    });
  }
};
var EntityDef = class _EntityDef {
  static {
    __name(this, "EntityDef");
  }
  attrs;
  links;
  constructor(attrs, links) {
    this.attrs = attrs;
    this.links = links;
  }
  asType() {
    return new _EntityDef(this.attrs, this.links);
  }
};
var InstantSchemaDef = class _InstantSchemaDef {
  static {
    __name(this, "InstantSchemaDef");
  }
  entities;
  links;
  rooms;
  constructor(entities, links, rooms2) {
    this.entities = entities;
    this.links = links;
    this.rooms = rooms2;
  }
  /**
   * @deprecated
   * `withRoomSchema` is deprecated. Define your schema in `rooms` directly:
   *
   * @example
   * // Before:
   * const schema = i.schema({
   *   // ...
   * }).withRoomSchema<RoomSchema>()
   *
   * // After
   * const schema = i.schema({
   *  rooms: {
   *    // ...
   *  }
   * })
   *
   * @see https://instantdb.com/docs/presence-and-topics#typesafety
   */
  withRoomSchema() {
    return new _InstantSchemaDef(this.entities, this.links, {});
  }
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/queryValidation.js
var QueryValidationError = class extends Error {
  static {
    __name(this, "QueryValidationError");
  }
  constructor(message, path) {
    const fullMessage = path ? `At path '${path}': ${message}` : message;
    super(fullMessage);
    this.name = "QueryValidationError";
  }
};
var dollarSignKeys = [
  "where",
  "order",
  "limit",
  "last",
  "first",
  "offset",
  "after",
  "afterInclusive",
  "before",
  "beforeInclusive",
  "fields",
  "aggregate"
];
var getAttrType = /* @__PURE__ */ __name((attrDef) => {
  return attrDef.valueType || "unknown";
}, "getAttrType");
var isValidValueForType = /* @__PURE__ */ __name((value, expectedType, isAnyType = false) => {
  if (isAnyType)
    return true;
  if (value === null || value === void 0)
    return true;
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && !isNaN(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return value instanceof Date || typeof value === "string" || typeof value === "number";
    default:
      return true;
  }
}, "isValidValueForType");
var validateOperator = /* @__PURE__ */ __name((op, opValue, expectedType, attrName, entityName, attrDef, path) => {
  const isAnyType = attrDef.valueType === "json";
  const assertValidValue = /* @__PURE__ */ __name((op2, expectedType2, opValue2) => {
    if (!isValidValueForType(opValue2, expectedType2, isAnyType)) {
      throw new QueryValidationError(`Invalid value for operator '${op2}' on attribute '${attrName}' in entity '${entityName}'. Expected ${expectedType2}, but received: ${typeof opValue2}`, path);
    }
  }, "assertValidValue");
  switch (op) {
    case "in":
    case "$in":
      if (!Array.isArray(opValue)) {
        throw new QueryValidationError(`Operator '${op}' for attribute '${attrName}' in entity '${entityName}' must be an array, but received: ${typeof opValue}`, path);
      }
      for (const item of opValue) {
        assertValidValue(op, expectedType, item);
      }
      break;
    case "$not":
    case "$ne":
    case "$gt":
    case "$lt":
    case "$gte":
    case "$lte":
      assertValidValue(op, expectedType, opValue);
      break;
    case "$like":
    case "$ilike":
      assertValidValue(op, "string", opValue);
      if (op === "$ilike") {
        if (!attrDef.isIndexed) {
          throw new QueryValidationError(`Operator '${op}' can only be used with indexed attributes, but '${attrName}' in entity '${entityName}' is not indexed`, path);
        }
      }
      break;
    case "$isNull":
      assertValidValue(op, "boolean", opValue);
      break;
    default:
      throw new QueryValidationError(`Unknown operator '${op}' for attribute '${attrName}' in entity '${entityName}'`, path);
  }
}, "validateOperator");
var validateWhereClauseValue = /* @__PURE__ */ __name((value, attrName, attrDef, entityName, path) => {
  const expectedType = getAttrType(attrDef);
  const isAnyType = attrDef.valueType === "json";
  const isComplexObject = typeof value === "object" && value !== null && !Array.isArray(value);
  if (isComplexObject) {
    if (isAnyType) {
      return;
    }
    const operators = value;
    for (const [op, opValue] of Object.entries(operators)) {
      validateOperator(op, opValue, expectedType, attrName, entityName, attrDef, `${path}.${op}`);
    }
  } else {
    if (!isValidValueForType(value, expectedType, isAnyType)) {
      throw new QueryValidationError(`Invalid value for attribute '${attrName}' in entity '${entityName}'. Expected ${expectedType}, but received: ${typeof value}`, path);
    }
  }
}, "validateWhereClauseValue");
var validateDotNotationAttribute = /* @__PURE__ */ __name((dotPath, value, startEntityName, schema3, path) => {
  const pathParts = dotPath.split(".");
  if (pathParts.length < 2) {
    throw new QueryValidationError(`Invalid dot notation path '${dotPath}'. Must contain at least one dot.`, path);
  }
  let currentEntityName = startEntityName;
  for (let i2 = 0; i2 < pathParts.length - 1; i2++) {
    const linkName = pathParts[i2];
    const currentEntity = schema3.entities[currentEntityName];
    if (!currentEntity) {
      throw new QueryValidationError(`Entity '${currentEntityName}' does not exist in schema while traversing dot notation path '${dotPath}'.`, path);
    }
    const link = currentEntity.links[linkName];
    if (!link) {
      const availableLinks = Object.keys(currentEntity.links);
      throw new QueryValidationError(`Link '${linkName}' does not exist on entity '${currentEntityName}' in dot notation path '${dotPath}'. Available links: ${availableLinks.length > 0 ? availableLinks.join(", ") : "none"}`, path);
    }
    currentEntityName = link.entityName;
  }
  const finalAttrName = pathParts[pathParts.length - 1];
  const finalEntity = schema3.entities[currentEntityName];
  if (!finalEntity) {
    throw new QueryValidationError(`Target entity '${currentEntityName}' does not exist in schema for dot notation path '${dotPath}'.`, path);
  }
  if (finalAttrName === "id") {
    if (typeof value == "string" && !validate_default(value)) {
      throw new QueryValidationError(`Invalid value for id field in entity '${currentEntityName}'. Expected a UUID, but received: ${value}`, path);
    }
    validateWhereClauseValue(value, dotPath, new DataAttrDef("string", false, true), startEntityName, path);
    return;
  }
  const attrDef = finalEntity.attrs[finalAttrName];
  if (Object.keys(finalEntity.links).includes(finalAttrName)) {
    if (typeof value === "string" && !validate_default(value)) {
      throw new QueryValidationError(`Invalid value for link '${finalAttrName}' in entity '${currentEntityName}'. Expected a UUID, but received: ${value}`, path);
    }
    validateWhereClauseValue(value, dotPath, new DataAttrDef("string", false, true), startEntityName, path);
    return;
  }
  if (!attrDef) {
    const availableAttrs = Object.keys(finalEntity.attrs);
    throw new QueryValidationError(`Attribute '${finalAttrName}' does not exist on entity '${currentEntityName}' in dot notation path '${dotPath}'. Available attributes: ${availableAttrs.length > 0 ? availableAttrs.join(", ") + ", id" : "id"}`, path);
  }
  validateWhereClauseValue(value, dotPath, attrDef, startEntityName, path);
}, "validateDotNotationAttribute");
var validateWhereClause = /* @__PURE__ */ __name((whereClause, entityName, schema3, path) => {
  for (const [key, value] of Object.entries(whereClause)) {
    if (key === "or" || key === "and") {
      if (Array.isArray(value)) {
        for (const clause of value) {
          if (typeof clause === "object" && clause !== null) {
            validateWhereClause(clause, entityName, schema3, `${path}.${key}[${clause}]`);
          }
        }
      }
      continue;
    }
    if (key === "id") {
      validateWhereClauseValue(value, "id", new DataAttrDef("string", false, true), entityName, `${path}.id`);
      continue;
    }
    if (key.includes(".")) {
      validateDotNotationAttribute(key, value, entityName, schema3, `${path}.${key}`);
      continue;
    }
    const entityDef = schema3.entities[entityName];
    if (!entityDef)
      continue;
    const attrDef = entityDef.attrs[key];
    const linkDef = entityDef.links[key];
    if (!attrDef && !linkDef) {
      const availableAttrs = Object.keys(entityDef.attrs);
      const availableLinks = Object.keys(entityDef.links);
      throw new QueryValidationError(`Attribute or link '${key}' does not exist on entity '${entityName}'. Available attributes: ${availableAttrs.length > 0 ? availableAttrs.join(", ") : "none"}. Available links: ${availableLinks.length > 0 ? availableLinks.join(", ") : "none"}`, `${path}.${key}`);
    }
    if (attrDef) {
      validateWhereClauseValue(value, key, attrDef, entityName, `${path}.${key}`);
    } else if (linkDef) {
      if (typeof value === "string" && !validate_default(value)) {
        throw new QueryValidationError(`Invalid value for link '${key}' in entity '${entityName}'. Expected a UUID, but received: ${value}`, `${path}.${key}`);
      }
      const syntheticAttrDef = new DataAttrDef("string", false, true);
      validateWhereClauseValue(value, key, syntheticAttrDef, entityName, `${path}.${key}`);
    }
  }
}, "validateWhereClause");
var validateDollarObject = /* @__PURE__ */ __name((dollarObj, entityName, schema3, path, depth = 0) => {
  for (const key of Object.keys(dollarObj)) {
    if (!dollarSignKeys.includes(key)) {
      throw new QueryValidationError(`Invalid query parameter '${key}' in $ object. Valid parameters are: ${dollarSignKeys.join(", ")}. Found: ${key}`, path);
    }
  }
  const paginationParams = [
    // 'limit', // only supported client side
    "offset",
    "before",
    "beforeInclusive",
    "after",
    "afterInclusive",
    "first",
    "last"
  ];
  for (const param of paginationParams) {
    if (dollarObj[param] !== void 0 && depth > 0) {
      throw new QueryValidationError(`'${param}' can only be used on top-level namespaces. It cannot be used in nested queries.`, path);
    }
  }
  if (dollarObj.where && schema3) {
    if (typeof dollarObj.where !== "object" || dollarObj.where === null) {
      throw new QueryValidationError(`'where' clause must be an object in entity '${entityName}', but received: ${typeof dollarObj.where}`, path ? `${path}.where` : void 0);
    }
    validateWhereClause(dollarObj.where, entityName, schema3, path ? `${path}.where` : "where");
  }
}, "validateDollarObject");
var validateEntityInQuery = /* @__PURE__ */ __name((queryPart, entityName, schema3, path, depth = 0) => {
  if (!queryPart || typeof queryPart !== "object") {
    throw new QueryValidationError(`Query part for entity '${entityName}' must be an object, but received: ${typeof queryPart}`, path);
  }
  for (const key of Object.keys(queryPart)) {
    if (key !== "$") {
      if (schema3 && !(key in schema3.entities[entityName].links)) {
        const availableLinks = Object.keys(schema3.entities[entityName].links);
        throw new QueryValidationError(`Link '${key}' does not exist on entity '${entityName}'. Available links: ${availableLinks.length > 0 ? availableLinks.join(", ") : "none"}`, `${path}.${key}`);
      }
      const nestedQuery = queryPart[key];
      if (typeof nestedQuery === "object" && nestedQuery !== null) {
        const linkedEntityName = schema3?.entities[entityName].links[key]?.entityName;
        if (linkedEntityName) {
          validateEntityInQuery(nestedQuery, linkedEntityName, schema3, `${path}.${key}`, depth + 1);
        }
      }
    } else {
      const dollarObj = queryPart[key];
      if (typeof dollarObj !== "object" || dollarObj === null) {
        throw new QueryValidationError(`Query parameter '$' must be an object in entity '${entityName}', but received: ${typeof dollarObj}`, `${path}.$`);
      }
      validateDollarObject(dollarObj, entityName, schema3, `${path}.$`, depth);
    }
  }
}, "validateEntityInQuery");
var validateQuery = /* @__PURE__ */ __name((q, schema3) => {
  if (typeof q !== "object" || q === null) {
    throw new QueryValidationError(`Query must be an object, but received: ${typeof q}${q === null ? " (null)" : ""}`);
  }
  if (Array.isArray(q)) {
    throw new QueryValidationError(`Query must be an object, but received: ${typeof q}`);
  }
  const queryObj = q;
  for (const topLevelKey of Object.keys(queryObj)) {
    if (Array.isArray(q[topLevelKey])) {
      throw new QueryValidationError(`Query keys must be strings, but found key of type: ${typeof topLevelKey}`, topLevelKey);
    }
    if (typeof topLevelKey !== "string") {
      throw new QueryValidationError(`Query keys must be strings, but found key of type: ${typeof topLevelKey}`, topLevelKey);
    }
    if (topLevelKey === "$$ruleParams") {
      continue;
    }
    if (schema3) {
      if (!schema3.entities[topLevelKey]) {
        const availableEntities = Object.keys(schema3.entities);
        throw new QueryValidationError(`Entity '${topLevelKey}' does not exist in schema. Available entities: ${availableEntities.length > 0 ? availableEntities.join(", ") : "none"}`, topLevelKey);
      }
    }
    validateEntityInQuery(queryObj[topLevelKey], topLevelKey, schema3, topLevelKey, 0);
  }
}, "validateQuery");

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/transactionValidation.js
init_esm();
var isValidEntityId = /* @__PURE__ */ __name((value) => {
  if (typeof value !== "string") {
    return false;
  }
  if (isLookup(value)) {
    return true;
  }
  return validate_default(value);
}, "isValidEntityId");
var TransactionValidationError = class extends Error {
  static {
    __name(this, "TransactionValidationError");
  }
  constructor(message) {
    super(message);
    this.name = "TransactionValidationError";
  }
};
var formatAvailableOptions = /* @__PURE__ */ __name((items) => items.length > 0 ? items.join(", ") : "none", "formatAvailableOptions");
var createEntityNotFoundError = /* @__PURE__ */ __name((entityName, availableEntities) => new TransactionValidationError(`Entity '${entityName}' does not exist in schema. Available entities: ${formatAvailableOptions(availableEntities)}`), "createEntityNotFoundError");
var TYPE_VALIDATORS = {
  string: /* @__PURE__ */ __name((value) => typeof value === "string", "string"),
  number: /* @__PURE__ */ __name((value) => typeof value === "number" && !isNaN(value), "number"),
  boolean: /* @__PURE__ */ __name((value) => typeof value === "boolean", "boolean"),
  date: /* @__PURE__ */ __name((value) => value instanceof Date || typeof value === "string" || typeof value === "number", "date"),
  json: /* @__PURE__ */ __name(() => true, "json")
};
var isValidValueForAttr = /* @__PURE__ */ __name((value, attrDef) => {
  if (value === null || value === void 0)
    return true;
  return TYPE_VALIDATORS[attrDef.valueType]?.(value) ?? false;
}, "isValidValueForAttr");
var validateEntityExists = /* @__PURE__ */ __name((entityName, schema3) => {
  const entityDef = schema3.entities[entityName];
  if (!entityDef) {
    throw createEntityNotFoundError(entityName, Object.keys(schema3.entities));
  }
  return entityDef;
}, "validateEntityExists");
var validateDataOperation = /* @__PURE__ */ __name((entityName, data, schema3) => {
  const entityDef = validateEntityExists(entityName, schema3);
  if (typeof data !== "object" || data === null) {
    throw new TransactionValidationError(`Arguments for data operation on entity '${entityName}' must be an object, but received: ${typeof data}`);
  }
  for (const [attrName, value] of Object.entries(data)) {
    if (attrName === "id")
      continue;
    const attrDef = entityDef.attrs[attrName];
    if (attrDef) {
      if (!isValidValueForAttr(value, attrDef)) {
        throw new TransactionValidationError(`Invalid value for attribute '${attrName}' in entity '${entityName}'. Expected ${attrDef.valueType}, but received: ${typeof value}`);
      }
    }
  }
}, "validateDataOperation");
var validateLinkOperation = /* @__PURE__ */ __name((entityName, links, schema3) => {
  const entityDef = validateEntityExists(entityName, schema3);
  if (typeof links !== "object" || links === null) {
    throw new TransactionValidationError(`Arguments for link operation on entity '${entityName}' must be an object, but received: ${typeof links}`);
  }
  for (const [linkName, linkValue] of Object.entries(links)) {
    const link = entityDef.links[linkName];
    if (!link) {
      const availableLinks = Object.keys(entityDef.links);
      throw new TransactionValidationError(`Link '${linkName}' does not exist on entity '${entityName}'. Available links: ${formatAvailableOptions(availableLinks)}`);
    }
    if (linkValue !== null && linkValue !== void 0) {
      if (Array.isArray(linkValue)) {
        for (const linkReference of linkValue) {
          if (!isValidEntityId(linkReference)) {
            throw new TransactionValidationError(`Invalid entity ID in link '${linkName}' for entity '${entityName}'. Expected a UUID or a lookup, but received: ${linkReference}`);
          }
        }
      } else {
        if (!isValidEntityId(linkValue)) {
          throw new TransactionValidationError(`Invalid UUID in link '${linkName}' for entity '${entityName}'. Expected a UUID, but received: ${linkValue}`);
        }
      }
    }
  }
}, "validateLinkOperation");
var VALIDATION_STRATEGIES = {
  create: validateDataOperation,
  update: validateDataOperation,
  merge: validateDataOperation,
  link: validateLinkOperation,
  unlink: validateLinkOperation,
  delete: /* @__PURE__ */ __name(() => {
  }, "delete")
};
var validateOp = /* @__PURE__ */ __name((op, schema3) => {
  if (!schema3)
    return;
  const [action, entityName, _id, args] = op;
  if (!Array.isArray(_id)) {
    const isUuid = validate_default(_id);
    if (!isUuid) {
      throw new TransactionValidationError(`Invalid id for entity '${entityName}'. Expected a UUID, but received: ${_id}`);
    }
  }
  if (typeof entityName !== "string") {
    throw new TransactionValidationError(`Entity name must be a string, but received: ${typeof entityName}`);
  }
  const validator = VALIDATION_STRATEGIES[action];
  if (validator && args !== void 0) {
    validator(entityName, args, schema3);
  }
}, "validateOp");
var validateTransactions = /* @__PURE__ */ __name((inputChunks, schema3) => {
  const chunks = Array.isArray(inputChunks) ? inputChunks : [inputChunks];
  for (const txStep of chunks) {
    if (!txStep || typeof txStep !== "object") {
      throw new TransactionValidationError(`Transaction chunk must be an object, but received: ${typeof txStep}`);
    }
    if (!Array.isArray(txStep.__ops)) {
      throw new TransactionValidationError(`Transaction chunk must have __ops array, but received: ${typeof txStep.__ops}`);
    }
    for (const op of txStep.__ops) {
      if (!Array.isArray(op)) {
        throw new TransactionValidationError(`Transaction operation must be an array, but received: ${typeof op}`);
      }
      validateOp(op, schema3);
    }
  }
}, "validateTransactions");

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/Connection.js
init_esm();
var _connId = 0;
var SSEConnection = class {
  static {
    __name(this, "SSEConnection");
  }
  type = "sse";
  initParams = null;
  sendQueue = [];
  sendPromise;
  closeFired = false;
  sseInitTimeout = void 0;
  ES;
  messageUrl;
  conn;
  url;
  id;
  onopen;
  onmessage;
  onclose;
  onerror;
  constructor(ES, url, messageUrl) {
    this.id = `${this.type}_${_connId++}`;
    this.url = url;
    this.messageUrl = messageUrl || this.url;
    this.ES = ES;
    this.conn = new ES(url);
    this.sseInitTimeout = setTimeout(() => {
      if (!this.initParams) {
        this.handleError();
      }
    }, 1e4);
    this.conn.onmessage = (e) => {
      const message = JSON.parse(e.data);
      if (Array.isArray(message)) {
        for (const msg of message) {
          this.handleMessage(msg);
        }
      } else {
        this.handleMessage(message);
      }
    };
    this.conn.onerror = (e) => {
      this.handleError();
    };
  }
  handleMessage(msg) {
    if (msg.op === "sse-init") {
      this.initParams = {
        machineId: msg["machine-id"],
        sessionId: msg["session-id"],
        sseToken: msg["sse-token"]
      };
      if (this.onopen) {
        this.onopen({ target: this });
      }
      clearTimeout(this.sseInitTimeout);
      return;
    }
    if (this.onmessage) {
      this.onmessage({
        target: this,
        message: msg
      });
    }
  }
  // Runs the onerror and closes the connection
  handleError() {
    try {
      if (this.onerror) {
        this.onerror({ target: this });
      }
    } finally {
      this.handleClose();
    }
  }
  handleClose() {
    this.conn.close();
    if (this.onclose && !this.closeFired) {
      this.closeFired = true;
      this.onclose({ target: this });
    }
  }
  async postMessages(messages) {
    try {
      const resp = await fetch(this.messageUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machine_id: this.initParams?.machineId,
          session_id: this.initParams?.sessionId,
          sse_token: this.initParams?.sseToken,
          messages
        })
      });
      if (!resp.ok) {
        this.handleError();
      }
    } catch (e) {
      this.handleError();
    }
  }
  async flushQueue() {
    if (this.sendPromise || !this.sendQueue.length)
      return;
    const messages = this.sendQueue;
    this.sendQueue = [];
    const sendPromise = this.postMessages(messages);
    this.sendPromise = sendPromise;
    sendPromise.then(() => {
      this.sendPromise = null;
      this.flushQueue();
    });
  }
  send(msg) {
    if (!this.isOpen() || !this.initParams) {
      if (this.isConnecting()) {
        throw new Error(`Failed to execute 'send' on 'EventSource': Still in CONNECTING state.`);
      }
      if (this.conn.readyState === this.ES.CLOSED) {
        throw new Error(`EventSource is already in CLOSING or CLOSED state.`);
      }
      throw new Error(`EventSource is in invalid state.`);
    }
    this.sendQueue.push(msg);
    this.flushQueue();
  }
  isOpen() {
    return this.conn.readyState === this.ES.OPEN && this.initParams !== null;
  }
  isConnecting() {
    return this.conn.readyState === this.ES.CONNECTING || this.conn.readyState === this.ES.OPEN && this.initParams === null;
  }
  close() {
    this.handleClose();
  }
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/SyncTable.js
init_esm();
var CallbackEventType;
(function(CallbackEventType2) {
  CallbackEventType2["InitialSyncBatch"] = "InitialSyncBatch";
  CallbackEventType2["InitialSyncComplete"] = "InitialSyncComplete";
  CallbackEventType2["LoadFromStorage"] = "LoadFromStorage";
  CallbackEventType2["SyncTransaction"] = "SyncTransaction";
  CallbackEventType2["Error"] = "Error";
})(CallbackEventType || (CallbackEventType = {}));

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/Stream.js
init_esm();
function createWriteStream({ WStream, opts, startStream, appendStream, registerStream }) {
  const clientId = opts.clientId;
  let streamId_ = null;
  let error_ = null;
  let controller_ = null;
  const reconnectToken = id_default();
  let isDone = false;
  let closed = false;
  const closeCbs = [];
  const streamIdCbs = [];
  const completeCbs = [];
  let disconnected = false;
  let bufferOffset = 0;
  let bufferByteSize = 0;
  const buffer = [];
  const encoder = new TextEncoder();
  function markClosed() {
    closed = true;
    for (const cb of closeCbs) {
      cb(error_ ?? void 0);
    }
  }
  __name(markClosed, "markClosed");
  function addCloseCb(cb) {
    closeCbs.push(cb);
    if (closed) {
      cb(error_ ?? void 0);
    }
    return () => {
      const i2 = closeCbs.indexOf(cb);
      if (i2 !== -1) {
        closeCbs.splice(i2, 1);
      }
    };
  }
  __name(addCloseCb, "addCloseCb");
  function addCompleteCb(cb) {
    completeCbs.push(cb);
    return () => {
      const i2 = completeCbs.indexOf(cb);
      if (i2 !== -1) {
        completeCbs.splice(i2, 1);
      }
    };
  }
  __name(addCompleteCb, "addCompleteCb");
  if (opts.waitUntil) {
    opts.waitUntil(new Promise((resolve) => {
      completeCbs.push(resolve);
    }));
  }
  function runCompleteCbs() {
    for (const cb of completeCbs) {
      try {
        cb();
      } catch (_e) {
      }
    }
  }
  __name(runCompleteCbs, "runCompleteCbs");
  function addStreamIdCb(cb) {
    streamIdCbs.push(cb);
    if (streamId_) {
      cb(streamId_);
    }
    return () => {
      const i2 = streamIdCbs.indexOf(cb);
      if (i2 !== -1) {
        streamIdCbs.splice(i2, 1);
      }
    };
  }
  __name(addStreamIdCb, "addStreamIdCb");
  function setStreamId(streamId) {
    streamId_ = streamId;
    for (const cb of streamIdCbs) {
      cb(streamId_);
    }
  }
  __name(setStreamId, "setStreamId");
  function onDisconnect() {
    disconnected = true;
  }
  __name(onDisconnect, "onDisconnect");
  function discardFlushed(offset) {
    let chunkOffset = bufferOffset;
    let segmentsToDrop = 0;
    let droppedSegmentsByteLen = 0;
    for (const { byteLen } of buffer) {
      const nextChunkOffset = chunkOffset + byteLen;
      if (nextChunkOffset > offset) {
        break;
      }
      chunkOffset = nextChunkOffset;
      segmentsToDrop++;
      droppedSegmentsByteLen += byteLen;
    }
    if (segmentsToDrop > 0) {
      bufferOffset += droppedSegmentsByteLen;
      bufferByteSize -= droppedSegmentsByteLen;
      buffer.splice(0, segmentsToDrop);
    }
  }
  __name(discardFlushed, "discardFlushed");
  function error(controller, e) {
    error_ = e;
    markClosed();
    controller.error(e);
    runCompleteCbs();
  }
  __name(error, "error");
  async function onConnectionReconnect() {
    const result = await startStream({
      clientId,
      reconnectToken,
      ruleParams: opts.ruleParams
    });
    switch (result.type) {
      case "ok": {
        const { streamId, offset } = result;
        streamId_ = streamId;
        discardFlushed(offset);
        if (buffer.length) {
          appendStream({
            streamId,
            chunks: buffer.map((b) => b.chunk),
            offset: bufferOffset
          });
        }
        disconnected = false;
        break;
      }
      case "disconnect": {
        onDisconnect();
        break;
      }
      case "error": {
        if (controller_) {
          error(controller_, result.error);
        }
        break;
      }
    }
  }
  __name(onConnectionReconnect, "onConnectionReconnect");
  function onAppendFailed() {
    onDisconnect();
    onConnectionReconnect();
  }
  __name(onAppendFailed, "onAppendFailed");
  function onFlush({ offset, done }) {
    discardFlushed(offset);
    if (done) {
      isDone = true;
      runCompleteCbs();
    }
  }
  __name(onFlush, "onFlush");
  function ensureSetup(controller) {
    if (isDone) {
      error(controller, new InstantError("Stream has been closed."));
      return null;
    }
    if (!streamId_) {
      error(controller, new InstantError("Stream has not been initialized."));
      return null;
    }
    return streamId_;
  }
  __name(ensureSetup, "ensureSetup");
  async function start(controller) {
    controller_ = controller;
    let tryAgain = true;
    let attempts = 0;
    while (tryAgain) {
      let nextAttempt = Date.now() + Math.min(15e3, 500 * (attempts - 1));
      tryAgain = false;
      const result = await startStream({
        clientId: opts.clientId,
        reconnectToken,
        ruleParams: opts.ruleParams
      });
      switch (result.type) {
        case "ok": {
          const { streamId, offset } = result;
          if (offset !== 0) {
            const e = new InstantError("Write stream is corrupted");
            error(controller, e);
            return;
          }
          setStreamId(streamId);
          registerStream(streamId, {
            onDisconnect,
            onFlush,
            onConnectionReconnect,
            onAppendFailed
          });
          disconnected = false;
          return;
        }
        case "disconnect": {
          tryAgain = true;
          onDisconnect();
          attempts++;
          await new Promise((resolve) => {
            setTimeout(resolve, Math.max(0, nextAttempt - Date.now()));
          });
          break;
        }
        case "error": {
          error(controller, result.error);
          return;
        }
      }
    }
  }
  __name(start, "start");
  class WStreamEnhanced extends WStream {
    static {
      __name(this, "WStreamEnhanced");
    }
    constructor(sink, strategy) {
      super(sink, strategy);
    }
    async streamId() {
      if (streamId_) {
        return streamId_;
      }
      return new Promise((resolve, reject) => {
        const cleanupFns = [];
        const cleanup = /* @__PURE__ */ __name(() => {
          for (const f of cleanupFns) {
            f();
          }
        }, "cleanup");
        const resolveCb = /* @__PURE__ */ __name((streamId) => {
          resolve(streamId);
          cleanup();
        }, "resolveCb");
        const rejectCb = /* @__PURE__ */ __name((e) => {
          reject(e || new InstantError("Stream is closed."));
          cleanup();
        }, "rejectCb");
        cleanupFns.push(addStreamIdCb(resolveCb));
        cleanupFns.push(addCloseCb(rejectCb));
      });
    }
  }
  const stream = new WStreamEnhanced({
    // TODO(dww): accept a storage so that write streams can survive across
    //            browser restarts
    async start(controller) {
      try {
        await start(controller);
      } catch (e) {
        error(controller, e);
      }
    },
    write(chunk, controller) {
      const streamId = ensureSetup(controller);
      if (streamId) {
        const byteLen = encoder.encode(chunk).length;
        buffer.push({ chunk, byteLen });
        const offset = bufferOffset + bufferByteSize;
        bufferByteSize += byteLen;
        if (!disconnected) {
          appendStream({ streamId, chunks: [chunk], offset });
        }
      }
    },
    close() {
      if (streamId_) {
        appendStream({
          streamId: streamId_,
          chunks: [],
          offset: bufferOffset + bufferByteSize,
          isDone: true
        });
      } else {
        runCompleteCbs();
      }
      markClosed();
    },
    abort(reason) {
      if (streamId_) {
        appendStream({
          streamId: streamId_,
          chunks: [],
          offset: bufferOffset + bufferByteSize,
          isDone: true,
          abortReason: reason
        });
      } else {
        runCompleteCbs();
      }
      markClosed();
    }
  });
  return {
    stream,
    addCompleteCb,
    closed() {
      return closed;
    }
  };
}
__name(createWriteStream, "createWriteStream");
var StreamIterator = class {
  static {
    __name(this, "StreamIterator");
  }
  items = [];
  resolvers = [];
  isClosed = false;
  constructor() {
  }
  push(item) {
    if (this.isClosed)
      return;
    const resolve = this.resolvers.shift();
    if (resolve) {
      resolve({ value: item, done: false });
    } else {
      this.items.push(item);
    }
  }
  close() {
    this.isClosed = true;
    while (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift();
      resolve({ value: void 0, done: true });
    }
  }
  async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.items.length > 0) {
        yield this.items.shift();
      } else if (this.isClosed) {
        return;
      } else {
        const { value, done } = await new Promise((resolve) => {
          this.resolvers.push(resolve);
        });
        if (done || !value) {
          return;
        }
        yield value;
      }
    }
  }
};
function createReadStream({ RStream, opts, startStream, cancelStream }) {
  let seenOffset = opts.byteOffset || 0;
  let canceled = false;
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let eventId;
  let closed = false;
  const closeCbs = [];
  const streamIdCbs = [];
  let streamId_ = null;
  let error_ = null;
  function markClosed(error2) {
    closed = true;
    for (const cb of closeCbs) {
      cb(error2);
    }
  }
  __name(markClosed, "markClosed");
  function addCloseCb(cb) {
    closeCbs.push(cb);
    return () => {
      const i2 = closeCbs.indexOf(cb);
      if (i2 !== -1) {
        closeCbs.splice(i2, 1);
      }
    };
  }
  __name(addCloseCb, "addCloseCb");
  function addStreamIdCb(cb) {
    streamIdCbs.push(cb);
    if (streamId_) {
      cb(streamId_);
    }
    return () => {
      const i2 = streamIdCbs.indexOf(cb);
      if (i2 !== -1) {
        streamIdCbs.splice(i2, 1);
      }
    };
  }
  __name(addStreamIdCb, "addStreamIdCb");
  function error(controller, e) {
    error_ = e;
    controller.error(e);
    markClosed(e);
  }
  __name(error, "error");
  let fetchFailures = 0;
  async function runStartStream(opts2, controller) {
    eventId = id_default();
    const streamOpts = { ...opts2 || {}, eventId };
    for await (const item of startStream(streamOpts)) {
      if (canceled) {
        return;
      }
      if (item.type === "reconnect") {
        return { retry: true };
      }
      if (item.type === "error") {
        error(controller, item.error);
        return;
      }
      if (item.offset > seenOffset) {
        error(controller, new InstantError("Stream is corrupted."));
        canceled = true;
        return;
      }
      streamId_ = item.streamId;
      for (const cb of streamIdCbs) {
        cb(streamId_);
      }
      let discardLen = seenOffset - item.offset;
      if (item.files && item.files.length) {
        const fetchAbort = new AbortController();
        let nextFetch = fetch(item.files[0].url, {
          signal: fetchAbort.signal
        });
        for (let i2 = 0; i2 < item.files.length; i2++) {
          const nextFile = item.files[i2 + 1];
          const thisFetch = nextFetch;
          const res = await thisFetch;
          if (nextFile) {
            nextFetch = fetch(nextFile.url, { signal: fetchAbort.signal });
          }
          if (!res.ok) {
            fetchFailures++;
            if (fetchFailures > 10) {
              error(controller, new InstantError("Unable to process stream."));
              return;
            }
            return { retry: true };
          }
          if (res.body) {
            const reader = res.body.getReader();
            try {
              while (true) {
                const { done, value: bodyChunk } = await reader.read();
                if (done) {
                  break;
                }
                if (canceled) {
                  fetchAbort.abort();
                  return;
                }
                let chunk = bodyChunk;
                if (discardLen > 0) {
                  chunk = bodyChunk.subarray(discardLen);
                  discardLen -= bodyChunk.length - chunk.length;
                }
                if (!chunk.length) {
                  continue;
                }
                seenOffset += chunk.length;
                const s = decoder.decode(chunk);
                controller.enqueue(s);
              }
            } finally {
              reader.releaseLock();
            }
          } else {
            const bodyChunk = await res.arrayBuffer();
            let chunk = bodyChunk;
            if (canceled) {
              fetchAbort.abort();
              return;
            }
            if (discardLen > 0) {
              chunk = new Uint8Array(bodyChunk).subarray(discardLen);
              discardLen -= bodyChunk.byteLength - chunk.length;
            }
            if (!chunk.byteLength) {
              continue;
            }
            seenOffset += chunk.byteLength;
            const s = decoder.decode(chunk);
            controller.enqueue(s);
          }
        }
      }
      fetchFailures = 0;
      if (item.content) {
        let content = item.content;
        let encoded = encoder.encode(item.content);
        if (discardLen > 0) {
          const remaining = encoded.subarray(discardLen);
          discardLen -= encoded.length - remaining.length;
          if (!remaining.length) {
            continue;
          }
          encoded = remaining;
          content = decoder.decode(remaining);
        }
        seenOffset += encoded.length;
        controller.enqueue(content);
      }
    }
  }
  __name(runStartStream, "runStartStream");
  async function start(controller) {
    let retry = true;
    let attempts = 0;
    while (retry) {
      retry = false;
      let nextAttempt = Date.now() + Math.min(15e3, 500 * (attempts - 1));
      const res = await runStartStream({ ...opts, offset: seenOffset }, controller);
      if (res?.retry) {
        retry = true;
        attempts++;
        if (nextAttempt < Date.now() - 3e5) {
          attempts = 0;
        }
        await new Promise((resolve) => {
          setTimeout(resolve, Math.max(0, nextAttempt - Date.now()));
        });
      }
    }
    if (!canceled && !closed) {
      controller.close();
      markClosed();
    }
  }
  __name(start, "start");
  class RStreamEnhanced extends RStream {
    static {
      __name(this, "RStreamEnhanced");
    }
    constructor(source, strategy) {
      super(source, strategy);
    }
    async streamId() {
      if (streamId_) {
        return streamId_;
      }
      if (error_) {
        throw error_;
      }
      return new Promise((resolve, reject) => {
        const cleanupFns = [];
        const cleanup = /* @__PURE__ */ __name(() => {
          for (const f of cleanupFns) {
            f();
          }
        }, "cleanup");
        const resolveCb = /* @__PURE__ */ __name((streamId) => {
          resolve(streamId);
          cleanup();
        }, "resolveCb");
        const rejectCb = /* @__PURE__ */ __name((e) => {
          reject(e || new InstantError("Stream is closed."));
          cleanup();
        }, "rejectCb");
        cleanupFns.push(addStreamIdCb(resolveCb));
        cleanupFns.push(addCloseCb(rejectCb));
      });
    }
  }
  const stream = new RStreamEnhanced({
    start(controller) {
      start(controller);
    },
    cancel(_reason) {
      canceled = true;
      if (eventId) {
        cancelStream({ eventId });
      }
      markClosed();
    }
  });
  return {
    stream,
    addCloseCb,
    closed() {
      return closed;
    }
  };
}
__name(createReadStream, "createReadStream");
var InstantStream = class {
  static {
    __name(this, "InstantStream");
  }
  trySend;
  WStream;
  RStream;
  writeStreams = {};
  startWriteStreamCbs = {};
  readStreamIterators = {};
  log;
  activeStreams = /* @__PURE__ */ new Set();
  constructor({ WStream, RStream, trySend, log }) {
    this.WStream = WStream;
    this.RStream = RStream;
    this.trySend = trySend;
    this.log = log;
  }
  createWriteStream(opts) {
    const { stream, addCompleteCb } = createWriteStream({
      WStream: this.WStream,
      startStream: this.startWriteStream.bind(this),
      appendStream: this.appendStream.bind(this),
      registerStream: this.registerWriteStream.bind(this),
      opts
    });
    this.activeStreams.add(stream);
    addCompleteCb(() => {
      this.activeStreams.delete(stream);
    });
    return stream;
  }
  createReadStream(opts) {
    const { stream, addCloseCb } = createReadStream({
      RStream: this.RStream,
      opts,
      startStream: this.startReadStream.bind(this),
      cancelStream: this.cancelReadStream.bind(this)
    });
    this.activeStreams.add(stream);
    addCloseCb(() => {
      this.activeStreams.delete(stream);
    });
    return stream;
  }
  startWriteStream(opts) {
    const eventId = id_default();
    let resolve = null;
    const promise = new Promise((r) => {
      resolve = r;
    });
    this.startWriteStreamCbs[eventId] = resolve;
    const msg = {
      op: "start-stream",
      "client-id": opts.clientId,
      "reconnect-token": opts.reconnectToken
    };
    if (opts.ruleParams) {
      msg["rule-params"] = opts.ruleParams;
    }
    this.trySend(eventId, msg);
    return promise;
  }
  registerWriteStream(streamId, cbs) {
    this.writeStreams[streamId] = cbs;
  }
  appendStream({ streamId, chunks, isDone, offset, abortReason }) {
    const msg = {
      op: "append-stream",
      "stream-id": streamId,
      chunks,
      offset,
      done: !!isDone
    };
    if (abortReason) {
      msg["abort-reason"] = abortReason;
    }
    this.trySend(id_default(), msg);
  }
  onAppendFailed(msg) {
    const cbs = this.writeStreams[msg["stream-id"]];
    if (cbs) {
      cbs.onAppendFailed();
    }
  }
  onStartStreamOk(msg) {
    const cb = this.startWriteStreamCbs[msg["client-event-id"]];
    if (!cb) {
      this.log.info("No stream for start-stream-ok", msg);
      return;
    }
    cb({ type: "ok", streamId: msg["stream-id"], offset: msg.offset });
    delete this.startWriteStreamCbs[msg["client-event-id"]];
  }
  onStreamFlushed(msg) {
    const streamId = msg["stream-id"];
    const cbs = this.writeStreams[streamId];
    if (!cbs) {
      this.log.info("No stream cbs for stream-flushed", msg);
      return;
    }
    cbs.onFlush({ offset: msg.offset, done: msg.done });
    if (msg.done) {
      delete this.writeStreams[streamId];
    }
  }
  startReadStream({ eventId, clientId, streamId, offset, ruleParams }) {
    const msg = { op: "subscribe-stream" };
    if (!streamId && !clientId) {
      throw new Error("Must provide one of streamId or clientId to subscribe to the stream.");
    }
    if (streamId) {
      msg["stream-id"] = streamId;
    }
    if (clientId) {
      msg["client-id"] = clientId;
    }
    if (offset) {
      msg["offset"] = offset;
    }
    if (ruleParams) {
      msg["rule-params"] = ruleParams;
    }
    const iterator = new StreamIterator();
    this.readStreamIterators[eventId] = iterator;
    this.trySend(eventId, msg);
    return iterator;
  }
  cancelReadStream({ eventId }) {
    const msg = {
      op: "unsubscribe-stream",
      "subscribe-event-id": eventId
    };
    this.trySend(id_default(), msg);
    delete this.readStreamIterators[eventId];
  }
  onStreamAppend(msg) {
    const eventId = msg["client-event-id"];
    const iterator = this.readStreamIterators[eventId];
    if (!iterator) {
      this.log.info("No iterator for read stream", msg);
      return;
    }
    if (msg.error) {
      if (msg.retry) {
        iterator.push({ type: "reconnect" });
      } else {
        iterator.push({
          type: "error",
          error: new InstantError(msg.error)
        });
      }
      iterator.close();
      delete this.readStreamIterators[eventId];
      return;
    }
    iterator.push({
      type: "append",
      offset: msg.offset,
      files: msg.files,
      content: msg.content,
      streamId: msg["stream-id"]
    });
    if (msg.done) {
      iterator.close();
      delete this.readStreamIterators[eventId];
    }
  }
  onConnectionStatusChange(status) {
    for (const cb of Object.values(this.startWriteStreamCbs)) {
      cb({ type: "disconnect" });
    }
    this.startWriteStreamCbs = {};
    if (status !== STATUS.AUTHENTICATED) {
      for (const { onDisconnect } of Object.values(this.writeStreams)) {
        onDisconnect();
      }
    } else {
      for (const { onConnectionReconnect } of Object.values(this.writeStreams)) {
        onConnectionReconnect();
      }
      for (const iterator of Object.values(this.readStreamIterators)) {
        iterator.push({ type: "reconnect" });
        iterator.close();
      }
      this.readStreamIterators = {};
    }
  }
  onRecieveError(msg) {
    const ev = msg["original-event"];
    switch (ev.op) {
      case "append-stream": {
        const streamId = ev["stream-id"];
        const cbs = this.writeStreams[streamId];
        cbs?.onAppendFailed();
        break;
      }
      case "start-stream": {
        const eventId = msg["client-event-id"];
        const cb = this.startWriteStreamCbs[eventId];
        if (cb) {
          cb({
            type: "error",
            error: new InstantError(msg.message || "Unknown error", msg.hint)
          });
          delete this.startWriteStreamCbs[eventId];
        }
        break;
      }
      case "subscribe-stream": {
        const eventId = msg["client-event-id"];
        const iterator = this.readStreamIterators[eventId];
        if (iterator) {
          iterator.push({
            type: "error",
            error: new InstantError(msg.message || "Unknown error", msg.hint)
          });
          iterator.close();
          delete this.readStreamIterators[eventId];
        }
        break;
      }
      case "unsubscribe-stream": {
        break;
      }
    }
  }
  hasActiveStreams() {
    return this.activeStreams.size > 0;
  }
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/Reactor.js
var STATUS = {
  CONNECTING: "connecting",
  OPENED: "opened",
  AUTHENTICATED: "authenticated",
  CLOSED: "closed",
  ERRORED: "errored"
};
var ONE_MIN_MS = 1e3 * 60;
var ONE_DAY_MS = ONE_MIN_MS * 60 * 24;

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/schema.js
init_esm();
function graph(entities, links) {
  return new InstantSchemaDef(
    enrichEntitiesWithLinks(entities, links),
    // (XXX): LinksDef<any> stems from TypeScript’s inability to reconcile the
    // type EntitiesWithLinks<EntitiesWithoutLinks, Links> with
    // EntitiesWithoutLinks. TypeScript is strict about ensuring that types are
    // correctly aligned and does not allow for substituting a type that might
    // be broader or have additional properties.
    links,
    void 0
  );
}
__name(graph, "graph");
function entity(attrs) {
  return new EntityDef(attrs, {});
}
__name(entity, "entity");
function string() {
  return new DataAttrDef("string", true, false);
}
__name(string, "string");
function number() {
  return new DataAttrDef("number", true, false);
}
__name(number, "number");
function boolean() {
  return new DataAttrDef("boolean", true, false);
}
__name(boolean, "boolean");
function date() {
  return new DataAttrDef("date", true, false);
}
__name(date, "date");
function json() {
  return new DataAttrDef("json", true, false);
}
__name(json, "json");
function any() {
  return new DataAttrDef("json", true, false);
}
__name(any, "any");
function enrichEntitiesWithLinks(entities, links) {
  const linksIndex = { fwd: {}, rev: {} };
  for (const linkDef of Object.values(links)) {
    linksIndex.fwd[linkDef.forward.on] ||= {};
    linksIndex.rev[linkDef.reverse.on] ||= {};
    linksIndex.fwd[linkDef.forward.on][linkDef.forward.label] = {
      entityName: linkDef.reverse.on,
      cardinality: linkDef.forward.has
    };
    linksIndex.rev[linkDef.reverse.on][linkDef.reverse.label] = {
      entityName: linkDef.forward.on,
      cardinality: linkDef.reverse.has
    };
  }
  const enrichedEntities = Object.fromEntries(Object.entries(entities).map(([name, def]) => [
    name,
    new EntityDef(def.attrs, {
      ...linksIndex.fwd[name],
      ...linksIndex.rev[name]
    })
  ]));
  return enrichedEntities;
}
__name(enrichEntitiesWithLinks, "enrichEntitiesWithLinks");
function schema({ entities, links, rooms: rooms2 }) {
  const linksDef = links ?? {};
  const roomsDef = rooms2 ?? {};
  return new InstantSchemaDef(
    enrichEntitiesWithLinks(entities, linksDef),
    // (XXX): LinksDef<any> stems from TypeScript's inability to reconcile the
    // type EntitiesWithLinks<EntitiesWithoutLinks, Links> with
    // EntitiesWithoutLinks. TypeScript is strict about ensuring that types are
    // correctly aligned and does not allow for substituting a type that might
    // be broader or have additional properties.
    linksDef,
    roomsDef
  );
}
__name(schema, "schema");
var i = {
  // constructs
  graph,
  schema,
  entity,
  // value types
  string,
  number,
  boolean,
  date,
  json,
  any
};

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/devtool.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/createRouteHandler.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/parseSchemaFromJSON.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/framework.js
init_esm();
var isServer = typeof window === "undefined" || "Deno" in globalThis;

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/infiniteQuery.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/utils/error.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+core@1.0.43/node_modules/@instantdb/core/dist/esm/index.js
function initSchemaHashStore() {
  globalThis.__instantDbSchemaHashStore = globalThis.__instantDbSchemaHashStore ?? /* @__PURE__ */ new WeakMap();
  return globalThis.__instantDbSchemaHashStore;
}
__name(initSchemaHashStore, "initSchemaHashStore");
function initGlobalInstantCoreStore() {
  globalThis.__instantDbStore = globalThis.__instantDbStore ?? {};
  return globalThis.__instantDbStore;
}
__name(initGlobalInstantCoreStore, "initGlobalInstantCoreStore");
var globalInstantCoreStore = initGlobalInstantCoreStore();
var schemaHashStore = initSchemaHashStore();

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/version.js
init_esm();
var version_default2 = version;

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/subscribe.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+eventsource@4.1.0-2/node_modules/@instantdb/eventsource/dist/index.js
init_esm();
var ErrorEvent = class extends Event {
  static {
    __name(this, "ErrorEvent");
  }
  /**
   * Constructs a new `ErrorEvent` instance. This is typically not called directly,
   * but rather emitted by the `EventSource` object when an error occurs.
   *
   * @param type - The type of the event (should be "error")
   * @param errorEventInitDict - Optional properties to include in the error event
   */
  constructor(type, errorEventInitDict) {
    var _a, _b;
    super(type), this.code = (_a = errorEventInitDict == null ? void 0 : errorEventInitDict.code) != null ? _a : void 0, this.message = (_b = errorEventInitDict == null ? void 0 : errorEventInitDict.message) != null ? _b : void 0;
  }
  /**
   * Node.js "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Node.js when you `console.log` an instance of this class.
   *
   * @param _depth - The current depth
   * @param options - The options passed to `util.inspect`
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @returns A string representation of the error
   */
  [Symbol.for("nodejs.util.inspect.custom")](_depth, options, inspect) {
    return inspect(inspectableError(this), options);
  }
  /**
   * Deno "hides" the `message` and `code` properties of the `ErrorEvent` instance,
   * when it is `console.log`'ed. This makes it harder to debug errors. To ease debugging,
   * we explicitly include the properties in the `inspect` method.
   *
   * This is automatically called by Deno when you `console.log` an instance of this class.
   *
   * @param inspect - The inspect function to use (prevents having to import it from `util`)
   * @param options - The options passed to `Deno.inspect`
   * @returns A string representation of the error
   */
  [Symbol.for("Deno.customInspect")](inspect, options) {
    return inspect(inspectableError(this), options);
  }
};
function syntaxError(message) {
  const DomException = globalThis.DOMException;
  return typeof DomException == "function" ? new DomException(message, "SyntaxError") : new SyntaxError(message);
}
__name(syntaxError, "syntaxError");
function flattenError(err) {
  return err instanceof Error ? "errors" in err && Array.isArray(err.errors) ? err.errors.map(flattenError).join(", ") : "cause" in err && err.cause instanceof Error ? `${err}: ${flattenError(err.cause)}` : err.message : `${err}`;
}
__name(flattenError, "flattenError");
function inspectableError(err) {
  return {
    type: err.type,
    message: err.message,
    code: err.code,
    defaultPrevented: err.defaultPrevented,
    cancelable: err.cancelable,
    timeStamp: err.timeStamp
  };
}
__name(inspectableError, "inspectableError");
var __typeError = /* @__PURE__ */ __name((msg) => {
  throw TypeError(msg);
}, "__typeError");
var __accessCheck = /* @__PURE__ */ __name((obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg), "__accessCheck");
var __privateGet = /* @__PURE__ */ __name((obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj)), "__privateGet");
var __privateAdd = /* @__PURE__ */ __name((obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value), "__privateAdd");
var __privateSet = /* @__PURE__ */ __name((obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value), "__privateSet");
var __privateMethod = /* @__PURE__ */ __name((obj, member, method) => (__accessCheck(obj, member, "access private method"), method), "__privateMethod");
var _readyState;
var _url;
var _redirectUrl;
var _withCredentials;
var _fetch;
var _MessageEvent;
var _reconnectInterval;
var _reconnectTimer;
var _lastEventId;
var _controller;
var _parser;
var _onError;
var _onMessage;
var _onOpen;
var _EventSource_instances;
var connect_fn;
var _onFetchResponse;
var _onFetchError;
var getRequestOptions_fn;
var _onEvent;
var _onRetryChange;
var failConnection_fn;
var scheduleReconnect_fn;
var _reconnect;
var EventSource = class extends EventTarget {
  static {
    __name(this, "EventSource");
  }
  constructor(url, eventSourceInitDict) {
    var _a, _b, _c;
    super(), __privateAdd(this, _EventSource_instances), this.CONNECTING = 0, this.OPEN = 1, this.CLOSED = 2, __privateAdd(this, _readyState), __privateAdd(this, _url), __privateAdd(this, _redirectUrl), __privateAdd(this, _withCredentials), __privateAdd(this, _fetch), __privateAdd(this, _MessageEvent), __privateAdd(this, _reconnectInterval), __privateAdd(this, _reconnectTimer), __privateAdd(this, _lastEventId, null), __privateAdd(this, _controller), __privateAdd(this, _parser), __privateAdd(this, _onError, null), __privateAdd(this, _onMessage, null), __privateAdd(this, _onOpen, null), __privateAdd(this, _onFetchResponse, async (response) => {
      var _a2;
      __privateGet(this, _parser).reset();
      const { body, redirected, status, headers } = response;
      if (status === 204) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Server sent HTTP 204, not reconnecting", 204), this.close();
        return;
      }
      if (redirected ? __privateSet(this, _redirectUrl, new URL(response.url)) : __privateSet(this, _redirectUrl, void 0), status !== 200) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, `Non-200 status code (${status})`, status);
        return;
      }
      if (!(headers.get("content-type") || "").startsWith("text/event-stream")) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, 'Invalid content type, expected "text/event-stream"', status);
        return;
      }
      if (__privateGet(this, _readyState) === this.CLOSED)
        return;
      __privateSet(this, _readyState, this.OPEN);
      const openEvent = new Event("open");
      if ((_a2 = __privateGet(this, _onOpen)) == null || _a2.call(this, openEvent), this.dispatchEvent(openEvent), typeof body != "object" || !body || !("getReader" in body)) {
        __privateMethod(this, _EventSource_instances, failConnection_fn).call(this, "Invalid response body, expected a web ReadableStream", status), this.close();
        return;
      }
      const decoder = new TextDecoder(), reader = body.getReader();
      let open = true;
      do {
        const { done, value } = await reader.read();
        value && __privateGet(this, _parser).feed(decoder.decode(value, { stream: !done })), done && (open = false, __privateGet(this, _parser).reset(), __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this));
      } while (open);
    }), __privateAdd(this, _onFetchError, (err) => {
      __privateSet(this, _controller, void 0), !(err.name === "AbortError" || err.type === "aborted") && __privateMethod(this, _EventSource_instances, scheduleReconnect_fn).call(this, flattenError(err));
    }), __privateAdd(this, _onEvent, (event) => {
      typeof event.id == "string" && __privateSet(this, _lastEventId, event.id);
      const messageEvent = new (__privateGet(this, _MessageEvent))(event.event || "message", {
        data: event.data,
        origin: __privateGet(this, _redirectUrl) ? __privateGet(this, _redirectUrl).origin : __privateGet(this, _url).origin,
        lastEventId: event.id || ""
      });
      __privateGet(this, _onMessage) && (!event.event || event.event === "message") && __privateGet(this, _onMessage).call(this, messageEvent), this.dispatchEvent(messageEvent);
    }), __privateAdd(this, _onRetryChange, (value) => {
      __privateSet(this, _reconnectInterval, value);
    }), __privateAdd(this, _reconnect, () => {
      __privateSet(this, _reconnectTimer, void 0), __privateGet(this, _readyState) === this.CONNECTING && __privateMethod(this, _EventSource_instances, connect_fn).call(this);
    });
    try {
      if (url instanceof URL)
        __privateSet(this, _url, url);
      else if (typeof url == "string")
        __privateSet(this, _url, new URL(url, getBaseURL()));
      else
        throw new Error("Invalid URL");
    } catch {
      throw syntaxError("An invalid or illegal string was specified");
    }
    __privateSet(this, _parser, createParser({
      onEvent: __privateGet(this, _onEvent),
      onRetry: __privateGet(this, _onRetryChange)
    })), __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _reconnectInterval, 3e3), __privateSet(this, _fetch, (_a = eventSourceInitDict == null ? void 0 : eventSourceInitDict.fetch) != null ? _a : globalThis.fetch), __privateSet(this, _MessageEvent, (_b = eventSourceInitDict == null ? void 0 : eventSourceInitDict.messageEvent) != null ? _b : globalThis.MessageEvent), __privateSet(this, _withCredentials, (_c = eventSourceInitDict == null ? void 0 : eventSourceInitDict.withCredentials) != null ? _c : false), __privateMethod(this, _EventSource_instances, connect_fn).call(this);
  }
  /**
   * Returns the state of this EventSource object's connection. It can have the values described below.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/readyState)
   *
   * Note: typed as `number` instead of `0 | 1 | 2` for compatibility with the `EventSource` interface,
   * defined in the TypeScript `dom` library.
   *
   * @public
   */
  get readyState() {
    return __privateGet(this, _readyState);
  }
  /**
   * Returns the URL providing the event stream.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/url)
   *
   * @public
   */
  get url() {
    return __privateGet(this, _url).href;
  }
  /**
   * Returns true if the credentials mode for connection requests to the URL providing the event stream is set to "include", and false otherwise.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/withCredentials)
   */
  get withCredentials() {
    return __privateGet(this, _withCredentials);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/error_event) */
  get onerror() {
    return __privateGet(this, _onError);
  }
  set onerror(value) {
    __privateSet(this, _onError, value);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/message_event) */
  get onmessage() {
    return __privateGet(this, _onMessage);
  }
  set onmessage(value) {
    __privateSet(this, _onMessage, value);
  }
  /** [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/open_event) */
  get onopen() {
    return __privateGet(this, _onOpen);
  }
  set onopen(value) {
    __privateSet(this, _onOpen, value);
  }
  addEventListener(type, listener, options) {
    const listen = listener;
    super.addEventListener(type, listen, options);
  }
  removeEventListener(type, listener, options) {
    const listen = listener;
    super.removeEventListener(type, listen, options);
  }
  /**
   * Aborts any instances of the fetch algorithm started for this EventSource object, and sets the readyState attribute to CLOSED.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/EventSource/close)
   *
   * @public
   */
  close() {
    __privateGet(this, _reconnectTimer) && clearTimeout(__privateGet(this, _reconnectTimer)), __privateGet(this, _readyState) !== this.CLOSED && (__privateGet(this, _controller) && __privateGet(this, _controller).abort(), __privateSet(this, _readyState, this.CLOSED), __privateSet(this, _controller, void 0));
  }
};
_readyState = /* @__PURE__ */ new WeakMap(), _url = /* @__PURE__ */ new WeakMap(), _redirectUrl = /* @__PURE__ */ new WeakMap(), _withCredentials = /* @__PURE__ */ new WeakMap(), _fetch = /* @__PURE__ */ new WeakMap(), _MessageEvent = /* @__PURE__ */ new WeakMap(), _reconnectInterval = /* @__PURE__ */ new WeakMap(), _reconnectTimer = /* @__PURE__ */ new WeakMap(), _lastEventId = /* @__PURE__ */ new WeakMap(), _controller = /* @__PURE__ */ new WeakMap(), _parser = /* @__PURE__ */ new WeakMap(), _onError = /* @__PURE__ */ new WeakMap(), _onMessage = /* @__PURE__ */ new WeakMap(), _onOpen = /* @__PURE__ */ new WeakMap(), _EventSource_instances = /* @__PURE__ */ new WeakSet(), /**
* Connect to the given URL and start receiving events
*
* @internal
*/
connect_fn = /* @__PURE__ */ __name(function() {
  __privateSet(this, _readyState, this.CONNECTING), __privateSet(this, _controller, new AbortController()), __privateGet(this, _fetch)(__privateGet(this, _url), __privateMethod(this, _EventSource_instances, getRequestOptions_fn).call(this)).then(__privateGet(this, _onFetchResponse)).catch(__privateGet(this, _onFetchError));
}, "connect_fn"), _onFetchResponse = /* @__PURE__ */ new WeakMap(), _onFetchError = /* @__PURE__ */ new WeakMap(), /**
* Get request options for the `fetch()` request
*
* @returns The request options
* @internal
*/
getRequestOptions_fn = /* @__PURE__ */ __name(function() {
  var _a;
  const init4 = {
    // [spec] Let `corsAttributeState` be `Anonymous`…
    // [spec] …will have their mode set to "cors"…
    mode: "cors",
    redirect: "follow",
    headers: { Accept: "text/event-stream", ...__privateGet(this, _lastEventId) ? { "Last-Event-ID": __privateGet(this, _lastEventId) } : void 0 },
    cache: "no-store",
    signal: (_a = __privateGet(this, _controller)) == null ? void 0 : _a.signal
  };
  return "window" in globalThis && (init4.credentials = this.withCredentials ? "include" : "same-origin"), init4;
}, "getRequestOptions_fn"), _onEvent = /* @__PURE__ */ new WeakMap(), _onRetryChange = /* @__PURE__ */ new WeakMap(), /**
* Handles the process referred to in the EventSource specification as "failing a connection".
*
* @param error - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
failConnection_fn = /* @__PURE__ */ __name(function(message, code) {
  var _a;
  __privateGet(this, _readyState) !== this.CLOSED && __privateSet(this, _readyState, this.CLOSED);
  const errorEvent = new ErrorEvent("error", { code, message });
  (_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent), this.dispatchEvent(errorEvent);
}, "failConnection_fn"), /**
* Schedules a reconnection attempt against the EventSource endpoint.
*
* @param message - The error causing the connection to fail
* @param code - The HTTP status code, if available
* @internal
*/
scheduleReconnect_fn = /* @__PURE__ */ __name(function(message, code) {
  var _a;
  if (__privateGet(this, _readyState) === this.CLOSED)
    return;
  __privateSet(this, _readyState, this.CONNECTING);
  const errorEvent = new ErrorEvent("error", { code, message });
  (_a = __privateGet(this, _onError)) == null || _a.call(this, errorEvent), this.dispatchEvent(errorEvent), __privateSet(this, _reconnectTimer, setTimeout(__privateGet(this, _reconnect), __privateGet(this, _reconnectInterval)));
}, "scheduleReconnect_fn"), _reconnect = /* @__PURE__ */ new WeakMap(), /**
* ReadyState representing an EventSource currently trying to connect
*
* @public
*/
EventSource.CONNECTING = 0, /**
* ReadyState representing an EventSource connection that is open (eg connected)
*
* @public
*/
EventSource.OPEN = 1, /**
* ReadyState representing an EventSource connection that is closed (eg disconnected)
*
* @public
*/
EventSource.CLOSED = 2;
Object.defineProperty(EventSource, Symbol.for("eventsource.supports-fetch-override"), {
  value: true,
  writable: false,
  configurable: false,
  enumerable: false
});
function getBaseURL() {
  const doc = "document" in globalThis ? globalThis.document : void 0;
  return doc && typeof doc == "object" && "baseURI" in doc && typeof doc.baseURI == "string" ? doc.baseURI : void 0;
}
__name(getBaseURL, "getBaseURL");

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/polyfill.js
init_esm();
var MessageEventPolyfill = class extends Event {
  static {
    __name(this, "MessageEventPolyfill");
  }
  data;
  origin;
  lastEventId;
  source;
  ports;
  constructor(type, init4) {
    super(type);
    this.data = init4?.data ?? null;
    this.origin = init4?.origin ?? "";
    this.lastEventId = init4?.lastEventId ?? "";
    this.source = init4?.source ?? null;
    this.ports = init4?.ports ?? [];
  }
  /** @deprecated */
  initMessageEvent(_type, _bubbles, _cancelable, _data, _origin, _lastEventId2, _source, _ports) {
  }
};

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/subscribe.js
function makeAsyncIterator(subscribe2, subscribeOnClose, unsubscribe, readyState) {
  let wakeup = null;
  let closed = false;
  const backlog = [];
  const handler = /* @__PURE__ */ __name((data) => {
    backlog.push(data);
    if (backlog.length > 100) {
      backlog.shift();
    }
    if (wakeup) {
      wakeup();
      wakeup = null;
    }
  }, "handler");
  subscribe2(handler);
  const done = /* @__PURE__ */ __name(() => {
    unsubscribe(handler);
    return Promise.resolve({ done: true, value: void 0 });
  }, "done");
  const onClose = /* @__PURE__ */ __name(() => {
    closed = true;
    if (wakeup) {
      wakeup();
    }
    done();
  }, "onClose");
  subscribeOnClose(onClose);
  const next = /* @__PURE__ */ __name(async () => {
    while (true) {
      if (readyState() === "closed" || closed) {
        return done();
      }
      const nextValue = backlog.shift();
      if (nextValue) {
        return { value: nextValue, done: false };
      }
      const p = new Promise((resolve) => {
        wakeup = resolve;
      });
      await p;
    }
  }, "next");
  return {
    next,
    return: done,
    throw(error) {
      unsubscribe(handler);
      return Promise.reject(error);
    },
    [Symbol.asyncIterator]() {
      return this;
    }
  };
}
__name(makeAsyncIterator, "makeAsyncIterator");
function esReadyState(es) {
  switch (es.readyState) {
    case es.CLOSED: {
      return "closed";
    }
    case es.CONNECTING: {
      return "connecting";
    }
    case es.OPEN: {
      return "open";
    }
    default:
      return "connecting";
  }
}
__name(esReadyState, "esReadyState");
function multiReadFetchResponse(r) {
  let p = null;
  return {
    ...r,
    text() {
      if (!p) {
        p = r.text();
      }
      return p;
    },
    json() {
      if (!p) {
        p = r.text();
      }
      return p.then((x) => JSON.parse(x));
    }
  };
}
__name(multiReadFetchResponse, "multiReadFetchResponse");
function formatPageInfo(pageInfo) {
  if (!pageInfo) {
    return void 0;
  }
  const res = {};
  for (const [k, v] of Object.entries(pageInfo)) {
    res[k] = {
      startCursor: v["start-cursor"],
      endCursor: v["end-cursor"],
      hasNextPage: v["has-next-page?"],
      hasPreviousPage: v["has-previous-page?"]
    };
  }
  return res;
}
__name(formatPageInfo, "formatPageInfo");
function subscribe(query3, cb, opts) {
  let fetchErrorResponse;
  let closed = false;
  const localConnectionId = id_default();
  const es = new EventSource(`${opts.apiURI}/admin/subscribe-query?local_connection_id=${localConnectionId}`, {
    messageEvent: MessageEventPolyfill,
    fetch(input, init4) {
      fetchErrorResponse = null;
      return fetch(input, {
        ...init4,
        method: "POST",
        headers: opts.headers,
        body: JSON.stringify({
          query: query3,
          "inference?": opts.inference,
          versions: {
            "@instantdb/admin": version_default2,
            "@instantdb/core": version_default
          }
        })
      }).then((r) => {
        if (!r.ok) {
          fetchErrorResponse = multiReadFetchResponse(r);
        }
        return r;
      });
    }
  });
  const subscribers = [];
  const onCloseSubscribers = [];
  const subscribe2 = /* @__PURE__ */ __name((cb2) => {
    subscribers.push(cb2);
  }, "subscribe");
  const unsubscribe = /* @__PURE__ */ __name((cb2) => {
    subscribers.splice(subscribers.indexOf(cb2), 1);
  }, "unsubscribe");
  const subscribeOnClose = /* @__PURE__ */ __name((cb2) => {
    onCloseSubscribers.push(cb2);
  }, "subscribeOnClose");
  if (cb) {
    subscribe2(cb);
  }
  let sessionParams = null;
  function deliver(result) {
    if (closed) {
      return;
    }
    for (const sub of subscribers) {
      try {
        sub(result);
      } catch (e) {
        console.error("Error in subscribeQuery callback", e);
      }
    }
  }
  __name(deliver, "deliver");
  function handleMessage(msg) {
    switch (msg.op) {
      case "sse-init": {
        const machineId = msg["machine-id"];
        const sessionId = msg["session-id"];
        sessionParams = { machineId, sessionId };
        break;
      }
      case "add-query-ok": {
        deliver({
          type: "ok",
          data: msg.result,
          pageInfo: formatPageInfo(msg["result-meta"]?.["page-info"]),
          sessionInfo: sessionParams
        });
        break;
      }
      case "refresh-ok": {
        if (msg.computations.length) {
          deliver({
            type: "ok",
            data: msg.computations[0]["instaql-result"],
            pageInfo: formatPageInfo(msg.computations[0]["result-meta"]?.["page-info"]),
            sessionInfo: sessionParams
          });
        }
        break;
      }
      case "error": {
        deliver({
          type: "error",
          error: new InstantAPIError({ body: msg, status: msg.status }),
          get readyState() {
            return esReadyState(es);
          },
          get isClosed() {
            return esReadyState(es) === "closed";
          },
          sessionInfo: sessionParams
        });
        break;
      }
    }
  }
  __name(handleMessage, "handleMessage");
  es.onerror = (e) => {
    if (fetchErrorResponse) {
      fetchErrorResponse.text().then((t) => {
        let body = { type: void 0, message: t };
        try {
          body = JSON.parse(t);
        } catch (_e) {
        }
        deliver({
          type: "error",
          error: new InstantAPIError({
            status: fetchErrorResponse.status,
            body
          }),
          get readyState() {
            return esReadyState(es);
          },
          get isClosed() {
            return esReadyState(es) === "closed";
          },
          sessionInfo: sessionParams
        });
      });
    } else {
      const deliverError = /* @__PURE__ */ __name(() => {
        deliver({
          type: "error",
          error: new InstantAPIError({
            status: e.code || 500,
            body: {
              type: void 0,
              message: e.message || "Unknown error in subscribe query."
            }
          }),
          get readyState() {
            return esReadyState(es);
          },
          get isClosed() {
            return esReadyState(es) === "closed";
          },
          sessionInfo: sessionParams
        });
      }, "deliverError");
      if (es.readyState === EventSource.CLOSED) {
        deliverError();
        return;
      }
      setTimeout(() => {
        if (es.readyState !== EventSource.OPEN) {
          deliverError();
        }
      }, 5e3);
    }
  };
  es.onmessage = (e) => {
    handleMessage(JSON.parse(e.data));
  };
  const close = /* @__PURE__ */ __name(() => {
    closed = true;
    for (const sub of onCloseSubscribers) {
      try {
        sub();
      } catch (e) {
        console.error("Error in onClose callback", e);
      }
    }
    es.close();
  }, "close");
  return {
    close,
    [Symbol.iterator]: () => {
      throw new Error("subscribeQuery does not support synchronous iteration. Use `for await` instead.");
    },
    get sessionInfo() {
      return sessionParams;
    },
    get readyState() {
      return esReadyState(es);
    },
    get isClosed() {
      return esReadyState(es) === "closed";
    },
    [Symbol.asyncIterator]: makeAsyncIterator.bind(this, subscribe2, subscribeOnClose, unsubscribe, () => 1)
  };
}
__name(subscribe, "subscribe");

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/index.js
var import_cookie = __toESM(require_dist(), 1);

// ../../node_modules/.pnpm/@instantdb+webhooks@1.0.43/node_modules/@instantdb/webhooks/dist/esm/index.js
init_esm();
var knownKeys = {
  "https://api.instantdb.com": {
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        alg: "EdDSA",
        use: "sig",
        kid: "1034696293",
        x: "N-C41432STKAKkXAWmeIOXMnZcGRR1b9u1L3bTVqI_o"
      }
    ]
  },
  "http://localhost:8888": {
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        alg: "EdDSA",
        use: "sig",
        kid: "503090235",
        x: "qrSkwDaMITRMF9nOgpueqxgaAiuFmJperYE3mkyl8Ow"
      }
    ]
  }
};
function inferWebCryptoAlg(jwk) {
  if (jwk.kty === "OKP" && jwk.crv === "Ed25519") {
    return { name: "Ed25519" };
  }
  if (jwk.kty === "EC") {
    return { name: "ECDSA", namedCurve: jwk.crv };
  }
  if (jwk.kty === "RSA") {
    const hashMap = {
      RS256: "SHA-256",
      RS384: "SHA-384",
      RS512: "SHA-512"
    };
    return {
      name: "RSASSA-PKCS1-v1_5",
      hash: hashMap[jwk.alg] || "SHA-256"
    };
  }
  throw new Error(`Unsupported JWK configuration: kty=${jwk.kty}, crv=${jwk.crv}`);
}
__name(inferWebCryptoAlg, "inferWebCryptoAlg");
async function importKey(jwk) {
  const alg = inferWebCryptoAlg(jwk);
  const key = await crypto.subtle.importKey("jwk", jwk, alg, false, ["verify"]);
  return { alg, key };
}
__name(importKey, "importKey");
function verify(alg, key, signature, message) {
  return crypto.subtle.verify(alg, key, signature, message);
}
__name(verify, "verify");
function hexToUint8Array(hexString) {
  const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
  for (let i2 = 0; i2 < bytes.length; i2++) {
    bytes[i2] = parseInt(hexString.substring(i2 * 2, i2 * 2 + 2), 16);
  }
  return bytes;
}
__name(hexToUint8Array, "hexToUint8Array");
function parseSignatureHeader(h) {
  let t, kid, v1;
  for (const part of h.split(",")) {
    const [k, v] = part.split("=");
    switch (k) {
      case "t": {
        t = v;
        break;
      }
      case "kid": {
        kid = v;
        break;
      }
      case "v1": {
        v1 = v;
        break;
      }
    }
  }
  const missingKeys = [];
  if (!t) {
    missingKeys.push("t");
  }
  if (!kid) {
    missingKeys.push("kid");
  }
  if (!v1) {
    missingKeys.push("v1");
  }
  if (missingKeys.length || !t || !kid || !v1) {
    throw new InstantError("Invalid Instant-Signature header.", {
      header: h,
      missingKeys
    });
  }
  return { t, kid, v1 };
}
__name(parseSignatureHeader, "parseSignatureHeader");
function validateT(receivedAt, t, tolerance) {
  const age = Math.floor(receivedAt.getTime() / 1e3) - parseInt(t, 10);
  if (age > tolerance) {
    throw new InstantError("Webhook signature is too old", {
      tolerance,
      receivedAt,
      t
    });
  }
}
__name(validateT, "validateT");
var keyCache = {};
var defaultTolerance = 300;
async function jsonReject(rejectFn, res) {
  const body = await res.text();
  try {
    const json2 = JSON.parse(body);
    return rejectFn(new InstantAPIError({ status: res.status, body: json2 }));
  } catch (_e) {
    return rejectFn(new InstantAPIError({
      status: res.status,
      body: { type: void 0, message: body }
    }));
  }
}
__name(jsonReject, "jsonReject");
var defaultJsonFetch = /* @__PURE__ */ __name(async (input, init4) => {
  const headers = {
    ...init4?.headers || {},
    "Instant-Core-Version": version_default
  };
  const res = await fetch(input, { ...init4, headers });
  if (res.status === 200) {
    return res.json();
  }
  return jsonReject((x) => Promise.reject(x), res);
}, "defaultJsonFetch");
function parseDate(s) {
  return s ? new Date(s) : null;
}
__name(parseDate, "parseDate");
function toWebhookInfo(raw) {
  return {
    id: raw.id,
    sink: raw.sink,
    namespaces: raw.namespaces ?? [],
    actions: raw.actions,
    status: raw.status,
    disabledReason: raw.disabled_reason ?? null,
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at)
  };
}
__name(toWebhookInfo, "toWebhookInfo");
function toWebhookAttempt(raw) {
  return {
    attemptAt: parseDate(raw["attempt-at"]),
    durationMs: raw["duration-ms"] ?? null,
    success: raw["success?"] ?? null,
    statusCode: raw["status-code"] ?? null,
    responseText: raw["response-text"] ?? null,
    errorType: raw["error-type"] ?? null,
    errorMessage: raw["error-message"] ?? null
  };
}
__name(toWebhookAttempt, "toWebhookAttempt");
function toWebhookEventInfo(raw) {
  return {
    isn: raw.isn,
    status: raw.status,
    attempts: raw.attempts ? raw.attempts.map(toWebhookAttempt) : null,
    nextAttemptAfter: parseDate(raw.next_attempt_after),
    createdAt: new Date(raw.created_at),
    updatedAt: new Date(raw.updated_at)
  };
}
__name(toWebhookEventInfo, "toWebhookEventInfo");
var WebhooksManager = class {
  static {
    __name(this, "WebhooksManager");
  }
  #appId;
  #apiURI;
  #token;
  #withAuth;
  #jsonFetch;
  constructor(opts) {
    this.#appId = opts.appId;
    this.#apiURI = opts.apiURI;
    this.#token = opts.token;
    this.#withAuth = opts.withAuth;
    this.#jsonFetch = opts.jsonFetch;
  }
  #authedFetch(path, opts) {
    if (!this.#appId) {
      throw new InstantError("appId is required to manage webhooks. Pass it to the Webhooks constructor.");
    }
    const run = /* @__PURE__ */ __name((token) => {
      const init4 = {
        method: opts?.method,
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        }
      };
      if (opts?.body !== void 0) {
        init4.body = JSON.stringify(opts.body);
      }
      return this.#jsonFetch(`${this.#apiURI}${path}`, init4);
    }, "run");
    if (this.#withAuth) {
      return this.#withAuth(run);
    }
    if (!this.#token) {
      throw new InstantError("A token is required to manage webhooks. Pass `adminToken` or `token` to the Webhooks constructor.");
    }
    return run(this.#token);
  }
  /**
   * Returns every webhook configured on the app, newest first. Includes both
   * active and disabled webhooks.
   */
  async list() {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks`);
    return (res.webhooks || []).map(toWebhookInfo);
  }
  /**
   * Creates a new webhook. The webhook is created in the `active` state and
   * starts receiving matching events immediately.
   *
   * The server rejects the request if `url` is not an HTTPS URL pointing at a
   * public host, if `namespaces` doesn't reference any entity in the app's
   * schema, if `actions` is empty, or if the app has hit its webhook limit.
   *
   * An app may have at most **100 active webhooks** at a time; {@link delete}
   * a webhook to free up a slot before creating another.
   *
   * @example
   * const webhook = await db.webhooks.manager.create({
   *   url: 'https://example.com/instant',
   *   namespaces: ['posts', 'comments'],
   *   actions: ['create', 'update'],
   * });
   */
  async create(params) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks`, {
      method: "POST",
      body: params
    });
    return toWebhookInfo(res.webhook);
  }
  /**
   * Updates a webhook's `url`, `namespaces`, and/or `actions`. Pass only the
   * fields you want to change; omitted fields keep their current value.
   *
   * Does not affect the webhook's status — use {@link enable} or
   * {@link disable} for that.
   */
  async update(webhookId, params) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}`, { method: "POST", body: params });
    return toWebhookInfo(res.webhook);
  }
  /**
   * Deletes a webhook. No further events will be queued for it. Returns the
   * webhook as it looked just before deletion.
   */
  async delete(webhookId) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}`, { method: "DELETE" });
    return toWebhookInfo(res.webhook);
  }
  /**
   * Re-enables a disabled webhook. Clears `disabledReason` and resumes
   * delivery for new events. Has no effect if the webhook is already active.
   *
   * Events that occurred while the webhook was disabled are not retroactively
   * delivered.
   */
  async enable(webhookId) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}/enable`, { method: "POST", body: {} });
    return toWebhookInfo(res.webhook);
  }
  /**
   * Disables a webhook. No new events will be queued until it is re-enabled
   * via {@link enable}. In-flight events already being processed will still
   * complete.
   *
   * @param opts.reason  Optional human-readable note stored on the webhook
   *                     and surfaced in the dashboard.
   */
  async disable(webhookId, opts) {
    const body = opts?.reason ? { reason: opts.reason } : {};
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}/disable`, { method: "POST", body });
    return toWebhookInfo(res.webhook);
  }
  /**
   * Returns a page of events for a webhook, newest first.
   *
   * Events are retained for ~60 days. To paginate, pass the previous page's
   * `pageInfo.endCursor` as `opts.after`; stop when `pageInfo.hasNextPage`
   * is `false`.
   */
  async listEvents(webhookId, opts) {
    const qs = opts?.after ? `?after=${encodeURIComponent(opts.after)}` : "";
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}/events${qs}`);
    return {
      events: (res.events || []).map(toWebhookEventInfo),
      pageInfo: {
        startCursor: res.pageInfo?.startCursor ?? null,
        endCursor: res.pageInfo?.endCursor ?? null,
        hasNextPage: !!res.pageInfo?.hasNextPage
      }
    };
  }
  /**
   * Fetches a single webhook event by its `isn`.
   */
  async getEvent(webhookId, isn) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}/events/${isn}`);
    return toWebhookEventInfo(res.event);
  }
  /** Returns the full payload for an event. */
  async getPayload(webhookId, isn) {
    return this.#authedFetch(`/webhooks/payload/${this.#appId}/${webhookId}/${isn}`);
  }
  /**
   * Re-queues an event for delivery, regardless of its current status. Use
   * this to retry a `failed` event or force a redelivery of a `success` one.
   *
   * The server rate-limits resends; if the event was queued or resent very
   * recently the call will fail with a validation error asking you to try
   * again in about a minute.
   */
  async resendEvent(webhookId, isn) {
    const res = await this.#authedFetch(`/dash/apps/${this.#appId}/webhooks/${webhookId}/events/${isn}`, { method: "POST", body: {} });
    return toWebhookEventInfo(res.event);
  }
};
var Webhooks = class _Webhooks {
  static {
    __name(this, "Webhooks");
  }
  /** App this instance is bound to. */
  appId;
  /** Schema used to type webhook payloads and handler records. */
  schema;
  #token;
  /** Base URL for the Instant API. */
  apiURI;
  #jsonFetch;
  /** Manage webhook subscriptions and inspect delivery events. */
  manager;
  /**
   * Schema-bound helpers for building typed handler maps.
   *
   * - `typedHandlers(namespace, action, handler)` builds a single typed entry.
   *   Pass `'$default'` for `namespace` to register a catch-all handler.
   * - `combineHandlers(...entries)` merges entries into a
   *   {@link WebhookHandlers} object suitable for {@link processPayload} and
   *   {@link processRequest}.
   *
   * If you already have a {@link Webhooks} instance, prefer the instance
   * form (`db.webhooks.helpers()`) — it infers `Schema` automatically.
   *
   * @example
   * const { typedHandlers, combineHandlers } = Webhooks.helpers<typeof schema>();
   * const handlers = combineHandlers(
   *   typedHandlers('posts', 'create', (record) => { ... }),
   *   typedHandlers('comments', '$default', (record) => { ... }),
   *   typedHandlers('$default', (record) => { ... }),
   * );
   */
  static helpers() {
    function typedHandlers(...args) {
      if (args.length === 2) {
        return { $default: args[1] };
      }
      const [namespace, action, handler] = args;
      return { [namespace]: { [action]: handler } };
    }
    __name(typedHandlers, "typedHandlers");
    function combineHandlers(...entries) {
      const result = {};
      for (const entry of entries) {
        for (const key of Object.keys(entry)) {
          if (key === "$default") {
            result.$default = entry.$default;
          } else {
            result[key] = { ...result[key], ...entry[key] };
          }
        }
      }
      return result;
    }
    __name(combineHandlers, "combineHandlers");
    return {
      typedHandlers,
      combineHandlers
    };
  }
  /**
   * Instance form of {@link Webhooks.helpers} that infers `Schema` from this
   * instance — no `<typeof schema>` type argument required.
   *
   * @example
   * const { typedHandlers, combineHandlers } = db.webhooks.helpers();
   */
  helpers() {
    return _Webhooks.helpers();
  }
  constructor(config, jsonFetch3) {
    this.appId = config.appId;
    this.schema = config.schema;
    this.#token = config.adminToken || config.token;
    this.apiURI = config.apiURI || "https://api.instantdb.com";
    this.#jsonFetch = jsonFetch3 || defaultJsonFetch;
    this.manager = new WebhooksManager({
      appId: this.appId,
      apiURI: this.apiURI,
      token: this.#token,
      withAuth: config.withAuth,
      jsonFetch: this.#jsonFetch
    });
  }
  /** Fetches Instant's JWK set for verifying webhook signatures. */
  async fetchJwks() {
    const resp = await this.#jsonFetch(`${this.apiURI}/.well-known/webhooks/jwks.json`);
    return resp;
  }
  /**
   * Resolves a `kid` to an imported {@link CryptoKey}, hitting a
   * process-wide cache on repeat calls. Falls back to {@link fetchJwks} if
   * the key isn't already known.
   */
  async keyOfKid(kid) {
    const cacheKey = `${this.apiURI}:${kid}`;
    const cached = keyCache[cacheKey];
    if (cached) {
      return cached;
    }
    const jwk = knownKeys[this.apiURI]?.keys.find((k) => k.kid === kid) || (await this.fetchJwks())?.keys?.find((k) => k.kid === kid);
    if (!jwk) {
      throw new InstantError("Could not find matching signing key", { kid });
    }
    const res = await importKey(jwk);
    keyCache[cacheKey] = res;
    return res;
  }
  /**
   * Verifies an `Instant-Signature` header against a body and returns the
   * parsed {@link WebhookBody} (containing the `payloadUrl` and a JWT
   * `token` for fetching the records).
   *
   * Throws if the signature doesn't validate, the signature is older than
   * `opts.tolerance` (default 300 seconds), or the body doesn't decode to
   * the expected shape.
   *
   * @param body  Either the raw body string, or a function returning it.
   *              Use a function to defer reading the body until after the
   *              header has been parsed.
   */
  async validate(signatureHeader, body, opts) {
    const receivedAt = opts?.receivedAt || /* @__PURE__ */ new Date();
    const { t, kid, v1 } = parseSignatureHeader(signatureHeader);
    const tolerance = opts?.tolerance ?? defaultTolerance;
    validateT(receivedAt, t, tolerance);
    const { alg, key } = await this.keyOfKid(kid);
    const bodyText = typeof body === "function" ? await body() : body;
    const message = new TextEncoder().encode(`${t}.${bodyText}`);
    const verified = await verify(alg, key, hexToUint8Array(v1), message);
    if (!verified) {
      throw new InstantError("Instant Signature did not validate", {
        header: signatureHeader
      });
    }
    const res = JSON.parse(bodyText);
    if (typeof res !== "object" || typeof res.payloadUrl !== "string" || typeof res.token !== "string") {
      throw new InstantError("Invalid webhook body, expected an object with payloadUrl and token fields", { body: res });
    }
    return res;
  }
  /**
   * Pulls the `Instant-Signature` header and body from a `Request` and
   * delegates to {@link validate}. Throws if the header is missing.
   */
  async validateRequest(req, opts) {
    const signatureHeader = req.headers.get("instant-signature");
    if (!signatureHeader) {
      throw new InstantError("Request is missing Instant-Signature header");
    }
    return this.validate(signatureHeader, () => req.text(), opts);
  }
  /**
   * Fetches the records and `idempotencyKey` for a validated
   * {@link WebhookBody}, authenticating with the JWT `token` it carries.
   */
  fetchPayloads({ payloadUrl, token }) {
    return this.#jsonFetch(payloadUrl, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" }
    });
  }
  /**
   * Dispatches each record in `payload` to its matching handler in
   * `handlers`. Resolution order per record: exact `namespace` + `action` →
   * `namespace`'s `$default` → top-level `$default`. Records with no matching
   * handler are skipped.
   *
   * Handlers run concurrently. If any handler rejects, the call rejects so
   * the caller (e.g. {@link processRequest}) can return a non-2xx response
   * and let Instant retry the event.
   */
  async processPayload(handlers, payload) {
    const results = [];
    for (const record of payload.data) {
      const { namespace, action } = record;
      const handler = handlers?.[namespace]?.[action] || handlers?.[namespace]?.$default || handlers?.$default;
      if (handler) {
        results.push(handler(record));
      }
    }
    await Promise.all(results);
  }
  /**
   * The one-liner for handling webhooks. Hand it your handlers and the
   * incoming `Request` — it verifies the signature, fetches the records, and
   * dispatches each one to your code.
   *
   * Async handlers are executed in parallel, the return promise will resolve once
   * all handlers complete and will reject if any of the handlers fails.
   *
   * @example
   * const { typedHandlers, combineHandlers } = db.webhooks.helpers();
   *
   * const handlers = combineHandlers(
   *   typedHandlers('posts', 'create', async (record) => {
   *     await sendNewPostEmail(record.after);
   *   }),
   *   typedHandlers('$default', (record) => {
   *     console.log('webhook event', record);
   *   }),
   * );
   *
   * export async function POST(req: Request) {
   *   await db.webhooks.processRequest(handlers, req);
   *   return new Response('ok');
   * }
   */
  async processRequest(handlers, req, opts) {
    const body = await this.validateRequest(req, opts);
    const payload = await this.fetchPayloads(body);
    await this.processPayload(handlers, payload);
  }
  /**
   * Adapter for frameworks that hand you a Node-style `http.IncomingMessage`
   * (Next.js Pages Router, Express, Koa, etc.) instead of a Web `Request`.
   * Wraps the request in a Web `Request` and delegates to
   * {@link processRequest}. You still send the HTTP response yourself.
   *
   * The raw body is required for signature verification. The adapter picks
   * it up from one of:
   *
   * - `req.body` if it's a `Buffer` or `Uint8Array` (set by middleware like
   *   `express.raw({ type: 'application/json' })`)
   * - `req.body` if it's a string (set by middleware like `express.text()`)
   * - otherwise the unconsumed request stream
   *
   * Don't use a JSON body parser on this route — `express.json()` and
   * `bodyParser: true` in Next.js both parse the body into an object,
   * destroying the raw bytes the signature was computed over.
   *
   * @example
   * // Next.js Pages Router (`pages/api/webhooks.ts`)
   * import type { NextApiRequest, NextApiResponse } from 'next';
   *
   * export const config = { api: { bodyParser: false } };
   *
   * const { typedHandlers, combineHandlers } = db.webhooks.helpers();
   *
   * const handlers = combineHandlers(
   *   typedHandlers('posts', 'create', async (record) => {
   *     await sendNewPostEmail(record.after);
   *   }),
   *   typedHandlers('$default', (record) => {
   *     console.log('unhandled record', record);
   *   }),
   * );
   *
   * export default async function handler(
   *   req: NextApiRequest,
   *   res: NextApiResponse,
   * ) {
   *   try {
   *     await db.webhooks.processNodeRequest(handlers, req);
   *     res.status(200).end();
   *   } catch (e) {
   *     res.status(400).json({ error: String(e) });
   *   }
   * }
   *
   * @example
   * // Express — skip the JSON body parser on the webhook route and use
   * // `express.raw()` so `req.body` arrives as a Buffer.
   * import express from 'express';
   *
   * const app = express();
   *
   * app.use((req, res, next) => {
   *   if (req.originalUrl === '/webhooks/instant') return next();
   *   express.json()(req, res, next);
   * });
   *
   * app.post(
   *   '/webhooks/instant',
   *   express.raw({ type: 'application/json' }),
   *   async (req, res) => {
   *     try {
   *       await db.webhooks.processNodeRequest(handlers, req);
   *       res.status(200).end();
   *     } catch (e) {
   *       res.status(400).json({ error: String(e) });
   *     }
   *   },
   * );
   *
   * @example
   * // Koa — `ctx.req` is the raw IncomingMessage. If `koa-bodyparser` (or
   * // similar) runs on this route it consumes the stream, so either skip it
   * // here or pull the raw body yourself and shim it onto the request:
   * import Koa from 'koa';
   * import Router from '@koa/router';
   * import rawBody from 'raw-body';
   *
   * const router = new Router();
   *
   * router.post('/webhooks/instant', async (ctx) => {
   *   try {
   *     await db.webhooks.processNodeRequest(handlers, ctx.req, {
   *       body: rawBody(ctx.req), // adapter awaits the Promise
   *     });
   *     ctx.status = 200;
   *   } catch (e) {
   *     ctx.status = 400;
   *     ctx.body = { error: String(e) };
   *   }
   * });
   *
   * @example
   * // NestJS (Express adapter). With `rawBody: true` on the factory, Nest
   * // populates `req.rawBody` itself — just pass `req`.
   * import { Controller, Post, Req, HttpCode } from '@nestjs/common';
   * import type { Request } from 'express';
   *
   * @Controller('webhooks')
   * export class WebhooksController {
   *   @Post('instant')
   *   @HttpCode(200)
   *   async handle(@Req() req: Request) {
   *     await db.webhooks.processNodeRequest(handlers, req);
   *   }
   * }
   *
   * // (Pair with `NestFactory.create(AppModule, { rawBody: true })` in main.ts.)
   */
  async processNodeRequest(handlers, req, opts) {
    let rawBody;
    let bodyWasReserialized = false;
    let bodyValue = opts?.body ?? req.rawBody ?? req.body;
    if (bodyValue != null && typeof bodyValue.then === "function") {
      bodyValue = await bodyValue;
    }
    if (typeof bodyValue === "string") {
      rawBody = bodyValue;
    } else if (bodyValue instanceof Uint8Array) {
      rawBody = new TextDecoder("utf-8").decode(bodyValue);
    } else if (bodyValue != null && typeof bodyValue === "object") {
      try {
        rawBody = JSON.stringify(bodyValue);
        bodyWasReserialized = true;
      } catch {
        throw new InstantError("Webhook request body has already been parsed and could not be re-serialized. Configure this route to receive the raw request body instead of parsed JSON.");
      }
    } else if (req[Symbol.asyncIterator]) {
      const encoder = new TextEncoder();
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === "string" ? encoder.encode(chunk) : chunk);
      }
      let total = 0;
      for (const c of chunks)
        total += c.byteLength;
      const buf = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        buf.set(c, offset);
        offset += c.byteLength;
      }
      rawBody = new TextDecoder("utf-8").decode(buf);
    } else {
      throw new InstantError("Could not read the webhook request body. Pass a Node IncomingMessage with an unconsumed stream, or set `req.body` to the raw bytes (Buffer/Uint8Array) or string.");
    }
    const host = typeof req.headers.host === "string" ? req.headers.host : "localhost";
    const url = new URL(req.url ?? "/", `https://${host}`);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (typeof v === "string")
        headers.set(k, v);
      else if (Array.isArray(v))
        headers.set(k, v.join(", "));
    }
    const webReq = new Request(url, {
      method: req.method ?? "POST",
      headers,
      body: rawBody
    });
    try {
      await this.processRequest(handlers, webReq, opts);
    } catch (e) {
      if (bodyWasReserialized && e instanceof InstantError && e.message === "Instant Signature did not validate") {
        throw new InstantError("Webhook signature did not validate. The request body was re-serialized from a parsed JSON object, which can produce different bytes than the server signed. Configure this route to receive the raw request body instead of parsed JSON.", { hint: e.hint });
      }
      throw e;
    }
  }
};

// ../../node_modules/.pnpm/@instantdb+admin@1.0.43/node_modules/@instantdb/admin/dist/esm/index.js
function instantConfigWithDefaults(config) {
  const defaultConfig = {
    apiURI: "https://api.instantdb.com"
  };
  const r = { ...defaultConfig, ...config };
  if (!r.apiURI) {
    r.apiURI = defaultConfig.apiURI;
  }
  return r;
}
__name(instantConfigWithDefaults, "instantConfigWithDefaults");
function withImpersonation(headers, opts) {
  if ("email" in opts) {
    headers["as-email"] = opts.email;
  } else if ("token" in opts) {
    headers["as-token"] = opts.token;
  } else if ("guest" in opts) {
    headers["as-guest"] = "true";
  }
  return headers;
}
__name(withImpersonation, "withImpersonation");
function validateConfigAndImpersonation(config, impersonationOpts) {
  if (impersonationOpts && ("token" in impersonationOpts || "guest" in impersonationOpts)) {
    return;
  }
  if (config.adminToken) {
    return;
  }
  if (impersonationOpts && "email" in impersonationOpts) {
    throw new Error("Admin token required. To impersonate users with an email you must pass `adminToken` to `init`.");
  }
  throw new Error("Admin token required. To run this operation pass `adminToken` to `init`, or use `db.asUser`.");
}
__name(validateConfigAndImpersonation, "validateConfigAndImpersonation");
function authorizedHeaders(config, impersonationOpts) {
  validateConfigAndImpersonation(config, impersonationOpts);
  const { adminToken, appId } = config;
  const headers = {
    "content-type": "application/json",
    "app-id": appId
  };
  if (adminToken) {
    headers.authorization = `Bearer ${adminToken}`;
  }
  return impersonationOpts ? withImpersonation(headers, impersonationOpts) : headers;
}
__name(authorizedHeaders, "authorizedHeaders");
function isNextJSVersionThatCachesFetchByDefault() {
  return (
    // NextJS 13 onwards added a `__nextPatched` property to the fetch function
    fetch["__nextPatched"] && // NextJS 15 onwards _also_ added a global `next-patch` symbol.
    !globalThis[Symbol.for("next-patch")]
  );
}
__name(isNextJSVersionThatCachesFetchByDefault, "isNextJSVersionThatCachesFetchByDefault");
function getDefaultFetchOpts() {
  return isNextJSVersionThatCachesFetchByDefault() ? { cache: "no-store" } : {};
}
__name(getDefaultFetchOpts, "getDefaultFetchOpts");
async function jsonReject2(rejectFn, res) {
  const body = await res.text();
  try {
    const json2 = JSON.parse(body);
    return rejectFn(new InstantAPIError({ status: res.status, body: json2 }));
  } catch (_e) {
    return rejectFn(new InstantAPIError({
      status: res.status,
      body: { type: void 0, message: body }
    }));
  }
}
__name(jsonReject2, "jsonReject");
async function jsonFetch2(input, init4) {
  const defaultFetchOpts = getDefaultFetchOpts();
  const headers = {
    ...init4?.headers || {},
    "Instant-Admin-Version": version_default2,
    "Instant-Core-Version": version_default
  };
  const res = await fetch(input, { ...defaultFetchOpts, ...init4, headers });
  if (res.status === 200) {
    const json2 = await res.json();
    return Promise.resolve(json2);
  }
  return jsonReject2((x) => Promise.reject(x), res);
}
__name(jsonFetch2, "jsonFetch");
function makeEventSourceWrapper(opts) {
  return class EventSourceWrapper {
    static {
      __name(this, "EventSourceWrapper");
    }
    source;
    static OPEN = EventSource.OPEN;
    static CONNECTING = EventSource.CONNECTING;
    static CLOSED = EventSource.CLOSED;
    url;
    constructor(url) {
      this.url = url;
      this.source = this.#createEventSource(url);
    }
    get onopen() {
      return this.source.onopen;
    }
    set onopen(fn) {
      this.source.onopen = fn;
    }
    get onmessage() {
      return this.source.onmessage;
    }
    set onmessage(fn) {
      this.source.onmessage = fn;
    }
    get onerror() {
      return this.source.onerror;
    }
    set onerror(fn) {
      this.source.onerror = fn;
    }
    get readyState() {
      return this.source.readyState;
    }
    close() {
      this.source.close();
    }
    #createEventSource(url) {
      const es = new EventSource(url, {
        messageEvent: MessageEventPolyfill,
        fetch(input, init4) {
          return fetch(input, {
            ...init4,
            method: "POST",
            headers: opts.headers,
            body: JSON.stringify({
              "inference?": opts.inference,
              versions: {
                "@instantdb/admin": version_default2,
                "@instantdb/core": version_default
              }
            })
          });
        }
      });
      return es;
    }
  };
}
__name(makeEventSourceWrapper, "makeEventSourceWrapper");
function init(config) {
  if (!config.appId || !validate_default(config.appId)) {
    console.warn("warning: Instant Admin DB must be initialized with a valid appId. Received: " + JSON.stringify(config.appId));
  }
  const configStrict = {
    ...config,
    appId: config.appId?.trim(),
    adminToken: config.adminToken?.trim(),
    useDateObjects: config.useDateObjects ?? false
  };
  return new InstantAdminDatabase(configStrict);
}
__name(init, "init");
function steps(inputChunks) {
  const chunks = Array.isArray(inputChunks) ? inputChunks : [inputChunks];
  return chunks.flatMap(getOps);
}
__name(steps, "steps");
var Rooms = class {
  static {
    __name(this, "Rooms");
  }
  config;
  constructor(config) {
    this.config = config;
  }
  async getPresence(roomType, roomId) {
    const res = await jsonFetch2(`${this.config.apiURI}/admin/rooms/presence?app_id=${this.config.appId}&room-type=${String(roomType)}&room-id=${roomId}`, {
      method: "GET",
      headers: authorizedHeaders(this.config)
    });
    return res.sessions || {};
  }
};
var Auth = class {
  static {
    __name(this, "Auth");
  }
  config;
  constructor(config) {
    this.config = config;
    this.createToken = this.createToken.bind(this);
  }
  /**
   * Generates a magic code for the user with the given email.
   * This is useful if you want to use your own email provider
   * to send magic codes.
   *
   * @example
   *   // Generate a magic code
   *   const { code } = await db.auth.generateMagicCode({ email })
   *   // Send the magic code to the user with your own email provider
   *   await customEmailProvider.sendMagicCode(email, code)
   *
   * @see https://instantdb.com/docs/backend#custom-magic-codes
   */
  generateMagicCode = /* @__PURE__ */ __name(async (email) => {
    return jsonFetch2(`${this.config.apiURI}/admin/magic_code?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify({ email })
    });
  }, "generateMagicCode");
  /**
   * Sends a magic code to the user with the given email.
   * This uses Instant's built-in email provider.
   *
   * @example
   *   // Send an email to user with magic code
   *   await db.auth.sendMagicCode({ email })
   *
   * @see https://instantdb.com/docs/backend#custom-magic-codes
   */
  sendMagicCode = /* @__PURE__ */ __name(async (email) => {
    return jsonFetch2(`${this.config.apiURI}/admin/send_magic_code?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify({ email })
    });
  }, "sendMagicCode");
  /**
   * @deprecated Use {@link checkMagicCode} instead to get the `created` field
   * and support `extraFields`.
   *
   * @see https://instantdb.com/docs/backend#custom-magic-codes
   */
  verifyMagicCode = /* @__PURE__ */ __name(async (email, code) => {
    const { user } = await jsonFetch2(`${this.config.apiURI}/admin/verify_magic_code?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify({ email, code })
    });
    return user;
  }, "verifyMagicCode");
  /**
   * Verifies a magic code and returns the user along with whether
   * the user was newly created. Supports `extraFields` to set custom
   * `$users` properties at signup.
   *
   * @example
   *   const { user, created } = await db.auth.checkMagicCode(
   *     email,
   *     code,
   *     { extraFields: { nickname: 'ari' } },
   *   );
   *
   * @see https://instantdb.com/docs/backend#custom-magic-codes
   */
  checkMagicCode = /* @__PURE__ */ __name(async (email, code, options) => {
    const res = await jsonFetch2(`${this.config.apiURI}/admin/verify_magic_code?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify({
        email,
        code,
        ...options?.extraFields ? { "extra-fields": options.extraFields } : {}
      })
    });
    return { user: res.user, created: res.created };
  }, "checkMagicCode");
  async createToken(input) {
    const body = typeof input === "string" ? { email: input } : input;
    const ret = await jsonFetch2(`${this.config.apiURI}/admin/refresh_tokens?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify(body)
    });
    return ret.user.refresh_token;
  }
  /**
   * Verifies a given token and returns the associated user.
   *
   * This is often useful for writing custom endpoints, where you need
   * to authenticate users.
   *
   * @example
   *   app.post('/custom_endpoint', async (req, res) => {
   *     const user = await db.auth.verifyToken(req.headers['token'])
   *     if (!user) {
   *       return res.status(401).send('Uh oh, you are not authenticated')
   *     }
   *     // ...
   *   })
   * @see https://instantdb.com/docs/backend#custom-endpoints
   */
  verifyToken = /* @__PURE__ */ __name(async (token) => {
    const res = await jsonFetch2(`${this.config.apiURI}/runtime/auth/verify_refresh_token?app_id=${this.config.appId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        "app-id": this.config.appId,
        "refresh-token": token
      })
    });
    return res.user;
  }, "verifyToken");
  /**
   * Retrieves an app user by id, email, or refresh token.
   * Resolves to `null` when no user matches; throws on malformed
   * input or auth errors.
   *
   * @example
   *   const user = await db.auth.getUser({ email });
   *   if (!user) {
   *     console.log("No user found");
   *     return;
   *   }
   *   console.log("Found user:", user);
   *
   * @see https://instantdb.com/docs/backend#retrieve-a-user
   */
  getUser = /* @__PURE__ */ __name(async (params) => {
    const qs = new URLSearchParams(Object.entries(params)).toString();
    const response = await jsonFetch2(`${this.config.apiURI}/admin/users?app_id=${this.config.appId}&${qs}`, {
      method: "GET",
      headers: authorizedHeaders(this.config)
    });
    return response.user;
  }, "getUser");
  /**
   * Deletes an app user by id, email, or refresh token.
   * Resolves to `null` when no user matches; throws on malformed
   * input or auth errors.
   *
   * NB: This _only_ deletes the user; it does not delete all user data.
   * You will need to handle this manually.
   *
   * @example
   *   const deletedUser = await db.auth.deleteUser({ email });
   *   if (!deletedUser) {
   *     console.log("No user found to delete");
   *     return;
   *   }
   *   console.log("Deleted user:", deletedUser);
   *
   * @see https://instantdb.com/docs/backend#delete-a-user
   */
  deleteUser = /* @__PURE__ */ __name(async (params) => {
    const qs = new URLSearchParams(Object.entries(params)).toString();
    const response = await jsonFetch2(`${this.config.apiURI}/admin/users?app_id=${this.config.appId}&${qs}`, {
      method: "DELETE",
      headers: authorizedHeaders(this.config)
    });
    return response.deleted;
  }, "deleteUser");
  async signOut(input) {
    const params = typeof input === "string" ? { email: input } : input;
    const config = this.config;
    await jsonFetch2(`${config.apiURI}/admin/sign_out?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(config),
      body: JSON.stringify(params)
    });
  }
  /**
   * Get instant user from Request
   *
   * Reads cookies and gets a validated user
   * @param req The request containing a cookie synced with createInstantRouteHandler
   * @param opts Allow disabling validation of refresh token
   */
  getUserFromRequest = /* @__PURE__ */ __name(async (req, opts) => {
    const cookieHeader = req.headers.get("cookie") || "";
    const parsedCookie = (0, import_cookie.parseCookie)(cookieHeader);
    const cookieName = "instant_user_" + this.config.appId;
    if (!parsedCookie[cookieName]) {
      return null;
    }
    const value = parsedCookie[cookieName];
    const user = JSON.parse(value);
    if (!user?.refresh_token) {
      return null;
    }
    if (opts?.disableValidation) {
      return user;
    }
    const verified = await this.verifyToken(user.refresh_token);
    return verified;
  }, "getUserFromRequest");
};
var isNodeReadable = /* @__PURE__ */ __name((v) => v && typeof v === "object" && typeof v.pipe === "function" && typeof v.read === "function", "isNodeReadable");
var isWebReadable = /* @__PURE__ */ __name((v) => v && typeof v.getReader === "function", "isWebReadable");
var Storage = class {
  static {
    __name(this, "Storage");
  }
  config;
  impersonationOpts;
  constructor(config, impersonationOpts) {
    this.config = config;
    this.impersonationOpts = impersonationOpts;
  }
  /**
   * Uploads file at the provided path. Accepts a Buffer or a Readable stream.
   *
   * @see https://instantdb.com/docs/storage
   * @example
   *   const buffer = fs.readFileSync('demo.png');
   *   const isSuccess = await db.storage.uploadFile('photos/demo.png', buffer);
   */
  uploadFile = /* @__PURE__ */ __name(async (path, file, metadata = {}) => {
    const headers = {
      ...authorizedHeaders(this.config, this.impersonationOpts),
      path
    };
    if (metadata.contentDisposition) {
      headers["content-disposition"] = metadata.contentDisposition;
    }
    delete headers["content-type"];
    if (metadata.contentType) {
      headers["content-type"] = metadata.contentType;
    }
    let duplex;
    if (isNodeReadable(file)) {
      duplex = "half";
    }
    if (isNodeReadable(file) || isWebReadable(file)) {
      if (!metadata.fileSize) {
        throw new Error("fileSize is required in metadata when uploading streams");
      }
      headers["content-length"] = metadata.fileSize.toString();
    }
    let options = {
      method: "PUT",
      headers,
      body: file,
      ...duplex && { duplex }
    };
    return jsonFetch2(`${this.config.apiURI}/admin/storage/upload?app_id=${this.config.appId}`, options);
  }, "uploadFile");
  /**
   * Deletes a file by its path name (e.g. "photos/demo.png").
   *
   * @deprecated Use `db.transact` to delete files instead:
   * @example
   *   // Delete by id
   *   await db.transact(db.tx.$files[fileId].delete());
   *
   *   // Delete by path
   *   await db.transact(db.tx.$files[lookup('path', 'photos/demo.png')].delete());
   *
   * @see https://instantdb.com/docs/storage
   */
  delete = /* @__PURE__ */ __name(async (pathname) => {
    return jsonFetch2(`${this.config.apiURI}/admin/storage/files?app_id=${this.config.appId}&filename=${encodeURIComponent(pathname)}`, {
      method: "DELETE",
      headers: authorizedHeaders(this.config, this.impersonationOpts)
    });
  }, "delete");
  /**
   * Deletes multiple files by their path names.
   *
   * @deprecated Use `db.transact` to delete files instead:
   * @example
   *   // Delete multiple files by path
   *   const paths = ['images/1.png', 'images/2.png', 'images/3.png'];
   *   await db.transact(paths.map(p => db.tx.$files[lookup('path', p)].delete()));
   *
   * @see https://instantdb.com/docs/storage
   */
  deleteMany = /* @__PURE__ */ __name(async (pathnames) => {
    return jsonFetch2(`${this.config.apiURI}/admin/storage/files/delete?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config, this.impersonationOpts),
      body: JSON.stringify({ filenames: pathnames })
    });
  }, "deleteMany");
  /**
   * @deprecated. This method will be removed in the future. Use `uploadFile`
   * instead
   */
  upload = /* @__PURE__ */ __name(async (pathname, file, metadata = {}) => {
    const { data: presignedUrl } = await jsonFetch2(`${this.config.apiURI}/admin/storage/signed-upload-url?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config),
      body: JSON.stringify({
        app_id: this.config.appId,
        filename: pathname
      })
    });
    const headers = {};
    const contentType = metadata.contentType;
    if (contentType) {
      headers["Content-Type"] = contentType;
    }
    const { ok } = await fetch(presignedUrl, {
      method: "PUT",
      body: file,
      headers
    });
    return ok;
  }, "upload");
  /**
   * @deprecated. This method will be removed in the future. Use `query` instead
   * @example
   * const files = await db.query({ $files: {}})
   */
  list = /* @__PURE__ */ __name(async () => {
    const { data } = await jsonFetch2(`${this.config.apiURI}/admin/storage/files?app_id=${this.config.appId}`, {
      method: "GET",
      headers: authorizedHeaders(this.config)
    });
    return data;
  }, "list");
  /**
   * @deprecated. getDownloadUrl will be removed in the future.
   * Use `query` instead to query and fetch for valid urls
   *
   * db.useQuery({
   *   $files: {
   *     $: {
   *       where: {
   *         path: "moop.png"
   *       }
   *     }
   *   }
   * })
   */
  getDownloadUrl = /* @__PURE__ */ __name(async (pathname) => {
    const { data } = await jsonFetch2(`${this.config.apiURI}/admin/storage/signed-download-url?app_id=${this.config.appId}&filename=${encodeURIComponent(pathname)}`, {
      method: "GET",
      headers: authorizedHeaders(this.config)
    });
    return data;
  }, "getDownloadUrl");
};
var Streams = class {
  static {
    __name(this, "Streams");
  }
  #ensureInstantStream;
  constructor(ensureInstantStream) {
    this.#ensureInstantStream = ensureInstantStream;
  }
  /**
   * Creates a new ReadableStream for the given clientId.
   *
   * @example
   *   const stream = db.streams.createReadStream({clientId: clientId})
   *   for await (const chunk of stream) {
   *     console.log(chunk);
   *   }
   */
  createReadStream = /* @__PURE__ */ __name((opts) => {
    return this.#ensureInstantStream().createReadStream(opts);
  }, "createReadStream");
  /**
   * Creates a new WritableStream for the given clientId.
   *
   * @example
   *   const writeStream = db.streams.createWriteStream({clientId: clientId})
   *   const writer = writeStream.getWriter();
   *   writer.write('Hello world');
   *   writer.close();
   */
  createWriteStream = /* @__PURE__ */ __name((opts) => {
    return this.#ensureInstantStream().createWriteStream(opts);
  }, "createWriteStream");
};
function createLogger2(isEnabled) {
  return {
    info: isEnabled ? (...args) => console.info(...args) : () => {
    },
    debug: isEnabled ? (...args) => console.debug(...args) : () => {
    },
    error: isEnabled ? (...args) => console.error(...args) : () => {
    }
  };
}
__name(createLogger2, "createLogger");
var InstantAdminDatabase = class _InstantAdminDatabase {
  static {
    __name(this, "InstantAdminDatabase");
  }
  config;
  auth;
  storage;
  streams;
  rooms;
  impersonationOpts;
  webhooks;
  #sseConnection = null;
  #sseBackoff = 0;
  #instantStream = null;
  #log;
  tx = txInit();
  constructor(_config) {
    this.config = instantConfigWithDefaults(_config);
    this.auth = new Auth(this.config);
    this.storage = new Storage(this.config, this.impersonationOpts);
    this.streams = new Streams(this.#ensureInstantStream.bind(this));
    this.rooms = new Rooms(this.config);
    this.webhooks = new Webhooks(this.config, jsonFetch2);
    this.#log = createLogger2(!!this.config.verbose);
  }
  /**
   * Sometimes you want to scope queries to a specific user.
   *
   * You can provide a user's auth token, email, or impersonate a guest.
   *
   * @see https://instantdb.com/docs/backend#impersonating-users
   * @example
   *  await db.asUser({email: "stopa@instantdb.com"}).query({ goals: {} })
   */
  asUser = /* @__PURE__ */ __name((opts) => {
    const newClient = new _InstantAdminDatabase({
      ...this.config
    });
    newClient.impersonationOpts = opts;
    newClient.storage = new Storage(this.config, opts);
    return newClient;
  }, "asUser");
  /**
   * Use this to query your data!
   *
   * @see https://instantdb.com/docs/instaql
   *
   * @example
   *  // fetch all goals
   *  await db.query({ goals: {} })
   *
   *  // goals where the title is "Get Fit"
   *  await db.query({ goals: { $: { where: { title: "Get Fit" } } } })
   *
   *  // all goals, _alongside_ their todos
   *  await db.query({ goals: { todos: {} } })
   */
  query = /* @__PURE__ */ __name((query3, opts = {}) => {
    if (query3 && opts && "ruleParams" in opts) {
      query3 = { $$ruleParams: opts["ruleParams"], ...query3 };
    }
    if (!this.config.disableValidation) {
      validateQuery(query3, this.config.schema);
    }
    const fetchOpts = opts.fetchOpts || {};
    const fetchOptsHeaders = fetchOpts["headers"] || {};
    return jsonFetch2(`${this.config.apiURI}/admin/query?app_id=${this.config.appId}`, {
      ...fetchOpts,
      method: "POST",
      headers: {
        ...fetchOptsHeaders,
        ...authorizedHeaders(this.config, this.impersonationOpts)
      },
      body: JSON.stringify({
        query: query3,
        "inference?": !!this.config.schema
      })
    });
  }, "query");
  /**
   * Use this to to get a live view of your data!
   *
   * @see https://www.instantdb.com/docs/backend
   *
   * @example
   *  // create a subscription to a query
   *  const query = { goals: { $: { where: { title: "Get Fit" } } } }
   *  const sub = db.subscribeQuery(query);
   *
   *  // iterate through the results with an async iterator
   *  for await (const payload of sub) {
   *    if (payload.error) {
   *      console.log(payload.error);
   *      // Stop the subscription
   *      sub.close();
   *    } else {
   *      console.log(payload.data);
   *    }
   *  }
   *
   *  // Stop the subscription
   *  sub.close();
   *
   *  // Create a subscription with a callback
   *  const sub = db.subscribeQuery(query, (payload) => {
   *    if (payload.error) {
   *      console.log(payload.error);
   *      // Stop the subscription
   *      sub.close();
   *    } else {
   *      console.log(payload.data);
   *    }
   *  });
   */
  subscribeQuery(query3, cb, opts = {}) {
    if (query3 && opts && "ruleParams" in opts) {
      query3 = { $$ruleParams: opts["ruleParams"], ...query3 };
    }
    if (!this.config.disableValidation) {
      validateQuery(query3, this.config.schema);
    }
    const fetchOpts = opts.fetchOpts || {};
    const fetchOptsHeaders = fetchOpts["headers"] || {};
    const headers = {
      ...fetchOptsHeaders,
      ...authorizedHeaders(this.config, this.impersonationOpts)
    };
    const inference = !!this.config.schema;
    return subscribe(query3, cb, {
      headers,
      inference,
      apiURI: this.config.apiURI
    });
  }
  /**
   * Use this to write data! You can create, update, delete, and link objects
   *
   * @see https://instantdb.com/docs/instaml
   *
   * @example
   *   // Create a new object in the `goals` namespace
   *   const goalId = id();
   *   db.transact(db.tx.goals[goalId].update({title: "Get fit"}))
   *
   *   // Update the title
   *   db.transact(db.tx.goals[goalId].update({title: "Get super fit"}))
   *
   *   // Delete it
   *   db.transact(db.tx.goals[goalId].delete())
   *
   *   // Or create an association:
   *   todoId = id();
   *   db.transact([
   *    db.tx.todos[todoId].update({ title: 'Go on a run' }),
   *    db.tx.goals[goalId].link({todos: todoId}),
   *  ])
   */
  transact = /* @__PURE__ */ __name((inputChunks) => {
    if (!this.config.disableValidation) {
      validateTransactions(inputChunks, this.config.schema);
    }
    return jsonFetch2(`${this.config.apiURI}/admin/transact?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config, this.impersonationOpts),
      body: JSON.stringify({
        steps: steps(inputChunks),
        "throw-on-missing-attrs?": !!this.config.schema
      })
    });
  }, "transact");
  /**
   * Like `query`, but returns debugging information
   * for permissions checks along with the result.
   * Useful for inspecting the values returned by the permissions checks.
   * Note, this will return debug information for *all* entities
   * that match the query's `where` clauses.
   *
   * Requires a user/guest context to be set with `asUser`,
   * since permissions checks are user-specific.
   *
   * Accepts an optional configuration object with a `rules` key.
   * The provided rules will override the rules in the database for the query.
   *
   * @see https://instantdb.com/docs/instaql
   *
   * @example
   *  await db.asUser({ guest: true }).debugQuery(
   *    { goals: {} },
   *    { rules: { goals: { allow: { read: "auth.id != null" } } }
   *  )
   */
  debugQuery = /* @__PURE__ */ __name(async (query3, opts) => {
    if (query3 && opts && "ruleParams" in opts) {
      query3 = { $$ruleParams: opts["ruleParams"], ...query3 };
    }
    const body = {
      query: query3,
      "rules-override": opts?.rules,
      "inference?": opts?.cardinalityInference ?? !!this.config.schema
    };
    if (opts?.ip) {
      body["ip-override"] = opts.ip;
    }
    if (opts?.origin) {
      body["origin-override"] = opts.origin;
    }
    const response = await jsonFetch2(`${this.config.apiURI}/admin/query_perms_check?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config, this.impersonationOpts),
      body: JSON.stringify(body)
    });
    return {
      result: response.result,
      checkResults: response["check-results"]
    };
  }, "debugQuery");
  /**
   * Like `transact`, but does not write to the database.
   * Returns debugging information for permissions checks.
   * Useful for inspecting the values returned by the permissions checks.
   *
   * Requires a user/guest context to be set with `asUser`,
   * since permissions checks are user-specific.
   *
   * Accepts an optional configuration object with a `rules` key.
   * The provided rules will override the rules in the database for the duration of the transaction.
   *
   * @example
   *   const goalId = id();
   *   db.asUser({ guest: true }).debugTransact(
   *      [db.tx.goals[goalId].update({title: "Get fit"})],
   *      { rules: { goals: { allow: { update: "auth.id != null" } } }
   *   )
   */
  debugTransact = /* @__PURE__ */ __name((inputChunks, opts) => {
    const body = {
      steps: steps(inputChunks),
      "rules-override": opts?.rules,
      // @ts-expect-error because we're using a private API (for now)
      "dangerously-commit-tx": opts?.__dangerouslyCommit
    };
    if (opts?.ip) {
      body["ip-override"] = opts.ip;
    }
    if (opts?.origin) {
      body["origin-override"] = opts.origin;
    }
    return jsonFetch2(`${this.config.apiURI}/admin/transact_perms_check?app_id=${this.config.appId}`, {
      method: "POST",
      headers: authorizedHeaders(this.config, this.impersonationOpts),
      body: JSON.stringify(body)
    });
  }, "debugTransact");
  #setupSSEConnection() {
    if (this.#sseConnection) {
      this.#sseConnection.close();
    }
    const headers = {
      ...authorizedHeaders(this.config, this.impersonationOpts)
    };
    const inference = !!this.config.schema;
    const ES = makeEventSourceWrapper({ headers, inference });
    const conn = new SSEConnection(ES, `${this.config.apiURI}/admin/sse?app_id=${this.config.appId}`, `${this.config.apiURI}/admin/sse/push?app_id=${this.config.appId}`);
    conn.onopen = this.#onopen;
    conn.onmessage = this.#onmessage;
    conn.onclose = this.#onclose;
    conn.onerror = this.#onerror;
    this.#sseConnection = conn;
    return conn;
  }
  #ensureSSEConnection() {
    return this.#sseConnection || this.#setupSSEConnection();
  }
  #trySend(eventId, msg) {
    const sseConnection = this.#ensureSSEConnection();
    this.#log.info("[send]", eventId, msg, {
      isOpen: sseConnection.isOpen()
    });
    if (sseConnection.isOpen()) {
      sseConnection.send({ "client-event-id": eventId, ...msg });
    }
  }
  #setupInstantStream() {
    this.#ensureSSEConnection();
    const instantStream = new InstantStream({
      WStream: this.config.WritableStream || WritableStream,
      RStream: this.config.ReadableStream || ReadableStream,
      trySend: /* @__PURE__ */ __name((eventId, msg) => {
        this.#trySend(eventId, msg);
      }, "trySend"),
      log: this.#log
    });
    this.#instantStream = instantStream;
    return instantStream;
  }
  #ensureInstantStream() {
    return this.#instantStream || this.#setupInstantStream();
  }
  #onopen = /* @__PURE__ */ __name((e) => {
    if (e.target !== this.#sseConnection) {
      this.#log.info("[socket][open]", e.target.id, "skip; this is no longer the current transport");
      return;
    }
    this.#log.info("[socket][open]", e.target.id);
    this.#sseBackoff = 0;
    this.#instantStream?.onConnectionStatusChange("authenticated");
  }, "#onopen");
  #onclose = /* @__PURE__ */ __name((e) => {
    if (e.target !== this.#sseConnection) {
      this.#log.info("[socket][close]", e.target.id, "skip; this is no longer the current transport");
      return;
    }
    this.#log.info("[socket][close]", e.target.id);
    this.#instantStream?.onConnectionStatusChange("closed");
    if (this.#sseConnection) {
      this.#sseConnection = null;
      if (!this.#connectionIsIdle()) {
        setTimeout(() => this.#ensureSSEConnection(), this.#sseBackoff);
        this.#sseBackoff = Math.min(15e3, Math.max(this.#sseBackoff, 500) * 2);
      }
    }
  }, "#onclose");
  #onerror = /* @__PURE__ */ __name((e) => {
    if (e.target !== this.#sseConnection) {
      this.#log.info("[socket][error]", e.target.id, "skip; this is no longer the current transport");
      return;
    }
    this.#log.info("[socket][error]", e.target.id);
    this.#instantStream?.onConnectionStatusChange("closed");
  }, "#onerror");
  #connectionIsIdle() {
    return !this.#instantStream || !this.#instantStream.hasActiveStreams();
  }
  #maybeShutdownConnection() {
    if (this.#sseConnection && this.#connectionIsIdle()) {
      const conn = this.#sseConnection;
      this.#log.info("cleaning up unused socket", conn.id);
      this.#sseConnection = null;
      conn.close();
    }
  }
  #onmessage = /* @__PURE__ */ __name((e) => {
    if (e.target !== this.#sseConnection) {
      this.#log.info("[socket][message]", e.target.id, "skip; this is no longer the current transport");
      return;
    }
    const msg = e.message;
    this.#log.info("[receive]", msg);
    switch (msg.op) {
      case "start-stream-ok": {
        this.#instantStream?.onStartStreamOk(msg);
        break;
      }
      case "stream-flushed": {
        this.#instantStream?.onStreamFlushed(msg);
        break;
      }
      case "append-failed": {
        this.#instantStream?.onAppendFailed(msg);
        break;
      }
      case "stream-append": {
        this.#instantStream?.onStreamAppend(msg);
        break;
      }
      case "error": {
        switch (msg["original-event"]?.op) {
          case "start-stream":
          case "append-stream":
          case "subscribe-stream":
          case "unsubscribe-stream": {
            this.#instantStream?.onRecieveError(msg);
            break;
          }
        }
        break;
      }
    }
    this.#maybeShutdownConnection();
  }, "#onmessage");
};

// ../../packages/db/src/schema.ts
init_esm();

// ../../node_modules/.pnpm/@instantdb+react@1.0.43_react@19.2.0/node_modules/@instantdb/react/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/index.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/InstantReactAbstractDatabase.js
init_esm();
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var import_react5 = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/useQuery.js
init_esm();
var import_react = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/useInfiniteQuerySubscription.js
init_esm();
var import_react2 = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/InstantReactRoom.js
init_esm();
var import_react4 = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/@instantdb+react-common@1.0.43_react@19.2.0/node_modules/@instantdb/react-common/dist/esm/useTimeout.js
init_esm();
var import_react3 = __toESM(require_react(), 1);

// ../../node_modules/.pnpm/@instantdb+react@1.0.43_react@19.2.0/node_modules/@instantdb/react/dist/esm/InstantReactWebDatabase.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+react@1.0.43_react@19.2.0/node_modules/@instantdb/react/dist/esm/init.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+react@1.0.43_react@19.2.0/node_modules/@instantdb/react/dist/esm/version.js
init_esm();

// ../../node_modules/.pnpm/@instantdb+react@1.0.43_react@19.2.0/node_modules/@instantdb/react/dist/esm/Cursors.js
init_esm();
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var import_react6 = __toESM(require_react(), 1);

// ../../packages/db/src/schema.ts
var _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string()
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional()
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional()
    }),
    factories: i.entity({
      name: i.string().indexed(),
      createdAt: i.date().optional(),
      githubAccessTokenEncrypted: i.string().optional(),
      gitAuthorName: i.string().optional()
    }),
    repositories: i.entity({
      url: i.string().indexed(),
      path: i.string().optional(),
      branch: i.string().optional(),
      createdAt: i.date().optional()
    }),
    agents: i.entity({
      name: i.string().indexed(),
      auth: i.json().optional(),
      createdAt: i.date().optional(),
      settings: i.json().optional(),
      status: i.string().optional(),
      sandboxId: i.string().optional()
    }),
    organisations: i.entity({
      name: i.string().indexed(),
      handle: i.string().unique().indexed(),
      createdAt: i.date().optional()
    }),
    members: i.entity({
      createdAt: i.date().optional(),
      inviteSentAt: i.date().optional(),
      inviteToken: i.string().unique().optional(),
      joinedAt: i.date().optional(),
      role: i.string().optional()
    }),
    tasks: i.entity({
      name: i.string().indexed(),
      status: i.string().optional(),
      instructions: i.string().optional(),
      createdAt: i.date().optional(),
      completedAt: i.date().optional(),
      sandboxId: i.string().optional(),
      agentThreadId: i.string().optional(),
      agentPid: i.number().optional(),
      agentModel: i.string().optional(),
      agentReasoningEffort: i.string().optional(),
      agentSpeed: i.string().optional(),
      agentToken: i.string().optional(),
      diffWorkspacePath: i.string().optional(),
      latestDiffPath: i.string().optional(),
      latestDiffGeneratedAt: i.date().optional(),
      latestDiffBytes: i.number().optional()
    }),
    secrets: i.entity({
      name: i.string().indexed(),
      valueEncrypted: i.string().optional(),
      createdAt: i.date().optional()
    }),
    services: i.entity({
      name: i.string().indexed(),
      portNumber: i.number().indexed(),
      url: i.string().optional(),
      command: i.string().optional(),
      cwd: i.string().optional(),
      healthPath: i.string().optional(),
      pid: i.number().optional(),
      status: i.string().optional()
    }),
    events: i.entity({
      type: i.string().optional(),
      data: i.json().optional(),
      createdAt: i.date().optional()
    })
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files"
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade"
      }
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade"
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers"
      }
    },
    factoryTasks: {
      forward: {
        on: "factories",
        has: "many",
        label: "tasks"
      },
      reverse: {
        on: "tasks",
        has: "one",
        label: "factory"
      }
    },
    taskEvents: {
      forward: {
        on: "tasks",
        has: "many",
        label: "events"
      },
      reverse: {
        on: "events",
        has: "one",
        label: "task"
      }
    },
    taskAgent: {
      forward: {
        on: "tasks",
        has: "one",
        label: "agent"
      },
      reverse: {
        on: "agents",
        has: "many",
        label: "tasks"
      }
    },
    taskServices: {
      forward: {
        on: "tasks",
        has: "many",
        label: "services"
      },
      reverse: {
        on: "services",
        has: "one",
        label: "task"
      }
    },
    taskLatestDiffFile: {
      forward: {
        on: "tasks",
        has: "one",
        label: "latestDiffFile"
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "diffTask"
      }
    },
    factorySecrets: {
      forward: {
        on: "factories",
        has: "many",
        label: "secrets"
      },
      reverse: {
        on: "secrets",
        has: "one",
        label: "factory"
      }
    },
    factoryRepositories: {
      forward: {
        on: "factories",
        has: "many",
        label: "repositories"
      },
      reverse: {
        on: "repositories",
        has: "one",
        label: "factory",
        onDelete: "cascade"
      }
    },
    organisationFactories: {
      forward: {
        on: "organisations",
        has: "many",
        label: "factories"
      },
      reverse: {
        on: "factories",
        has: "one",
        label: "organisation"
      }
    },
    organisationMembers: {
      forward: {
        on: "organisations",
        has: "many",
        label: "members"
      },
      reverse: {
        on: "members",
        has: "one",
        label: "organisation"
      }
    },
    memberUsers: {
      forward: {
        on: "members",
        has: "one",
        label: "user"
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "members"
      }
    }
  },
  rooms: {}
});
var schema2 = _schema;
var schema_default = schema2;

// ../../packages/db/src/admin.ts
var db = init({
  appId: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
  adminToken: process.env.INSTANT_APP_ADMIN_TOKEN,
  schema: schema_default
});
var admin_default = db;

// trigger/sync-agent-auth.ts
var CODEX_AUTH_PATH = "~/.codex/auth.json";
var agentTx = /* @__PURE__ */ __name((agentId) => {
  const tx2 = admin_default.tx.agents[agentId];
  if (!tx2) {
    throw new Error(`Agent transaction builder ${agentId} not found`);
  }
  return tx2;
}, "agentTx");
var syncAgentAuthFromSandbox = /* @__PURE__ */ __name(async (sandbox, agentId) => {
  try {
    const raw = await sandbox.files.read(CODEX_AUTH_PATH);
    const auth = JSON.parse(raw);
    await admin_default.transact(
      agentTx(agentId).update({
        auth
      })
    );
  } catch (error) {
    console.log("Failed to sync agent auth from sandbox", {
      agentId,
      error
    });
  }
}, "syncAgentAuthFromSandbox");

export {
  admin_default,
  syncAgentAuthFromSandbox
};
/*! Bundled license information:

react/cjs/react-jsx-runtime.production.js:
  (**
   * @license React
   * react-jsx-runtime.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.production.js:
  (**
   * @license React
   * react.production.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Meta Platforms, Inc. and affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
//# sourceMappingURL=chunk-5G3RJ6SF.mjs.map
