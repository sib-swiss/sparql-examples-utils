var Traqula = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to2, from2, except, desc) => {
    if (from2 && typeof from2 === "object" || typeof from2 === "function") {
      for (let key of __getOwnPropNames(from2))
        if (!__hasOwnProp.call(to2, key) && key !== except)
          __defProp(to2, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
    }
    return to2;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/index.js
  var lib_exports = {};
  __export(lib_exports, {
    Parser: () => Parser2,
    expressionParserBuilder: () => expressionParserBuilder,
    objectListParserBuilder: () => objectListParserBuilder,
    queryUnitParserBuilder: () => queryUnitParserBuilder,
    sparql11ParserBuilder: () => sparql11ParserBuilder,
    subSelectParserBuilder: () => subSelectParserBuilder,
    triplesBlockParserBuilder: () => triplesBlockParserBuilder,
    triplesTemplateParserBuilder: () => triplesTemplateParserBuilder,
    updateNoModifyParserBuilder: () => updateNoModifyParserBuilder,
    updateParserBuilder: () => updateParserBuilder
  });

  // node_modules/@traqula/core/dist/esm/lib/AstCoreFactory.js
  var AstCoreFactory = class {
    /**
     * Whether this AstFactory will track source location. Default: true.
     * In case source location is not tracked,
     * each generated node using this factory will be {@link SourceLocationNodeAutoGenerate}
     */
    tracksSourceLocation;
    constructor(args = {}) {
      this.tracksSourceLocation = args.tracksSourceLocation ?? true;
    }
    /**
     * Wrap any type into an object that tracks the source location of tha value.
     * @param val the value to wrap
     * @param loc the source location for that value
     */
    wrap(val, loc) {
      return { val, loc };
    }
    /**
     * Whether the provided value is an object that tracks source location.
     * @param obj
     */
    isLocalized(obj) {
      return typeof obj === "object" && obj !== null && "loc" in obj && typeof obj.loc === "object" && obj.loc !== null && "sourceLocationType" in obj.loc;
    }
    /**
     * Compute the source location of an element based on the elements it contains.
     * The provided arguments should be in order of occurrence in the string.
     */
    sourceLocation(...elements) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      const pureElements = elements.filter((x) => x !== void 0);
      if (pureElements.length === 0) {
        return this.sourceLocationNoMaterialize();
      }
      const filtered = pureElements.filter((element) => !this.isLocalized(element) || this.isSourceLocationSource(element.loc) || this.isSourceLocationStringReplace(element.loc) || this.isSourceLocationNodeReplace(element.loc));
      if (filtered.length === 0) {
        return this.gen();
      }
      const first2 = filtered.at(0);
      const last2 = filtered.at(-1);
      return {
        sourceLocationType: "source",
        start: this.isLocalized(first2) ? first2.loc.start : first2.startOffset,
        end: this.isLocalized(last2) ? last2.loc.end : last2.endOffset + 1
      };
    }
    /**
     * Generate a source location indicating the no materialization.
     */
    sourceLocationNoMaterialize() {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      return { sourceLocationType: "noMaterialize" };
    }
    /**
     * Returns a copy of the argument that is not materialized
     */
    dematerialized(arg) {
      return { ...arg, loc: this.sourceLocationNoMaterialize() };
    }
    /**
     * Given a value and some mapper from objects to objects,
     * map all containing items in case it is an array,
     * otherwise map the provided value in case it is an object, finally, do nothing.
     * @param value the value to map
     * @param mapper the function mapping an object to another object.
     */
    safeObjectTransform(value, mapper) {
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          return value.map((x) => this.safeObjectTransform(x, mapper));
        }
        return mapper(value);
      }
      return value;
    }
    /**
     * Given a (AST) tree, return a copy of that tree where it and it's
     * descendents all have a {@link SourceLocationNodeAutoGenerate} localization.
     */
    forcedAutoGenTree(obj) {
      const copy3 = { ...obj };
      for (const [key, value] of Object.entries(copy3)) {
        copy3[key] = this.safeObjectTransform(value, (obj2) => this.forcedAutoGenTree(obj2));
      }
      if (this.isLocalized(copy3)) {
        copy3.loc = this.gen();
      }
      return copy3;
    }
    /**
     * In case the provided Node is not yet materialized, force it to be autoGenerated.
     */
    forceMaterialized(arg) {
      if (this.isSourceLocationNoMaterialize(arg.loc)) {
        return this.forcedAutoGenTree(arg);
      }
      return { ...arg };
    }
    /**
     * Check whether an object is in fact a {@link SourceLocation}.
     * @param loc
     */
    isSourceLocation(loc) {
      return "sourceLocationType" in loc;
    }
    /**
     * Create a {@link SourceLocation} that indicates what range of characters this node represents in the source string.
     */
    sourceLocationSource(start, end) {
      return {
        sourceLocationType: "source",
        start,
        end
      };
    }
    /**
     * Create a {@link SourceLocation} that indicates a given range of the current range should be replaced by
     * a new source.
     */
    sourceLocationInlinedSource(newSource, subLoc, start, end, startOnNew = 0, endOnNew = newSource.length) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      if (this.isSourceLocationSource(subLoc)) {
        startOnNew = subLoc.start;
        endOnNew = subLoc.end;
      }
      return {
        sourceLocationType: "inlinedSource",
        newSource,
        start,
        end,
        loc: subLoc,
        startOnNew,
        endOnNew
      };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationInlinedSource}.
     */
    isSourceLocationInlinedSource(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "inlinedSource";
    }
    /**
     * Create a {@link SourceLocation} indicating the node should be autoGenerated by a generator.
     */
    gen() {
      return { sourceLocationType: "autoGenerate" };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationSource}.
     */
    isSourceLocationSource(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "source";
    }
    /**
     * Create a {@link SourceLocation} that indicates this node,
     * representing a range of characters in the original string, should be replaced by some string during generation.
     */
    sourceLocationStringReplace(newSource, start, end) {
      if (!this.tracksSourceLocation) {
        return this.gen();
      }
      return { sourceLocationType: "stringReplace", newSource, start, end };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationStringReplace}.
     * @param loc
     */
    isSourceLocationStringReplace(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "stringReplace";
    }
    /**
     * Given a sourceLocation, generate a new {@link SourceLocation}
     * that indicates the range of the given location should now be autoGenerated
     */
    sourceLocationNodeReplaceUnsafe(loc) {
      if (this.isSourceLocationSource(loc)) {
        return this.sourceLocationNodeReplace(loc);
      }
      if (this.isSourceLocationInlinedSource(loc)) {
        return this.sourceLocationNodeReplaceUnsafe(loc.loc);
      }
      throw new Error(`Cannot convert SourceLocation of type ${loc.sourceLocationType} to SourceLocationNodeReplace`);
    }
    sourceLocationNodeReplace(startOrLoc, end) {
      let starting;
      let ending;
      if (typeof startOrLoc === "number") {
        starting = startOrLoc;
        ending = end;
      } else {
        starting = startOrLoc.start;
        ending = startOrLoc.end;
      }
      return {
        sourceLocationType: "nodeReplace",
        start: starting,
        end: ending
      };
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNodeReplace}.
     */
    isSourceLocationNodeReplace(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "nodeReplace";
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNodeAutoGenerate}.
     */
    isSourceLocationNodeAutoGenerate(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "autoGenerate";
    }
    /**
     * Check whether the provided {@link SourceLocation} expects the generator to autoGenerate.
     */
    isPrintingLoc(loc) {
      return this.isSourceLocationNodeReplace(loc) || this.isSourceLocationNodeAutoGenerate(loc) || this.isSourceLocationInlinedSource(loc) && this.isPrintingLoc(loc.loc);
    }
    /**
     * A simple filter that will only execute the provided callback when the provided {@link SourceLocation}
     * expects the generator steps to autoGenerate.
     */
    printFilter(node, callback) {
      if (this.isPrintingLoc(node.loc)) {
        callback();
      }
    }
    /**
     * Guard to check if an object is a {@link SourceLocation} of type {@link SourceLocationNoMaterialize}.
     */
    isSourceLocationNoMaterialize(loc) {
      return this.isSourceLocation(loc) && loc.sourceLocationType === "noMaterialize";
    }
    /**
     * Guard to check if an object is the specified Type: {@link Typed}.
     */
    isOfType(obj, type) {
      const casted = obj;
      return casted.type === type;
    }
    /**
     * Guard to check if an object is the specified Type: {@link SubTyped}.
     */
    isOfSubType(obj, type, subType) {
      const temp = obj;
      return temp.type === type && temp.subType === subType;
    }
  };

  // node_modules/@traqula/chevrotain/dist/esm/lib/index.js
  var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
  var freeGlobal_default = freeGlobal;
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal_default || freeSelf || Function("return this")();
  var root_default = root;
  var Symbol2 = root_default.Symbol;
  var Symbol_default = Symbol2;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  var getRawTag_default = getRawTag;
  var objectProto2 = Object.prototype;
  var nativeObjectToString2 = objectProto2.toString;
  function objectToString(value) {
    return nativeObjectToString2.call(value);
  }
  var objectToString_default = objectToString;
  var nullTag = "[object Null]";
  var undefinedTag = "[object Undefined]";
  var symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag2 && symToStringTag2 in Object(value) ? getRawTag_default(value) : objectToString_default(value);
  }
  var baseGetTag_default = baseGetTag;
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  var isObjectLike_default = isObjectLike;
  var symbolTag = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike_default(value) && baseGetTag_default(value) == symbolTag;
  }
  var isSymbol_default = isSymbol;
  function arrayMap(array, iteratee) {
    var index = -1, length = array == null ? 0 : array.length, result = Array(length);
    while (++index < length) {
      result[index] = iteratee(array[index], index, array);
    }
    return result;
  }
  var arrayMap_default = arrayMap;
  var isArray = Array.isArray;
  var isArray_default = isArray;
  var INFINITY = 1 / 0;
  var symbolProto = Symbol_default ? Symbol_default.prototype : void 0;
  var symbolToString = symbolProto ? symbolProto.toString : void 0;
  function baseToString(value) {
    if (typeof value == "string") {
      return value;
    }
    if (isArray_default(value)) {
      return arrayMap_default(value, baseToString) + "";
    }
    if (isSymbol_default(value)) {
      return symbolToString ? symbolToString.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -INFINITY ? "-0" : result;
  }
  var baseToString_default = baseToString;
  var reWhitespace = /\s/;
  function trimmedEndIndex(string2) {
    var index = string2.length;
    while (index-- && reWhitespace.test(string2.charAt(index))) {
    }
    return index;
  }
  var trimmedEndIndex_default = trimmedEndIndex;
  var reTrimStart = /^\s+/;
  function baseTrim(string2) {
    return string2 ? string2.slice(0, trimmedEndIndex_default(string2) + 1).replace(reTrimStart, "") : string2;
  }
  var baseTrim_default = baseTrim;
  function isObject(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  var isObject_default = isObject;
  var NAN = 0 / 0;
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
  var reIsBinary = /^0b[01]+$/i;
  var reIsOctal = /^0o[0-7]+$/i;
  var freeParseInt = parseInt;
  function toNumber(value) {
    if (typeof value == "number") {
      return value;
    }
    if (isSymbol_default(value)) {
      return NAN;
    }
    if (isObject_default(value)) {
      var other = typeof value.valueOf == "function" ? value.valueOf() : value;
      value = isObject_default(other) ? other + "" : other;
    }
    if (typeof value != "string") {
      return value === 0 ? value : +value;
    }
    value = baseTrim_default(value);
    var isBinary = reIsBinary.test(value);
    return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
  }
  var toNumber_default = toNumber;
  var INFINITY2 = 1 / 0;
  var MAX_INTEGER = 17976931348623157e292;
  function toFinite(value) {
    if (!value) {
      return value === 0 ? value : 0;
    }
    value = toNumber_default(value);
    if (value === INFINITY2 || value === -INFINITY2) {
      var sign = value < 0 ? -1 : 1;
      return sign * MAX_INTEGER;
    }
    return value === value ? value : 0;
  }
  var toFinite_default = toFinite;
  function toInteger(value) {
    var result = toFinite_default(value), remainder = result % 1;
    return result === result ? remainder ? result - remainder : result : 0;
  }
  var toInteger_default = toInteger;
  function identity(value) {
    return value;
  }
  var identity_default = identity;
  var asyncTag = "[object AsyncFunction]";
  var funcTag = "[object Function]";
  var genTag = "[object GeneratorFunction]";
  var proxyTag = "[object Proxy]";
  function isFunction(value) {
    if (!isObject_default(value)) {
      return false;
    }
    var tag = baseGetTag_default(value);
    return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
  }
  var isFunction_default = isFunction;
  var coreJsData = root_default["__core-js_shared__"];
  var coreJsData_default = coreJsData;
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
    return uid ? "Symbol(src)_1." + uid : "";
  })();
  function isMasked(func) {
    return !!maskSrcKey && maskSrcKey in func;
  }
  var isMasked_default = isMasked;
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {
      }
      try {
        return func + "";
      } catch (e) {
      }
    }
    return "";
  }
  var toSource_default = toSource;
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
  var reIsHostCtor = /^\[object .+?Constructor\]$/;
  var funcProto2 = Function.prototype;
  var objectProto3 = Object.prototype;
  var funcToString2 = funcProto2.toString;
  var hasOwnProperty2 = objectProto3.hasOwnProperty;
  var reIsNative = RegExp(
    "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
  );
  function baseIsNative(value) {
    if (!isObject_default(value) || isMasked_default(value)) {
      return false;
    }
    var pattern = isFunction_default(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource_default(value));
  }
  var baseIsNative_default = baseIsNative;
  function getValue(object2, key) {
    return object2 == null ? void 0 : object2[key];
  }
  var getValue_default = getValue;
  function getNative(object2, key) {
    var value = getValue_default(object2, key);
    return baseIsNative_default(value) ? value : void 0;
  }
  var getNative_default = getNative;
  var WeakMap2 = getNative_default(root_default, "WeakMap");
  var WeakMap_default = WeakMap2;
  var objectCreate = Object.create;
  var baseCreate = /* @__PURE__ */ (function() {
    function object2() {
    }
    return function(proto) {
      if (!isObject_default(proto)) {
        return {};
      }
      if (objectCreate) {
        return objectCreate(proto);
      }
      object2.prototype = proto;
      var result = new object2();
      object2.prototype = void 0;
      return result;
    };
  })();
  var baseCreate_default = baseCreate;
  function apply(func, thisArg, args) {
    switch (args.length) {
      case 0:
        return func.call(thisArg);
      case 1:
        return func.call(thisArg, args[0]);
      case 2:
        return func.call(thisArg, args[0], args[1]);
      case 3:
        return func.call(thisArg, args[0], args[1], args[2]);
    }
    return func.apply(thisArg, args);
  }
  var apply_default = apply;
  function noop() {
  }
  var noop_default = noop;
  function copyArray(source, array) {
    var index = -1, length = source.length;
    array || (array = Array(length));
    while (++index < length) {
      array[index] = source[index];
    }
    return array;
  }
  var copyArray_default = copyArray;
  var HOT_COUNT = 800;
  var HOT_SPAN = 16;
  var nativeNow = Date.now;
  function shortOut(func) {
    var count2 = 0, lastCalled = 0;
    return function() {
      var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
      lastCalled = stamp;
      if (remaining > 0) {
        if (++count2 >= HOT_COUNT) {
          return arguments[0];
        }
      } else {
        count2 = 0;
      }
      return func.apply(void 0, arguments);
    };
  }
  var shortOut_default = shortOut;
  function constant(value) {
    return function() {
      return value;
    };
  }
  var constant_default = constant;
  var defineProperty = (function() {
    try {
      var func = getNative_default(Object, "defineProperty");
      func({}, "", {});
      return func;
    } catch (e) {
    }
  })();
  var defineProperty_default = defineProperty;
  var baseSetToString = !defineProperty_default ? identity_default : function(func, string2) {
    return defineProperty_default(func, "toString", {
      "configurable": true,
      "enumerable": false,
      "value": constant_default(string2),
      "writable": true
    });
  };
  var baseSetToString_default = baseSetToString;
  var setToString = shortOut_default(baseSetToString_default);
  var setToString_default = setToString;
  function arrayEach(array, iteratee) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (iteratee(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }
  var arrayEach_default = arrayEach;
  function baseFindIndex(array, predicate, fromIndex, fromRight) {
    var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
    while (fromRight ? index-- : ++index < length) {
      if (predicate(array[index], index, array)) {
        return index;
      }
    }
    return -1;
  }
  var baseFindIndex_default = baseFindIndex;
  function baseIsNaN(value) {
    return value !== value;
  }
  var baseIsNaN_default = baseIsNaN;
  function strictIndexOf(array, value, fromIndex) {
    var index = fromIndex - 1, length = array.length;
    while (++index < length) {
      if (array[index] === value) {
        return index;
      }
    }
    return -1;
  }
  var strictIndexOf_default = strictIndexOf;
  function baseIndexOf(array, value, fromIndex) {
    return value === value ? strictIndexOf_default(array, value, fromIndex) : baseFindIndex_default(array, baseIsNaN_default, fromIndex);
  }
  var baseIndexOf_default = baseIndexOf;
  function arrayIncludes(array, value) {
    var length = array == null ? 0 : array.length;
    return !!length && baseIndexOf_default(array, value, 0) > -1;
  }
  var arrayIncludes_default = arrayIncludes;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
  }
  var isIndex_default = isIndex;
  function baseAssignValue(object2, key, value) {
    if (key == "__proto__" && defineProperty_default) {
      defineProperty_default(object2, key, {
        "configurable": true,
        "enumerable": true,
        "value": value,
        "writable": true
      });
    } else {
      object2[key] = value;
    }
  }
  var baseAssignValue_default = baseAssignValue;
  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  var eq_default = eq;
  var objectProto4 = Object.prototype;
  var hasOwnProperty3 = objectProto4.hasOwnProperty;
  function assignValue(object2, key, value) {
    var objValue = object2[key];
    if (!(hasOwnProperty3.call(object2, key) && eq_default(objValue, value)) || value === void 0 && !(key in object2)) {
      baseAssignValue_default(object2, key, value);
    }
  }
  var assignValue_default = assignValue;
  function copyObject(source, props, object2, customizer) {
    var isNew = !object2;
    object2 || (object2 = {});
    var index = -1, length = props.length;
    while (++index < length) {
      var key = props[index];
      var newValue = customizer ? customizer(object2[key], source[key], key, object2, source) : void 0;
      if (newValue === void 0) {
        newValue = source[key];
      }
      if (isNew) {
        baseAssignValue_default(object2, key, newValue);
      } else {
        assignValue_default(object2, key, newValue);
      }
    }
    return object2;
  }
  var copyObject_default = copyObject;
  var nativeMax = Math.max;
  function overRest(func, start, transform) {
    start = nativeMax(start === void 0 ? func.length - 1 : start, 0);
    return function() {
      var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array(length);
      while (++index < length) {
        array[index] = args[start + index];
      }
      index = -1;
      var otherArgs = Array(start + 1);
      while (++index < start) {
        otherArgs[index] = args[index];
      }
      otherArgs[start] = transform(array);
      return apply_default(func, this, otherArgs);
    };
  }
  var overRest_default = overRest;
  function baseRest(func, start) {
    return setToString_default(overRest_default(func, start, identity_default), func + "");
  }
  var baseRest_default = baseRest;
  var MAX_SAFE_INTEGER2 = 9007199254740991;
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER2;
  }
  var isLength_default = isLength;
  function isArrayLike(value) {
    return value != null && isLength_default(value.length) && !isFunction_default(value);
  }
  var isArrayLike_default = isArrayLike;
  function isIterateeCall(value, index, object2) {
    if (!isObject_default(object2)) {
      return false;
    }
    var type = typeof index;
    if (type == "number" ? isArrayLike_default(object2) && isIndex_default(index, object2.length) : type == "string" && index in object2) {
      return eq_default(object2[index], value);
    }
    return false;
  }
  var isIterateeCall_default = isIterateeCall;
  function createAssigner(assigner) {
    return baseRest_default(function(object2, sources) {
      var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : void 0, guard = length > 2 ? sources[2] : void 0;
      customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : void 0;
      if (guard && isIterateeCall_default(sources[0], sources[1], guard)) {
        customizer = length < 3 ? void 0 : customizer;
        length = 1;
      }
      object2 = Object(object2);
      while (++index < length) {
        var source = sources[index];
        if (source) {
          assigner(object2, source, index, customizer);
        }
      }
      return object2;
    });
  }
  var createAssigner_default = createAssigner;
  var objectProto5 = Object.prototype;
  function isPrototype(value) {
    var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto5;
    return value === proto;
  }
  var isPrototype_default = isPrototype;
  function baseTimes(n, iteratee) {
    var index = -1, result = Array(n);
    while (++index < n) {
      result[index] = iteratee(index);
    }
    return result;
  }
  var baseTimes_default = baseTimes;
  var argsTag = "[object Arguments]";
  function baseIsArguments(value) {
    return isObjectLike_default(value) && baseGetTag_default(value) == argsTag;
  }
  var baseIsArguments_default = baseIsArguments;
  var objectProto6 = Object.prototype;
  var hasOwnProperty4 = objectProto6.hasOwnProperty;
  var propertyIsEnumerable = objectProto6.propertyIsEnumerable;
  var isArguments = baseIsArguments_default(/* @__PURE__ */ (function() {
    return arguments;
  })()) ? baseIsArguments_default : function(value) {
    return isObjectLike_default(value) && hasOwnProperty4.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
  };
  var isArguments_default = isArguments;
  function stubFalse() {
    return false;
  }
  var stubFalse_default = stubFalse;
  var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
  var freeModule = freeExports && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports = freeModule && freeModule.exports === freeExports;
  var Buffer2 = moduleExports ? root_default.Buffer : void 0;
  var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
  var isBuffer = nativeIsBuffer || stubFalse_default;
  var isBuffer_default = isBuffer;
  var argsTag2 = "[object Arguments]";
  var arrayTag = "[object Array]";
  var boolTag = "[object Boolean]";
  var dateTag = "[object Date]";
  var errorTag = "[object Error]";
  var funcTag2 = "[object Function]";
  var mapTag = "[object Map]";
  var numberTag = "[object Number]";
  var objectTag = "[object Object]";
  var regexpTag = "[object RegExp]";
  var setTag = "[object Set]";
  var stringTag = "[object String]";
  var weakMapTag = "[object WeakMap]";
  var arrayBufferTag = "[object ArrayBuffer]";
  var dataViewTag = "[object DataView]";
  var float32Tag = "[object Float32Array]";
  var float64Tag = "[object Float64Array]";
  var int8Tag = "[object Int8Array]";
  var int16Tag = "[object Int16Array]";
  var int32Tag = "[object Int32Array]";
  var uint8Tag = "[object Uint8Array]";
  var uint8ClampedTag = "[object Uint8ClampedArray]";
  var uint16Tag = "[object Uint16Array]";
  var uint32Tag = "[object Uint32Array]";
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag2] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag2] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
  function baseIsTypedArray(value) {
    return isObjectLike_default(value) && isLength_default(value.length) && !!typedArrayTags[baseGetTag_default(value)];
  }
  var baseIsTypedArray_default = baseIsTypedArray;
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }
  var baseUnary_default = baseUnary;
  var freeExports2 = typeof exports == "object" && exports && !exports.nodeType && exports;
  var freeModule2 = freeExports2 && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports2 = freeModule2 && freeModule2.exports === freeExports2;
  var freeProcess = moduleExports2 && freeGlobal_default.process;
  var nodeUtil = (function() {
    try {
      var types = freeModule2 && freeModule2.require && freeModule2.require("util").types;
      if (types) {
        return types;
      }
      return freeProcess && freeProcess.binding && freeProcess.binding("util");
    } catch (e) {
    }
  })();
  var nodeUtil_default = nodeUtil;
  var nodeIsTypedArray = nodeUtil_default && nodeUtil_default.isTypedArray;
  var isTypedArray = nodeIsTypedArray ? baseUnary_default(nodeIsTypedArray) : baseIsTypedArray_default;
  var isTypedArray_default = isTypedArray;
  var objectProto7 = Object.prototype;
  var hasOwnProperty5 = objectProto7.hasOwnProperty;
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray_default(value), isArg = !isArr && isArguments_default(value), isBuff = !isArr && !isArg && isBuffer_default(value), isType = !isArr && !isArg && !isBuff && isTypedArray_default(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes_default(value.length, String) : [], length = result.length;
    for (var key in value) {
      if ((inherited || hasOwnProperty5.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
      (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
      isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
      isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
      isIndex_default(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  var arrayLikeKeys_default = arrayLikeKeys;
  function overArg(func, transform) {
    return function(arg) {
      return func(transform(arg));
    };
  }
  var overArg_default = overArg;
  var nativeKeys = overArg_default(Object.keys, Object);
  var nativeKeys_default = nativeKeys;
  var objectProto8 = Object.prototype;
  var hasOwnProperty6 = objectProto8.hasOwnProperty;
  function baseKeys(object2) {
    if (!isPrototype_default(object2)) {
      return nativeKeys_default(object2);
    }
    var result = [];
    for (var key in Object(object2)) {
      if (hasOwnProperty6.call(object2, key) && key != "constructor") {
        result.push(key);
      }
    }
    return result;
  }
  var baseKeys_default = baseKeys;
  function keys(object2) {
    return isArrayLike_default(object2) ? arrayLikeKeys_default(object2) : baseKeys_default(object2);
  }
  var keys_default = keys;
  var objectProto9 = Object.prototype;
  var hasOwnProperty7 = objectProto9.hasOwnProperty;
  var assign = createAssigner_default(function(object2, source) {
    if (isPrototype_default(source) || isArrayLike_default(source)) {
      copyObject_default(source, keys_default(source), object2);
      return;
    }
    for (var key in source) {
      if (hasOwnProperty7.call(source, key)) {
        assignValue_default(object2, key, source[key]);
      }
    }
  });
  var assign_default = assign;
  function nativeKeysIn(object2) {
    var result = [];
    if (object2 != null) {
      for (var key in Object(object2)) {
        result.push(key);
      }
    }
    return result;
  }
  var nativeKeysIn_default = nativeKeysIn;
  var objectProto10 = Object.prototype;
  var hasOwnProperty8 = objectProto10.hasOwnProperty;
  function baseKeysIn(object2) {
    if (!isObject_default(object2)) {
      return nativeKeysIn_default(object2);
    }
    var isProto = isPrototype_default(object2), result = [];
    for (var key in object2) {
      if (!(key == "constructor" && (isProto || !hasOwnProperty8.call(object2, key)))) {
        result.push(key);
      }
    }
    return result;
  }
  var baseKeysIn_default = baseKeysIn;
  function keysIn(object2) {
    return isArrayLike_default(object2) ? arrayLikeKeys_default(object2, true) : baseKeysIn_default(object2);
  }
  var keysIn_default = keysIn;
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
  var reIsPlainProp = /^\w*$/;
  function isKey(value, object2) {
    if (isArray_default(value)) {
      return false;
    }
    var type = typeof value;
    if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol_default(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object(object2);
  }
  var isKey_default = isKey;
  var nativeCreate = getNative_default(Object, "create");
  var nativeCreate_default = nativeCreate;
  function hashClear() {
    this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {};
    this.size = 0;
  }
  var hashClear_default = hashClear;
  function hashDelete(key) {
    var result = this.has(key) && delete this.__data__[key];
    this.size -= result ? 1 : 0;
    return result;
  }
  var hashDelete_default = hashDelete;
  var HASH_UNDEFINED = "__lodash_hash_undefined__";
  var objectProto11 = Object.prototype;
  var hasOwnProperty9 = objectProto11.hasOwnProperty;
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate_default) {
      var result = data[key];
      return result === HASH_UNDEFINED ? void 0 : result;
    }
    return hasOwnProperty9.call(data, key) ? data[key] : void 0;
  }
  var hashGet_default = hashGet;
  var objectProto12 = Object.prototype;
  var hasOwnProperty10 = objectProto12.hasOwnProperty;
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate_default ? data[key] !== void 0 : hasOwnProperty10.call(data, key);
  }
  var hashHas_default = hashHas;
  var HASH_UNDEFINED2 = "__lodash_hash_undefined__";
  function hashSet(key, value) {
    var data = this.__data__;
    this.size += this.has(key) ? 0 : 1;
    data[key] = nativeCreate_default && value === void 0 ? HASH_UNDEFINED2 : value;
    return this;
  }
  var hashSet_default = hashSet;
  function Hash(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  Hash.prototype.clear = hashClear_default;
  Hash.prototype["delete"] = hashDelete_default;
  Hash.prototype.get = hashGet_default;
  Hash.prototype.has = hashHas_default;
  Hash.prototype.set = hashSet_default;
  var Hash_default = Hash;
  function listCacheClear() {
    this.__data__ = [];
    this.size = 0;
  }
  var listCacheClear_default = listCacheClear;
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq_default(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }
  var assocIndexOf_default = assocIndexOf;
  var arrayProto = Array.prototype;
  var splice = arrayProto.splice;
  function listCacheDelete(key) {
    var data = this.__data__, index = assocIndexOf_default(data, key);
    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    --this.size;
    return true;
  }
  var listCacheDelete_default = listCacheDelete;
  function listCacheGet(key) {
    var data = this.__data__, index = assocIndexOf_default(data, key);
    return index < 0 ? void 0 : data[index][1];
  }
  var listCacheGet_default = listCacheGet;
  function listCacheHas(key) {
    return assocIndexOf_default(this.__data__, key) > -1;
  }
  var listCacheHas_default = listCacheHas;
  function listCacheSet(key, value) {
    var data = this.__data__, index = assocIndexOf_default(data, key);
    if (index < 0) {
      ++this.size;
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }
  var listCacheSet_default = listCacheSet;
  function ListCache(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  ListCache.prototype.clear = listCacheClear_default;
  ListCache.prototype["delete"] = listCacheDelete_default;
  ListCache.prototype.get = listCacheGet_default;
  ListCache.prototype.has = listCacheHas_default;
  ListCache.prototype.set = listCacheSet_default;
  var ListCache_default = ListCache;
  var Map2 = getNative_default(root_default, "Map");
  var Map_default = Map2;
  function mapCacheClear() {
    this.size = 0;
    this.__data__ = {
      "hash": new Hash_default(),
      "map": new (Map_default || ListCache_default)(),
      "string": new Hash_default()
    };
  }
  var mapCacheClear_default = mapCacheClear;
  function isKeyable(value) {
    var type = typeof value;
    return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
  }
  var isKeyable_default = isKeyable;
  function getMapData(map2, key) {
    var data = map2.__data__;
    return isKeyable_default(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
  }
  var getMapData_default = getMapData;
  function mapCacheDelete(key) {
    var result = getMapData_default(this, key)["delete"](key);
    this.size -= result ? 1 : 0;
    return result;
  }
  var mapCacheDelete_default = mapCacheDelete;
  function mapCacheGet(key) {
    return getMapData_default(this, key).get(key);
  }
  var mapCacheGet_default = mapCacheGet;
  function mapCacheHas(key) {
    return getMapData_default(this, key).has(key);
  }
  var mapCacheHas_default = mapCacheHas;
  function mapCacheSet(key, value) {
    var data = getMapData_default(this, key), size = data.size;
    data.set(key, value);
    this.size += data.size == size ? 0 : 1;
    return this;
  }
  var mapCacheSet_default = mapCacheSet;
  function MapCache(entries) {
    var index = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }
  MapCache.prototype.clear = mapCacheClear_default;
  MapCache.prototype["delete"] = mapCacheDelete_default;
  MapCache.prototype.get = mapCacheGet_default;
  MapCache.prototype.has = mapCacheHas_default;
  MapCache.prototype.set = mapCacheSet_default;
  var MapCache_default = MapCache;
  var FUNC_ERROR_TEXT = "Expected a function";
  function memoize(func, resolver) {
    if (typeof func != "function" || resolver != null && typeof resolver != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache_default)();
    return memoized;
  }
  memoize.Cache = MapCache_default;
  var memoize_default = memoize;
  var MAX_MEMOIZE_SIZE = 500;
  function memoizeCapped(func) {
    var result = memoize_default(func, function(key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });
    var cache = result.cache;
    return result;
  }
  var memoizeCapped_default = memoizeCapped;
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = memoizeCapped_default(function(string2) {
    var result = [];
    if (string2.charCodeAt(0) === 46) {
      result.push("");
    }
    string2.replace(rePropName, function(match, number, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
    });
    return result;
  });
  var stringToPath_default = stringToPath;
  function toString(value) {
    return value == null ? "" : baseToString_default(value);
  }
  var toString_default = toString;
  function castPath(value, object2) {
    if (isArray_default(value)) {
      return value;
    }
    return isKey_default(value, object2) ? [value] : stringToPath_default(toString_default(value));
  }
  var castPath_default = castPath;
  var INFINITY3 = 1 / 0;
  function toKey(value) {
    if (typeof value == "string" || isSymbol_default(value)) {
      return value;
    }
    var result = value + "";
    return result == "0" && 1 / value == -INFINITY3 ? "-0" : result;
  }
  var toKey_default = toKey;
  function baseGet(object2, path2) {
    path2 = castPath_default(path2, object2);
    var index = 0, length = path2.length;
    while (object2 != null && index < length) {
      object2 = object2[toKey_default(path2[index++])];
    }
    return index && index == length ? object2 : void 0;
  }
  var baseGet_default = baseGet;
  function get(object2, path2, defaultValue) {
    var result = object2 == null ? void 0 : baseGet_default(object2, path2);
    return result === void 0 ? defaultValue : result;
  }
  var get_default = get;
  function arrayPush(array, values22) {
    var index = -1, length = values22.length, offset2 = array.length;
    while (++index < length) {
      array[offset2 + index] = values22[index];
    }
    return array;
  }
  var arrayPush_default = arrayPush;
  var spreadableSymbol = Symbol_default ? Symbol_default.isConcatSpreadable : void 0;
  function isFlattenable(value) {
    return isArray_default(value) || isArguments_default(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
  }
  var isFlattenable_default = isFlattenable;
  function baseFlatten(array, depth, predicate, isStrict, result) {
    var index = -1, length = array.length;
    predicate || (predicate = isFlattenable_default);
    result || (result = []);
    while (++index < length) {
      var value = array[index];
      if (depth > 0 && predicate(value)) {
        if (depth > 1) {
          baseFlatten(value, depth - 1, predicate, isStrict, result);
        } else {
          arrayPush_default(result, value);
        }
      } else if (!isStrict) {
        result[result.length] = value;
      }
    }
    return result;
  }
  var baseFlatten_default = baseFlatten;
  function flatten(array) {
    var length = array == null ? 0 : array.length;
    return length ? baseFlatten_default(array, 1) : [];
  }
  var flatten_default = flatten;
  var getPrototype = overArg_default(Object.getPrototypeOf, Object);
  var getPrototype_default = getPrototype;
  function baseSlice(array, start, end) {
    var index = -1, length = array.length;
    if (start < 0) {
      start = -start > length ? 0 : length + start;
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : end - start >>> 0;
    start >>>= 0;
    var result = Array(length);
    while (++index < length) {
      result[index] = array[index + start];
    }
    return result;
  }
  var baseSlice_default = baseSlice;
  function castSlice(array, start, end) {
    var length = array.length;
    end = end === void 0 ? length : end;
    return !start && end >= length ? array : baseSlice_default(array, start, end);
  }
  var castSlice_default = castSlice;
  var rsAstralRange = "\\ud800-\\udfff";
  var rsComboMarksRange = "\\u0300-\\u036f";
  var reComboHalfMarksRange = "\\ufe20-\\ufe2f";
  var rsComboSymbolsRange = "\\u20d0-\\u20ff";
  var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
  var rsVarRange = "\\ufe0e\\ufe0f";
  var rsZWJ = "\\u200d";
  var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
  function hasUnicode(string2) {
    return reHasUnicode.test(string2);
  }
  var hasUnicode_default = hasUnicode;
  function asciiToArray(string2) {
    return string2.split("");
  }
  var asciiToArray_default = asciiToArray;
  var rsAstralRange2 = "\\ud800-\\udfff";
  var rsComboMarksRange2 = "\\u0300-\\u036f";
  var reComboHalfMarksRange2 = "\\ufe20-\\ufe2f";
  var rsComboSymbolsRange2 = "\\u20d0-\\u20ff";
  var rsComboRange2 = rsComboMarksRange2 + reComboHalfMarksRange2 + rsComboSymbolsRange2;
  var rsVarRange2 = "\\ufe0e\\ufe0f";
  var rsAstral = "[" + rsAstralRange2 + "]";
  var rsCombo = "[" + rsComboRange2 + "]";
  var rsFitz = "\\ud83c[\\udffb-\\udfff]";
  var rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")";
  var rsNonAstral = "[^" + rsAstralRange2 + "]";
  var rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
  var rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";
  var rsZWJ2 = "\\u200d";
  var reOptMod = rsModifier + "?";
  var rsOptVar = "[" + rsVarRange2 + "]?";
  var rsOptJoin = "(?:" + rsZWJ2 + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*";
  var rsSeq = rsOptVar + reOptMod + rsOptJoin;
  var rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
  var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
  function unicodeToArray(string2) {
    return string2.match(reUnicode) || [];
  }
  var unicodeToArray_default = unicodeToArray;
  function stringToArray(string2) {
    return hasUnicode_default(string2) ? unicodeToArray_default(string2) : asciiToArray_default(string2);
  }
  var stringToArray_default = stringToArray;
  function createCaseFirst(methodName) {
    return function(string2) {
      string2 = toString_default(string2);
      var strSymbols = hasUnicode_default(string2) ? stringToArray_default(string2) : void 0;
      var chr = strSymbols ? strSymbols[0] : string2.charAt(0);
      var trailing = strSymbols ? castSlice_default(strSymbols, 1).join("") : string2.slice(1);
      return chr[methodName]() + trailing;
    };
  }
  var createCaseFirst_default = createCaseFirst;
  var upperFirst = createCaseFirst_default("toUpperCase");
  function arrayReduce(array, iteratee, accumulator, initAccum) {
    var index = -1, length = array == null ? 0 : array.length;
    if (initAccum && length) {
      accumulator = array[++index];
    }
    while (++index < length) {
      accumulator = iteratee(accumulator, array[index], index, array);
    }
    return accumulator;
  }
  var arrayReduce_default = arrayReduce;
  function stackClear() {
    this.__data__ = new ListCache_default();
    this.size = 0;
  }
  var stackClear_default = stackClear;
  function stackDelete(key) {
    var data = this.__data__, result = data["delete"](key);
    this.size = data.size;
    return result;
  }
  var stackDelete_default = stackDelete;
  function stackGet(key) {
    return this.__data__.get(key);
  }
  var stackGet_default = stackGet;
  function stackHas(key) {
    return this.__data__.has(key);
  }
  var stackHas_default = stackHas;
  var LARGE_ARRAY_SIZE = 200;
  function stackSet(key, value) {
    var data = this.__data__;
    if (data instanceof ListCache_default) {
      var pairs = data.__data__;
      if (!Map_default || pairs.length < LARGE_ARRAY_SIZE - 1) {
        pairs.push([key, value]);
        this.size = ++data.size;
        return this;
      }
      data = this.__data__ = new MapCache_default(pairs);
    }
    data.set(key, value);
    this.size = data.size;
    return this;
  }
  var stackSet_default = stackSet;
  function Stack(entries) {
    var data = this.__data__ = new ListCache_default(entries);
    this.size = data.size;
  }
  Stack.prototype.clear = stackClear_default;
  Stack.prototype["delete"] = stackDelete_default;
  Stack.prototype.get = stackGet_default;
  Stack.prototype.has = stackHas_default;
  Stack.prototype.set = stackSet_default;
  var Stack_default = Stack;
  function baseAssign(object2, source) {
    return object2 && copyObject_default(source, keys_default(source), object2);
  }
  var baseAssign_default = baseAssign;
  function baseAssignIn(object2, source) {
    return object2 && copyObject_default(source, keysIn_default(source), object2);
  }
  var baseAssignIn_default = baseAssignIn;
  var freeExports3 = typeof exports == "object" && exports && !exports.nodeType && exports;
  var freeModule3 = freeExports3 && typeof module == "object" && module && !module.nodeType && module;
  var moduleExports3 = freeModule3 && freeModule3.exports === freeExports3;
  var Buffer22 = moduleExports3 ? root_default.Buffer : void 0;
  var allocUnsafe = Buffer22 ? Buffer22.allocUnsafe : void 0;
  function cloneBuffer(buffer, isDeep) {
    if (isDeep) {
      return buffer.slice();
    }
    var length = buffer.length, result = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
    buffer.copy(result);
    return result;
  }
  var cloneBuffer_default = cloneBuffer;
  function arrayFilter(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
    while (++index < length) {
      var value = array[index];
      if (predicate(value, index, array)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  var arrayFilter_default = arrayFilter;
  function stubArray() {
    return [];
  }
  var stubArray_default = stubArray;
  var objectProto13 = Object.prototype;
  var propertyIsEnumerable2 = objectProto13.propertyIsEnumerable;
  var nativeGetSymbols = Object.getOwnPropertySymbols;
  var getSymbols = !nativeGetSymbols ? stubArray_default : function(object2) {
    if (object2 == null) {
      return [];
    }
    object2 = Object(object2);
    return arrayFilter_default(nativeGetSymbols(object2), function(symbol) {
      return propertyIsEnumerable2.call(object2, symbol);
    });
  };
  var getSymbols_default = getSymbols;
  function copySymbols(source, object2) {
    return copyObject_default(source, getSymbols_default(source), object2);
  }
  var copySymbols_default = copySymbols;
  var nativeGetSymbols2 = Object.getOwnPropertySymbols;
  var getSymbolsIn = !nativeGetSymbols2 ? stubArray_default : function(object2) {
    var result = [];
    while (object2) {
      arrayPush_default(result, getSymbols_default(object2));
      object2 = getPrototype_default(object2);
    }
    return result;
  };
  var getSymbolsIn_default = getSymbolsIn;
  function copySymbolsIn(source, object2) {
    return copyObject_default(source, getSymbolsIn_default(source), object2);
  }
  var copySymbolsIn_default = copySymbolsIn;
  function baseGetAllKeys(object2, keysFunc, symbolsFunc) {
    var result = keysFunc(object2);
    return isArray_default(object2) ? result : arrayPush_default(result, symbolsFunc(object2));
  }
  var baseGetAllKeys_default = baseGetAllKeys;
  function getAllKeys(object2) {
    return baseGetAllKeys_default(object2, keys_default, getSymbols_default);
  }
  var getAllKeys_default = getAllKeys;
  function getAllKeysIn(object2) {
    return baseGetAllKeys_default(object2, keysIn_default, getSymbolsIn_default);
  }
  var getAllKeysIn_default = getAllKeysIn;
  var DataView = getNative_default(root_default, "DataView");
  var DataView_default = DataView;
  var Promise2 = getNative_default(root_default, "Promise");
  var Promise_default = Promise2;
  var Set2 = getNative_default(root_default, "Set");
  var Set_default = Set2;
  var mapTag2 = "[object Map]";
  var objectTag2 = "[object Object]";
  var promiseTag = "[object Promise]";
  var setTag2 = "[object Set]";
  var weakMapTag2 = "[object WeakMap]";
  var dataViewTag2 = "[object DataView]";
  var dataViewCtorString = toSource_default(DataView_default);
  var mapCtorString = toSource_default(Map_default);
  var promiseCtorString = toSource_default(Promise_default);
  var setCtorString = toSource_default(Set_default);
  var weakMapCtorString = toSource_default(WeakMap_default);
  var getTag = baseGetTag_default;
  if (DataView_default && getTag(new DataView_default(new ArrayBuffer(1))) != dataViewTag2 || Map_default && getTag(new Map_default()) != mapTag2 || Promise_default && getTag(Promise_default.resolve()) != promiseTag || Set_default && getTag(new Set_default()) != setTag2 || WeakMap_default && getTag(new WeakMap_default()) != weakMapTag2) {
    getTag = function(value) {
      var result = baseGetTag_default(value), Ctor = result == objectTag2 ? value.constructor : void 0, ctorString = Ctor ? toSource_default(Ctor) : "";
      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString:
            return dataViewTag2;
          case mapCtorString:
            return mapTag2;
          case promiseCtorString:
            return promiseTag;
          case setCtorString:
            return setTag2;
          case weakMapCtorString:
            return weakMapTag2;
        }
      }
      return result;
    };
  }
  var getTag_default = getTag;
  var objectProto14 = Object.prototype;
  var hasOwnProperty11 = objectProto14.hasOwnProperty;
  function initCloneArray(array) {
    var length = array.length, result = new array.constructor(length);
    if (length && typeof array[0] == "string" && hasOwnProperty11.call(array, "index")) {
      result.index = array.index;
      result.input = array.input;
    }
    return result;
  }
  var initCloneArray_default = initCloneArray;
  var Uint8Array2 = root_default.Uint8Array;
  var Uint8Array_default = Uint8Array2;
  function cloneArrayBuffer(arrayBuffer) {
    var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
    new Uint8Array_default(result).set(new Uint8Array_default(arrayBuffer));
    return result;
  }
  var cloneArrayBuffer_default = cloneArrayBuffer;
  function cloneDataView(dataView, isDeep) {
    var buffer = isDeep ? cloneArrayBuffer_default(dataView.buffer) : dataView.buffer;
    return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
  }
  var cloneDataView_default = cloneDataView;
  var reFlags = /\w*$/;
  function cloneRegExp(regexp) {
    var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
    result.lastIndex = regexp.lastIndex;
    return result;
  }
  var cloneRegExp_default = cloneRegExp;
  var symbolProto2 = Symbol_default ? Symbol_default.prototype : void 0;
  var symbolValueOf = symbolProto2 ? symbolProto2.valueOf : void 0;
  function cloneSymbol(symbol) {
    return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
  }
  var cloneSymbol_default = cloneSymbol;
  function cloneTypedArray(typedArray, isDeep) {
    var buffer = isDeep ? cloneArrayBuffer_default(typedArray.buffer) : typedArray.buffer;
    return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
  }
  var cloneTypedArray_default = cloneTypedArray;
  var boolTag2 = "[object Boolean]";
  var dateTag2 = "[object Date]";
  var mapTag3 = "[object Map]";
  var numberTag2 = "[object Number]";
  var regexpTag2 = "[object RegExp]";
  var setTag3 = "[object Set]";
  var stringTag2 = "[object String]";
  var symbolTag2 = "[object Symbol]";
  var arrayBufferTag2 = "[object ArrayBuffer]";
  var dataViewTag3 = "[object DataView]";
  var float32Tag2 = "[object Float32Array]";
  var float64Tag2 = "[object Float64Array]";
  var int8Tag2 = "[object Int8Array]";
  var int16Tag2 = "[object Int16Array]";
  var int32Tag2 = "[object Int32Array]";
  var uint8Tag2 = "[object Uint8Array]";
  var uint8ClampedTag2 = "[object Uint8ClampedArray]";
  var uint16Tag2 = "[object Uint16Array]";
  var uint32Tag2 = "[object Uint32Array]";
  function initCloneByTag(object2, tag, isDeep) {
    var Ctor = object2.constructor;
    switch (tag) {
      case arrayBufferTag2:
        return cloneArrayBuffer_default(object2);
      case boolTag2:
      case dateTag2:
        return new Ctor(+object2);
      case dataViewTag3:
        return cloneDataView_default(object2, isDeep);
      case float32Tag2:
      case float64Tag2:
      case int8Tag2:
      case int16Tag2:
      case int32Tag2:
      case uint8Tag2:
      case uint8ClampedTag2:
      case uint16Tag2:
      case uint32Tag2:
        return cloneTypedArray_default(object2, isDeep);
      case mapTag3:
        return new Ctor();
      case numberTag2:
      case stringTag2:
        return new Ctor(object2);
      case regexpTag2:
        return cloneRegExp_default(object2);
      case setTag3:
        return new Ctor();
      case symbolTag2:
        return cloneSymbol_default(object2);
    }
  }
  var initCloneByTag_default = initCloneByTag;
  function initCloneObject(object2) {
    return typeof object2.constructor == "function" && !isPrototype_default(object2) ? baseCreate_default(getPrototype_default(object2)) : {};
  }
  var initCloneObject_default = initCloneObject;
  var mapTag4 = "[object Map]";
  function baseIsMap(value) {
    return isObjectLike_default(value) && getTag_default(value) == mapTag4;
  }
  var baseIsMap_default = baseIsMap;
  var nodeIsMap = nodeUtil_default && nodeUtil_default.isMap;
  var isMap = nodeIsMap ? baseUnary_default(nodeIsMap) : baseIsMap_default;
  var isMap_default = isMap;
  var setTag4 = "[object Set]";
  function baseIsSet(value) {
    return isObjectLike_default(value) && getTag_default(value) == setTag4;
  }
  var baseIsSet_default = baseIsSet;
  var nodeIsSet = nodeUtil_default && nodeUtil_default.isSet;
  var isSet = nodeIsSet ? baseUnary_default(nodeIsSet) : baseIsSet_default;
  var isSet_default = isSet;
  var CLONE_DEEP_FLAG = 1;
  var CLONE_FLAT_FLAG = 2;
  var CLONE_SYMBOLS_FLAG = 4;
  var argsTag3 = "[object Arguments]";
  var arrayTag2 = "[object Array]";
  var boolTag3 = "[object Boolean]";
  var dateTag3 = "[object Date]";
  var errorTag2 = "[object Error]";
  var funcTag3 = "[object Function]";
  var genTag2 = "[object GeneratorFunction]";
  var mapTag5 = "[object Map]";
  var numberTag3 = "[object Number]";
  var objectTag3 = "[object Object]";
  var regexpTag3 = "[object RegExp]";
  var setTag5 = "[object Set]";
  var stringTag3 = "[object String]";
  var symbolTag3 = "[object Symbol]";
  var weakMapTag3 = "[object WeakMap]";
  var arrayBufferTag3 = "[object ArrayBuffer]";
  var dataViewTag4 = "[object DataView]";
  var float32Tag3 = "[object Float32Array]";
  var float64Tag3 = "[object Float64Array]";
  var int8Tag3 = "[object Int8Array]";
  var int16Tag3 = "[object Int16Array]";
  var int32Tag3 = "[object Int32Array]";
  var uint8Tag3 = "[object Uint8Array]";
  var uint8ClampedTag3 = "[object Uint8ClampedArray]";
  var uint16Tag3 = "[object Uint16Array]";
  var uint32Tag3 = "[object Uint32Array]";
  var cloneableTags = {};
  cloneableTags[argsTag3] = cloneableTags[arrayTag2] = cloneableTags[arrayBufferTag3] = cloneableTags[dataViewTag4] = cloneableTags[boolTag3] = cloneableTags[dateTag3] = cloneableTags[float32Tag3] = cloneableTags[float64Tag3] = cloneableTags[int8Tag3] = cloneableTags[int16Tag3] = cloneableTags[int32Tag3] = cloneableTags[mapTag5] = cloneableTags[numberTag3] = cloneableTags[objectTag3] = cloneableTags[regexpTag3] = cloneableTags[setTag5] = cloneableTags[stringTag3] = cloneableTags[symbolTag3] = cloneableTags[uint8Tag3] = cloneableTags[uint8ClampedTag3] = cloneableTags[uint16Tag3] = cloneableTags[uint32Tag3] = true;
  cloneableTags[errorTag2] = cloneableTags[funcTag3] = cloneableTags[weakMapTag3] = false;
  function baseClone(value, bitmask, customizer, key, object2, stack) {
    var result, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
    if (customizer) {
      result = object2 ? customizer(value, key, object2, stack) : customizer(value);
    }
    if (result !== void 0) {
      return result;
    }
    if (!isObject_default(value)) {
      return value;
    }
    var isArr = isArray_default(value);
    if (isArr) {
      result = initCloneArray_default(value);
      if (!isDeep) {
        return copyArray_default(value, result);
      }
    } else {
      var tag = getTag_default(value), isFunc = tag == funcTag3 || tag == genTag2;
      if (isBuffer_default(value)) {
        return cloneBuffer_default(value, isDeep);
      }
      if (tag == objectTag3 || tag == argsTag3 || isFunc && !object2) {
        result = isFlat || isFunc ? {} : initCloneObject_default(value);
        if (!isDeep) {
          return isFlat ? copySymbolsIn_default(value, baseAssignIn_default(result, value)) : copySymbols_default(value, baseAssign_default(result, value));
        }
      } else {
        if (!cloneableTags[tag]) {
          return object2 ? value : {};
        }
        result = initCloneByTag_default(value, tag, isDeep);
      }
    }
    stack || (stack = new Stack_default());
    var stacked = stack.get(value);
    if (stacked) {
      return stacked;
    }
    stack.set(value, result);
    if (isSet_default(value)) {
      value.forEach(function(subValue) {
        result.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
      });
    } else if (isMap_default(value)) {
      value.forEach(function(subValue, key2) {
        result.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
      });
    }
    var keysFunc = isFull ? isFlat ? getAllKeysIn_default : getAllKeys_default : isFlat ? keysIn_default : keys_default;
    var props = isArr ? void 0 : keysFunc(value);
    arrayEach_default(props || value, function(subValue, key2) {
      if (props) {
        key2 = subValue;
        subValue = value[key2];
      }
      assignValue_default(result, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
    });
    return result;
  }
  var baseClone_default = baseClone;
  var CLONE_SYMBOLS_FLAG2 = 4;
  function clone(value) {
    return baseClone_default(value, CLONE_SYMBOLS_FLAG2);
  }
  var clone_default = clone;
  function compact(array) {
    var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
    while (++index < length) {
      var value = array[index];
      if (value) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  var compact_default = compact;
  var HASH_UNDEFINED3 = "__lodash_hash_undefined__";
  function setCacheAdd(value) {
    this.__data__.set(value, HASH_UNDEFINED3);
    return this;
  }
  var setCacheAdd_default = setCacheAdd;
  function setCacheHas(value) {
    return this.__data__.has(value);
  }
  var setCacheHas_default = setCacheHas;
  function SetCache(values22) {
    var index = -1, length = values22 == null ? 0 : values22.length;
    this.__data__ = new MapCache_default();
    while (++index < length) {
      this.add(values22[index]);
    }
  }
  SetCache.prototype.add = SetCache.prototype.push = setCacheAdd_default;
  SetCache.prototype.has = setCacheHas_default;
  var SetCache_default = SetCache;
  function arraySome(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (predicate(array[index], index, array)) {
        return true;
      }
    }
    return false;
  }
  var arraySome_default = arraySome;
  function cacheHas(cache, key) {
    return cache.has(key);
  }
  var cacheHas_default = cacheHas;
  var COMPARE_PARTIAL_FLAG = 1;
  var COMPARE_UNORDERED_FLAG = 2;
  function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    var arrStacked = stack.get(array);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array;
    }
    var index = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache_default() : void 0;
    stack.set(array, other);
    stack.set(other, array);
    while (++index < arrLength) {
      var arrValue = array[index], othValue = other[index];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
      }
      if (compared !== void 0) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      if (seen) {
        if (!arraySome_default(other, function(othValue2, othIndex) {
          if (!cacheHas_default(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
            return seen.push(othIndex);
          }
        })) {
          result = false;
          break;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
        result = false;
        break;
      }
    }
    stack["delete"](array);
    stack["delete"](other);
    return result;
  }
  var equalArrays_default = equalArrays;
  function mapToArray(map2) {
    var index = -1, result = Array(map2.size);
    map2.forEach(function(value, key) {
      result[++index] = [key, value];
    });
    return result;
  }
  var mapToArray_default = mapToArray;
  function setToArray(set) {
    var index = -1, result = Array(set.size);
    set.forEach(function(value) {
      result[++index] = value;
    });
    return result;
  }
  var setToArray_default = setToArray;
  var COMPARE_PARTIAL_FLAG2 = 1;
  var COMPARE_UNORDERED_FLAG2 = 2;
  var boolTag4 = "[object Boolean]";
  var dateTag4 = "[object Date]";
  var errorTag3 = "[object Error]";
  var mapTag6 = "[object Map]";
  var numberTag4 = "[object Number]";
  var regexpTag4 = "[object RegExp]";
  var setTag6 = "[object Set]";
  var stringTag4 = "[object String]";
  var symbolTag4 = "[object Symbol]";
  var arrayBufferTag4 = "[object ArrayBuffer]";
  var dataViewTag5 = "[object DataView]";
  var symbolProto3 = Symbol_default ? Symbol_default.prototype : void 0;
  var symbolValueOf2 = symbolProto3 ? symbolProto3.valueOf : void 0;
  function equalByTag(object2, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag5:
        if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
          return false;
        }
        object2 = object2.buffer;
        other = other.buffer;
      case arrayBufferTag4:
        if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array_default(object2), new Uint8Array_default(other))) {
          return false;
        }
        return true;
      case boolTag4:
      case dateTag4:
      case numberTag4:
        return eq_default(+object2, +other);
      case errorTag3:
        return object2.name == other.name && object2.message == other.message;
      case regexpTag4:
      case stringTag4:
        return object2 == other + "";
      case mapTag6:
        var convert = mapToArray_default;
      case setTag6:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG2;
        convert || (convert = setToArray_default);
        if (object2.size != other.size && !isPartial) {
          return false;
        }
        var stacked = stack.get(object2);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG2;
        stack.set(object2, other);
        var result = equalArrays_default(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
        stack["delete"](object2);
        return result;
      case symbolTag4:
        if (symbolValueOf2) {
          return symbolValueOf2.call(object2) == symbolValueOf2.call(other);
        }
    }
    return false;
  }
  var equalByTag_default = equalByTag;
  var COMPARE_PARTIAL_FLAG3 = 1;
  var objectProto15 = Object.prototype;
  var hasOwnProperty12 = objectProto15.hasOwnProperty;
  function equalObjects(object2, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG3, objProps = getAllKeys_default(object2), objLength = objProps.length, othProps = getAllKeys_default(other), othLength = othProps.length;
    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index = objLength;
    while (index--) {
      var key = objProps[index];
      if (!(isPartial ? key in other : hasOwnProperty12.call(other, key))) {
        return false;
      }
    }
    var objStacked = stack.get(object2);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object2;
    }
    var result = true;
    stack.set(object2, other);
    stack.set(other, object2);
    var skipCtor = isPartial;
    while (++index < objLength) {
      key = objProps[index];
      var objValue = object2[key], othValue = other[key];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
      }
      if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == "constructor");
    }
    if (result && !skipCtor) {
      var objCtor = object2.constructor, othCtor = other.constructor;
      if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack["delete"](object2);
    stack["delete"](other);
    return result;
  }
  var equalObjects_default = equalObjects;
  var COMPARE_PARTIAL_FLAG4 = 1;
  var argsTag4 = "[object Arguments]";
  var arrayTag3 = "[object Array]";
  var objectTag4 = "[object Object]";
  var objectProto16 = Object.prototype;
  var hasOwnProperty13 = objectProto16.hasOwnProperty;
  function baseIsEqualDeep(object2, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray_default(object2), othIsArr = isArray_default(other), objTag = objIsArr ? arrayTag3 : getTag_default(object2), othTag = othIsArr ? arrayTag3 : getTag_default(other);
    objTag = objTag == argsTag4 ? objectTag4 : objTag;
    othTag = othTag == argsTag4 ? objectTag4 : othTag;
    var objIsObj = objTag == objectTag4, othIsObj = othTag == objectTag4, isSameTag = objTag == othTag;
    if (isSameTag && isBuffer_default(object2)) {
      if (!isBuffer_default(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack_default());
      return objIsArr || isTypedArray_default(object2) ? equalArrays_default(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag_default(object2, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG4)) {
      var objIsWrapped = objIsObj && hasOwnProperty13.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty13.call(other, "__wrapped__");
      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
        stack || (stack = new Stack_default());
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack_default());
    return equalObjects_default(object2, other, bitmask, customizer, equalFunc, stack);
  }
  var baseIsEqualDeep_default = baseIsEqualDeep;
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || !isObjectLike_default(value) && !isObjectLike_default(other)) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep_default(value, other, bitmask, customizer, baseIsEqual, stack);
  }
  var baseIsEqual_default = baseIsEqual;
  var COMPARE_PARTIAL_FLAG5 = 1;
  var COMPARE_UNORDERED_FLAG3 = 2;
  function baseIsMatch(object2, source, matchData, customizer) {
    var index = matchData.length, length = index, noCustomizer = !customizer;
    if (object2 == null) {
      return !length;
    }
    object2 = Object(object2);
    while (index--) {
      var data = matchData[index];
      if (noCustomizer && data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
        return false;
      }
    }
    while (++index < length) {
      data = matchData[index];
      var key = data[0], objValue = object2[key], srcValue = data[1];
      if (noCustomizer && data[2]) {
        if (objValue === void 0 && !(key in object2)) {
          return false;
        }
      } else {
        var stack = new Stack_default();
        if (customizer) {
          var result = customizer(objValue, srcValue, key, object2, source, stack);
        }
        if (!(result === void 0 ? baseIsEqual_default(srcValue, objValue, COMPARE_PARTIAL_FLAG5 | COMPARE_UNORDERED_FLAG3, customizer, stack) : result)) {
          return false;
        }
      }
    }
    return true;
  }
  var baseIsMatch_default = baseIsMatch;
  function isStrictComparable(value) {
    return value === value && !isObject_default(value);
  }
  var isStrictComparable_default = isStrictComparable;
  function getMatchData(object2) {
    var result = keys_default(object2), length = result.length;
    while (length--) {
      var key = result[length], value = object2[key];
      result[length] = [key, value, isStrictComparable_default(value)];
    }
    return result;
  }
  var getMatchData_default = getMatchData;
  function matchesStrictComparable(key, srcValue) {
    return function(object2) {
      if (object2 == null) {
        return false;
      }
      return object2[key] === srcValue && (srcValue !== void 0 || key in Object(object2));
    };
  }
  var matchesStrictComparable_default = matchesStrictComparable;
  function baseMatches(source) {
    var matchData = getMatchData_default(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return matchesStrictComparable_default(matchData[0][0], matchData[0][1]);
    }
    return function(object2) {
      return object2 === source || baseIsMatch_default(object2, source, matchData);
    };
  }
  var baseMatches_default = baseMatches;
  function baseHasIn(object2, key) {
    return object2 != null && key in Object(object2);
  }
  var baseHasIn_default = baseHasIn;
  function hasPath(object2, path2, hasFunc) {
    path2 = castPath_default(path2, object2);
    var index = -1, length = path2.length, result = false;
    while (++index < length) {
      var key = toKey_default(path2[index]);
      if (!(result = object2 != null && hasFunc(object2, key))) {
        break;
      }
      object2 = object2[key];
    }
    if (result || ++index != length) {
      return result;
    }
    length = object2 == null ? 0 : object2.length;
    return !!length && isLength_default(length) && isIndex_default(key, length) && (isArray_default(object2) || isArguments_default(object2));
  }
  var hasPath_default = hasPath;
  function hasIn(object2, path2) {
    return object2 != null && hasPath_default(object2, path2, baseHasIn_default);
  }
  var hasIn_default = hasIn;
  var COMPARE_PARTIAL_FLAG6 = 1;
  var COMPARE_UNORDERED_FLAG4 = 2;
  function baseMatchesProperty(path2, srcValue) {
    if (isKey_default(path2) && isStrictComparable_default(srcValue)) {
      return matchesStrictComparable_default(toKey_default(path2), srcValue);
    }
    return function(object2) {
      var objValue = get_default(object2, path2);
      return objValue === void 0 && objValue === srcValue ? hasIn_default(object2, path2) : baseIsEqual_default(srcValue, objValue, COMPARE_PARTIAL_FLAG6 | COMPARE_UNORDERED_FLAG4);
    };
  }
  var baseMatchesProperty_default = baseMatchesProperty;
  function baseProperty(key) {
    return function(object2) {
      return object2 == null ? void 0 : object2[key];
    };
  }
  var baseProperty_default = baseProperty;
  function basePropertyDeep(path2) {
    return function(object2) {
      return baseGet_default(object2, path2);
    };
  }
  var basePropertyDeep_default = basePropertyDeep;
  function property(path2) {
    return isKey_default(path2) ? baseProperty_default(toKey_default(path2)) : basePropertyDeep_default(path2);
  }
  var property_default = property;
  function baseIteratee(value) {
    if (typeof value == "function") {
      return value;
    }
    if (value == null) {
      return identity_default;
    }
    if (typeof value == "object") {
      return isArray_default(value) ? baseMatchesProperty_default(value[0], value[1]) : baseMatches_default(value);
    }
    return property_default(value);
  }
  var baseIteratee_default = baseIteratee;
  function arrayAggregator(array, setter, iteratee, accumulator) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      var value = array[index];
      setter(accumulator, value, iteratee(value), array);
    }
    return accumulator;
  }
  var arrayAggregator_default = arrayAggregator;
  function createBaseFor(fromRight) {
    return function(object2, iteratee, keysFunc) {
      var index = -1, iterable = Object(object2), props = keysFunc(object2), length = props.length;
      while (length--) {
        var key = props[fromRight ? length : ++index];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object2;
    };
  }
  var createBaseFor_default = createBaseFor;
  var baseFor = createBaseFor_default();
  var baseFor_default = baseFor;
  function baseForOwn(object2, iteratee) {
    return object2 && baseFor_default(object2, iteratee, keys_default);
  }
  var baseForOwn_default = baseForOwn;
  function createBaseEach(eachFunc, fromRight) {
    return function(collection2, iteratee) {
      if (collection2 == null) {
        return collection2;
      }
      if (!isArrayLike_default(collection2)) {
        return eachFunc(collection2, iteratee);
      }
      var length = collection2.length, index = fromRight ? length : -1, iterable = Object(collection2);
      while (fromRight ? index-- : ++index < length) {
        if (iteratee(iterable[index], index, iterable) === false) {
          break;
        }
      }
      return collection2;
    };
  }
  var createBaseEach_default = createBaseEach;
  var baseEach = createBaseEach_default(baseForOwn_default);
  var baseEach_default = baseEach;
  function baseAggregator(collection2, setter, iteratee, accumulator) {
    baseEach_default(collection2, function(value, key, collection22) {
      setter(accumulator, value, iteratee(value), collection22);
    });
    return accumulator;
  }
  var baseAggregator_default = baseAggregator;
  function createAggregator(setter, initializer) {
    return function(collection2, iteratee) {
      var func = isArray_default(collection2) ? arrayAggregator_default : baseAggregator_default, accumulator = initializer ? initializer() : {};
      return func(collection2, setter, baseIteratee_default(iteratee, 2), accumulator);
    };
  }
  var createAggregator_default = createAggregator;
  var objectProto17 = Object.prototype;
  var hasOwnProperty14 = objectProto17.hasOwnProperty;
  var defaults = baseRest_default(function(object2, sources) {
    object2 = Object(object2);
    var index = -1;
    var length = sources.length;
    var guard = length > 2 ? sources[2] : void 0;
    if (guard && isIterateeCall_default(sources[0], sources[1], guard)) {
      length = 1;
    }
    while (++index < length) {
      var source = sources[index];
      var props = keysIn_default(source);
      var propsIndex = -1;
      var propsLength = props.length;
      while (++propsIndex < propsLength) {
        var key = props[propsIndex];
        var value = object2[key];
        if (value === void 0 || eq_default(value, objectProto17[key]) && !hasOwnProperty14.call(object2, key)) {
          object2[key] = source[key];
        }
      }
    }
    return object2;
  });
  var defaults_default = defaults;
  function isArrayLikeObject(value) {
    return isObjectLike_default(value) && isArrayLike_default(value);
  }
  var isArrayLikeObject_default = isArrayLikeObject;
  function arrayIncludesWith(array, value, comparator) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (comparator(value, array[index])) {
        return true;
      }
    }
    return false;
  }
  var arrayIncludesWith_default = arrayIncludesWith;
  var LARGE_ARRAY_SIZE2 = 200;
  function baseDifference(array, values22, iteratee, comparator) {
    var index = -1, includes2 = arrayIncludes_default, isCommon = true, length = array.length, result = [], valuesLength = values22.length;
    if (!length) {
      return result;
    }
    if (iteratee) {
      values22 = arrayMap_default(values22, baseUnary_default(iteratee));
    }
    if (comparator) {
      includes2 = arrayIncludesWith_default;
      isCommon = false;
    } else if (values22.length >= LARGE_ARRAY_SIZE2) {
      includes2 = cacheHas_default;
      isCommon = false;
      values22 = new SetCache_default(values22);
    }
    outer:
      while (++index < length) {
        var value = array[index], computed = iteratee == null ? value : iteratee(value);
        value = comparator || value !== 0 ? value : 0;
        if (isCommon && computed === computed) {
          var valuesIndex = valuesLength;
          while (valuesIndex--) {
            if (values22[valuesIndex] === computed) {
              continue outer;
            }
          }
          result.push(value);
        } else if (!includes2(values22, computed, comparator)) {
          result.push(value);
        }
      }
    return result;
  }
  var baseDifference_default = baseDifference;
  var difference = baseRest_default(function(array, values22) {
    return isArrayLikeObject_default(array) ? baseDifference_default(array, baseFlatten_default(values22, 1, isArrayLikeObject_default, true)) : [];
  });
  var difference_default = difference;
  function last(array) {
    var length = array == null ? 0 : array.length;
    return length ? array[length - 1] : void 0;
  }
  var last_default = last;
  function drop(array, n, guard) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return [];
    }
    n = guard || n === void 0 ? 1 : toInteger_default(n);
    return baseSlice_default(array, n < 0 ? 0 : n, length);
  }
  var drop_default = drop;
  function dropRight(array, n, guard) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return [];
    }
    n = guard || n === void 0 ? 1 : toInteger_default(n);
    n = length - n;
    return baseSlice_default(array, 0, n < 0 ? 0 : n);
  }
  var dropRight_default = dropRight;
  function castFunction(value) {
    return typeof value == "function" ? value : identity_default;
  }
  var castFunction_default = castFunction;
  function forEach(collection2, iteratee) {
    var func = isArray_default(collection2) ? arrayEach_default : baseEach_default;
    return func(collection2, castFunction_default(iteratee));
  }
  var forEach_default = forEach;
  function arrayEvery(array, predicate) {
    var index = -1, length = array == null ? 0 : array.length;
    while (++index < length) {
      if (!predicate(array[index], index, array)) {
        return false;
      }
    }
    return true;
  }
  var arrayEvery_default = arrayEvery;
  function baseEvery(collection2, predicate) {
    var result = true;
    baseEach_default(collection2, function(value, index, collection22) {
      result = !!predicate(value, index, collection22);
      return result;
    });
    return result;
  }
  var baseEvery_default = baseEvery;
  function every(collection2, predicate, guard) {
    var func = isArray_default(collection2) ? arrayEvery_default : baseEvery_default;
    if (guard && isIterateeCall_default(collection2, predicate, guard)) {
      predicate = void 0;
    }
    return func(collection2, baseIteratee_default(predicate, 3));
  }
  var every_default = every;
  function baseFilter(collection2, predicate) {
    var result = [];
    baseEach_default(collection2, function(value, index, collection22) {
      if (predicate(value, index, collection22)) {
        result.push(value);
      }
    });
    return result;
  }
  var baseFilter_default = baseFilter;
  function filter(collection2, predicate) {
    var func = isArray_default(collection2) ? arrayFilter_default : baseFilter_default;
    return func(collection2, baseIteratee_default(predicate, 3));
  }
  var filter_default = filter;
  function createFind(findIndexFunc) {
    return function(collection2, predicate, fromIndex) {
      var iterable = Object(collection2);
      if (!isArrayLike_default(collection2)) {
        var iteratee = baseIteratee_default(predicate, 3);
        collection2 = keys_default(collection2);
        predicate = function(key) {
          return iteratee(iterable[key], key, iterable);
        };
      }
      var index = findIndexFunc(collection2, predicate, fromIndex);
      return index > -1 ? iterable[iteratee ? collection2[index] : index] : void 0;
    };
  }
  var createFind_default = createFind;
  var nativeMax2 = Math.max;
  function findIndex(array, predicate, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = fromIndex == null ? 0 : toInteger_default(fromIndex);
    if (index < 0) {
      index = nativeMax2(length + index, 0);
    }
    return baseFindIndex_default(array, baseIteratee_default(predicate, 3), index);
  }
  var findIndex_default = findIndex;
  var find = createFind_default(findIndex_default);
  var find_default = find;
  function head(array) {
    return array && array.length ? array[0] : void 0;
  }
  var head_default = head;
  function baseMap(collection2, iteratee) {
    var index = -1, result = isArrayLike_default(collection2) ? Array(collection2.length) : [];
    baseEach_default(collection2, function(value, key, collection22) {
      result[++index] = iteratee(value, key, collection22);
    });
    return result;
  }
  var baseMap_default = baseMap;
  function map(collection2, iteratee) {
    var func = isArray_default(collection2) ? arrayMap_default : baseMap_default;
    return func(collection2, baseIteratee_default(iteratee, 3));
  }
  var map_default = map;
  function flatMap(collection2, iteratee) {
    return baseFlatten_default(map_default(collection2, iteratee), 1);
  }
  var flatMap_default = flatMap;
  var objectProto18 = Object.prototype;
  var hasOwnProperty15 = objectProto18.hasOwnProperty;
  var groupBy = createAggregator_default(function(result, value, key) {
    if (hasOwnProperty15.call(result, key)) {
      result[key].push(value);
    } else {
      baseAssignValue_default(result, key, [value]);
    }
  });
  var groupBy_default = groupBy;
  var objectProto19 = Object.prototype;
  var hasOwnProperty16 = objectProto19.hasOwnProperty;
  function baseHas(object2, key) {
    return object2 != null && hasOwnProperty16.call(object2, key);
  }
  var baseHas_default = baseHas;
  function has(object2, path2) {
    return object2 != null && hasPath_default(object2, path2, baseHas_default);
  }
  var has_default = has;
  var stringTag5 = "[object String]";
  function isString(value) {
    return typeof value == "string" || !isArray_default(value) && isObjectLike_default(value) && baseGetTag_default(value) == stringTag5;
  }
  var isString_default = isString;
  function baseValues(object2, props) {
    return arrayMap_default(props, function(key) {
      return object2[key];
    });
  }
  var baseValues_default = baseValues;
  function values(object2) {
    return object2 == null ? [] : baseValues_default(object2, keys_default(object2));
  }
  var values_default = values;
  var nativeMax3 = Math.max;
  function includes(collection2, value, fromIndex, guard) {
    collection2 = isArrayLike_default(collection2) ? collection2 : values_default(collection2);
    fromIndex = fromIndex && !guard ? toInteger_default(fromIndex) : 0;
    var length = collection2.length;
    if (fromIndex < 0) {
      fromIndex = nativeMax3(length + fromIndex, 0);
    }
    return isString_default(collection2) ? fromIndex <= length && collection2.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf_default(collection2, value, fromIndex) > -1;
  }
  var includes_default = includes;
  var nativeMax4 = Math.max;
  function indexOf(array, value, fromIndex) {
    var length = array == null ? 0 : array.length;
    if (!length) {
      return -1;
    }
    var index = fromIndex == null ? 0 : toInteger_default(fromIndex);
    if (index < 0) {
      index = nativeMax4(length + index, 0);
    }
    return baseIndexOf_default(array, value, index);
  }
  var indexOf_default = indexOf;
  var mapTag7 = "[object Map]";
  var setTag7 = "[object Set]";
  var objectProto20 = Object.prototype;
  var hasOwnProperty17 = objectProto20.hasOwnProperty;
  function isEmpty(value) {
    if (value == null) {
      return true;
    }
    if (isArrayLike_default(value) && (isArray_default(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer_default(value) || isTypedArray_default(value) || isArguments_default(value))) {
      return !value.length;
    }
    var tag = getTag_default(value);
    if (tag == mapTag7 || tag == setTag7) {
      return !value.size;
    }
    if (isPrototype_default(value)) {
      return !baseKeys_default(value).length;
    }
    for (var key in value) {
      if (hasOwnProperty17.call(value, key)) {
        return false;
      }
    }
    return true;
  }
  var isEmpty_default = isEmpty;
  var regexpTag5 = "[object RegExp]";
  function baseIsRegExp(value) {
    return isObjectLike_default(value) && baseGetTag_default(value) == regexpTag5;
  }
  var baseIsRegExp_default = baseIsRegExp;
  var nodeIsRegExp = nodeUtil_default && nodeUtil_default.isRegExp;
  var isRegExp = nodeIsRegExp ? baseUnary_default(nodeIsRegExp) : baseIsRegExp_default;
  var isRegExp_default = isRegExp;
  function isUndefined(value) {
    return value === void 0;
  }
  var isUndefined_default = isUndefined;
  var FUNC_ERROR_TEXT2 = "Expected a function";
  function negate(predicate) {
    if (typeof predicate != "function") {
      throw new TypeError(FUNC_ERROR_TEXT2);
    }
    return function() {
      var args = arguments;
      switch (args.length) {
        case 0:
          return !predicate.call(this);
        case 1:
          return !predicate.call(this, args[0]);
        case 2:
          return !predicate.call(this, args[0], args[1]);
        case 3:
          return !predicate.call(this, args[0], args[1], args[2]);
      }
      return !predicate.apply(this, args);
    };
  }
  var negate_default = negate;
  function baseSet(object2, path2, value, customizer) {
    if (!isObject_default(object2)) {
      return object2;
    }
    path2 = castPath_default(path2, object2);
    var index = -1, length = path2.length, lastIndex = length - 1, nested = object2;
    while (nested != null && ++index < length) {
      var key = toKey_default(path2[index]), newValue = value;
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        return object2;
      }
      if (index != lastIndex) {
        var objValue = nested[key];
        newValue = customizer ? customizer(objValue, key, nested) : void 0;
        if (newValue === void 0) {
          newValue = isObject_default(objValue) ? objValue : isIndex_default(path2[index + 1]) ? [] : {};
        }
      }
      assignValue_default(nested, key, newValue);
      nested = nested[key];
    }
    return object2;
  }
  var baseSet_default = baseSet;
  function basePickBy(object2, paths, predicate) {
    var index = -1, length = paths.length, result = {};
    while (++index < length) {
      var path2 = paths[index], value = baseGet_default(object2, path2);
      if (predicate(value, path2)) {
        baseSet_default(result, castPath_default(path2, object2), value);
      }
    }
    return result;
  }
  var basePickBy_default = basePickBy;
  function pickBy(object2, predicate) {
    if (object2 == null) {
      return {};
    }
    var props = arrayMap_default(getAllKeysIn_default(object2), function(prop) {
      return [prop];
    });
    predicate = baseIteratee_default(predicate);
    return basePickBy_default(object2, props, function(value, path2) {
      return predicate(value, path2[0]);
    });
  }
  var pickBy_default = pickBy;
  function baseReduce(collection2, iteratee, accumulator, initAccum, eachFunc) {
    eachFunc(collection2, function(value, index, collection22) {
      accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection22);
    });
    return accumulator;
  }
  var baseReduce_default = baseReduce;
  function reduce(collection2, iteratee, accumulator) {
    var func = isArray_default(collection2) ? arrayReduce_default : baseReduce_default, initAccum = arguments.length < 3;
    return func(collection2, baseIteratee_default(iteratee, 4), accumulator, initAccum, baseEach_default);
  }
  var reduce_default = reduce;
  function reject(collection2, predicate) {
    var func = isArray_default(collection2) ? arrayFilter_default : baseFilter_default;
    return func(collection2, negate_default(baseIteratee_default(predicate, 3)));
  }
  var reject_default = reject;
  function baseSome(collection2, predicate) {
    var result;
    baseEach_default(collection2, function(value, index, collection22) {
      result = predicate(value, index, collection22);
      return !result;
    });
    return !!result;
  }
  var baseSome_default = baseSome;
  function some(collection2, predicate, guard) {
    var func = isArray_default(collection2) ? arraySome_default : baseSome_default;
    if (guard && isIterateeCall_default(collection2, predicate, guard)) {
      predicate = void 0;
    }
    return func(collection2, baseIteratee_default(predicate, 3));
  }
  var some_default = some;
  var INFINITY4 = 1 / 0;
  var createSet = !(Set_default && 1 / setToArray_default(new Set_default([, -0]))[1] == INFINITY4) ? noop_default : function(values22) {
    return new Set_default(values22);
  };
  var createSet_default = createSet;
  var LARGE_ARRAY_SIZE3 = 200;
  function baseUniq(array, iteratee, comparator) {
    var index = -1, includes2 = arrayIncludes_default, length = array.length, isCommon = true, result = [], seen = result;
    if (comparator) {
      isCommon = false;
      includes2 = arrayIncludesWith_default;
    } else if (length >= LARGE_ARRAY_SIZE3) {
      var set = iteratee ? null : createSet_default(array);
      if (set) {
        return setToArray_default(set);
      }
      isCommon = false;
      includes2 = cacheHas_default;
      seen = new SetCache_default();
    } else {
      seen = iteratee ? [] : result;
    }
    outer:
      while (++index < length) {
        var value = array[index], computed = iteratee ? iteratee(value) : value;
        value = comparator || value !== 0 ? value : 0;
        if (isCommon && computed === computed) {
          var seenIndex = seen.length;
          while (seenIndex--) {
            if (seen[seenIndex] === computed) {
              continue outer;
            }
          }
          if (iteratee) {
            seen.push(computed);
          }
          result.push(value);
        } else if (!includes2(seen, computed, comparator)) {
          if (seen !== result) {
            seen.push(computed);
          }
          result.push(value);
        }
      }
    return result;
  }
  var baseUniq_default = baseUniq;
  function uniq(array) {
    return array && array.length ? baseUniq_default(array) : [];
  }
  var uniq_default = uniq;
  function PRINT_ERROR(msg) {
    if (console && console.error) {
      console.error(`Error: ${msg}`);
    }
  }
  function PRINT_WARNING(msg) {
    if (console && console.warn) {
      console.warn(`Warning: ${msg}`);
    }
  }
  function timer(func) {
    const start = (/* @__PURE__ */ new Date()).getTime();
    const val = func();
    const end = (/* @__PURE__ */ new Date()).getTime();
    const total = end - start;
    return { time: total, value: val };
  }
  function toFastProperties(toBecomeFast) {
    function FakeConstructor() {
    }
    FakeConstructor.prototype = toBecomeFast;
    const fakeInstance = new FakeConstructor();
    function fakeAccess() {
      return typeof fakeInstance.bar;
    }
    fakeAccess();
    fakeAccess();
    if (1)
      return toBecomeFast;
    (0, eval)(toBecomeFast);
  }
  function tokenLabel(tokType) {
    if (hasTokenLabel(tokType)) {
      return tokType.LABEL;
    } else {
      return tokType.name;
    }
  }
  function hasTokenLabel(obj) {
    return isString_default(obj.LABEL) && obj.LABEL !== "";
  }
  var AbstractProduction = class {
    get definition() {
      return this._definition;
    }
    set definition(value) {
      this._definition = value;
    }
    constructor(_definition) {
      this._definition = _definition;
    }
    accept(visitor) {
      visitor.visit(this);
      forEach_default(this.definition, (prod) => {
        prod.accept(visitor);
      });
    }
  };
  var NonTerminal = class extends AbstractProduction {
    constructor(options) {
      super([]);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
    set definition(definition) {
    }
    get definition() {
      if (this.referencedRule !== void 0) {
        return this.referencedRule.definition;
      }
      return [];
    }
    accept(visitor) {
      visitor.visit(this);
    }
  };
  var Rule = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.orgText = "";
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var Alternative = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.ignoreAmbiguities = false;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var Option = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var RepetitionMandatory = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var RepetitionMandatoryWithSeparator = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var Repetition = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var RepetitionWithSeparator = class extends AbstractProduction {
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var Alternation = class extends AbstractProduction {
    get definition() {
      return this._definition;
    }
    set definition(value) {
      this._definition = value;
    }
    constructor(options) {
      super(options.definition);
      this.idx = 1;
      this.ignoreAmbiguities = false;
      this.hasPredicates = false;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
  };
  var Terminal = class {
    constructor(options) {
      this.idx = 1;
      assign_default(this, pickBy_default(options, (v) => v !== void 0));
    }
    accept(visitor) {
      visitor.visit(this);
    }
  };
  function serializeGrammar(topRules) {
    return map_default(topRules, serializeProduction);
  }
  function serializeProduction(node) {
    function convertDefinition(definition) {
      return map_default(definition, serializeProduction);
    }
    if (node instanceof NonTerminal) {
      const serializedNonTerminal = {
        type: "NonTerminal",
        name: node.nonTerminalName,
        idx: node.idx
      };
      if (isString_default(node.label)) {
        serializedNonTerminal.label = node.label;
      }
      return serializedNonTerminal;
    } else if (node instanceof Alternative) {
      return {
        type: "Alternative",
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Option) {
      return {
        type: "Option",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionMandatory) {
      return {
        type: "RepetitionMandatory",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionMandatoryWithSeparator) {
      return {
        type: "RepetitionMandatoryWithSeparator",
        idx: node.idx,
        separator: serializeProduction(new Terminal({ terminalType: node.separator })),
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof RepetitionWithSeparator) {
      return {
        type: "RepetitionWithSeparator",
        idx: node.idx,
        separator: serializeProduction(new Terminal({ terminalType: node.separator })),
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Repetition) {
      return {
        type: "Repetition",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Alternation) {
      return {
        type: "Alternation",
        idx: node.idx,
        definition: convertDefinition(node.definition)
      };
    } else if (node instanceof Terminal) {
      const serializedTerminal = {
        type: "Terminal",
        name: node.terminalType.name,
        label: tokenLabel(node.terminalType),
        idx: node.idx
      };
      if (isString_default(node.label)) {
        serializedTerminal.terminalLabel = node.label;
      }
      const pattern = node.terminalType.PATTERN;
      if (node.terminalType.PATTERN) {
        serializedTerminal.pattern = isRegExp_default(pattern) ? pattern.source : pattern;
      }
      return serializedTerminal;
    } else if (node instanceof Rule) {
      return {
        type: "Rule",
        name: node.name,
        orgText: node.orgText,
        definition: convertDefinition(node.definition)
      };
    } else {
      throw Error("non exhaustive match");
    }
  }
  var GAstVisitor = class {
    visit(node) {
      const nodeAny = node;
      switch (nodeAny.constructor) {
        case NonTerminal:
          return this.visitNonTerminal(nodeAny);
        case Alternative:
          return this.visitAlternative(nodeAny);
        case Option:
          return this.visitOption(nodeAny);
        case RepetitionMandatory:
          return this.visitRepetitionMandatory(nodeAny);
        case RepetitionMandatoryWithSeparator:
          return this.visitRepetitionMandatoryWithSeparator(nodeAny);
        case RepetitionWithSeparator:
          return this.visitRepetitionWithSeparator(nodeAny);
        case Repetition:
          return this.visitRepetition(nodeAny);
        case Alternation:
          return this.visitAlternation(nodeAny);
        case Terminal:
          return this.visitTerminal(nodeAny);
        case Rule:
          return this.visitRule(nodeAny);
        /* c8 ignore next 2 */
        default:
          throw Error("non exhaustive match");
      }
    }
    /* c8 ignore next */
    visitNonTerminal(node) {
    }
    /* c8 ignore next */
    visitAlternative(node) {
    }
    /* c8 ignore next */
    visitOption(node) {
    }
    /* c8 ignore next */
    visitRepetition(node) {
    }
    /* c8 ignore next */
    visitRepetitionMandatory(node) {
    }
    /* c8 ignore next 3 */
    visitRepetitionMandatoryWithSeparator(node) {
    }
    /* c8 ignore next */
    visitRepetitionWithSeparator(node) {
    }
    /* c8 ignore next */
    visitAlternation(node) {
    }
    /* c8 ignore next */
    visitTerminal(node) {
    }
    /* c8 ignore next */
    visitRule(node) {
    }
  };
  function isSequenceProd(prod) {
    return prod instanceof Alternative || prod instanceof Option || prod instanceof Repetition || prod instanceof RepetitionMandatory || prod instanceof RepetitionMandatoryWithSeparator || prod instanceof RepetitionWithSeparator || prod instanceof Terminal || prod instanceof Rule;
  }
  function isOptionalProd(prod, alreadyVisited = []) {
    const isDirectlyOptional = prod instanceof Option || prod instanceof Repetition || prod instanceof RepetitionWithSeparator;
    if (isDirectlyOptional) {
      return true;
    }
    if (prod instanceof Alternation) {
      return some_default(prod.definition, (subProd) => {
        return isOptionalProd(subProd, alreadyVisited);
      });
    } else if (prod instanceof NonTerminal && includes_default(alreadyVisited, prod)) {
      return false;
    } else if (prod instanceof AbstractProduction) {
      if (prod instanceof NonTerminal) {
        alreadyVisited.push(prod);
      }
      return every_default(prod.definition, (subProd) => {
        return isOptionalProd(subProd, alreadyVisited);
      });
    } else {
      return false;
    }
  }
  function isBranchingProd(prod) {
    return prod instanceof Alternation;
  }
  function getProductionDslName(prod) {
    if (prod instanceof NonTerminal) {
      return "SUBRULE";
    } else if (prod instanceof Option) {
      return "OPTION";
    } else if (prod instanceof Alternation) {
      return "OR";
    } else if (prod instanceof RepetitionMandatory) {
      return "AT_LEAST_ONE";
    } else if (prod instanceof RepetitionMandatoryWithSeparator) {
      return "AT_LEAST_ONE_SEP";
    } else if (prod instanceof RepetitionWithSeparator) {
      return "MANY_SEP";
    } else if (prod instanceof Repetition) {
      return "MANY";
    } else if (prod instanceof Terminal) {
      return "CONSUME";
    } else {
      throw Error("non exhaustive match");
    }
  }
  var RestWalker = class {
    walk(prod, prevRest = []) {
      forEach_default(prod.definition, (subProd, index) => {
        const currRest = drop_default(prod.definition, index + 1);
        if (subProd instanceof NonTerminal) {
          this.walkProdRef(subProd, currRest, prevRest);
        } else if (subProd instanceof Terminal) {
          this.walkTerminal(subProd, currRest, prevRest);
        } else if (subProd instanceof Alternative) {
          this.walkFlat(subProd, currRest, prevRest);
        } else if (subProd instanceof Option) {
          this.walkOption(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionMandatory) {
          this.walkAtLeastOne(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionMandatoryWithSeparator) {
          this.walkAtLeastOneSep(subProd, currRest, prevRest);
        } else if (subProd instanceof RepetitionWithSeparator) {
          this.walkManySep(subProd, currRest, prevRest);
        } else if (subProd instanceof Repetition) {
          this.walkMany(subProd, currRest, prevRest);
        } else if (subProd instanceof Alternation) {
          this.walkOr(subProd, currRest, prevRest);
        } else {
          throw Error("non exhaustive match");
        }
      });
    }
    walkTerminal(terminal, currRest, prevRest) {
    }
    walkProdRef(refProd, currRest, prevRest) {
    }
    walkFlat(flatProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      this.walk(flatProd, fullOrRest);
    }
    walkOption(optionProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      this.walk(optionProd, fullOrRest);
    }
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      const fullAtLeastOneRest = [
        new Option({ definition: atLeastOneProd.definition })
      ].concat(currRest, prevRest);
      this.walk(atLeastOneProd, fullAtLeastOneRest);
    }
    walkAtLeastOneSep(atLeastOneSepProd, currRest, prevRest) {
      const fullAtLeastOneSepRest = restForRepetitionWithSeparator(atLeastOneSepProd, currRest, prevRest);
      this.walk(atLeastOneSepProd, fullAtLeastOneSepRest);
    }
    walkMany(manyProd, currRest, prevRest) {
      const fullManyRest = [
        new Option({ definition: manyProd.definition })
      ].concat(currRest, prevRest);
      this.walk(manyProd, fullManyRest);
    }
    walkManySep(manySepProd, currRest, prevRest) {
      const fullManySepRest = restForRepetitionWithSeparator(manySepProd, currRest, prevRest);
      this.walk(manySepProd, fullManySepRest);
    }
    walkOr(orProd, currRest, prevRest) {
      const fullOrRest = currRest.concat(prevRest);
      forEach_default(orProd.definition, (alt) => {
        const prodWrapper = new Alternative({ definition: [alt] });
        this.walk(prodWrapper, fullOrRest);
      });
    }
  };
  function restForRepetitionWithSeparator(repSepProd, currRest, prevRest) {
    const repSepRest = [
      new Option({
        definition: [
          new Terminal({ terminalType: repSepProd.separator })
        ].concat(repSepProd.definition)
      })
    ];
    const fullRepSepRest = repSepRest.concat(currRest, prevRest);
    return fullRepSepRest;
  }
  function first(prod) {
    if (prod instanceof NonTerminal) {
      return first(prod.referencedRule);
    } else if (prod instanceof Terminal) {
      return firstForTerminal(prod);
    } else if (isSequenceProd(prod)) {
      return firstForSequence(prod);
    } else if (isBranchingProd(prod)) {
      return firstForBranching(prod);
    } else {
      throw Error("non exhaustive match");
    }
  }
  function firstForSequence(prod) {
    let firstSet = [];
    const seq = prod.definition;
    let nextSubProdIdx = 0;
    let hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    let currSubProd;
    let isLastInnerProdOptional = true;
    while (hasInnerProdsRemaining && isLastInnerProdOptional) {
      currSubProd = seq[nextSubProdIdx];
      isLastInnerProdOptional = isOptionalProd(currSubProd);
      firstSet = firstSet.concat(first(currSubProd));
      nextSubProdIdx = nextSubProdIdx + 1;
      hasInnerProdsRemaining = seq.length > nextSubProdIdx;
    }
    return uniq_default(firstSet);
  }
  function firstForBranching(prod) {
    const allAlternativesFirsts = map_default(prod.definition, (innerProd) => {
      return first(innerProd);
    });
    return uniq_default(flatten_default(allAlternativesFirsts));
  }
  function firstForTerminal(terminal) {
    return [terminal.terminalType];
  }
  var IN = "_~IN~_";
  var ResyncFollowsWalker = class extends RestWalker {
    constructor(topProd) {
      super();
      this.topProd = topProd;
      this.follows = {};
    }
    startWalking() {
      this.walk(this.topProd);
      return this.follows;
    }
    walkTerminal(terminal, currRest, prevRest) {
    }
    walkProdRef(refProd, currRest, prevRest) {
      const followName = buildBetweenProdsFollowPrefix(refProd.referencedRule, refProd.idx) + this.topProd.name;
      const fullRest = currRest.concat(prevRest);
      const restProd = new Alternative({ definition: fullRest });
      const t_in_topProd_follows = first(restProd);
      this.follows[followName] = t_in_topProd_follows;
    }
  };
  function computeAllProdsFollows(topProductions) {
    const reSyncFollows = {};
    forEach_default(topProductions, (topProd) => {
      const currRefsFollow = new ResyncFollowsWalker(topProd).startWalking();
      assign_default(reSyncFollows, currRefsFollow);
    });
    return reSyncFollows;
  }
  function buildBetweenProdsFollowPrefix(inner, occurenceInParent) {
    return inner.name + occurenceInParent + IN;
  }
  function cc(char) {
    return char.charCodeAt(0);
  }
  function insertToSet(item, set) {
    if (Array.isArray(item)) {
      item.forEach(function(subItem) {
        set.push(subItem);
      });
    } else {
      set.push(item);
    }
  }
  function addFlag(flagObj, flagKey) {
    if (flagObj[flagKey] === true) {
      throw "duplicate flag " + flagKey;
    }
    const x = flagObj[flagKey];
    flagObj[flagKey] = true;
  }
  function ASSERT_EXISTS(obj) {
    if (obj === void 0) {
      throw Error("Internal Error - Should never get here!");
    }
    return true;
  }
  function ASSERT_NEVER_REACH_HERE() {
    throw Error("Internal Error - Should never get here!");
  }
  function isCharacter(obj) {
    return obj["type"] === "Character";
  }
  var digitsCharCodes = [];
  for (let i = cc("0"); i <= cc("9"); i++) {
    digitsCharCodes.push(i);
  }
  var wordCharCodes = [cc("_")].concat(digitsCharCodes);
  for (let i = cc("a"); i <= cc("z"); i++) {
    wordCharCodes.push(i);
  }
  for (let i = cc("A"); i <= cc("Z"); i++) {
    wordCharCodes.push(i);
  }
  var whitespaceCodes = [
    cc(" "),
    cc("\f"),
    cc("\n"),
    cc("\r"),
    cc("	"),
    cc("\v"),
    cc("	"),
    cc("\xA0"),
    cc("\u1680"),
    cc("\u2000"),
    cc("\u2001"),
    cc("\u2002"),
    cc("\u2003"),
    cc("\u2004"),
    cc("\u2005"),
    cc("\u2006"),
    cc("\u2007"),
    cc("\u2008"),
    cc("\u2009"),
    cc("\u200A"),
    cc("\u2028"),
    cc("\u2029"),
    cc("\u202F"),
    cc("\u205F"),
    cc("\u3000"),
    cc("\uFEFF")
  ];
  var hexDigitPattern = /[0-9a-fA-F]/;
  var decimalPattern = /[0-9]/;
  var decimalPatternNoZero = /[1-9]/;
  var RegExpParser = class {
    constructor() {
      this.idx = 0;
      this.input = "";
      this.groupIdx = 0;
    }
    saveState() {
      return {
        idx: this.idx,
        input: this.input,
        groupIdx: this.groupIdx
      };
    }
    restoreState(newState) {
      this.idx = newState.idx;
      this.input = newState.input;
      this.groupIdx = newState.groupIdx;
    }
    pattern(input) {
      this.idx = 0;
      this.input = input;
      this.groupIdx = 0;
      this.consumeChar("/");
      const value = this.disjunction();
      this.consumeChar("/");
      const flags = {
        type: "Flags",
        loc: { begin: this.idx, end: input.length },
        global: false,
        ignoreCase: false,
        multiLine: false,
        unicode: false,
        sticky: false
      };
      while (this.isRegExpFlag()) {
        switch (this.popChar()) {
          case "g":
            addFlag(flags, "global");
            break;
          case "i":
            addFlag(flags, "ignoreCase");
            break;
          case "m":
            addFlag(flags, "multiLine");
            break;
          case "u":
            addFlag(flags, "unicode");
            break;
          case "y":
            addFlag(flags, "sticky");
            break;
        }
      }
      if (this.idx !== this.input.length) {
        throw Error("Redundant input: " + this.input.substring(this.idx));
      }
      return {
        type: "Pattern",
        flags,
        value,
        loc: this.loc(0)
      };
    }
    disjunction() {
      const alts = [];
      const begin = this.idx;
      alts.push(this.alternative());
      while (this.peekChar() === "|") {
        this.consumeChar("|");
        alts.push(this.alternative());
      }
      return { type: "Disjunction", value: alts, loc: this.loc(begin) };
    }
    alternative() {
      const terms = [];
      const begin = this.idx;
      while (this.isTerm()) {
        terms.push(this.term());
      }
      return { type: "Alternative", value: terms, loc: this.loc(begin) };
    }
    term() {
      if (this.isAssertion()) {
        return this.assertion();
      } else {
        return this.atom();
      }
    }
    assertion() {
      const begin = this.idx;
      switch (this.popChar()) {
        case "^":
          return {
            type: "StartAnchor",
            loc: this.loc(begin)
          };
        case "$":
          return { type: "EndAnchor", loc: this.loc(begin) };
        // '\b' or '\B'
        case "\\":
          switch (this.popChar()) {
            case "b":
              return {
                type: "WordBoundary",
                loc: this.loc(begin)
              };
            case "B":
              return {
                type: "NonWordBoundary",
                loc: this.loc(begin)
              };
          }
          throw Error("Invalid Assertion Escape");
        // '(?=' or '(?!'
        case "(":
          this.consumeChar("?");
          let type;
          switch (this.popChar()) {
            case "=":
              type = "Lookahead";
              break;
            case "!":
              type = "NegativeLookahead";
              break;
            case "<": {
              switch (this.popChar()) {
                case "=":
                  type = "Lookbehind";
                  break;
                case "!":
                  type = "NegativeLookbehind";
              }
              break;
            }
          }
          ASSERT_EXISTS(type);
          const disjunction = this.disjunction();
          this.consumeChar(")");
          return {
            type,
            value: disjunction,
            loc: this.loc(begin)
          };
      }
      return ASSERT_NEVER_REACH_HERE();
    }
    quantifier(isBacktracking = false) {
      let range = void 0;
      const begin = this.idx;
      switch (this.popChar()) {
        case "*":
          range = {
            atLeast: 0,
            atMost: Infinity
          };
          break;
        case "+":
          range = {
            atLeast: 1,
            atMost: Infinity
          };
          break;
        case "?":
          range = {
            atLeast: 0,
            atMost: 1
          };
          break;
        case "{":
          const atLeast = this.integerIncludingZero();
          switch (this.popChar()) {
            case "}":
              range = {
                atLeast,
                atMost: atLeast
              };
              break;
            case ",":
              let atMost;
              if (this.isDigit()) {
                atMost = this.integerIncludingZero();
                range = {
                  atLeast,
                  atMost
                };
              } else {
                range = {
                  atLeast,
                  atMost: Infinity
                };
              }
              this.consumeChar("}");
              break;
          }
          if (isBacktracking === true && range === void 0) {
            return void 0;
          }
          ASSERT_EXISTS(range);
          break;
      }
      if (isBacktracking === true && range === void 0) {
        return void 0;
      }
      if (ASSERT_EXISTS(range)) {
        if (this.peekChar(0) === "?") {
          this.consumeChar("?");
          range.greedy = false;
        } else {
          range.greedy = true;
        }
        range.type = "Quantifier";
        range.loc = this.loc(begin);
        return range;
      }
    }
    atom() {
      let atom;
      const begin = this.idx;
      switch (this.peekChar()) {
        case ".":
          atom = this.dotAll();
          break;
        case "\\":
          atom = this.atomEscape();
          break;
        case "[":
          atom = this.characterClass();
          break;
        case "(":
          atom = this.group();
          break;
      }
      if (atom === void 0 && this.isPatternCharacter()) {
        atom = this.patternCharacter();
      }
      if (ASSERT_EXISTS(atom)) {
        atom.loc = this.loc(begin);
        if (this.isQuantifier()) {
          atom.quantifier = this.quantifier();
        }
        return atom;
      }
      return ASSERT_NEVER_REACH_HERE();
    }
    dotAll() {
      this.consumeChar(".");
      return {
        type: "Set",
        complement: true,
        value: [cc("\n"), cc("\r"), cc("\u2028"), cc("\u2029")]
      };
    }
    atomEscape() {
      this.consumeChar("\\");
      switch (this.peekChar()) {
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          return this.decimalEscapeAtom();
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return this.characterClassEscape();
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
          return this.controlEscapeAtom();
        case "c":
          return this.controlLetterEscapeAtom();
        case "0":
          return this.nulCharacterAtom();
        case "x":
          return this.hexEscapeSequenceAtom();
        case "u":
          return this.regExpUnicodeEscapeSequenceAtom();
        default:
          return this.identityEscapeAtom();
      }
    }
    decimalEscapeAtom() {
      const value = this.positiveInteger();
      return { type: "GroupBackReference", value };
    }
    characterClassEscape() {
      let set;
      let complement = false;
      switch (this.popChar()) {
        case "d":
          set = digitsCharCodes;
          break;
        case "D":
          set = digitsCharCodes;
          complement = true;
          break;
        case "s":
          set = whitespaceCodes;
          break;
        case "S":
          set = whitespaceCodes;
          complement = true;
          break;
        case "w":
          set = wordCharCodes;
          break;
        case "W":
          set = wordCharCodes;
          complement = true;
          break;
      }
      if (ASSERT_EXISTS(set)) {
        return { type: "Set", value: set, complement };
      }
      return ASSERT_NEVER_REACH_HERE();
    }
    controlEscapeAtom() {
      let escapeCode;
      switch (this.popChar()) {
        case "f":
          escapeCode = cc("\f");
          break;
        case "n":
          escapeCode = cc("\n");
          break;
        case "r":
          escapeCode = cc("\r");
          break;
        case "t":
          escapeCode = cc("	");
          break;
        case "v":
          escapeCode = cc("\v");
          break;
      }
      if (ASSERT_EXISTS(escapeCode)) {
        return { type: "Character", value: escapeCode };
      }
      return ASSERT_NEVER_REACH_HERE();
    }
    controlLetterEscapeAtom() {
      this.consumeChar("c");
      const letter = this.popChar();
      if (/[a-zA-Z]/.test(letter) === false) {
        throw Error("Invalid ");
      }
      const letterCode = letter.toUpperCase().charCodeAt(0) - 64;
      return { type: "Character", value: letterCode };
    }
    nulCharacterAtom() {
      this.consumeChar("0");
      return { type: "Character", value: cc("\0") };
    }
    hexEscapeSequenceAtom() {
      this.consumeChar("x");
      return this.parseHexDigits(2);
    }
    regExpUnicodeEscapeSequenceAtom() {
      this.consumeChar("u");
      return this.parseHexDigits(4);
    }
    identityEscapeAtom() {
      const escapedChar = this.popChar();
      return { type: "Character", value: cc(escapedChar) };
    }
    classPatternCharacterAtom() {
      switch (this.peekChar()) {
        // istanbul ignore next
        case "\n":
        // istanbul ignore next
        case "\r":
        // istanbul ignore next
        case "\u2028":
        // istanbul ignore next
        case "\u2029":
        // istanbul ignore next
        case "\\":
        // istanbul ignore next
        case "]":
          throw Error("TBD");
        default:
          const nextChar = this.popChar();
          return { type: "Character", value: cc(nextChar) };
      }
    }
    characterClass() {
      const set = [];
      let complement = false;
      this.consumeChar("[");
      if (this.peekChar(0) === "^") {
        this.consumeChar("^");
        complement = true;
      }
      while (this.isClassAtom()) {
        const from2 = this.classAtom();
        const isFromSingleChar = from2.type === "Character";
        if (isCharacter(from2) && this.isRangeDash()) {
          this.consumeChar("-");
          const to2 = this.classAtom();
          const isToSingleChar = to2.type === "Character";
          if (isCharacter(to2)) {
            if (to2.value < from2.value) {
              throw Error("Range out of order in character class");
            }
            set.push({ from: from2.value, to: to2.value });
          } else {
            insertToSet(from2.value, set);
            set.push(cc("-"));
            insertToSet(to2.value, set);
          }
        } else {
          insertToSet(from2.value, set);
        }
      }
      this.consumeChar("]");
      return { type: "Set", complement, value: set };
    }
    classAtom() {
      switch (this.peekChar()) {
        // istanbul ignore next
        case "]":
        // istanbul ignore next
        case "\n":
        // istanbul ignore next
        case "\r":
        // istanbul ignore next
        case "\u2028":
        // istanbul ignore next
        case "\u2029":
          throw Error("TBD");
        case "\\":
          return this.classEscape();
        default:
          return this.classPatternCharacterAtom();
      }
    }
    classEscape() {
      this.consumeChar("\\");
      switch (this.peekChar()) {
        // Matches a backspace.
        // (Not to be confused with \b word boundary outside characterClass)
        case "b":
          this.consumeChar("b");
          return { type: "Character", value: cc("\b") };
        case "d":
        case "D":
        case "s":
        case "S":
        case "w":
        case "W":
          return this.characterClassEscape();
        case "f":
        case "n":
        case "r":
        case "t":
        case "v":
          return this.controlEscapeAtom();
        case "c":
          return this.controlLetterEscapeAtom();
        case "0":
          return this.nulCharacterAtom();
        case "x":
          return this.hexEscapeSequenceAtom();
        case "u":
          return this.regExpUnicodeEscapeSequenceAtom();
        default:
          return this.identityEscapeAtom();
      }
    }
    group() {
      let capturing = true;
      this.consumeChar("(");
      switch (this.peekChar(0)) {
        case "?":
          this.consumeChar("?");
          this.consumeChar(":");
          capturing = false;
          break;
        default:
          this.groupIdx++;
          break;
      }
      const value = this.disjunction();
      this.consumeChar(")");
      const groupAst = {
        type: "Group",
        capturing,
        value
      };
      if (capturing) {
        groupAst["idx"] = this.groupIdx;
      }
      return groupAst;
    }
    positiveInteger() {
      let number = this.popChar();
      if (decimalPatternNoZero.test(number) === false) {
        throw Error("Expecting a positive integer");
      }
      while (decimalPattern.test(this.peekChar(0))) {
        number += this.popChar();
      }
      return parseInt(number, 10);
    }
    integerIncludingZero() {
      let number = this.popChar();
      if (decimalPattern.test(number) === false) {
        throw Error("Expecting an integer");
      }
      while (decimalPattern.test(this.peekChar(0))) {
        number += this.popChar();
      }
      return parseInt(number, 10);
    }
    patternCharacter() {
      const nextChar = this.popChar();
      switch (nextChar) {
        // istanbul ignore next
        case "\n":
        // istanbul ignore next
        case "\r":
        // istanbul ignore next
        case "\u2028":
        // istanbul ignore next
        case "\u2029":
        // istanbul ignore next
        case "^":
        // istanbul ignore next
        case "$":
        // istanbul ignore next
        case "\\":
        // istanbul ignore next
        case ".":
        // istanbul ignore next
        case "*":
        // istanbul ignore next
        case "+":
        // istanbul ignore next
        case "?":
        // istanbul ignore next
        case "(":
        // istanbul ignore next
        case ")":
        // istanbul ignore next
        case "[":
        // istanbul ignore next
        case "|":
          throw Error("TBD");
        default:
          return { type: "Character", value: cc(nextChar) };
      }
    }
    isRegExpFlag() {
      switch (this.peekChar(0)) {
        case "g":
        case "i":
        case "m":
        case "u":
        case "y":
          return true;
        default:
          return false;
      }
    }
    isRangeDash() {
      return this.peekChar() === "-" && this.isClassAtom(1);
    }
    isDigit() {
      return decimalPattern.test(this.peekChar(0));
    }
    isClassAtom(howMuch = 0) {
      switch (this.peekChar(howMuch)) {
        case "]":
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
          return false;
        default:
          return true;
      }
    }
    isTerm() {
      return this.isAtom() || this.isAssertion();
    }
    isAtom() {
      if (this.isPatternCharacter()) {
        return true;
      }
      switch (this.peekChar(0)) {
        case ".":
        case "\\":
        // atomEscape
        case "[":
        // characterClass
        // TODO: isAtom must be called before isAssertion - disambiguate
        case "(":
          return true;
        default:
          return false;
      }
    }
    isAssertion() {
      switch (this.peekChar(0)) {
        case "^":
        case "$":
          return true;
        // '\b' or '\B'
        case "\\":
          switch (this.peekChar(1)) {
            case "b":
            case "B":
              return true;
            default:
              return false;
          }
        // '(?=' or '(?!' or `(?<=` or `(?<!`
        case "(":
          return this.peekChar(1) === "?" && (this.peekChar(2) === "=" || this.peekChar(2) === "!" || this.peekChar(2) === "<" && (this.peekChar(3) === "=" || this.peekChar(3) === "!"));
        default:
          return false;
      }
    }
    isQuantifier() {
      const prevState = this.saveState();
      try {
        return this.quantifier(true) !== void 0;
      } catch (e) {
        return false;
      } finally {
        this.restoreState(prevState);
      }
    }
    isPatternCharacter() {
      switch (this.peekChar()) {
        case "^":
        case "$":
        case "\\":
        case ".":
        case "*":
        case "+":
        case "?":
        case "(":
        case ")":
        case "[":
        case "|":
        case "/":
        case "\n":
        case "\r":
        case "\u2028":
        case "\u2029":
          return false;
        default:
          return true;
      }
    }
    parseHexDigits(howMany) {
      let hexString = "";
      for (let i = 0; i < howMany; i++) {
        const hexChar = this.popChar();
        if (hexDigitPattern.test(hexChar) === false) {
          throw Error("Expecting a HexDecimal digits");
        }
        hexString += hexChar;
      }
      const charCode = parseInt(hexString, 16);
      return { type: "Character", value: charCode };
    }
    peekChar(howMuch = 0) {
      return this.input[this.idx + howMuch];
    }
    popChar() {
      const nextChar = this.peekChar(0);
      this.consumeChar(void 0);
      return nextChar;
    }
    consumeChar(char) {
      if (char !== void 0 && this.input[this.idx] !== char) {
        throw Error("Expected: '" + char + "' but found: '" + this.input[this.idx] + "' at offset: " + this.idx);
      }
      if (this.idx >= this.input.length) {
        throw Error("Unexpected end of input");
      }
      this.idx++;
    }
    loc(begin) {
      return { begin, end: this.idx };
    }
  };
  var BaseRegExpVisitor = class {
    visitChildren(node) {
      for (const key in node) {
        const child = node[key];
        if (node.hasOwnProperty(key)) {
          if (child.type !== void 0) {
            this.visit(child);
          } else if (Array.isArray(child)) {
            child.forEach((subChild) => {
              this.visit(subChild);
            }, this);
          }
        }
      }
    }
    visit(node) {
      switch (node.type) {
        case "Pattern":
          this.visitPattern(node);
          break;
        case "Flags":
          this.visitFlags(node);
          break;
        case "Disjunction":
          this.visitDisjunction(node);
          break;
        case "Alternative":
          this.visitAlternative(node);
          break;
        case "StartAnchor":
          this.visitStartAnchor(node);
          break;
        case "EndAnchor":
          this.visitEndAnchor(node);
          break;
        case "WordBoundary":
          this.visitWordBoundary(node);
          break;
        case "NonWordBoundary":
          this.visitNonWordBoundary(node);
          break;
        case "Lookahead":
          this.visitLookahead(node);
          break;
        case "NegativeLookahead":
          this.visitNegativeLookahead(node);
          break;
        case "Lookbehind":
          this.visitLookbehind(node);
          break;
        case "NegativeLookbehind":
          this.visitNegativeLookbehind(node);
          break;
        case "Character":
          this.visitCharacter(node);
          break;
        case "Set":
          this.visitSet(node);
          break;
        case "Group":
          this.visitGroup(node);
          break;
        case "GroupBackReference":
          this.visitGroupBackReference(node);
          break;
        case "Quantifier":
          this.visitQuantifier(node);
          break;
      }
      this.visitChildren(node);
    }
    visitPattern(node) {
    }
    visitFlags(node) {
    }
    visitDisjunction(node) {
    }
    visitAlternative(node) {
    }
    // Assertion
    visitStartAnchor(node) {
    }
    visitEndAnchor(node) {
    }
    visitWordBoundary(node) {
    }
    visitNonWordBoundary(node) {
    }
    visitLookahead(node) {
    }
    visitNegativeLookahead(node) {
    }
    visitLookbehind(node) {
    }
    visitNegativeLookbehind(node) {
    }
    // atoms
    visitCharacter(node) {
    }
    visitSet(node) {
    }
    visitGroup(node) {
    }
    visitGroupBackReference(node) {
    }
    visitQuantifier(node) {
    }
  };
  var regExpAstCache = {};
  var regExpParser = new RegExpParser();
  function getRegExpAst(regExp) {
    const regExpStr = regExp.toString();
    if (regExpAstCache.hasOwnProperty(regExpStr)) {
      return regExpAstCache[regExpStr];
    } else {
      const regExpAst = regExpParser.pattern(regExpStr);
      regExpAstCache[regExpStr] = regExpAst;
      return regExpAst;
    }
  }
  function clearRegExpParserCache() {
    regExpAstCache = {};
  }
  var complementErrorMessage = "Complement Sets are not supported for first char optimization";
  var failedOptimizationPrefixMsg = 'Unable to use "first char" lexer optimizations:\n';
  function getOptimizedStartCodesIndices(regExp, ensureOptimizations = false) {
    try {
      const ast = getRegExpAst(regExp);
      const firstChars = firstCharOptimizedIndices(ast.value, {}, ast.flags.ignoreCase);
      return firstChars;
    } catch (e) {
      if (e.message === complementErrorMessage) {
        if (ensureOptimizations) {
          PRINT_WARNING(`${failedOptimizationPrefixMsg}	Unable to optimize: < ${regExp.toString()} >
	Complement Sets cannot be automatically optimized.
	This will disable the lexer's first char optimizations.
	See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#COMPLEMENT for details.`);
        }
      } else {
        let msgSuffix = "";
        if (ensureOptimizations) {
          msgSuffix = "\n	This will disable the lexer's first char optimizations.\n	See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#REGEXP_PARSING for details.";
        }
        PRINT_ERROR(`${failedOptimizationPrefixMsg}
	Failed parsing: < ${regExp.toString()} >
	Using the @chevrotain/regexp-to-ast library
	Please open an issue at: https://github.com/chevrotain/chevrotain/issues` + msgSuffix);
      }
    }
    return [];
  }
  function firstCharOptimizedIndices(ast, result, ignoreCase) {
    switch (ast.type) {
      case "Disjunction":
        for (let i = 0; i < ast.value.length; i++) {
          firstCharOptimizedIndices(ast.value[i], result, ignoreCase);
        }
        break;
      case "Alternative":
        const terms = ast.value;
        for (let i = 0; i < terms.length; i++) {
          const term = terms[i];
          switch (term.type) {
            case "EndAnchor":
            // A group back reference cannot affect potential starting char.
            // because if a back reference is the first production than automatically
            // the group being referenced has had to come BEFORE so its codes have already been added
            case "GroupBackReference":
            // assertions do not affect potential starting codes
            case "Lookahead":
            case "NegativeLookahead":
            case "Lookbehind":
            case "NegativeLookbehind":
            case "StartAnchor":
            case "WordBoundary":
            case "NonWordBoundary":
              continue;
          }
          const atom = term;
          switch (atom.type) {
            case "Character":
              addOptimizedIdxToResult(atom.value, result, ignoreCase);
              break;
            case "Set":
              if (atom.complement === true) {
                throw Error(complementErrorMessage);
              }
              forEach_default(atom.value, (code) => {
                if (typeof code === "number") {
                  addOptimizedIdxToResult(code, result, ignoreCase);
                } else {
                  const range = code;
                  if (ignoreCase === true) {
                    for (let rangeCode = range.from; rangeCode <= range.to; rangeCode++) {
                      addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                    }
                  } else {
                    for (let rangeCode = range.from; rangeCode <= range.to && rangeCode < minOptimizationVal; rangeCode++) {
                      addOptimizedIdxToResult(rangeCode, result, ignoreCase);
                    }
                    if (range.to >= minOptimizationVal) {
                      const minUnOptVal = range.from >= minOptimizationVal ? range.from : minOptimizationVal;
                      const maxUnOptVal = range.to;
                      const minOptIdx = charCodeToOptimizedIndex(minUnOptVal);
                      const maxOptIdx = charCodeToOptimizedIndex(maxUnOptVal);
                      for (let currOptIdx = minOptIdx; currOptIdx <= maxOptIdx; currOptIdx++) {
                        result[currOptIdx] = currOptIdx;
                      }
                    }
                  }
                }
              });
              break;
            case "Group":
              firstCharOptimizedIndices(atom.value, result, ignoreCase);
              break;
            /* istanbul ignore next */
            default:
              throw Error("Non Exhaustive Match");
          }
          const isOptionalQuantifier = atom.quantifier !== void 0 && atom.quantifier.atLeast === 0;
          if (
            // A group may be optional due to empty contents /(?:)/
            // or if everything inside it is optional /((a)?)/
            atom.type === "Group" && isWholeOptional(atom) === false || // If this term is not a group it may only be optional if it has an optional quantifier
            atom.type !== "Group" && isOptionalQuantifier === false
          ) {
            break;
          }
        }
        break;
      /* istanbul ignore next */
      default:
        throw Error("non exhaustive match!");
    }
    return values_default(result);
  }
  function addOptimizedIdxToResult(code, result, ignoreCase) {
    const optimizedCharIdx = charCodeToOptimizedIndex(code);
    result[optimizedCharIdx] = optimizedCharIdx;
    if (ignoreCase === true) {
      handleIgnoreCase(code, result);
    }
  }
  function handleIgnoreCase(code, result) {
    const char = String.fromCharCode(code);
    const upperChar = char.toUpperCase();
    if (upperChar !== char) {
      const optimizedCharIdx = charCodeToOptimizedIndex(upperChar.charCodeAt(0));
      result[optimizedCharIdx] = optimizedCharIdx;
    } else {
      const lowerChar = char.toLowerCase();
      if (lowerChar !== char) {
        const optimizedCharIdx = charCodeToOptimizedIndex(lowerChar.charCodeAt(0));
        result[optimizedCharIdx] = optimizedCharIdx;
      }
    }
  }
  function findCode(setNode, targetCharCodes) {
    return find_default(setNode.value, (codeOrRange) => {
      if (typeof codeOrRange === "number") {
        return includes_default(targetCharCodes, codeOrRange);
      } else {
        const range = codeOrRange;
        return find_default(targetCharCodes, (targetCode) => range.from <= targetCode && targetCode <= range.to) !== void 0;
      }
    });
  }
  function isWholeOptional(ast) {
    const quantifier = ast.quantifier;
    if (quantifier && quantifier.atLeast === 0) {
      return true;
    }
    if (!ast.value) {
      return false;
    }
    return isArray_default(ast.value) ? every_default(ast.value, isWholeOptional) : isWholeOptional(ast.value);
  }
  var CharCodeFinder = class extends BaseRegExpVisitor {
    constructor(targetCharCodes) {
      super();
      this.targetCharCodes = targetCharCodes;
      this.found = false;
    }
    visitChildren(node) {
      if (this.found === true) {
        return;
      }
      switch (node.type) {
        case "Lookahead":
          this.visitLookahead(node);
          return;
        case "NegativeLookahead":
          this.visitNegativeLookahead(node);
          return;
        case "Lookbehind":
          this.visitLookbehind(node);
          return;
        case "NegativeLookbehind":
          this.visitNegativeLookbehind(node);
          return;
      }
      super.visitChildren(node);
    }
    visitCharacter(node) {
      if (includes_default(this.targetCharCodes, node.value)) {
        this.found = true;
      }
    }
    visitSet(node) {
      if (node.complement) {
        if (findCode(node, this.targetCharCodes) === void 0) {
          this.found = true;
        }
      } else {
        if (findCode(node, this.targetCharCodes) !== void 0) {
          this.found = true;
        }
      }
    }
  };
  function canMatchCharCode(charCodes, pattern) {
    if (pattern instanceof RegExp) {
      const ast = getRegExpAst(pattern);
      const charCodeFinder = new CharCodeFinder(charCodes);
      charCodeFinder.visit(ast);
      return charCodeFinder.found;
    } else {
      return find_default(pattern, (char) => {
        return includes_default(charCodes, char.charCodeAt(0));
      }) !== void 0;
    }
  }
  var PATTERN = "PATTERN";
  var DEFAULT_MODE = "defaultMode";
  var MODES = "modes";
  function analyzeTokenTypes(tokenTypes, options) {
    options = defaults_default(options, {
      debug: false,
      safeMode: false,
      positionTracking: "full",
      lineTerminatorCharacters: ["\r", "\n"],
      tracer: (msg, action) => action()
    });
    const tracer = options.tracer;
    tracer("initCharCodeToOptimizedIndexMap", () => {
      initCharCodeToOptimizedIndexMap();
    });
    let onlyRelevantTypes;
    tracer("Reject Lexer.NA", () => {
      onlyRelevantTypes = reject_default(tokenTypes, (currType) => {
        return currType[PATTERN] === Lexer.NA;
      });
    });
    let hasCustom = false;
    let allTransformedPatterns;
    tracer("Transform Patterns", () => {
      hasCustom = false;
      allTransformedPatterns = map_default(onlyRelevantTypes, (currType) => {
        const currPattern = currType[PATTERN];
        if (isRegExp_default(currPattern)) {
          const regExpSource = currPattern.source;
          if (regExpSource.length === 1 && // only these regExp meta characters which can appear in a length one regExp
          regExpSource !== "^" && regExpSource !== "$" && regExpSource !== "." && !currPattern.ignoreCase) {
            return regExpSource;
          } else if (regExpSource.length === 2 && regExpSource[0] === "\\" && // not a meta character
          !includes_default([
            "d",
            "D",
            "s",
            "S",
            "t",
            "r",
            "n",
            "t",
            "0",
            "c",
            "b",
            "B",
            "f",
            "v",
            "w",
            "W"
          ], regExpSource[1])) {
            return regExpSource[1];
          } else {
            return addStickyFlag(currPattern);
          }
        } else if (isFunction_default(currPattern)) {
          hasCustom = true;
          return { exec: currPattern };
        } else if (typeof currPattern === "object") {
          hasCustom = true;
          return currPattern;
        } else if (typeof currPattern === "string") {
          if (currPattern.length === 1) {
            return currPattern;
          } else {
            const escapedRegExpString = currPattern.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
            const wrappedRegExp = new RegExp(escapedRegExpString);
            return addStickyFlag(wrappedRegExp);
          }
        } else {
          throw Error("non exhaustive match");
        }
      });
    });
    let patternIdxToType;
    let patternIdxToGroup;
    let patternIdxToLongerAltIdxArr;
    let patternIdxToPushMode;
    let patternIdxToPopMode;
    tracer("misc mapping", () => {
      patternIdxToType = map_default(onlyRelevantTypes, (currType) => currType.tokenTypeIdx);
      patternIdxToGroup = map_default(onlyRelevantTypes, (clazz) => {
        const groupName = clazz.GROUP;
        if (groupName === Lexer.SKIPPED) {
          return void 0;
        } else if (isString_default(groupName)) {
          return groupName;
        } else if (isUndefined_default(groupName)) {
          return false;
        } else {
          throw Error("non exhaustive match");
        }
      });
      patternIdxToLongerAltIdxArr = map_default(onlyRelevantTypes, (clazz) => {
        const longerAltType = clazz.LONGER_ALT;
        if (longerAltType) {
          const longerAltIdxArr = isArray_default(longerAltType) ? map_default(longerAltType, (type) => indexOf_default(onlyRelevantTypes, type)) : [indexOf_default(onlyRelevantTypes, longerAltType)];
          return longerAltIdxArr;
        }
      });
      patternIdxToPushMode = map_default(onlyRelevantTypes, (clazz) => clazz.PUSH_MODE);
      patternIdxToPopMode = map_default(onlyRelevantTypes, (clazz) => has_default(clazz, "POP_MODE"));
    });
    let patternIdxToCanLineTerminator;
    tracer("Line Terminator Handling", () => {
      const lineTerminatorCharCodes = getCharCodes(options.lineTerminatorCharacters);
      patternIdxToCanLineTerminator = map_default(onlyRelevantTypes, (tokType) => false);
      if (options.positionTracking !== "onlyOffset") {
        patternIdxToCanLineTerminator = map_default(onlyRelevantTypes, (tokType) => {
          if (has_default(tokType, "LINE_BREAKS")) {
            return !!tokType.LINE_BREAKS;
          } else {
            return checkLineBreaksIssues(tokType, lineTerminatorCharCodes) === false && canMatchCharCode(lineTerminatorCharCodes, tokType.PATTERN);
          }
        });
      }
    });
    let patternIdxToIsCustom;
    let patternIdxToShort;
    let emptyGroups;
    let patternIdxToConfig;
    tracer("Misc Mapping #2", () => {
      patternIdxToIsCustom = map_default(onlyRelevantTypes, isCustomPattern);
      patternIdxToShort = map_default(allTransformedPatterns, isShortPattern);
      emptyGroups = reduce_default(onlyRelevantTypes, (acc, clazz) => {
        const groupName = clazz.GROUP;
        if (isString_default(groupName) && !(groupName === Lexer.SKIPPED)) {
          acc[groupName] = [];
        }
        return acc;
      }, {});
      patternIdxToConfig = map_default(allTransformedPatterns, (x, idx) => {
        return {
          pattern: allTransformedPatterns[idx],
          longerAlt: patternIdxToLongerAltIdxArr[idx],
          canLineTerminator: patternIdxToCanLineTerminator[idx],
          isCustom: patternIdxToIsCustom[idx],
          short: patternIdxToShort[idx],
          group: patternIdxToGroup[idx],
          push: patternIdxToPushMode[idx],
          pop: patternIdxToPopMode[idx],
          tokenTypeIdx: patternIdxToType[idx],
          tokenType: onlyRelevantTypes[idx]
        };
      });
    });
    let canBeOptimized = true;
    let charCodeToPatternIdxToConfig = [];
    if (!options.safeMode) {
      tracer("First Char Optimization", () => {
        charCodeToPatternIdxToConfig = reduce_default(onlyRelevantTypes, (result, currTokType, idx) => {
          if (typeof currTokType.PATTERN === "string") {
            const charCode = currTokType.PATTERN.charCodeAt(0);
            const optimizedIdx = charCodeToOptimizedIndex(charCode);
            addToMapOfArrays(result, optimizedIdx, patternIdxToConfig[idx]);
          } else if (isArray_default(currTokType.START_CHARS_HINT)) {
            let lastOptimizedIdx;
            forEach_default(currTokType.START_CHARS_HINT, (charOrInt) => {
              const charCode = typeof charOrInt === "string" ? charOrInt.charCodeAt(0) : charOrInt;
              const currOptimizedIdx = charCodeToOptimizedIndex(charCode);
              if (lastOptimizedIdx !== currOptimizedIdx) {
                lastOptimizedIdx = currOptimizedIdx;
                addToMapOfArrays(result, currOptimizedIdx, patternIdxToConfig[idx]);
              }
            });
          } else if (isRegExp_default(currTokType.PATTERN)) {
            if (currTokType.PATTERN.unicode) {
              canBeOptimized = false;
              if (options.ensureOptimizations) {
                PRINT_ERROR(`${failedOptimizationPrefixMsg}	Unable to analyze < ${currTokType.PATTERN.toString()} > pattern.
	The regexp unicode flag is not currently supported by the regexp-to-ast library.
	This will disable the lexer's first char optimizations.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNICODE_OPTIMIZE`);
              }
            } else {
              const optimizedCodes = getOptimizedStartCodesIndices(currTokType.PATTERN, options.ensureOptimizations);
              if (isEmpty_default(optimizedCodes)) {
                canBeOptimized = false;
              }
              forEach_default(optimizedCodes, (code) => {
                addToMapOfArrays(result, code, patternIdxToConfig[idx]);
              });
            }
          } else {
            if (options.ensureOptimizations) {
              PRINT_ERROR(`${failedOptimizationPrefixMsg}	TokenType: <${currTokType.name}> is using a custom token pattern without providing <start_chars_hint> parameter.
	This will disable the lexer's first char optimizations.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_OPTIMIZE`);
            }
            canBeOptimized = false;
          }
          return result;
        }, []);
      });
    }
    return {
      emptyGroups,
      patternIdxToConfig,
      charCodeToPatternIdxToConfig,
      hasCustom,
      canBeOptimized
    };
  }
  function validatePatterns(tokenTypes, validModesNames) {
    let errors = [];
    const missingResult = findMissingPatterns(tokenTypes);
    errors = errors.concat(missingResult.errors);
    const invalidResult = findInvalidPatterns(missingResult.valid);
    const validTokenTypes = invalidResult.valid;
    errors = errors.concat(invalidResult.errors);
    errors = errors.concat(validateRegExpPattern(validTokenTypes));
    errors = errors.concat(findInvalidGroupType(validTokenTypes));
    errors = errors.concat(findModesThatDoNotExist(validTokenTypes, validModesNames));
    errors = errors.concat(findUnreachablePatterns(validTokenTypes));
    return errors;
  }
  function validateRegExpPattern(tokenTypes) {
    let errors = [];
    const withRegExpPatterns = filter_default(tokenTypes, (currTokType) => isRegExp_default(currTokType[PATTERN]));
    errors = errors.concat(findEndOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findStartOfInputAnchor(withRegExpPatterns));
    errors = errors.concat(findUnsupportedFlags(withRegExpPatterns));
    errors = errors.concat(findDuplicatePatterns(withRegExpPatterns));
    errors = errors.concat(findEmptyMatchRegExps(withRegExpPatterns));
    return errors;
  }
  function findMissingPatterns(tokenTypes) {
    const tokenTypesWithMissingPattern = filter_default(tokenTypes, (currType) => {
      return !has_default(currType, PATTERN);
    });
    const errors = map_default(tokenTypesWithMissingPattern, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- missing static 'PATTERN' property",
        type: LexerDefinitionErrorType.MISSING_PATTERN,
        tokenTypes: [currType]
      };
    });
    const valid = difference_default(tokenTypes, tokenTypesWithMissingPattern);
    return { errors, valid };
  }
  function findInvalidPatterns(tokenTypes) {
    const tokenTypesWithInvalidPattern = filter_default(tokenTypes, (currType) => {
      const pattern = currType[PATTERN];
      return !isRegExp_default(pattern) && !isFunction_default(pattern) && !has_default(pattern, "exec") && !isString_default(pattern);
    });
    const errors = map_default(tokenTypesWithInvalidPattern, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' can only be a RegExp, a Function matching the {CustomPatternMatcherFunc} type or an Object matching the {ICustomPattern} interface.",
        type: LexerDefinitionErrorType.INVALID_PATTERN,
        tokenTypes: [currType]
      };
    });
    const valid = difference_default(tokenTypes, tokenTypesWithInvalidPattern);
    return { errors, valid };
  }
  var end_of_input = /[^\\][$]/;
  function findEndOfInputAnchor(tokenTypes) {
    class EndAnchorFinder extends BaseRegExpVisitor {
      constructor() {
        super(...arguments);
        this.found = false;
      }
      visitEndAnchor(node) {
        this.found = true;
      }
    }
    const invalidRegex = filter_default(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      try {
        const regexpAst = getRegExpAst(pattern);
        const endAnchorVisitor = new EndAnchorFinder();
        endAnchorVisitor.visit(regexpAst);
        return endAnchorVisitor.found;
      } catch (e) {
        return end_of_input.test(pattern.source);
      }
    });
    const errors = map_default(invalidRegex, (currType) => {
      return {
        message: "Unexpected RegExp Anchor Error:\n	Token Type: ->" + currType.name + "<- static 'PATTERN' cannot contain end of input anchor '$'\n	See chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS	for details.",
        type: LexerDefinitionErrorType.EOI_ANCHOR_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findEmptyMatchRegExps(tokenTypes) {
    const matchesEmptyString = filter_default(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      return pattern.test("");
    });
    const errors = map_default(matchesEmptyString, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' must not match an empty string",
        type: LexerDefinitionErrorType.EMPTY_MATCH_PATTERN,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  var start_of_input = /[^\\[][\^]|^\^/;
  function findStartOfInputAnchor(tokenTypes) {
    class StartAnchorFinder extends BaseRegExpVisitor {
      constructor() {
        super(...arguments);
        this.found = false;
      }
      visitStartAnchor(node) {
        this.found = true;
      }
    }
    const invalidRegex = filter_default(tokenTypes, (currType) => {
      const pattern = currType.PATTERN;
      try {
        const regexpAst = getRegExpAst(pattern);
        const startAnchorVisitor = new StartAnchorFinder();
        startAnchorVisitor.visit(regexpAst);
        return startAnchorVisitor.found;
      } catch (e) {
        return start_of_input.test(pattern.source);
      }
    });
    const errors = map_default(invalidRegex, (currType) => {
      return {
        message: "Unexpected RegExp Anchor Error:\n	Token Type: ->" + currType.name + "<- static 'PATTERN' cannot contain start of input anchor '^'\n	See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#ANCHORS	for details.",
        type: LexerDefinitionErrorType.SOI_ANCHOR_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findUnsupportedFlags(tokenTypes) {
    const invalidFlags = filter_default(tokenTypes, (currType) => {
      const pattern = currType[PATTERN];
      return pattern instanceof RegExp && (pattern.multiline || pattern.global);
    });
    const errors = map_default(invalidFlags, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'PATTERN' may NOT contain global('g') or multiline('m')",
        type: LexerDefinitionErrorType.UNSUPPORTED_FLAGS_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findDuplicatePatterns(tokenTypes) {
    const found = [];
    let identicalPatterns = map_default(tokenTypes, (outerType) => {
      return reduce_default(tokenTypes, (result, innerType) => {
        if (outerType.PATTERN.source === innerType.PATTERN.source && !includes_default(found, innerType) && innerType.PATTERN !== Lexer.NA) {
          found.push(innerType);
          result.push(innerType);
          return result;
        }
        return result;
      }, []);
    });
    identicalPatterns = compact_default(identicalPatterns);
    const duplicatePatterns = filter_default(identicalPatterns, (currIdenticalSet) => {
      return currIdenticalSet.length > 1;
    });
    const errors = map_default(duplicatePatterns, (setOfIdentical) => {
      const tokenTypeNames = map_default(setOfIdentical, (currType) => {
        return currType.name;
      });
      const dupPatternSrc = head_default(setOfIdentical).PATTERN;
      return {
        message: `The same RegExp pattern ->${dupPatternSrc}<-has been used in all of the following Token Types: ${tokenTypeNames.join(", ")} <-`,
        type: LexerDefinitionErrorType.DUPLICATE_PATTERNS_FOUND,
        tokenTypes: setOfIdentical
      };
    });
    return errors;
  }
  function findInvalidGroupType(tokenTypes) {
    const invalidTypes = filter_default(tokenTypes, (clazz) => {
      if (!has_default(clazz, "GROUP")) {
        return false;
      }
      const group = clazz.GROUP;
      return group !== Lexer.SKIPPED && group !== Lexer.NA && !isString_default(group);
    });
    const errors = map_default(invalidTypes, (currType) => {
      return {
        message: "Token Type: ->" + currType.name + "<- static 'GROUP' can only be Lexer.SKIPPED/Lexer.NA/A String",
        type: LexerDefinitionErrorType.INVALID_GROUP_TYPE_FOUND,
        tokenTypes: [currType]
      };
    });
    return errors;
  }
  function findModesThatDoNotExist(tokenTypes, validModes) {
    const invalidModes = filter_default(tokenTypes, (clazz) => {
      return clazz.PUSH_MODE !== void 0 && !includes_default(validModes, clazz.PUSH_MODE);
    });
    const errors = map_default(invalidModes, (tokType) => {
      const msg = `Token Type: ->${tokType.name}<- static 'PUSH_MODE' value cannot refer to a Lexer Mode ->${tokType.PUSH_MODE}<-which does not exist`;
      return {
        message: msg,
        type: LexerDefinitionErrorType.PUSH_MODE_DOES_NOT_EXIST,
        tokenTypes: [tokType]
      };
    });
    return errors;
  }
  function findUnreachablePatterns(tokenTypes) {
    const errors = [];
    const canBeTested = reduce_default(tokenTypes, (result, tokType, idx) => {
      const pattern = tokType.PATTERN;
      if (pattern === Lexer.NA) {
        return result;
      }
      if (isString_default(pattern)) {
        result.push({ str: pattern, idx, tokenType: tokType });
      } else if (isRegExp_default(pattern) && noMetaChar(pattern)) {
        result.push({ str: pattern.source, idx, tokenType: tokType });
      }
      return result;
    }, []);
    forEach_default(tokenTypes, (aTokType, aIdx) => {
      forEach_default(canBeTested, ({ str: bStr, idx: bIdx, tokenType: bTokType }) => {
        if (aIdx < bIdx && tryToMatchStrToPattern(bStr, aTokType.PATTERN)) {
          const msg = `Token: ->${bTokType.name}<- can never be matched.
Because it appears AFTER the Token Type ->${aTokType.name}<-in the lexer's definition.
See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#UNREACHABLE`;
          errors.push({
            message: msg,
            type: LexerDefinitionErrorType.UNREACHABLE_PATTERN,
            tokenTypes: [aTokType, bTokType]
          });
        }
      });
    });
    return errors;
  }
  function tryToMatchStrToPattern(str2, pattern) {
    if (isRegExp_default(pattern)) {
      if (usesLookAheadOrBehind(pattern)) {
        return false;
      }
      const regExpArray = pattern.exec(str2);
      return regExpArray !== null && regExpArray.index === 0;
    } else if (isFunction_default(pattern)) {
      return pattern(str2, 0, [], {});
    } else if (has_default(pattern, "exec")) {
      return pattern.exec(str2, 0, [], {});
    } else if (typeof pattern === "string") {
      return pattern === str2;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function noMetaChar(regExp) {
    const metaChars = [
      ".",
      "\\",
      "[",
      "]",
      "|",
      "^",
      "$",
      "(",
      ")",
      "?",
      "*",
      "+",
      "{"
    ];
    return find_default(metaChars, (char) => regExp.source.indexOf(char) !== -1) === void 0;
  }
  function usesLookAheadOrBehind(regExp) {
    return /(\(\?=)|(\(\?!)|(\(\?<=)|(\(\?<!)/.test(regExp.source);
  }
  function addStickyFlag(pattern) {
    const flags = pattern.ignoreCase ? "iy" : "y";
    return new RegExp(`${pattern.source}`, flags);
  }
  function performRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    const errors = [];
    if (!has_default(lexerDefinition, DEFAULT_MODE)) {
      errors.push({
        message: "A MultiMode Lexer cannot be initialized without a <" + DEFAULT_MODE + "> property in its definition\n",
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE
      });
    }
    if (!has_default(lexerDefinition, MODES)) {
      errors.push({
        message: "A MultiMode Lexer cannot be initialized without a <" + MODES + "> property in its definition\n",
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY
      });
    }
    if (has_default(lexerDefinition, MODES) && has_default(lexerDefinition, DEFAULT_MODE) && !has_default(lexerDefinition.modes, lexerDefinition.defaultMode)) {
      errors.push({
        message: `A MultiMode Lexer cannot be initialized with a ${DEFAULT_MODE}: <${lexerDefinition.defaultMode}>which does not exist
`,
        type: LexerDefinitionErrorType.MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST
      });
    }
    if (has_default(lexerDefinition, MODES)) {
      forEach_default(lexerDefinition.modes, (currModeValue, currModeName) => {
        forEach_default(currModeValue, (currTokType, currIdx) => {
          if (isUndefined_default(currTokType)) {
            errors.push({
              message: `A Lexer cannot be initialized using an undefined Token Type. Mode:<${currModeName}> at index: <${currIdx}>
`,
              type: LexerDefinitionErrorType.LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED
            });
          } else if (has_default(currTokType, "LONGER_ALT")) {
            const longerAlt = isArray_default(currTokType.LONGER_ALT) ? currTokType.LONGER_ALT : [currTokType.LONGER_ALT];
            forEach_default(longerAlt, (currLongerAlt) => {
              if (!isUndefined_default(currLongerAlt) && !includes_default(currModeValue, currLongerAlt)) {
                errors.push({
                  message: `A MultiMode Lexer cannot be initialized with a longer_alt <${currLongerAlt.name}> on token <${currTokType.name}> outside of mode <${currModeName}>
`,
                  type: LexerDefinitionErrorType.MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE
                });
              }
            });
          }
        });
      });
    }
    return errors;
  }
  function performWarningRuntimeChecks(lexerDefinition, trackLines, lineTerminatorCharacters) {
    const warnings = [];
    let hasAnyLineBreak = false;
    const allTokenTypes = compact_default(flatten_default(values_default(lexerDefinition.modes)));
    const concreteTokenTypes = reject_default(allTokenTypes, (currType) => currType[PATTERN] === Lexer.NA);
    const terminatorCharCodes = getCharCodes(lineTerminatorCharacters);
    if (trackLines) {
      forEach_default(concreteTokenTypes, (tokType) => {
        const currIssue = checkLineBreaksIssues(tokType, terminatorCharCodes);
        if (currIssue !== false) {
          const message = buildLineBreakIssueMessage(tokType, currIssue);
          const warningDescriptor = {
            message,
            type: currIssue.issue,
            tokenType: tokType
          };
          warnings.push(warningDescriptor);
        } else {
          if (has_default(tokType, "LINE_BREAKS")) {
            if (tokType.LINE_BREAKS === true) {
              hasAnyLineBreak = true;
            }
          } else {
            if (canMatchCharCode(terminatorCharCodes, tokType.PATTERN)) {
              hasAnyLineBreak = true;
            }
          }
        }
      });
    }
    if (trackLines && !hasAnyLineBreak) {
      warnings.push({
        message: "Warning: No LINE_BREAKS Found.\n	This Lexer has been defined to track line and column information,\n	But none of the Token Types can be identified as matching a line terminator.\n	See https://chevrotain.io/docs/guide/resolving_lexer_errors.html#LINE_BREAKS \n	for details.",
        type: LexerDefinitionErrorType.NO_LINE_BREAKS_FLAGS
      });
    }
    return warnings;
  }
  function cloneEmptyGroups(emptyGroups) {
    const clonedResult = {};
    const groupKeys = keys_default(emptyGroups);
    forEach_default(groupKeys, (currKey) => {
      const currGroupValue = emptyGroups[currKey];
      if (isArray_default(currGroupValue)) {
        clonedResult[currKey] = [];
      } else {
        throw Error("non exhaustive match");
      }
    });
    return clonedResult;
  }
  function isCustomPattern(tokenType) {
    const pattern = tokenType.PATTERN;
    if (isRegExp_default(pattern)) {
      return false;
    } else if (isFunction_default(pattern)) {
      return true;
    } else if (has_default(pattern, "exec")) {
      return true;
    } else if (isString_default(pattern)) {
      return false;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function isShortPattern(pattern) {
    if (isString_default(pattern) && pattern.length === 1) {
      return pattern.charCodeAt(0);
    } else {
      return false;
    }
  }
  var LineTerminatorOptimizedTester = {
    // implements /\n|\r\n?/g.test
    test: function(text) {
      const len = text.length;
      for (let i = this.lastIndex; i < len; i++) {
        const c = text.charCodeAt(i);
        if (c === 10) {
          this.lastIndex = i + 1;
          return true;
        } else if (c === 13) {
          if (text.charCodeAt(i + 1) === 10) {
            this.lastIndex = i + 2;
          } else {
            this.lastIndex = i + 1;
          }
          return true;
        }
      }
      return false;
    },
    lastIndex: 0
  };
  function checkLineBreaksIssues(tokType, lineTerminatorCharCodes) {
    if (has_default(tokType, "LINE_BREAKS")) {
      return false;
    } else {
      if (isRegExp_default(tokType.PATTERN)) {
        try {
          canMatchCharCode(lineTerminatorCharCodes, tokType.PATTERN);
        } catch (e) {
          return {
            issue: LexerDefinitionErrorType.IDENTIFY_TERMINATOR,
            errMsg: e.message
          };
        }
        return false;
      } else if (isString_default(tokType.PATTERN)) {
        return false;
      } else if (isCustomPattern(tokType)) {
        return { issue: LexerDefinitionErrorType.CUSTOM_LINE_BREAK };
      } else {
        throw Error("non exhaustive match");
      }
    }
  }
  function buildLineBreakIssueMessage(tokType, details) {
    if (details.issue === LexerDefinitionErrorType.IDENTIFY_TERMINATOR) {
      return `Warning: unable to identify line terminator usage in pattern.
	The problem is in the <${tokType.name}> Token Type
	 Root cause: ${details.errMsg}.
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#IDENTIFY_TERMINATOR`;
    } else if (details.issue === LexerDefinitionErrorType.CUSTOM_LINE_BREAK) {
      return `Warning: A Custom Token Pattern should specify the <line_breaks> option.
	The problem is in the <${tokType.name}> Token Type
	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#CUSTOM_LINE_BREAK`;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function getCharCodes(charsOrCodes) {
    const charCodes = map_default(charsOrCodes, (numOrString) => {
      if (isString_default(numOrString)) {
        return numOrString.charCodeAt(0);
      } else {
        return numOrString;
      }
    });
    return charCodes;
  }
  function addToMapOfArrays(map2, key, value) {
    if (map2[key] === void 0) {
      map2[key] = [value];
    } else {
      map2[key].push(value);
    }
  }
  var minOptimizationVal = 256;
  var charCodeToOptimizedIdxMap = [];
  function charCodeToOptimizedIndex(charCode) {
    return charCode < minOptimizationVal ? charCode : charCodeToOptimizedIdxMap[charCode];
  }
  function initCharCodeToOptimizedIndexMap() {
    if (isEmpty_default(charCodeToOptimizedIdxMap)) {
      charCodeToOptimizedIdxMap = new Array(65536);
      for (let i = 0; i < 65536; i++) {
        charCodeToOptimizedIdxMap[i] = i > 255 ? 255 + ~~(i / 255) : i;
      }
    }
  }
  function tokenStructuredMatcher(tokInstance, tokConstructor) {
    const instanceType = tokInstance.tokenTypeIdx;
    if (instanceType === tokConstructor.tokenTypeIdx) {
      return true;
    } else {
      return tokConstructor.isParent === true && tokConstructor.categoryMatchesMap[instanceType] === true;
    }
  }
  function tokenStructuredMatcherNoCategories(token, tokType) {
    return token.tokenTypeIdx === tokType.tokenTypeIdx;
  }
  var tokenShortNameIdx = 1;
  var tokenIdxToClass = {};
  function augmentTokenTypes(tokenTypes) {
    const tokenTypesAndParents = expandCategories(tokenTypes);
    assignTokenDefaultProps(tokenTypesAndParents);
    assignCategoriesMapProp(tokenTypesAndParents);
    assignCategoriesTokensProp(tokenTypesAndParents);
    forEach_default(tokenTypesAndParents, (tokType) => {
      tokType.isParent = tokType.categoryMatches.length > 0;
    });
  }
  function expandCategories(tokenTypes) {
    let result = clone_default(tokenTypes);
    let categories = tokenTypes;
    let searching = true;
    while (searching) {
      categories = compact_default(flatten_default(map_default(categories, (currTokType) => currTokType.CATEGORIES)));
      const newCategories = difference_default(categories, result);
      result = result.concat(newCategories);
      if (isEmpty_default(newCategories)) {
        searching = false;
      } else {
        categories = newCategories;
      }
    }
    return result;
  }
  function assignTokenDefaultProps(tokenTypes) {
    forEach_default(tokenTypes, (currTokType) => {
      if (!hasShortKeyProperty(currTokType)) {
        tokenIdxToClass[tokenShortNameIdx] = currTokType;
        currTokType.tokenTypeIdx = tokenShortNameIdx++;
      }
      if (hasCategoriesProperty(currTokType) && !isArray_default(currTokType.CATEGORIES)) {
        currTokType.CATEGORIES = [currTokType.CATEGORIES];
      }
      if (!hasCategoriesProperty(currTokType)) {
        currTokType.CATEGORIES = [];
      }
      if (!hasExtendingTokensTypesProperty(currTokType)) {
        currTokType.categoryMatches = [];
      }
      if (!hasExtendingTokensTypesMapProperty(currTokType)) {
        currTokType.categoryMatchesMap = {};
      }
    });
  }
  function assignCategoriesTokensProp(tokenTypes) {
    forEach_default(tokenTypes, (currTokType) => {
      currTokType.categoryMatches = [];
      forEach_default(currTokType.categoryMatchesMap, (val, key) => {
        currTokType.categoryMatches.push(tokenIdxToClass[key].tokenTypeIdx);
      });
    });
  }
  function assignCategoriesMapProp(tokenTypes) {
    forEach_default(tokenTypes, (currTokType) => {
      singleAssignCategoriesToksMap([], currTokType);
    });
  }
  function singleAssignCategoriesToksMap(path2, nextNode) {
    forEach_default(path2, (pathNode) => {
      nextNode.categoryMatchesMap[pathNode.tokenTypeIdx] = true;
    });
    forEach_default(nextNode.CATEGORIES, (nextCategory) => {
      const newPath = path2.concat(nextNode);
      if (!includes_default(newPath, nextCategory)) {
        singleAssignCategoriesToksMap(newPath, nextCategory);
      }
    });
  }
  function hasShortKeyProperty(tokType) {
    return has_default(tokType, "tokenTypeIdx");
  }
  function hasCategoriesProperty(tokType) {
    return has_default(tokType, "CATEGORIES");
  }
  function hasExtendingTokensTypesProperty(tokType) {
    return has_default(tokType, "categoryMatches");
  }
  function hasExtendingTokensTypesMapProperty(tokType) {
    return has_default(tokType, "categoryMatchesMap");
  }
  function isTokenType(tokType) {
    return has_default(tokType, "tokenTypeIdx");
  }
  var defaultLexerErrorProvider = {
    buildUnableToPopLexerModeMessage(token) {
      return `Unable to pop Lexer Mode after encountering Token ->${token.image}<- The Mode Stack is empty`;
    },
    buildUnexpectedCharactersMessage(fullText, startOffset, length, line, column, mode) {
      return `unexpected character: ->${fullText.charAt(startOffset)}<- at offset: ${startOffset}, skipped ${length} characters.`;
    }
  };
  var LexerDefinitionErrorType;
  (function(LexerDefinitionErrorType2) {
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MISSING_PATTERN"] = 0] = "MISSING_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["INVALID_PATTERN"] = 1] = "INVALID_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["EOI_ANCHOR_FOUND"] = 2] = "EOI_ANCHOR_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["UNSUPPORTED_FLAGS_FOUND"] = 3] = "UNSUPPORTED_FLAGS_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["DUPLICATE_PATTERNS_FOUND"] = 4] = "DUPLICATE_PATTERNS_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["INVALID_GROUP_TYPE_FOUND"] = 5] = "INVALID_GROUP_TYPE_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["PUSH_MODE_DOES_NOT_EXIST"] = 6] = "PUSH_MODE_DOES_NOT_EXIST";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE"] = 7] = "MULTI_MODE_LEXER_WITHOUT_DEFAULT_MODE";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY"] = 8] = "MULTI_MODE_LEXER_WITHOUT_MODES_PROPERTY";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST"] = 9] = "MULTI_MODE_LEXER_DEFAULT_MODE_VALUE_DOES_NOT_EXIST";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED"] = 10] = "LEXER_DEFINITION_CANNOT_CONTAIN_UNDEFINED";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["SOI_ANCHOR_FOUND"] = 11] = "SOI_ANCHOR_FOUND";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["EMPTY_MATCH_PATTERN"] = 12] = "EMPTY_MATCH_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["NO_LINE_BREAKS_FLAGS"] = 13] = "NO_LINE_BREAKS_FLAGS";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["UNREACHABLE_PATTERN"] = 14] = "UNREACHABLE_PATTERN";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["IDENTIFY_TERMINATOR"] = 15] = "IDENTIFY_TERMINATOR";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["CUSTOM_LINE_BREAK"] = 16] = "CUSTOM_LINE_BREAK";
    LexerDefinitionErrorType2[LexerDefinitionErrorType2["MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE"] = 17] = "MULTI_MODE_LEXER_LONGER_ALT_NOT_IN_CURRENT_MODE";
  })(LexerDefinitionErrorType || (LexerDefinitionErrorType = {}));
  var DEFAULT_LEXER_CONFIG = {
    deferDefinitionErrorsHandling: false,
    positionTracking: "full",
    lineTerminatorsPattern: /\n|\r\n?/g,
    lineTerminatorCharacters: ["\n", "\r"],
    ensureOptimizations: false,
    safeMode: false,
    errorMessageProvider: defaultLexerErrorProvider,
    traceInitPerf: false,
    skipValidations: false,
    recoveryEnabled: true
  };
  Object.freeze(DEFAULT_LEXER_CONFIG);
  var Lexer = class {
    constructor(lexerDefinition, config = DEFAULT_LEXER_CONFIG) {
      this.lexerDefinition = lexerDefinition;
      this.lexerDefinitionErrors = [];
      this.lexerDefinitionWarning = [];
      this.patternIdxToConfig = {};
      this.charCodeToPatternIdxToConfig = {};
      this.modes = [];
      this.emptyGroups = {};
      this.trackStartLines = true;
      this.trackEndLines = true;
      this.hasCustom = false;
      this.canModeBeOptimized = {};
      this.TRACE_INIT = (phaseDesc, phaseImpl) => {
        if (this.traceInitPerf === true) {
          this.traceInitIndent++;
          const indent = new Array(this.traceInitIndent + 1).join("	");
          if (this.traceInitIndent < this.traceInitMaxIdent) {
            console.log(`${indent}--> <${phaseDesc}>`);
          }
          const { time, value } = timer(phaseImpl);
          const traceMethod = time > 10 ? console.warn : console.log;
          if (this.traceInitIndent < this.traceInitMaxIdent) {
            traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
          }
          this.traceInitIndent--;
          return value;
        } else {
          return phaseImpl();
        }
      };
      if (typeof config === "boolean") {
        throw Error("The second argument to the Lexer constructor is now an ILexerConfig Object.\na boolean 2nd argument is no longer supported");
      }
      this.config = assign_default({}, DEFAULT_LEXER_CONFIG, config);
      const traceInitVal = this.config.traceInitPerf;
      if (traceInitVal === true) {
        this.traceInitMaxIdent = Infinity;
        this.traceInitPerf = true;
      } else if (typeof traceInitVal === "number") {
        this.traceInitMaxIdent = traceInitVal;
        this.traceInitPerf = true;
      }
      this.traceInitIndent = -1;
      this.TRACE_INIT("Lexer Constructor", () => {
        let actualDefinition;
        let hasOnlySingleMode = true;
        this.TRACE_INIT("Lexer Config handling", () => {
          if (this.config.lineTerminatorsPattern === DEFAULT_LEXER_CONFIG.lineTerminatorsPattern) {
            this.config.lineTerminatorsPattern = LineTerminatorOptimizedTester;
          } else {
            if (this.config.lineTerminatorCharacters === DEFAULT_LEXER_CONFIG.lineTerminatorCharacters) {
              throw Error("Error: Missing <lineTerminatorCharacters> property on the Lexer config.\n	For details See: https://chevrotain.io/docs/guide/resolving_lexer_errors.html#MISSING_LINE_TERM_CHARS");
            }
          }
          if (config.safeMode && config.ensureOptimizations) {
            throw Error('"safeMode" and "ensureOptimizations" flags are mutually exclusive.');
          }
          this.trackStartLines = /full|onlyStart/i.test(this.config.positionTracking);
          this.trackEndLines = /full/i.test(this.config.positionTracking);
          if (isArray_default(lexerDefinition)) {
            actualDefinition = {
              modes: { defaultMode: clone_default(lexerDefinition) },
              defaultMode: DEFAULT_MODE
            };
          } else {
            hasOnlySingleMode = false;
            actualDefinition = clone_default(lexerDefinition);
          }
        });
        if (this.config.skipValidations === false) {
          this.TRACE_INIT("performRuntimeChecks", () => {
            this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(performRuntimeChecks(actualDefinition, this.trackStartLines, this.config.lineTerminatorCharacters));
          });
          this.TRACE_INIT("performWarningRuntimeChecks", () => {
            this.lexerDefinitionWarning = this.lexerDefinitionWarning.concat(performWarningRuntimeChecks(actualDefinition, this.trackStartLines, this.config.lineTerminatorCharacters));
          });
        }
        actualDefinition.modes = actualDefinition.modes ? actualDefinition.modes : {};
        forEach_default(actualDefinition.modes, (currModeValue, currModeName) => {
          actualDefinition.modes[currModeName] = reject_default(currModeValue, (currTokType) => isUndefined_default(currTokType));
        });
        const allModeNames = keys_default(actualDefinition.modes);
        forEach_default(actualDefinition.modes, (currModDef, currModName) => {
          this.TRACE_INIT(`Mode: <${currModName}> processing`, () => {
            this.modes.push(currModName);
            if (this.config.skipValidations === false) {
              this.TRACE_INIT(`validatePatterns`, () => {
                this.lexerDefinitionErrors = this.lexerDefinitionErrors.concat(validatePatterns(currModDef, allModeNames));
              });
            }
            if (isEmpty_default(this.lexerDefinitionErrors)) {
              augmentTokenTypes(currModDef);
              let currAnalyzeResult;
              this.TRACE_INIT(`analyzeTokenTypes`, () => {
                currAnalyzeResult = analyzeTokenTypes(currModDef, {
                  lineTerminatorCharacters: this.config.lineTerminatorCharacters,
                  positionTracking: config.positionTracking,
                  ensureOptimizations: config.ensureOptimizations,
                  safeMode: config.safeMode,
                  tracer: this.TRACE_INIT
                });
              });
              this.patternIdxToConfig[currModName] = currAnalyzeResult.patternIdxToConfig;
              this.charCodeToPatternIdxToConfig[currModName] = currAnalyzeResult.charCodeToPatternIdxToConfig;
              this.emptyGroups = assign_default({}, this.emptyGroups, currAnalyzeResult.emptyGroups);
              this.hasCustom = currAnalyzeResult.hasCustom || this.hasCustom;
              this.canModeBeOptimized[currModName] = currAnalyzeResult.canBeOptimized;
            }
          });
        });
        this.defaultMode = actualDefinition.defaultMode;
        if (!isEmpty_default(this.lexerDefinitionErrors) && !this.config.deferDefinitionErrorsHandling) {
          const allErrMessages = map_default(this.lexerDefinitionErrors, (error) => {
            return error.message;
          });
          const allErrMessagesString = allErrMessages.join("-----------------------\n");
          throw new Error("Errors detected in definition of Lexer:\n" + allErrMessagesString);
        }
        forEach_default(this.lexerDefinitionWarning, (warningDescriptor) => {
          PRINT_WARNING(warningDescriptor.message);
        });
        this.TRACE_INIT("Choosing sub-methods implementations", () => {
          if (hasOnlySingleMode) {
            this.handleModes = noop_default;
          }
          if (this.trackStartLines === false) {
            this.computeNewColumn = identity_default;
          }
          if (this.trackEndLines === false) {
            this.updateTokenEndLineColumnLocation = noop_default;
          }
          if (/full/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createFullToken;
          } else if (/onlyStart/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createStartOnlyToken;
          } else if (/onlyOffset/i.test(this.config.positionTracking)) {
            this.createTokenInstance = this.createOffsetOnlyToken;
          } else {
            throw Error(`Invalid <positionTracking> config option: "${this.config.positionTracking}"`);
          }
          if (this.hasCustom) {
            this.addToken = this.addTokenUsingPush;
            this.handlePayload = this.handlePayloadWithCustom;
          } else {
            this.addToken = this.addTokenUsingMemberAccess;
            this.handlePayload = this.handlePayloadNoCustom;
          }
        });
        this.TRACE_INIT("Failed Optimization Warnings", () => {
          const unOptimizedModes = reduce_default(this.canModeBeOptimized, (cannotBeOptimized, canBeOptimized, modeName) => {
            if (canBeOptimized === false) {
              cannotBeOptimized.push(modeName);
            }
            return cannotBeOptimized;
          }, []);
          if (config.ensureOptimizations && !isEmpty_default(unOptimizedModes)) {
            throw Error(`Lexer Modes: < ${unOptimizedModes.join(", ")} > cannot be optimized.
	 Disable the "ensureOptimizations" lexer config flag to silently ignore this and run the lexer in an un-optimized mode.
	 Or inspect the console log for details on how to resolve these issues.`);
          }
        });
        this.TRACE_INIT("clearRegExpParserCache", () => {
          clearRegExpParserCache();
        });
        this.TRACE_INIT("toFastProperties", () => {
          toFastProperties(this);
        });
      });
    }
    tokenize(text, initialMode = this.defaultMode) {
      if (!isEmpty_default(this.lexerDefinitionErrors)) {
        const allErrMessages = map_default(this.lexerDefinitionErrors, (error) => {
          return error.message;
        });
        const allErrMessagesString = allErrMessages.join("-----------------------\n");
        throw new Error("Unable to Tokenize because Errors detected in definition of Lexer:\n" + allErrMessagesString);
      }
      return this.tokenizeInternal(text, initialMode);
    }
    // There is quite a bit of duplication between this and "tokenizeInternalLazy"
    // This is intentional due to performance considerations.
    // this method also used quite a bit of `!` none null assertions because it is too optimized
    // for `tsc` to always understand it is "safe"
    tokenizeInternal(text, initialMode) {
      let i, j, k, matchAltImage, longerAlt, matchedImage, payload, altPayload, imageLength, group, tokType, newToken, errLength, msg, match;
      const orgText = text;
      const orgLength = orgText.length;
      let offset2 = 0;
      let matchedTokensIndex = 0;
      const guessedNumberOfTokens = this.hasCustom ? 0 : Math.floor(text.length / 10);
      const matchedTokens = new Array(guessedNumberOfTokens);
      const errors = [];
      let line = this.trackStartLines ? 1 : void 0;
      let column = this.trackStartLines ? 1 : void 0;
      const groups = cloneEmptyGroups(this.emptyGroups);
      const trackLines = this.trackStartLines;
      const lineTerminatorPattern = this.config.lineTerminatorsPattern;
      let currModePatternsLength = 0;
      let patternIdxToConfig = [];
      let currCharCodeToPatternIdxToConfig = [];
      const modeStack = [];
      const emptyArray = [];
      Object.freeze(emptyArray);
      let isOptimizedMode = false;
      const pop_mode = (popToken) => {
        if (modeStack.length === 1 && // if we have both a POP_MODE and a PUSH_MODE this is in-fact a "transition"
        // So no error should occur.
        popToken.tokenType.PUSH_MODE === void 0) {
          const msg2 = this.config.errorMessageProvider.buildUnableToPopLexerModeMessage(popToken);
          errors.push({
            offset: popToken.startOffset,
            line: popToken.startLine,
            column: popToken.startColumn,
            length: popToken.image.length,
            message: msg2
          });
        } else {
          modeStack.pop();
          const newMode = last_default(modeStack);
          patternIdxToConfig = this.patternIdxToConfig[newMode];
          currCharCodeToPatternIdxToConfig = this.charCodeToPatternIdxToConfig[newMode];
          currModePatternsLength = patternIdxToConfig.length;
          const modeCanBeOptimized = this.canModeBeOptimized[newMode] && this.config.safeMode === false;
          if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
            isOptimizedMode = true;
          } else {
            isOptimizedMode = false;
          }
        }
      };
      function push_mode(newMode) {
        modeStack.push(newMode);
        currCharCodeToPatternIdxToConfig = this.charCodeToPatternIdxToConfig[newMode];
        patternIdxToConfig = this.patternIdxToConfig[newMode];
        currModePatternsLength = patternIdxToConfig.length;
        currModePatternsLength = patternIdxToConfig.length;
        const modeCanBeOptimized = this.canModeBeOptimized[newMode] && this.config.safeMode === false;
        if (currCharCodeToPatternIdxToConfig && modeCanBeOptimized) {
          isOptimizedMode = true;
        } else {
          isOptimizedMode = false;
        }
      }
      push_mode.call(this, initialMode);
      let currConfig;
      const recoveryEnabled = this.config.recoveryEnabled;
      while (offset2 < orgLength) {
        matchedImage = null;
        imageLength = -1;
        const nextCharCode = orgText.charCodeAt(offset2);
        let chosenPatternIdxToConfig;
        if (isOptimizedMode) {
          const optimizedCharIdx = charCodeToOptimizedIndex(nextCharCode);
          const possiblePatterns = currCharCodeToPatternIdxToConfig[optimizedCharIdx];
          chosenPatternIdxToConfig = possiblePatterns !== void 0 ? possiblePatterns : emptyArray;
        } else {
          chosenPatternIdxToConfig = patternIdxToConfig;
        }
        const chosenPatternsLength = chosenPatternIdxToConfig.length;
        for (i = 0; i < chosenPatternsLength; i++) {
          currConfig = chosenPatternIdxToConfig[i];
          const currPattern = currConfig.pattern;
          payload = null;
          const singleCharCode = currConfig.short;
          if (singleCharCode !== false) {
            if (nextCharCode === singleCharCode) {
              imageLength = 1;
              matchedImage = currPattern;
            }
          } else if (currConfig.isCustom === true) {
            match = currPattern.exec(orgText, offset2, matchedTokens, groups);
            if (match !== null) {
              matchedImage = match[0];
              imageLength = matchedImage.length;
              if (match.payload !== void 0) {
                payload = match.payload;
              }
            } else {
              matchedImage = null;
            }
          } else {
            currPattern.lastIndex = offset2;
            imageLength = this.matchLength(currPattern, text, offset2);
          }
          if (imageLength !== -1) {
            longerAlt = currConfig.longerAlt;
            if (longerAlt !== void 0) {
              matchedImage = text.substring(offset2, offset2 + imageLength);
              const longerAltLength = longerAlt.length;
              for (k = 0; k < longerAltLength; k++) {
                const longerAltConfig = patternIdxToConfig[longerAlt[k]];
                const longerAltPattern = longerAltConfig.pattern;
                altPayload = null;
                if (longerAltConfig.isCustom === true) {
                  match = longerAltPattern.exec(orgText, offset2, matchedTokens, groups);
                  if (match !== null) {
                    matchAltImage = match[0];
                    if (match.payload !== void 0) {
                      altPayload = match.payload;
                    }
                  } else {
                    matchAltImage = null;
                  }
                } else {
                  longerAltPattern.lastIndex = offset2;
                  matchAltImage = this.match(longerAltPattern, text, offset2);
                }
                if (matchAltImage && matchAltImage.length > matchedImage.length) {
                  matchedImage = matchAltImage;
                  imageLength = matchAltImage.length;
                  payload = altPayload;
                  currConfig = longerAltConfig;
                  break;
                }
              }
            }
            break;
          }
        }
        if (imageLength !== -1) {
          group = currConfig.group;
          if (group !== void 0) {
            matchedImage = matchedImage !== null ? matchedImage : text.substring(offset2, offset2 + imageLength);
            tokType = currConfig.tokenTypeIdx;
            newToken = this.createTokenInstance(matchedImage, offset2, tokType, currConfig.tokenType, line, column, imageLength);
            this.handlePayload(newToken, payload);
            if (group === false) {
              matchedTokensIndex = this.addToken(matchedTokens, matchedTokensIndex, newToken);
            } else {
              groups[group].push(newToken);
            }
          }
          if (trackLines === true && currConfig.canLineTerminator === true) {
            let numOfLTsInMatch = 0;
            let foundTerminator;
            let lastLTEndOffset;
            lineTerminatorPattern.lastIndex = 0;
            do {
              matchedImage = matchedImage !== null ? matchedImage : text.substring(offset2, offset2 + imageLength);
              foundTerminator = lineTerminatorPattern.test(matchedImage);
              if (foundTerminator === true) {
                lastLTEndOffset = lineTerminatorPattern.lastIndex - 1;
                numOfLTsInMatch++;
              }
            } while (foundTerminator === true);
            if (numOfLTsInMatch !== 0) {
              line = line + numOfLTsInMatch;
              column = imageLength - lastLTEndOffset;
              this.updateTokenEndLineColumnLocation(newToken, group, lastLTEndOffset, numOfLTsInMatch, line, column, imageLength);
            } else {
              column = this.computeNewColumn(column, imageLength);
            }
          } else {
            column = this.computeNewColumn(column, imageLength);
          }
          offset2 = offset2 + imageLength;
          this.handleModes(currConfig, pop_mode, push_mode, newToken);
        } else {
          const errorStartOffset = offset2;
          const errorLine = line;
          const errorColumn = column;
          let foundResyncPoint = recoveryEnabled === false;
          while (foundResyncPoint === false && offset2 < orgLength) {
            offset2++;
            for (j = 0; j < currModePatternsLength; j++) {
              const currConfig2 = patternIdxToConfig[j];
              const currPattern = currConfig2.pattern;
              const singleCharCode = currConfig2.short;
              if (singleCharCode !== false) {
                if (orgText.charCodeAt(offset2) === singleCharCode) {
                  foundResyncPoint = true;
                }
              } else if (currConfig2.isCustom === true) {
                foundResyncPoint = currPattern.exec(orgText, offset2, matchedTokens, groups) !== null;
              } else {
                currPattern.lastIndex = offset2;
                foundResyncPoint = currPattern.exec(text) !== null;
              }
              if (foundResyncPoint === true) {
                break;
              }
            }
          }
          errLength = offset2 - errorStartOffset;
          column = this.computeNewColumn(column, errLength);
          msg = this.config.errorMessageProvider.buildUnexpectedCharactersMessage(orgText, errorStartOffset, errLength, errorLine, errorColumn, last_default(modeStack));
          errors.push({
            offset: errorStartOffset,
            line: errorLine,
            column: errorColumn,
            length: errLength,
            message: msg
          });
          if (recoveryEnabled === false) {
            break;
          }
        }
      }
      if (!this.hasCustom) {
        matchedTokens.length = matchedTokensIndex;
      }
      return {
        tokens: matchedTokens,
        groups,
        errors
      };
    }
    handleModes(config, pop_mode, push_mode, newToken) {
      if (config.pop === true) {
        const pushMode = config.push;
        pop_mode(newToken);
        if (pushMode !== void 0) {
          push_mode.call(this, pushMode);
        }
      } else if (config.push !== void 0) {
        push_mode.call(this, config.push);
      }
    }
    // TODO: decrease this under 600 characters? inspect stripping comments option in TSC compiler
    updateTokenEndLineColumnLocation(newToken, group, lastLTIdx, numOfLTsInMatch, line, column, imageLength) {
      let lastCharIsLT, fixForEndingInLT;
      if (group !== void 0) {
        lastCharIsLT = lastLTIdx === imageLength - 1;
        fixForEndingInLT = lastCharIsLT ? -1 : 0;
        if (!(numOfLTsInMatch === 1 && lastCharIsLT === true)) {
          newToken.endLine = line + fixForEndingInLT;
          newToken.endColumn = column - 1 + -fixForEndingInLT;
        }
      }
    }
    computeNewColumn(oldColumn, imageLength) {
      return oldColumn + imageLength;
    }
    createOffsetOnlyToken(image, startOffset, tokenTypeIdx, tokenType) {
      return {
        image,
        startOffset,
        tokenTypeIdx,
        tokenType
      };
    }
    createStartOnlyToken(image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn) {
      return {
        image,
        startOffset,
        startLine,
        startColumn,
        tokenTypeIdx,
        tokenType
      };
    }
    createFullToken(image, startOffset, tokenTypeIdx, tokenType, startLine, startColumn, imageLength) {
      return {
        image,
        startOffset,
        endOffset: startOffset + imageLength - 1,
        startLine,
        endLine: startLine,
        startColumn,
        endColumn: startColumn + imageLength - 1,
        tokenTypeIdx,
        tokenType
      };
    }
    addTokenUsingPush(tokenVector, index, tokenToAdd) {
      tokenVector.push(tokenToAdd);
      return index;
    }
    addTokenUsingMemberAccess(tokenVector, index, tokenToAdd) {
      tokenVector[index] = tokenToAdd;
      index++;
      return index;
    }
    handlePayloadNoCustom(token, payload) {
    }
    handlePayloadWithCustom(token, payload) {
      if (payload !== null) {
        token.payload = payload;
      }
    }
    match(pattern, text, offset2) {
      const found = pattern.test(text);
      if (found === true) {
        return text.substring(offset2, pattern.lastIndex);
      }
      return null;
    }
    matchLength(pattern, text, offset2) {
      const found = pattern.test(text);
      if (found === true) {
        return pattern.lastIndex - offset2;
      }
      return -1;
    }
  };
  Lexer.SKIPPED = "This marks a skipped Token pattern, this means each token identified by it will be consumed and then thrown into oblivion, this can be used to for example to completely ignore whitespace.";
  Lexer.NA = /NOT_APPLICABLE/;
  function tokenLabel2(tokType) {
    if (hasTokenLabel2(tokType)) {
      return tokType.LABEL;
    } else {
      return tokType.name;
    }
  }
  function hasTokenLabel2(obj) {
    return isString_default(obj.LABEL) && obj.LABEL !== "";
  }
  var PARENT = "parent";
  var CATEGORIES = "categories";
  var LABEL = "label";
  var GROUP = "group";
  var PUSH_MODE = "push_mode";
  var POP_MODE = "pop_mode";
  var LONGER_ALT = "longer_alt";
  var LINE_BREAKS = "line_breaks";
  var START_CHARS_HINT = "start_chars_hint";
  function createToken(config) {
    return createTokenInternal(config);
  }
  function createTokenInternal(config) {
    const pattern = config.pattern;
    const tokenType = {};
    tokenType.name = config.name;
    if (!isUndefined_default(pattern)) {
      tokenType.PATTERN = pattern;
    }
    if (has_default(config, PARENT)) {
      throw "The parent property is no longer supported.\nSee: https://github.com/chevrotain/chevrotain/issues/564#issuecomment-349062346 for details.";
    }
    if (has_default(config, CATEGORIES)) {
      tokenType.CATEGORIES = config[CATEGORIES];
    }
    augmentTokenTypes([tokenType]);
    if (has_default(config, LABEL)) {
      tokenType.LABEL = config[LABEL];
    }
    if (has_default(config, GROUP)) {
      tokenType.GROUP = config[GROUP];
    }
    if (has_default(config, POP_MODE)) {
      tokenType.POP_MODE = config[POP_MODE];
    }
    if (has_default(config, PUSH_MODE)) {
      tokenType.PUSH_MODE = config[PUSH_MODE];
    }
    if (has_default(config, LONGER_ALT)) {
      tokenType.LONGER_ALT = config[LONGER_ALT];
    }
    if (has_default(config, LINE_BREAKS)) {
      tokenType.LINE_BREAKS = config[LINE_BREAKS];
    }
    if (has_default(config, START_CHARS_HINT)) {
      tokenType.START_CHARS_HINT = config[START_CHARS_HINT];
    }
    return tokenType;
  }
  var EOF = createToken({ name: "EOF", pattern: Lexer.NA });
  augmentTokenTypes([EOF]);
  function createTokenInstance(tokType, image, startOffset, endOffset, startLine, endLine, startColumn, endColumn) {
    return {
      image,
      startOffset,
      endOffset,
      startLine,
      endLine,
      startColumn,
      endColumn,
      tokenTypeIdx: tokType.tokenTypeIdx,
      tokenType: tokType
    };
  }
  function tokenMatcher(token, tokType) {
    return tokenStructuredMatcher(token, tokType);
  }
  var defaultParserErrorProvider = {
    buildMismatchTokenMessage({ expected, actual, previous, ruleName }) {
      const hasLabel = hasTokenLabel2(expected);
      const expectedMsg = hasLabel ? `--> ${tokenLabel2(expected)} <--` : `token of type --> ${expected.name} <--`;
      const msg = `Expecting ${expectedMsg} but found --> '${actual.image}' <--`;
      return msg;
    },
    buildNotAllInputParsedMessage({ firstRedundant, ruleName }) {
      return "Redundant input, expecting EOF but found: " + firstRedundant.image;
    },
    buildNoViableAltMessage({ expectedPathsPerAlt, actual, previous, customUserDescription, ruleName }) {
      const errPrefix = "Expecting: ";
      const actualText = head_default(actual).image;
      const errSuffix = "\nbut found: '" + actualText + "'";
      if (customUserDescription) {
        return errPrefix + customUserDescription + errSuffix;
      } else {
        const allLookAheadPaths = reduce_default(expectedPathsPerAlt, (result, currAltPaths) => result.concat(currAltPaths), []);
        const nextValidTokenSequences = map_default(allLookAheadPaths, (currPath) => `[${map_default(currPath, (currTokenType) => tokenLabel2(currTokenType)).join(", ")}]`);
        const nextValidSequenceItems = map_default(nextValidTokenSequences, (itemMsg, idx) => `  ${idx + 1}. ${itemMsg}`);
        const calculatedDescription = `one of these possible Token sequences:
${nextValidSequenceItems.join("\n")}`;
        return errPrefix + calculatedDescription + errSuffix;
      }
    },
    buildEarlyExitMessage({ expectedIterationPaths, actual, customUserDescription, ruleName }) {
      const errPrefix = "Expecting: ";
      const actualText = head_default(actual).image;
      const errSuffix = "\nbut found: '" + actualText + "'";
      if (customUserDescription) {
        return errPrefix + customUserDescription + errSuffix;
      } else {
        const nextValidTokenSequences = map_default(expectedIterationPaths, (currPath) => `[${map_default(currPath, (currTokenType) => tokenLabel2(currTokenType)).join(",")}]`);
        const calculatedDescription = `expecting at least one iteration which starts with one of these possible Token sequences::
  <${nextValidTokenSequences.join(" ,")}>`;
        return errPrefix + calculatedDescription + errSuffix;
      }
    }
  };
  Object.freeze(defaultParserErrorProvider);
  var defaultGrammarResolverErrorProvider = {
    buildRuleNotFoundError(topLevelRule, undefinedRule) {
      const msg = "Invalid grammar, reference to a rule which is not defined: ->" + undefinedRule.nonTerminalName + "<-\ninside top level rule: ->" + topLevelRule.name + "<-";
      return msg;
    }
  };
  var defaultGrammarValidatorErrorProvider = {
    buildDuplicateFoundError(topLevelRule, duplicateProds) {
      function getExtraProductionArgument2(prod) {
        if (prod instanceof Terminal) {
          return prod.terminalType.name;
        } else if (prod instanceof NonTerminal) {
          return prod.nonTerminalName;
        } else {
          return "";
        }
      }
      const topLevelName = topLevelRule.name;
      const duplicateProd = head_default(duplicateProds);
      const index = duplicateProd.idx;
      const dslName = getProductionDslName(duplicateProd);
      const extraArgument = getExtraProductionArgument2(duplicateProd);
      const hasExplicitIndex = index > 0;
      let msg = `->${dslName}${hasExplicitIndex ? index : ""}<- ${extraArgument ? `with argument: ->${extraArgument}<-` : ""}
                  appears more than once (${duplicateProds.length} times) in the top level rule: ->${topLevelName}<-.                  
                  For further details see: https://chevrotain.io/docs/FAQ.html#NUMERICAL_SUFFIXES 
                  `;
      msg = msg.replace(/[ \t]+/g, " ");
      msg = msg.replace(/\s\s+/g, "\n");
      return msg;
    },
    buildNamespaceConflictError(rule) {
      const errMsg = `Namespace conflict found in grammar.
The grammar has both a Terminal(Token) and a Non-Terminal(Rule) named: <${rule.name}>.
To resolve this make sure each Terminal and Non-Terminal names are unique
This is easy to accomplish by using the convention that Terminal names start with an uppercase letter
and Non-Terminal names start with a lower case letter.`;
      return errMsg;
    },
    buildAlternationPrefixAmbiguityError(options) {
      const pathMsg = map_default(options.prefixPath, (currTok) => tokenLabel2(currTok)).join(", ");
      const occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
      const errMsg = `Ambiguous alternatives: <${options.ambiguityIndices.join(" ,")}> due to common lookahead prefix
in <OR${occurrence}> inside <${options.topLevelRule.name}> Rule,
<${pathMsg}> may appears as a prefix path in all these alternatives.
See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#COMMON_PREFIX
For Further details.`;
      return errMsg;
    },
    buildAlternationAmbiguityError(options) {
      const occurrence = options.alternation.idx === 0 ? "" : options.alternation.idx;
      const isEmptyPath = options.prefixPath.length === 0;
      let currMessage = `Ambiguous Alternatives Detected: <${options.ambiguityIndices.join(" ,")}> in <OR${occurrence}> inside <${options.topLevelRule.name}> Rule,
`;
      if (isEmptyPath) {
        currMessage += `These alternatives are all empty (match no tokens), making them indistinguishable.
Only the last alternative may be empty.
`;
      } else {
        const pathMsg = map_default(options.prefixPath, (currtok) => tokenLabel2(currtok)).join(", ");
        currMessage += `<${pathMsg}> may appears as a prefix path in all these alternatives.
`;
      }
      currMessage += `See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#AMBIGUOUS_ALTERNATIVES
For Further details.`;
      return currMessage;
    },
    buildEmptyRepetitionError(options) {
      let dslName = getProductionDslName(options.repetition);
      if (options.repetition.idx !== 0) {
        dslName += options.repetition.idx;
      }
      const errMsg = `The repetition <${dslName}> within Rule <${options.topLevelRule.name}> can never consume any tokens.
This could lead to an infinite loop.`;
      return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildTokenNameError(options) {
      return "deprecated";
    },
    buildEmptyAlternationError(options) {
      const errMsg = `Ambiguous empty alternative: <${options.emptyChoiceIdx + 1}> in <OR${options.alternation.idx}> inside <${options.topLevelRule.name}> Rule.
Only the last alternative may be an empty alternative.`;
      return errMsg;
    },
    buildTooManyAlternativesError(options) {
      const errMsg = `An Alternation cannot have more than 256 alternatives:
<OR${options.alternation.idx}> inside <${options.topLevelRule.name}> Rule.
 has ${options.alternation.definition.length + 1} alternatives.`;
      return errMsg;
    },
    buildLeftRecursionError(options) {
      const ruleName = options.topLevelRule.name;
      const pathNames = map_default(options.leftRecursionPath, (currRule) => currRule.name);
      const leftRecursivePath = `${ruleName} --> ${pathNames.concat([ruleName]).join(" --> ")}`;
      const errMsg = `Left Recursion found in grammar.
rule: <${ruleName}> can be invoked from itself (directly or indirectly)
without consuming any Tokens. The grammar path that causes this is: 
 ${leftRecursivePath}
 To fix this refactor your grammar to remove the left recursion.
see: https://en.wikipedia.org/wiki/LL_parser#Left_factoring.`;
      return errMsg;
    },
    // TODO: remove - `errors_public` from nyc.config.js exclude
    //       once this method is fully removed from this file
    buildInvalidRuleNameError(options) {
      return "deprecated";
    },
    buildDuplicateRuleNameError(options) {
      let ruleName;
      if (options.topLevelRule instanceof Rule) {
        ruleName = options.topLevelRule.name;
      } else {
        ruleName = options.topLevelRule;
      }
      const errMsg = `Duplicate definition, rule: ->${ruleName}<- is already defined in the grammar: ->${options.grammarName}<-`;
      return errMsg;
    }
  };
  function resolveGrammar(topLevels, errMsgProvider) {
    const refResolver = new GastRefResolverVisitor(topLevels, errMsgProvider);
    refResolver.resolveRefs();
    return refResolver.errors;
  }
  var GastRefResolverVisitor = class extends GAstVisitor {
    constructor(nameToTopRule, errMsgProvider) {
      super();
      this.nameToTopRule = nameToTopRule;
      this.errMsgProvider = errMsgProvider;
      this.errors = [];
    }
    resolveRefs() {
      forEach_default(values_default(this.nameToTopRule), (prod) => {
        this.currTopLevel = prod;
        prod.accept(this);
      });
    }
    visitNonTerminal(node) {
      const ref = this.nameToTopRule[node.nonTerminalName];
      if (!ref) {
        const msg = this.errMsgProvider.buildRuleNotFoundError(this.currTopLevel, node);
        this.errors.push({
          message: msg,
          type: ParserDefinitionErrorType.UNRESOLVED_SUBRULE_REF,
          ruleName: this.currTopLevel.name,
          unresolvedRefName: node.nonTerminalName
        });
      } else {
        node.referencedRule = ref;
      }
    }
  };
  var AbstractNextPossibleTokensWalker = class extends RestWalker {
    constructor(topProd, path2) {
      super();
      this.topProd = topProd;
      this.path = path2;
      this.possibleTokTypes = [];
      this.nextProductionName = "";
      this.nextProductionOccurrence = 0;
      this.found = false;
      this.isAtEndOfPath = false;
    }
    startWalking() {
      this.found = false;
      if (this.path.ruleStack[0] !== this.topProd.name) {
        throw Error("The path does not start with the walker's top Rule!");
      }
      this.ruleStack = clone_default(this.path.ruleStack).reverse();
      this.occurrenceStack = clone_default(this.path.occurrenceStack).reverse();
      this.ruleStack.pop();
      this.occurrenceStack.pop();
      this.updateExpectedNext();
      this.walk(this.topProd);
      return this.possibleTokTypes;
    }
    walk(prod, prevRest = []) {
      if (!this.found) {
        super.walk(prod, prevRest);
      }
    }
    walkProdRef(refProd, currRest, prevRest) {
      if (refProd.referencedRule.name === this.nextProductionName && refProd.idx === this.nextProductionOccurrence) {
        const fullRest = currRest.concat(prevRest);
        this.updateExpectedNext();
        this.walk(refProd.referencedRule, fullRest);
      }
    }
    updateExpectedNext() {
      if (isEmpty_default(this.ruleStack)) {
        this.nextProductionName = "";
        this.nextProductionOccurrence = 0;
        this.isAtEndOfPath = true;
      } else {
        this.nextProductionName = this.ruleStack.pop();
        this.nextProductionOccurrence = this.occurrenceStack.pop();
      }
    }
  };
  var NextAfterTokenWalker = class extends AbstractNextPossibleTokensWalker {
    constructor(topProd, path2) {
      super(topProd, path2);
      this.path = path2;
      this.nextTerminalName = "";
      this.nextTerminalOccurrence = 0;
      this.nextTerminalName = this.path.lastTok.name;
      this.nextTerminalOccurrence = this.path.lastTokOccurrence;
    }
    walkTerminal(terminal, currRest, prevRest) {
      if (this.isAtEndOfPath && terminal.terminalType.name === this.nextTerminalName && terminal.idx === this.nextTerminalOccurrence && !this.found) {
        const fullRest = currRest.concat(prevRest);
        const restProd = new Alternative({ definition: fullRest });
        this.possibleTokTypes = first(restProd);
        this.found = true;
      }
    }
  };
  var AbstractNextTerminalAfterProductionWalker = class extends RestWalker {
    constructor(topRule, occurrence) {
      super();
      this.topRule = topRule;
      this.occurrence = occurrence;
      this.result = {
        token: void 0,
        occurrence: void 0,
        isEndOfRule: void 0
      };
    }
    startWalking() {
      this.walk(this.topRule);
      return this.result;
    }
  };
  var NextTerminalAfterManyWalker = class extends AbstractNextTerminalAfterProductionWalker {
    walkMany(manyProd, currRest, prevRest) {
      if (manyProd.idx === this.occurrence) {
        const firstAfterMany = head_default(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterMany === void 0;
        if (firstAfterMany instanceof Terminal) {
          this.result.token = firstAfterMany.terminalType;
          this.result.occurrence = firstAfterMany.idx;
        }
      } else {
        super.walkMany(manyProd, currRest, prevRest);
      }
    }
  };
  var NextTerminalAfterManySepWalker = class extends AbstractNextTerminalAfterProductionWalker {
    walkManySep(manySepProd, currRest, prevRest) {
      if (manySepProd.idx === this.occurrence) {
        const firstAfterManySep = head_default(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterManySep === void 0;
        if (firstAfterManySep instanceof Terminal) {
          this.result.token = firstAfterManySep.terminalType;
          this.result.occurrence = firstAfterManySep.idx;
        }
      } else {
        super.walkManySep(manySepProd, currRest, prevRest);
      }
    }
  };
  var NextTerminalAfterAtLeastOneWalker = class extends AbstractNextTerminalAfterProductionWalker {
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      if (atLeastOneProd.idx === this.occurrence) {
        const firstAfterAtLeastOne = head_default(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterAtLeastOne === void 0;
        if (firstAfterAtLeastOne instanceof Terminal) {
          this.result.token = firstAfterAtLeastOne.terminalType;
          this.result.occurrence = firstAfterAtLeastOne.idx;
        }
      } else {
        super.walkAtLeastOne(atLeastOneProd, currRest, prevRest);
      }
    }
  };
  var NextTerminalAfterAtLeastOneSepWalker = class extends AbstractNextTerminalAfterProductionWalker {
    walkAtLeastOneSep(atleastOneSepProd, currRest, prevRest) {
      if (atleastOneSepProd.idx === this.occurrence) {
        const firstAfterfirstAfterAtLeastOneSep = head_default(currRest.concat(prevRest));
        this.result.isEndOfRule = firstAfterfirstAfterAtLeastOneSep === void 0;
        if (firstAfterfirstAfterAtLeastOneSep instanceof Terminal) {
          this.result.token = firstAfterfirstAfterAtLeastOneSep.terminalType;
          this.result.occurrence = firstAfterfirstAfterAtLeastOneSep.idx;
        }
      } else {
        super.walkAtLeastOneSep(atleastOneSepProd, currRest, prevRest);
      }
    }
  };
  function possiblePathsFrom(targetDef, maxLength, currPath = []) {
    currPath = clone_default(currPath);
    let result = [];
    let i = 0;
    function remainingPathWith(nextDef) {
      return nextDef.concat(drop_default(targetDef, i + 1));
    }
    function getAlternativesForProd(definition) {
      const alternatives = possiblePathsFrom(remainingPathWith(definition), maxLength, currPath);
      return result.concat(alternatives);
    }
    while (currPath.length < maxLength && i < targetDef.length) {
      const prod = targetDef[i];
      if (prod instanceof Alternative) {
        return getAlternativesForProd(prod.definition);
      } else if (prod instanceof NonTerminal) {
        return getAlternativesForProd(prod.definition);
      } else if (prod instanceof Option) {
        result = getAlternativesForProd(prod.definition);
      } else if (prod instanceof RepetitionMandatory) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: prod.definition
          })
        ]);
        return getAlternativesForProd(newDef);
      } else if (prod instanceof RepetitionMandatoryWithSeparator) {
        const newDef = [
          new Alternative({ definition: prod.definition }),
          new Repetition({
            definition: [new Terminal({ terminalType: prod.separator })].concat(prod.definition)
          })
        ];
        return getAlternativesForProd(newDef);
      } else if (prod instanceof RepetitionWithSeparator) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: [new Terminal({ terminalType: prod.separator })].concat(prod.definition)
          })
        ]);
        result = getAlternativesForProd(newDef);
      } else if (prod instanceof Repetition) {
        const newDef = prod.definition.concat([
          new Repetition({
            definition: prod.definition
          })
        ]);
        result = getAlternativesForProd(newDef);
      } else if (prod instanceof Alternation) {
        forEach_default(prod.definition, (currAlt) => {
          if (isEmpty_default(currAlt.definition) === false) {
            result = getAlternativesForProd(currAlt.definition);
          }
        });
        return result;
      } else if (prod instanceof Terminal) {
        currPath.push(prod.terminalType);
      } else {
        throw Error("non exhaustive match");
      }
      i++;
    }
    result.push({
      partialPath: currPath,
      suffixDef: drop_default(targetDef, i)
    });
    return result;
  }
  function nextPossibleTokensAfter(initialDef, tokenVector, tokMatcher, maxLookAhead) {
    const EXIT_NON_TERMINAL = "EXIT_NONE_TERMINAL";
    const EXIT_NON_TERMINAL_ARR = [EXIT_NON_TERMINAL];
    const EXIT_ALTERNATIVE = "EXIT_ALTERNATIVE";
    let foundCompletePath = false;
    const tokenVectorLength = tokenVector.length;
    const minimalAlternativesIndex = tokenVectorLength - maxLookAhead - 1;
    const result = [];
    const possiblePaths = [];
    possiblePaths.push({
      idx: -1,
      def: initialDef,
      ruleStack: [],
      occurrenceStack: []
    });
    while (!isEmpty_default(possiblePaths)) {
      const currPath = possiblePaths.pop();
      if (currPath === EXIT_ALTERNATIVE) {
        if (foundCompletePath && last_default(possiblePaths).idx <= minimalAlternativesIndex) {
          possiblePaths.pop();
        }
        continue;
      }
      const currDef = currPath.def;
      const currIdx = currPath.idx;
      const currRuleStack = currPath.ruleStack;
      const currOccurrenceStack = currPath.occurrenceStack;
      if (isEmpty_default(currDef)) {
        continue;
      }
      const prod = currDef[0];
      if (prod === EXIT_NON_TERMINAL) {
        const nextPath = {
          idx: currIdx,
          def: drop_default(currDef),
          ruleStack: dropRight_default(currRuleStack),
          occurrenceStack: dropRight_default(currOccurrenceStack)
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof Terminal) {
        if (currIdx < tokenVectorLength - 1) {
          const nextIdx = currIdx + 1;
          const actualToken = tokenVector[nextIdx];
          if (tokMatcher(actualToken, prod.terminalType)) {
            const nextPath = {
              idx: nextIdx,
              def: drop_default(currDef),
              ruleStack: currRuleStack,
              occurrenceStack: currOccurrenceStack
            };
            possiblePaths.push(nextPath);
          }
        } else if (currIdx === tokenVectorLength - 1) {
          result.push({
            nextTokenType: prod.terminalType,
            nextTokenOccurrence: prod.idx,
            ruleStack: currRuleStack,
            occurrenceStack: currOccurrenceStack
          });
          foundCompletePath = true;
        } else {
          throw Error("non exhaustive match");
        }
      } else if (prod instanceof NonTerminal) {
        const newRuleStack = clone_default(currRuleStack);
        newRuleStack.push(prod.nonTerminalName);
        const newOccurrenceStack = clone_default(currOccurrenceStack);
        newOccurrenceStack.push(prod.idx);
        const nextPath = {
          idx: currIdx,
          def: prod.definition.concat(EXIT_NON_TERMINAL_ARR, drop_default(currDef)),
          ruleStack: newRuleStack,
          occurrenceStack: newOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof Option) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop_default(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const nextPathWith = {
          idx: currIdx,
          def: prod.definition.concat(drop_default(currDef)),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof RepetitionMandatory) {
        const secondIteration = new Repetition({
          definition: prod.definition,
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([secondIteration], drop_default(currDef));
        const nextPath = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof RepetitionMandatoryWithSeparator) {
        const separatorGast = new Terminal({
          terminalType: prod.separator
        });
        const secondIteration = new Repetition({
          definition: [separatorGast].concat(prod.definition),
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([secondIteration], drop_default(currDef));
        const nextPath = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPath);
      } else if (prod instanceof RepetitionWithSeparator) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop_default(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const separatorGast = new Terminal({
          terminalType: prod.separator
        });
        const nthRepetition = new Repetition({
          definition: [separatorGast].concat(prod.definition),
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([nthRepetition], drop_default(currDef));
        const nextPathWith = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof Repetition) {
        const nextPathWithout = {
          idx: currIdx,
          def: drop_default(currDef),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWithout);
        possiblePaths.push(EXIT_ALTERNATIVE);
        const nthRepetition = new Repetition({
          definition: prod.definition,
          idx: prod.idx
        });
        const nextDef = prod.definition.concat([nthRepetition], drop_default(currDef));
        const nextPathWith = {
          idx: currIdx,
          def: nextDef,
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        };
        possiblePaths.push(nextPathWith);
      } else if (prod instanceof Alternation) {
        for (let i = prod.definition.length - 1; i >= 0; i--) {
          const currAlt = prod.definition[i];
          const currAltPath = {
            idx: currIdx,
            def: currAlt.definition.concat(drop_default(currDef)),
            ruleStack: currRuleStack,
            occurrenceStack: currOccurrenceStack
          };
          possiblePaths.push(currAltPath);
          possiblePaths.push(EXIT_ALTERNATIVE);
        }
      } else if (prod instanceof Alternative) {
        possiblePaths.push({
          idx: currIdx,
          def: prod.definition.concat(drop_default(currDef)),
          ruleStack: currRuleStack,
          occurrenceStack: currOccurrenceStack
        });
      } else if (prod instanceof Rule) {
        possiblePaths.push(expandTopLevelRule(prod, currIdx, currRuleStack, currOccurrenceStack));
      } else {
        throw Error("non exhaustive match");
      }
    }
    return result;
  }
  function expandTopLevelRule(topRule, currIdx, currRuleStack, currOccurrenceStack) {
    const newRuleStack = clone_default(currRuleStack);
    newRuleStack.push(topRule.name);
    const newCurrOccurrenceStack = clone_default(currOccurrenceStack);
    newCurrOccurrenceStack.push(1);
    return {
      idx: currIdx,
      def: topRule.definition,
      ruleStack: newRuleStack,
      occurrenceStack: newCurrOccurrenceStack
    };
  }
  var PROD_TYPE;
  (function(PROD_TYPE2) {
    PROD_TYPE2[PROD_TYPE2["OPTION"] = 0] = "OPTION";
    PROD_TYPE2[PROD_TYPE2["REPETITION"] = 1] = "REPETITION";
    PROD_TYPE2[PROD_TYPE2["REPETITION_MANDATORY"] = 2] = "REPETITION_MANDATORY";
    PROD_TYPE2[PROD_TYPE2["REPETITION_MANDATORY_WITH_SEPARATOR"] = 3] = "REPETITION_MANDATORY_WITH_SEPARATOR";
    PROD_TYPE2[PROD_TYPE2["REPETITION_WITH_SEPARATOR"] = 4] = "REPETITION_WITH_SEPARATOR";
    PROD_TYPE2[PROD_TYPE2["ALTERNATION"] = 5] = "ALTERNATION";
  })(PROD_TYPE || (PROD_TYPE = {}));
  function getProdType(prod) {
    if (prod instanceof Option || prod === "Option") {
      return PROD_TYPE.OPTION;
    } else if (prod instanceof Repetition || prod === "Repetition") {
      return PROD_TYPE.REPETITION;
    } else if (prod instanceof RepetitionMandatory || prod === "RepetitionMandatory") {
      return PROD_TYPE.REPETITION_MANDATORY;
    } else if (prod instanceof RepetitionMandatoryWithSeparator || prod === "RepetitionMandatoryWithSeparator") {
      return PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR;
    } else if (prod instanceof RepetitionWithSeparator || prod === "RepetitionWithSeparator") {
      return PROD_TYPE.REPETITION_WITH_SEPARATOR;
    } else if (prod instanceof Alternation || prod === "Alternation") {
      return PROD_TYPE.ALTERNATION;
    } else {
      throw Error("non exhaustive match");
    }
  }
  function buildLookaheadFuncForOr(occurrence, ruleGrammar, maxLookahead, hasPredicates, dynamicTokensEnabled, laFuncBuilder) {
    const lookAheadPaths = getLookaheadPathsForOr(occurrence, ruleGrammar, maxLookahead);
    const tokenMatcher2 = areTokenCategoriesNotUsed(lookAheadPaths) ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
    return laFuncBuilder(lookAheadPaths, hasPredicates, tokenMatcher2, dynamicTokensEnabled);
  }
  function buildLookaheadFuncForOptionalProd(occurrence, ruleGrammar, k, dynamicTokensEnabled, prodType, lookaheadBuilder) {
    const lookAheadPaths = getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k);
    const tokenMatcher2 = areTokenCategoriesNotUsed(lookAheadPaths) ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
    return lookaheadBuilder(lookAheadPaths[0], tokenMatcher2, dynamicTokensEnabled);
  }
  function buildAlternativesLookAheadFunc(alts, hasPredicates, tokenMatcher2, dynamicTokensEnabled) {
    const numOfAlts = alts.length;
    const areAllOneTokenLookahead = every_default(alts, (currAlt) => {
      return every_default(currAlt, (currPath) => {
        return currPath.length === 1;
      });
    });
    if (hasPredicates) {
      return function(orAlts) {
        const predicates = map_default(orAlts, (currAlt) => currAlt.GATE);
        for (let t = 0; t < numOfAlts; t++) {
          const currAlt = alts[t];
          const currNumOfPaths = currAlt.length;
          const currPredicate = predicates[t];
          if (currPredicate !== void 0 && currPredicate.call(this) === false) {
            continue;
          }
          nextPath: for (let j = 0; j < currNumOfPaths; j++) {
            const currPath = currAlt[j];
            const currPathLength = currPath.length;
            for (let i = 0; i < currPathLength; i++) {
              const nextToken = this.LA_FAST(i + 1);
              if (tokenMatcher2(nextToken, currPath[i]) === false) {
                continue nextPath;
              }
            }
            return t;
          }
        }
        return void 0;
      };
    } else if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
      const singleTokenAlts = map_default(alts, (currAlt) => {
        return flatten_default(currAlt);
      });
      const choiceToAlt = reduce_default(singleTokenAlts, (result, currAlt, idx) => {
        forEach_default(currAlt, (currTokType) => {
          if (!has_default(result, currTokType.tokenTypeIdx)) {
            result[currTokType.tokenTypeIdx] = idx;
          }
          forEach_default(currTokType.categoryMatches, (currExtendingType) => {
            if (!has_default(result, currExtendingType)) {
              result[currExtendingType] = idx;
            }
          });
        });
        return result;
      }, {});
      return function() {
        const nextToken = this.LA_FAST(1);
        return choiceToAlt[nextToken.tokenTypeIdx];
      };
    } else {
      return function() {
        for (let t = 0; t < numOfAlts; t++) {
          const currAlt = alts[t];
          const currNumOfPaths = currAlt.length;
          nextPath: for (let j = 0; j < currNumOfPaths; j++) {
            const currPath = currAlt[j];
            const currPathLength = currPath.length;
            for (let i = 0; i < currPathLength; i++) {
              const nextToken = this.LA_FAST(i + 1);
              if (tokenMatcher2(nextToken, currPath[i]) === false) {
                continue nextPath;
              }
            }
            return t;
          }
        }
        return void 0;
      };
    }
  }
  function buildSingleAlternativeLookaheadFunction(alt, tokenMatcher2, dynamicTokensEnabled) {
    const areAllOneTokenLookahead = every_default(alt, (currPath) => {
      return currPath.length === 1;
    });
    const numOfPaths = alt.length;
    if (areAllOneTokenLookahead && !dynamicTokensEnabled) {
      const singleTokensTypes = flatten_default(alt);
      if (singleTokensTypes.length === 1 && isEmpty_default(singleTokensTypes[0].categoryMatches)) {
        const expectedTokenType = singleTokensTypes[0];
        const expectedTokenUniqueKey = expectedTokenType.tokenTypeIdx;
        return function() {
          return this.LA_FAST(1).tokenTypeIdx === expectedTokenUniqueKey;
        };
      } else {
        const choiceToAlt = reduce_default(singleTokensTypes, (result, currTokType, idx) => {
          result[currTokType.tokenTypeIdx] = true;
          forEach_default(currTokType.categoryMatches, (currExtendingType) => {
            result[currExtendingType] = true;
          });
          return result;
        }, []);
        return function() {
          const nextToken = this.LA_FAST(1);
          return choiceToAlt[nextToken.tokenTypeIdx] === true;
        };
      }
    } else {
      return function() {
        nextPath: for (let j = 0; j < numOfPaths; j++) {
          const currPath = alt[j];
          const currPathLength = currPath.length;
          for (let i = 0; i < currPathLength; i++) {
            const nextToken = this.LA_FAST(i + 1);
            if (tokenMatcher2(nextToken, currPath[i]) === false) {
              continue nextPath;
            }
          }
          return true;
        }
        return false;
      };
    }
  }
  var RestDefinitionFinderWalker = class extends RestWalker {
    constructor(topProd, targetOccurrence, targetProdType) {
      super();
      this.topProd = topProd;
      this.targetOccurrence = targetOccurrence;
      this.targetProdType = targetProdType;
    }
    startWalking() {
      this.walk(this.topProd);
      return this.restDef;
    }
    checkIsTarget(node, expectedProdType, currRest, prevRest) {
      if (node.idx === this.targetOccurrence && this.targetProdType === expectedProdType) {
        this.restDef = currRest.concat(prevRest);
        return true;
      }
      return false;
    }
    walkOption(optionProd, currRest, prevRest) {
      if (!this.checkIsTarget(optionProd, PROD_TYPE.OPTION, currRest, prevRest)) {
        super.walkOption(optionProd, currRest, prevRest);
      }
    }
    walkAtLeastOne(atLeastOneProd, currRest, prevRest) {
      if (!this.checkIsTarget(atLeastOneProd, PROD_TYPE.REPETITION_MANDATORY, currRest, prevRest)) {
        super.walkOption(atLeastOneProd, currRest, prevRest);
      }
    }
    walkAtLeastOneSep(atLeastOneSepProd, currRest, prevRest) {
      if (!this.checkIsTarget(atLeastOneSepProd, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, currRest, prevRest)) {
        super.walkOption(atLeastOneSepProd, currRest, prevRest);
      }
    }
    walkMany(manyProd, currRest, prevRest) {
      if (!this.checkIsTarget(manyProd, PROD_TYPE.REPETITION, currRest, prevRest)) {
        super.walkOption(manyProd, currRest, prevRest);
      }
    }
    walkManySep(manySepProd, currRest, prevRest) {
      if (!this.checkIsTarget(manySepProd, PROD_TYPE.REPETITION_WITH_SEPARATOR, currRest, prevRest)) {
        super.walkOption(manySepProd, currRest, prevRest);
      }
    }
  };
  var InsideDefinitionFinderVisitor = class extends GAstVisitor {
    constructor(targetOccurrence, targetProdType, targetRef) {
      super();
      this.targetOccurrence = targetOccurrence;
      this.targetProdType = targetProdType;
      this.targetRef = targetRef;
      this.result = [];
    }
    checkIsTarget(node, expectedProdName) {
      if (node.idx === this.targetOccurrence && this.targetProdType === expectedProdName && (this.targetRef === void 0 || node === this.targetRef)) {
        this.result = node.definition;
      }
    }
    visitOption(node) {
      this.checkIsTarget(node, PROD_TYPE.OPTION);
    }
    visitRepetition(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION);
    }
    visitRepetitionMandatory(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY);
    }
    visitRepetitionMandatoryWithSeparator(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR);
    }
    visitRepetitionWithSeparator(node) {
      this.checkIsTarget(node, PROD_TYPE.REPETITION_WITH_SEPARATOR);
    }
    visitAlternation(node) {
      this.checkIsTarget(node, PROD_TYPE.ALTERNATION);
    }
  };
  function initializeArrayOfArrays(size) {
    const result = new Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = [];
    }
    return result;
  }
  function pathToHashKeys(path2) {
    let keys2 = [""];
    for (let i = 0; i < path2.length; i++) {
      const tokType = path2[i];
      const longerKeys = [];
      for (let j = 0; j < keys2.length; j++) {
        const currShorterKey = keys2[j];
        longerKeys.push(currShorterKey + "_" + tokType.tokenTypeIdx);
        for (let t = 0; t < tokType.categoryMatches.length; t++) {
          const categoriesKeySuffix = "_" + tokType.categoryMatches[t];
          longerKeys.push(currShorterKey + categoriesKeySuffix);
        }
      }
      keys2 = longerKeys;
    }
    return keys2;
  }
  function isUniquePrefixHash(altKnownPathsKeys, searchPathKeys, idx) {
    for (let currAltIdx = 0; currAltIdx < altKnownPathsKeys.length; currAltIdx++) {
      if (currAltIdx === idx) {
        continue;
      }
      const otherAltKnownPathsKeys = altKnownPathsKeys[currAltIdx];
      for (let searchIdx = 0; searchIdx < searchPathKeys.length; searchIdx++) {
        const searchKey = searchPathKeys[searchIdx];
        if (otherAltKnownPathsKeys[searchKey] === true) {
          return false;
        }
      }
    }
    return true;
  }
  function lookAheadSequenceFromAlternatives(altsDefs, k) {
    const partialAlts = map_default(altsDefs, (currAlt) => possiblePathsFrom([currAlt], 1));
    const finalResult = initializeArrayOfArrays(partialAlts.length);
    const altsHashes = map_default(partialAlts, (currAltPaths) => {
      const dict = {};
      forEach_default(currAltPaths, (item) => {
        const keys2 = pathToHashKeys(item.partialPath);
        forEach_default(keys2, (currKey) => {
          dict[currKey] = true;
        });
      });
      return dict;
    });
    let newData = partialAlts;
    for (let pathLength = 1; pathLength <= k; pathLength++) {
      const currDataset = newData;
      newData = initializeArrayOfArrays(currDataset.length);
      for (let altIdx = 0; altIdx < currDataset.length; altIdx++) {
        const currAltPathsAndSuffixes = currDataset[altIdx];
        for (let currPathIdx = 0; currPathIdx < currAltPathsAndSuffixes.length; currPathIdx++) {
          const currPathPrefix = currAltPathsAndSuffixes[currPathIdx].partialPath;
          const suffixDef = currAltPathsAndSuffixes[currPathIdx].suffixDef;
          const prefixKeys = pathToHashKeys(currPathPrefix);
          const isUnique = isUniquePrefixHash(altsHashes, prefixKeys, altIdx);
          if (isUnique || isEmpty_default(suffixDef) || currPathPrefix.length === k) {
            const currAltResult = finalResult[altIdx];
            if (containsPath(currAltResult, currPathPrefix) === false) {
              currAltResult.push(currPathPrefix);
              for (let j = 0; j < prefixKeys.length; j++) {
                const currKey = prefixKeys[j];
                altsHashes[altIdx][currKey] = true;
              }
            }
          } else {
            const newPartialPathsAndSuffixes = possiblePathsFrom(suffixDef, pathLength + 1, currPathPrefix);
            newData[altIdx] = newData[altIdx].concat(newPartialPathsAndSuffixes);
            forEach_default(newPartialPathsAndSuffixes, (item) => {
              const prefixKeys2 = pathToHashKeys(item.partialPath);
              forEach_default(prefixKeys2, (key) => {
                altsHashes[altIdx][key] = true;
              });
            });
          }
        }
      }
    }
    return finalResult;
  }
  function getLookaheadPathsForOr(occurrence, ruleGrammar, k, orProd) {
    const visitor = new InsideDefinitionFinderVisitor(occurrence, PROD_TYPE.ALTERNATION, orProd);
    ruleGrammar.accept(visitor);
    return lookAheadSequenceFromAlternatives(visitor.result, k);
  }
  function getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, k) {
    const insideDefVisitor = new InsideDefinitionFinderVisitor(occurrence, prodType);
    ruleGrammar.accept(insideDefVisitor);
    const insideDef = insideDefVisitor.result;
    const afterDefWalker = new RestDefinitionFinderWalker(ruleGrammar, occurrence, prodType);
    const afterDef = afterDefWalker.startWalking();
    const insideFlat = new Alternative({ definition: insideDef });
    const afterFlat = new Alternative({ definition: afterDef });
    return lookAheadSequenceFromAlternatives([insideFlat, afterFlat], k);
  }
  function containsPath(alternative, searchPath) {
    compareOtherPath: for (let i = 0; i < alternative.length; i++) {
      const otherPath = alternative[i];
      if (otherPath.length !== searchPath.length) {
        continue;
      }
      for (let j = 0; j < otherPath.length; j++) {
        const searchTok = searchPath[j];
        const otherTok = otherPath[j];
        const matchingTokens = searchTok === otherTok || otherTok.categoryMatchesMap[searchTok.tokenTypeIdx] !== void 0;
        if (matchingTokens === false) {
          continue compareOtherPath;
        }
      }
      return true;
    }
    return false;
  }
  function isStrictPrefixOfPath(prefix, other) {
    return prefix.length < other.length && every_default(prefix, (tokType, idx) => {
      const otherTokType = other[idx];
      return tokType === otherTokType || otherTokType.categoryMatchesMap[tokType.tokenTypeIdx];
    });
  }
  function areTokenCategoriesNotUsed(lookAheadPaths) {
    return every_default(lookAheadPaths, (singleAltPaths) => every_default(singleAltPaths, (singlePath) => every_default(singlePath, (token) => isEmpty_default(token.categoryMatches))));
  }
  function validateLookahead(options) {
    const lookaheadValidationErrorMessages = options.lookaheadStrategy.validate({
      rules: options.rules,
      tokenTypes: options.tokenTypes,
      grammarName: options.grammarName
    });
    return map_default(lookaheadValidationErrorMessages, (errorMessage) => Object.assign({ type: ParserDefinitionErrorType.CUSTOM_LOOKAHEAD_VALIDATION }, errorMessage));
  }
  function validateGrammar(topLevels, tokenTypes, errMsgProvider, grammarName) {
    const duplicateErrors = flatMap_default(topLevels, (currTopLevel) => validateDuplicateProductions(currTopLevel, errMsgProvider));
    const termsNamespaceConflictErrors = checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider);
    const tooManyAltsErrors = flatMap_default(topLevels, (curRule) => validateTooManyAlts(curRule, errMsgProvider));
    const duplicateRulesError = flatMap_default(topLevels, (curRule) => validateRuleDoesNotAlreadyExist(curRule, topLevels, grammarName, errMsgProvider));
    return duplicateErrors.concat(termsNamespaceConflictErrors, tooManyAltsErrors, duplicateRulesError);
  }
  function validateDuplicateProductions(topLevelRule, errMsgProvider) {
    const collectorVisitor2 = new OccurrenceValidationCollector();
    topLevelRule.accept(collectorVisitor2);
    const allRuleProductions = collectorVisitor2.allProductions;
    const productionGroups = groupBy_default(allRuleProductions, identifyProductionForDuplicates);
    const duplicates = pickBy_default(productionGroups, (currGroup) => {
      return currGroup.length > 1;
    });
    const errors = map_default(values_default(duplicates), (currDuplicates) => {
      const firstProd = head_default(currDuplicates);
      const msg = errMsgProvider.buildDuplicateFoundError(topLevelRule, currDuplicates);
      const dslName = getProductionDslName(firstProd);
      const defError = {
        message: msg,
        type: ParserDefinitionErrorType.DUPLICATE_PRODUCTIONS,
        ruleName: topLevelRule.name,
        dslName,
        occurrence: firstProd.idx
      };
      const param = getExtraProductionArgument(firstProd);
      if (param) {
        defError.parameter = param;
      }
      return defError;
    });
    return errors;
  }
  function identifyProductionForDuplicates(prod) {
    return `${getProductionDslName(prod)}_#_${prod.idx}_#_${getExtraProductionArgument(prod)}`;
  }
  function getExtraProductionArgument(prod) {
    if (prod instanceof Terminal) {
      return prod.terminalType.name;
    } else if (prod instanceof NonTerminal) {
      return prod.nonTerminalName;
    } else {
      return "";
    }
  }
  var OccurrenceValidationCollector = class extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.allProductions = [];
    }
    visitNonTerminal(subrule) {
      this.allProductions.push(subrule);
    }
    visitOption(option) {
      this.allProductions.push(option);
    }
    visitRepetitionWithSeparator(manySep) {
      this.allProductions.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.allProductions.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.allProductions.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.allProductions.push(many);
    }
    visitAlternation(or) {
      this.allProductions.push(or);
    }
    visitTerminal(terminal) {
      this.allProductions.push(terminal);
    }
  };
  function validateRuleDoesNotAlreadyExist(rule, allRules, className, errMsgProvider) {
    const errors = [];
    const occurrences = reduce_default(allRules, (result, curRule) => {
      if (curRule.name === rule.name) {
        return result + 1;
      }
      return result;
    }, 0);
    if (occurrences > 1) {
      const errMsg = errMsgProvider.buildDuplicateRuleNameError({
        topLevelRule: rule,
        grammarName: className
      });
      errors.push({
        message: errMsg,
        type: ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
        ruleName: rule.name
      });
    }
    return errors;
  }
  function validateRuleIsOverridden(ruleName, definedRulesNames, className) {
    const errors = [];
    let errMsg;
    if (!includes_default(definedRulesNames, ruleName)) {
      errMsg = `Invalid rule override, rule: ->${ruleName}<- cannot be overridden in the grammar: ->${className}<-as it is not defined in any of the super grammars `;
      errors.push({
        message: errMsg,
        type: ParserDefinitionErrorType.INVALID_RULE_OVERRIDE,
        ruleName
      });
    }
    return errors;
  }
  function validateNoLeftRecursion(topRule, currRule, errMsgProvider, path2 = []) {
    const errors = [];
    const nextNonTerminals = getFirstNoneTerminal(currRule.definition);
    if (isEmpty_default(nextNonTerminals)) {
      return [];
    } else {
      const ruleName = topRule.name;
      const foundLeftRecursion = includes_default(nextNonTerminals, topRule);
      if (foundLeftRecursion) {
        errors.push({
          message: errMsgProvider.buildLeftRecursionError({
            topLevelRule: topRule,
            leftRecursionPath: path2
          }),
          type: ParserDefinitionErrorType.LEFT_RECURSION,
          ruleName
        });
      }
      const validNextSteps = difference_default(nextNonTerminals, path2.concat([topRule]));
      const errorsFromNextSteps = flatMap_default(validNextSteps, (currRefRule) => {
        const newPath = clone_default(path2);
        newPath.push(currRefRule);
        return validateNoLeftRecursion(topRule, currRefRule, errMsgProvider, newPath);
      });
      return errors.concat(errorsFromNextSteps);
    }
  }
  function getFirstNoneTerminal(definition) {
    let result = [];
    if (isEmpty_default(definition)) {
      return result;
    }
    const firstProd = head_default(definition);
    if (firstProd instanceof NonTerminal) {
      result.push(firstProd.referencedRule);
    } else if (firstProd instanceof Alternative || firstProd instanceof Option || firstProd instanceof RepetitionMandatory || firstProd instanceof RepetitionMandatoryWithSeparator || firstProd instanceof RepetitionWithSeparator || firstProd instanceof Repetition) {
      result = result.concat(getFirstNoneTerminal(firstProd.definition));
    } else if (firstProd instanceof Alternation) {
      result = flatten_default(map_default(firstProd.definition, (currSubDef) => getFirstNoneTerminal(currSubDef.definition)));
    } else if (firstProd instanceof Terminal) {
    } else {
      throw Error("non exhaustive match");
    }
    const isFirstOptional = isOptionalProd(firstProd);
    const hasMore = definition.length > 1;
    if (isFirstOptional && hasMore) {
      const rest = drop_default(definition);
      return result.concat(getFirstNoneTerminal(rest));
    } else {
      return result;
    }
  }
  var OrCollector = class extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.alternations = [];
    }
    visitAlternation(node) {
      this.alternations.push(node);
    }
  };
  function validateEmptyOrAlternative(topLevelRule, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    const ors = orCollector.alternations;
    const errors = flatMap_default(ors, (currOr) => {
      const exceptLast = dropRight_default(currOr.definition);
      return flatMap_default(exceptLast, (currAlternative, currAltIdx) => {
        const possibleFirstInAlt = nextPossibleTokensAfter([currAlternative], [], tokenStructuredMatcher, 1);
        if (isEmpty_default(possibleFirstInAlt)) {
          return [
            {
              message: errMsgProvider.buildEmptyAlternationError({
                topLevelRule,
                alternation: currOr,
                emptyChoiceIdx: currAltIdx
              }),
              type: ParserDefinitionErrorType.NONE_LAST_EMPTY_ALT,
              ruleName: topLevelRule.name,
              occurrence: currOr.idx,
              alternative: currAltIdx + 1
            }
          ];
        } else {
          return [];
        }
      });
    });
    return errors;
  }
  function validateAmbiguousAlternationAlternatives(topLevelRule, globalMaxLookahead, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    let ors = orCollector.alternations;
    ors = reject_default(ors, (currOr) => currOr.ignoreAmbiguities === true);
    const errors = flatMap_default(ors, (currOr) => {
      const currOccurrence = currOr.idx;
      const actualMaxLookahead = currOr.maxLookahead || globalMaxLookahead;
      const alternatives = getLookaheadPathsForOr(currOccurrence, topLevelRule, actualMaxLookahead, currOr);
      const altsAmbiguityErrors = checkAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
      const altsPrefixAmbiguityErrors = checkPrefixAlternativesAmbiguities(alternatives, currOr, topLevelRule, errMsgProvider);
      return altsAmbiguityErrors.concat(altsPrefixAmbiguityErrors);
    });
    return errors;
  }
  var RepetitionCollector = class extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.allProductions = [];
    }
    visitRepetitionWithSeparator(manySep) {
      this.allProductions.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.allProductions.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.allProductions.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.allProductions.push(many);
    }
  };
  function validateTooManyAlts(topLevelRule, errMsgProvider) {
    const orCollector = new OrCollector();
    topLevelRule.accept(orCollector);
    const ors = orCollector.alternations;
    const errors = flatMap_default(ors, (currOr) => {
      if (currOr.definition.length > 255) {
        return [
          {
            message: errMsgProvider.buildTooManyAlternativesError({
              topLevelRule,
              alternation: currOr
            }),
            type: ParserDefinitionErrorType.TOO_MANY_ALTS,
            ruleName: topLevelRule.name,
            occurrence: currOr.idx
          }
        ];
      } else {
        return [];
      }
    });
    return errors;
  }
  function validateSomeNonEmptyLookaheadPath(topLevelRules, maxLookahead, errMsgProvider) {
    const errors = [];
    forEach_default(topLevelRules, (currTopRule) => {
      const collectorVisitor2 = new RepetitionCollector();
      currTopRule.accept(collectorVisitor2);
      const allRuleProductions = collectorVisitor2.allProductions;
      forEach_default(allRuleProductions, (currProd) => {
        const prodType = getProdType(currProd);
        const actualMaxLookahead = currProd.maxLookahead || maxLookahead;
        const currOccurrence = currProd.idx;
        const paths = getLookaheadPathsForOptionalProd(currOccurrence, currTopRule, prodType, actualMaxLookahead);
        const pathsInsideProduction = paths[0];
        if (isEmpty_default(flatten_default(pathsInsideProduction))) {
          const errMsg = errMsgProvider.buildEmptyRepetitionError({
            topLevelRule: currTopRule,
            repetition: currProd
          });
          errors.push({
            message: errMsg,
            type: ParserDefinitionErrorType.NO_NON_EMPTY_LOOKAHEAD,
            ruleName: currTopRule.name
          });
        }
      });
    });
    return errors;
  }
  function checkAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    const foundAmbiguousPaths = [];
    const identicalAmbiguities = reduce_default(alternatives, (result, currAlt, currAltIdx) => {
      if (alternation.definition[currAltIdx].ignoreAmbiguities === true) {
        return result;
      }
      forEach_default(currAlt, (currPath) => {
        const altsCurrPathAppearsIn = [currAltIdx];
        forEach_default(alternatives, (currOtherAlt, currOtherAltIdx) => {
          if (currAltIdx !== currOtherAltIdx && containsPath(currOtherAlt, currPath) && // ignore (skip) ambiguities with this "other" alternative
          alternation.definition[currOtherAltIdx].ignoreAmbiguities !== true) {
            altsCurrPathAppearsIn.push(currOtherAltIdx);
          }
        });
        if (altsCurrPathAppearsIn.length > 1 && !containsPath(foundAmbiguousPaths, currPath)) {
          foundAmbiguousPaths.push(currPath);
          result.push({
            alts: altsCurrPathAppearsIn,
            path: currPath
          });
        }
      });
      return result;
    }, []);
    const currErrors = map_default(identicalAmbiguities, (currAmbDescriptor) => {
      const ambgIndices = map_default(currAmbDescriptor.alts, (currAltIdx) => currAltIdx + 1);
      const currMessage = errMsgProvider.buildAlternationAmbiguityError({
        topLevelRule: rule,
        alternation,
        ambiguityIndices: ambgIndices,
        prefixPath: currAmbDescriptor.path
      });
      return {
        message: currMessage,
        type: ParserDefinitionErrorType.AMBIGUOUS_ALTS,
        ruleName: rule.name,
        occurrence: alternation.idx,
        alternatives: currAmbDescriptor.alts
      };
    });
    return currErrors;
  }
  function checkPrefixAlternativesAmbiguities(alternatives, alternation, rule, errMsgProvider) {
    const pathsAndIndices = reduce_default(alternatives, (result, currAlt, idx) => {
      const currPathsAndIdx = map_default(currAlt, (currPath) => {
        return { idx, path: currPath };
      });
      return result.concat(currPathsAndIdx);
    }, []);
    const errors = compact_default(flatMap_default(pathsAndIndices, (currPathAndIdx) => {
      const alternativeGast = alternation.definition[currPathAndIdx.idx];
      if (alternativeGast.ignoreAmbiguities === true) {
        return [];
      }
      const targetIdx = currPathAndIdx.idx;
      const targetPath = currPathAndIdx.path;
      const prefixAmbiguitiesPathsAndIndices = filter_default(pathsAndIndices, (searchPathAndIdx) => {
        return (
          // ignore (skip) ambiguities with this "other" alternative
          alternation.definition[searchPathAndIdx.idx].ignoreAmbiguities !== true && searchPathAndIdx.idx < targetIdx && // checking for strict prefix because identical lookaheads
          // will be be detected using a different validation.
          isStrictPrefixOfPath(searchPathAndIdx.path, targetPath)
        );
      });
      const currPathPrefixErrors = map_default(prefixAmbiguitiesPathsAndIndices, (currAmbPathAndIdx) => {
        const ambgIndices = [currAmbPathAndIdx.idx + 1, targetIdx + 1];
        const occurrence = alternation.idx === 0 ? "" : alternation.idx;
        const message = errMsgProvider.buildAlternationPrefixAmbiguityError({
          topLevelRule: rule,
          alternation,
          ambiguityIndices: ambgIndices,
          prefixPath: currAmbPathAndIdx.path
        });
        return {
          message,
          type: ParserDefinitionErrorType.AMBIGUOUS_PREFIX_ALTS,
          ruleName: rule.name,
          occurrence,
          alternatives: ambgIndices
        };
      });
      return currPathPrefixErrors;
    }));
    return errors;
  }
  function checkTerminalAndNoneTerminalsNameSpace(topLevels, tokenTypes, errMsgProvider) {
    const errors = [];
    const tokenNames = map_default(tokenTypes, (currToken) => currToken.name);
    forEach_default(topLevels, (currRule) => {
      const currRuleName = currRule.name;
      if (includes_default(tokenNames, currRuleName)) {
        const errMsg = errMsgProvider.buildNamespaceConflictError(currRule);
        errors.push({
          message: errMsg,
          type: ParserDefinitionErrorType.CONFLICT_TOKENS_RULES_NAMESPACE,
          ruleName: currRuleName
        });
      }
    });
    return errors;
  }
  function resolveGrammar2(options) {
    const actualOptions = defaults_default(options, {
      errMsgProvider: defaultGrammarResolverErrorProvider
    });
    const topRulesTable = {};
    forEach_default(options.rules, (rule) => {
      topRulesTable[rule.name] = rule;
    });
    return resolveGrammar(topRulesTable, actualOptions.errMsgProvider);
  }
  function validateGrammar2(options) {
    options = defaults_default(options, {
      errMsgProvider: defaultGrammarValidatorErrorProvider
    });
    return validateGrammar(options.rules, options.tokenTypes, options.errMsgProvider, options.grammarName);
  }
  var MISMATCHED_TOKEN_EXCEPTION = "MismatchedTokenException";
  var NO_VIABLE_ALT_EXCEPTION = "NoViableAltException";
  var EARLY_EXIT_EXCEPTION = "EarlyExitException";
  var NOT_ALL_INPUT_PARSED_EXCEPTION = "NotAllInputParsedException";
  var RECOGNITION_EXCEPTION_NAMES = [
    MISMATCHED_TOKEN_EXCEPTION,
    NO_VIABLE_ALT_EXCEPTION,
    EARLY_EXIT_EXCEPTION,
    NOT_ALL_INPUT_PARSED_EXCEPTION
  ];
  Object.freeze(RECOGNITION_EXCEPTION_NAMES);
  function isRecognitionException(error) {
    return includes_default(RECOGNITION_EXCEPTION_NAMES, error.name);
  }
  var RecognitionException = class extends Error {
    constructor(message, token) {
      super(message);
      this.token = token;
      this.resyncedTokens = [];
      Object.setPrototypeOf(this, new.target.prototype);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  };
  var MismatchedTokenException = class extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = MISMATCHED_TOKEN_EXCEPTION;
    }
  };
  var NoViableAltException = class extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = NO_VIABLE_ALT_EXCEPTION;
    }
  };
  var NotAllInputParsedException = class extends RecognitionException {
    constructor(message, token) {
      super(message, token);
      this.name = NOT_ALL_INPUT_PARSED_EXCEPTION;
    }
  };
  var EarlyExitException = class extends RecognitionException {
    constructor(message, token, previousToken) {
      super(message, token);
      this.previousToken = previousToken;
      this.name = EARLY_EXIT_EXCEPTION;
    }
  };
  var EOF_FOLLOW_KEY = {};
  var IN_RULE_RECOVERY_EXCEPTION = "InRuleRecoveryException";
  var InRuleRecoveryException = class extends Error {
    constructor(message) {
      super(message);
      this.name = IN_RULE_RECOVERY_EXCEPTION;
    }
  };
  var Recoverable = class {
    initRecoverable(config) {
      this.firstAfterRepMap = {};
      this.resyncFollows = {};
      this.recoveryEnabled = has_default(config, "recoveryEnabled") ? config.recoveryEnabled : DEFAULT_PARSER_CONFIG.recoveryEnabled;
      if (this.recoveryEnabled) {
        this.attemptInRepetitionRecovery = attemptInRepetitionRecovery;
      }
    }
    getTokenToInsert(tokType) {
      const tokToInsert = createTokenInstance(tokType, "", NaN, NaN, NaN, NaN, NaN, NaN);
      tokToInsert.isInsertedInRecovery = true;
      return tokToInsert;
    }
    canTokenTypeBeInsertedInRecovery(tokType) {
      return true;
    }
    canTokenTypeBeDeletedInRecovery(tokType) {
      return true;
    }
    tryInRepetitionRecovery(grammarRule, grammarRuleArgs, lookAheadFunc, expectedTokType) {
      const reSyncTokType = this.findReSyncTokenType();
      const savedLexerState = this.exportLexerState();
      const resyncedTokens = [];
      let passedResyncPoint = false;
      const nextTokenWithoutResync = this.LA_FAST(1);
      let currToken = this.LA_FAST(1);
      const generateErrorMessage = () => {
        const previousToken = this.LA(0);
        const msg = this.errorMessageProvider.buildMismatchTokenMessage({
          expected: expectedTokType,
          actual: nextTokenWithoutResync,
          previous: previousToken,
          ruleName: this.getCurrRuleFullName()
        });
        const error = new MismatchedTokenException(msg, nextTokenWithoutResync, this.LA(0));
        error.resyncedTokens = dropRight_default(resyncedTokens);
        this.SAVE_ERROR(error);
      };
      while (!passedResyncPoint) {
        if (this.tokenMatcher(currToken, expectedTokType)) {
          generateErrorMessage();
          return;
        } else if (lookAheadFunc.call(this)) {
          generateErrorMessage();
          grammarRule.apply(this, grammarRuleArgs);
          return;
        } else if (this.tokenMatcher(currToken, reSyncTokType)) {
          passedResyncPoint = true;
        } else {
          currToken = this.SKIP_TOKEN();
          this.addToResyncTokens(currToken, resyncedTokens);
        }
      }
      this.importLexerState(savedLexerState);
    }
    shouldInRepetitionRecoveryBeTried(expectTokAfterLastMatch, nextTokIdx, notStuck) {
      if (notStuck === false) {
        return false;
      }
      if (this.tokenMatcher(this.LA_FAST(1), expectTokAfterLastMatch)) {
        return false;
      }
      if (this.isBackTracking()) {
        return false;
      }
      if (this.canPerformInRuleRecovery(expectTokAfterLastMatch, this.getFollowsForInRuleRecovery(expectTokAfterLastMatch, nextTokIdx))) {
        return false;
      }
      return true;
    }
    // Error Recovery functionality
    getFollowsForInRuleRecovery(tokType, tokIdxInRule) {
      const grammarPath = this.getCurrentGrammarPath(tokType, tokIdxInRule);
      const follows = this.getNextPossibleTokenTypes(grammarPath);
      return follows;
    }
    tryInRuleRecovery(expectedTokType, follows) {
      if (this.canRecoverWithSingleTokenInsertion(expectedTokType, follows)) {
        const tokToInsert = this.getTokenToInsert(expectedTokType);
        return tokToInsert;
      }
      if (this.canRecoverWithSingleTokenDeletion(expectedTokType)) {
        const nextTok = this.SKIP_TOKEN();
        this.consumeToken();
        return nextTok;
      }
      throw new InRuleRecoveryException("sad sad panda");
    }
    canPerformInRuleRecovery(expectedToken, follows) {
      return this.canRecoverWithSingleTokenInsertion(expectedToken, follows) || this.canRecoverWithSingleTokenDeletion(expectedToken);
    }
    canRecoverWithSingleTokenInsertion(expectedTokType, follows) {
      if (!this.canTokenTypeBeInsertedInRecovery(expectedTokType)) {
        return false;
      }
      if (isEmpty_default(follows)) {
        return false;
      }
      const mismatchedTok = this.LA_FAST(1);
      const isMisMatchedTokInFollows = find_default(follows, (possibleFollowsTokType) => {
        return this.tokenMatcher(mismatchedTok, possibleFollowsTokType);
      }) !== void 0;
      return isMisMatchedTokInFollows;
    }
    canRecoverWithSingleTokenDeletion(expectedTokType) {
      if (!this.canTokenTypeBeDeletedInRecovery(expectedTokType)) {
        return false;
      }
      const isNextTokenWhatIsExpected = this.tokenMatcher(
        // not using LA_FAST because LA(2) might be un-safe with maxLookahead=1
        // in some edge cases (?)
        this.LA(2),
        expectedTokType
      );
      return isNextTokenWhatIsExpected;
    }
    isInCurrentRuleReSyncSet(tokenTypeIdx) {
      const followKey = this.getCurrFollowKey();
      const currentRuleReSyncSet = this.getFollowSetFromFollowKey(followKey);
      return includes_default(currentRuleReSyncSet, tokenTypeIdx);
    }
    findReSyncTokenType() {
      const allPossibleReSyncTokTypes = this.flattenFollowSet();
      let nextToken = this.LA_FAST(1);
      let k = 2;
      while (true) {
        const foundMatch = find_default(allPossibleReSyncTokTypes, (resyncTokType) => {
          const canMatch = tokenMatcher(nextToken, resyncTokType);
          return canMatch;
        });
        if (foundMatch !== void 0) {
          return foundMatch;
        }
        nextToken = this.LA(k);
        k++;
      }
    }
    getCurrFollowKey() {
      if (this.RULE_STACK_IDX === 0) {
        return EOF_FOLLOW_KEY;
      }
      const currRuleShortName = this.currRuleShortName;
      const currRuleIdx = this.getLastExplicitRuleOccurrenceIndex();
      const prevRuleShortName = this.getPreviousExplicitRuleShortName();
      return {
        ruleName: this.shortRuleNameToFullName(currRuleShortName),
        idxInCallingRule: currRuleIdx,
        inRule: this.shortRuleNameToFullName(prevRuleShortName)
      };
    }
    buildFullFollowKeyStack() {
      const explicitRuleStack = this.RULE_STACK;
      const explicitOccurrenceStack = this.RULE_OCCURRENCE_STACK;
      const len = this.RULE_STACK_IDX + 1;
      const result = new Array(len);
      for (let idx = 0; idx < len; idx++) {
        if (idx === 0) {
          result[idx] = EOF_FOLLOW_KEY;
        } else {
          result[idx] = {
            ruleName: this.shortRuleNameToFullName(explicitRuleStack[idx]),
            idxInCallingRule: explicitOccurrenceStack[idx],
            inRule: this.shortRuleNameToFullName(explicitRuleStack[idx - 1])
          };
        }
      }
      return result;
    }
    flattenFollowSet() {
      const followStack = map_default(this.buildFullFollowKeyStack(), (currKey) => {
        return this.getFollowSetFromFollowKey(currKey);
      });
      return flatten_default(followStack);
    }
    getFollowSetFromFollowKey(followKey) {
      if (followKey === EOF_FOLLOW_KEY) {
        return [EOF];
      }
      const followName = followKey.ruleName + followKey.idxInCallingRule + IN + followKey.inRule;
      return this.resyncFollows[followName];
    }
    // It does not make any sense to include a virtual EOF token in the list of resynced tokens
    // as EOF does not really exist and thus does not contain any useful information (line/column numbers)
    addToResyncTokens(token, resyncTokens) {
      if (!this.tokenMatcher(token, EOF)) {
        resyncTokens.push(token);
      }
      return resyncTokens;
    }
    reSyncTo(tokType) {
      const resyncedTokens = [];
      let nextTok = this.LA_FAST(1);
      while (this.tokenMatcher(nextTok, tokType) === false) {
        nextTok = this.SKIP_TOKEN();
        this.addToResyncTokens(nextTok, resyncedTokens);
      }
      return dropRight_default(resyncedTokens);
    }
    attemptInRepetitionRecovery(prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
    }
    getCurrentGrammarPath(tokType, tokIdxInRule) {
      const pathRuleStack = this.getHumanReadableRuleStack();
      const pathOccurrenceStack = this.RULE_OCCURRENCE_STACK.slice(0, this.RULE_OCCURRENCE_STACK_IDX + 1);
      const grammarPath = {
        ruleStack: pathRuleStack,
        occurrenceStack: pathOccurrenceStack,
        lastTok: tokType,
        lastTokOccurrence: tokIdxInRule
      };
      return grammarPath;
    }
    getHumanReadableRuleStack() {
      const len = this.RULE_STACK_IDX + 1;
      const result = new Array(len);
      for (let i = 0; i < len; i++) {
        result[i] = this.shortRuleNameToFullName(this.RULE_STACK[i]);
      }
      return result;
    }
  };
  function attemptInRepetitionRecovery(prodFunc, args, lookaheadFunc, dslMethodIdx, prodOccurrence, nextToksWalker, notStuck) {
    const key = this.getKeyForAutomaticLookahead(dslMethodIdx, prodOccurrence);
    let firstAfterRepInfo = this.firstAfterRepMap[key];
    if (firstAfterRepInfo === void 0) {
      const currRuleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[currRuleName];
      const walker = new nextToksWalker(ruleGrammar, prodOccurrence);
      firstAfterRepInfo = walker.startWalking();
      this.firstAfterRepMap[key] = firstAfterRepInfo;
    }
    let expectTokAfterLastMatch = firstAfterRepInfo.token;
    let nextTokIdx = firstAfterRepInfo.occurrence;
    const isEndOfRule = firstAfterRepInfo.isEndOfRule;
    if (this.RULE_STACK_IDX === 0 && isEndOfRule && expectTokAfterLastMatch === void 0) {
      expectTokAfterLastMatch = EOF;
      nextTokIdx = 1;
    }
    if (expectTokAfterLastMatch === void 0 || nextTokIdx === void 0) {
      return;
    }
    if (this.shouldInRepetitionRecoveryBeTried(expectTokAfterLastMatch, nextTokIdx, notStuck)) {
      this.tryInRepetitionRecovery(prodFunc, args, lookaheadFunc, expectTokAfterLastMatch);
    }
  }
  var BITS_FOR_METHOD_TYPE = 4;
  var BITS_FOR_OCCURRENCE_IDX = 8;
  var BITS_FOR_ALT_IDX = 8;
  var OR_IDX = 1 << BITS_FOR_OCCURRENCE_IDX;
  var OPTION_IDX = 2 << BITS_FOR_OCCURRENCE_IDX;
  var MANY_IDX = 3 << BITS_FOR_OCCURRENCE_IDX;
  var AT_LEAST_ONE_IDX = 4 << BITS_FOR_OCCURRENCE_IDX;
  var MANY_SEP_IDX = 5 << BITS_FOR_OCCURRENCE_IDX;
  var AT_LEAST_ONE_SEP_IDX = 6 << BITS_FOR_OCCURRENCE_IDX;
  function getKeyForAutomaticLookahead(ruleIdx, dslMethodIdx, occurrence) {
    return occurrence | dslMethodIdx | ruleIdx;
  }
  var BITS_START_FOR_ALT_IDX = 32 - BITS_FOR_ALT_IDX;
  var LLkLookaheadStrategy = class {
    constructor(options) {
      var _a;
      this.maxLookahead = (_a = options === null || options === void 0 ? void 0 : options.maxLookahead) !== null && _a !== void 0 ? _a : DEFAULT_PARSER_CONFIG.maxLookahead;
    }
    validate(options) {
      const leftRecursionErrors = this.validateNoLeftRecursion(options.rules);
      if (isEmpty_default(leftRecursionErrors)) {
        const emptyAltErrors = this.validateEmptyOrAlternatives(options.rules);
        const ambiguousAltsErrors = this.validateAmbiguousAlternationAlternatives(options.rules, this.maxLookahead);
        const emptyRepetitionErrors = this.validateSomeNonEmptyLookaheadPath(options.rules, this.maxLookahead);
        const allErrors = [
          ...leftRecursionErrors,
          ...emptyAltErrors,
          ...ambiguousAltsErrors,
          ...emptyRepetitionErrors
        ];
        return allErrors;
      }
      return leftRecursionErrors;
    }
    validateNoLeftRecursion(rules5) {
      return flatMap_default(rules5, (currTopRule) => validateNoLeftRecursion(currTopRule, currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateEmptyOrAlternatives(rules5) {
      return flatMap_default(rules5, (currTopRule) => validateEmptyOrAlternative(currTopRule, defaultGrammarValidatorErrorProvider));
    }
    validateAmbiguousAlternationAlternatives(rules5, maxLookahead) {
      return flatMap_default(rules5, (currTopRule) => validateAmbiguousAlternationAlternatives(currTopRule, maxLookahead, defaultGrammarValidatorErrorProvider));
    }
    validateSomeNonEmptyLookaheadPath(rules5, maxLookahead) {
      return validateSomeNonEmptyLookaheadPath(rules5, maxLookahead, defaultGrammarValidatorErrorProvider);
    }
    buildLookaheadForAlternation(options) {
      return buildLookaheadFuncForOr(options.prodOccurrence, options.rule, options.maxLookahead, options.hasPredicates, options.dynamicTokensEnabled, buildAlternativesLookAheadFunc);
    }
    buildLookaheadForOptional(options) {
      return buildLookaheadFuncForOptionalProd(options.prodOccurrence, options.rule, options.maxLookahead, options.dynamicTokensEnabled, getProdType(options.prodType), buildSingleAlternativeLookaheadFunction);
    }
  };
  var LooksAhead = class {
    initLooksAhead(config) {
      this.dynamicTokensEnabled = has_default(config, "dynamicTokensEnabled") ? config.dynamicTokensEnabled : DEFAULT_PARSER_CONFIG.dynamicTokensEnabled;
      this.maxLookahead = has_default(config, "maxLookahead") ? config.maxLookahead : DEFAULT_PARSER_CONFIG.maxLookahead;
      this.lookaheadStrategy = has_default(config, "lookaheadStrategy") ? config.lookaheadStrategy : new LLkLookaheadStrategy({ maxLookahead: this.maxLookahead });
      this.lookAheadFuncsCache = /* @__PURE__ */ new Map();
    }
    preComputeLookaheadFunctions(rules5) {
      forEach_default(rules5, (currRule) => {
        this.TRACE_INIT(`${currRule.name} Rule Lookahead`, () => {
          const { alternation, repetition, option, repetitionMandatory, repetitionMandatoryWithSeparator, repetitionWithSeparator } = collectMethods(currRule);
          forEach_default(alternation, (currProd) => {
            const prodIdx = currProd.idx === 0 ? "" : currProd.idx;
            this.TRACE_INIT(`${getProductionDslName(currProd)}${prodIdx}`, () => {
              const laFunc = this.lookaheadStrategy.buildLookaheadForAlternation({
                prodOccurrence: currProd.idx,
                rule: currRule,
                maxLookahead: currProd.maxLookahead || this.maxLookahead,
                hasPredicates: currProd.hasPredicates,
                dynamicTokensEnabled: this.dynamicTokensEnabled
              });
              const key = getKeyForAutomaticLookahead(this.fullRuleNameToShort[currRule.name], OR_IDX, currProd.idx);
              this.setLaFuncCache(key, laFunc);
            });
          });
          forEach_default(repetition, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, MANY_IDX, "Repetition", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach_default(option, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, OPTION_IDX, "Option", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach_default(repetitionMandatory, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, AT_LEAST_ONE_IDX, "RepetitionMandatory", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach_default(repetitionMandatoryWithSeparator, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, AT_LEAST_ONE_SEP_IDX, "RepetitionMandatoryWithSeparator", currProd.maxLookahead, getProductionDslName(currProd));
          });
          forEach_default(repetitionWithSeparator, (currProd) => {
            this.computeLookaheadFunc(currRule, currProd.idx, MANY_SEP_IDX, "RepetitionWithSeparator", currProd.maxLookahead, getProductionDslName(currProd));
          });
        });
      });
    }
    computeLookaheadFunc(rule, prodOccurrence, prodKey, prodType, prodMaxLookahead, dslMethodName) {
      this.TRACE_INIT(`${dslMethodName}${prodOccurrence === 0 ? "" : prodOccurrence}`, () => {
        const laFunc = this.lookaheadStrategy.buildLookaheadForOptional({
          prodOccurrence,
          rule,
          maxLookahead: prodMaxLookahead || this.maxLookahead,
          dynamicTokensEnabled: this.dynamicTokensEnabled,
          prodType
        });
        const key = getKeyForAutomaticLookahead(this.fullRuleNameToShort[rule.name], prodKey, prodOccurrence);
        this.setLaFuncCache(key, laFunc);
      });
    }
    // this actually returns a number, but it is always used as a string (object prop key)
    getKeyForAutomaticLookahead(dslMethodIdx, occurrence) {
      return getKeyForAutomaticLookahead(this.currRuleShortName, dslMethodIdx, occurrence);
    }
    getLaFuncFromCache(key) {
      return this.lookAheadFuncsCache.get(key);
    }
    /* istanbul ignore next */
    setLaFuncCache(key, value) {
      this.lookAheadFuncsCache.set(key, value);
    }
  };
  var DslMethodsCollectorVisitor = class extends GAstVisitor {
    constructor() {
      super(...arguments);
      this.dslMethods = {
        option: [],
        alternation: [],
        repetition: [],
        repetitionWithSeparator: [],
        repetitionMandatory: [],
        repetitionMandatoryWithSeparator: []
      };
    }
    reset() {
      this.dslMethods = {
        option: [],
        alternation: [],
        repetition: [],
        repetitionWithSeparator: [],
        repetitionMandatory: [],
        repetitionMandatoryWithSeparator: []
      };
    }
    visitOption(option) {
      this.dslMethods.option.push(option);
    }
    visitRepetitionWithSeparator(manySep) {
      this.dslMethods.repetitionWithSeparator.push(manySep);
    }
    visitRepetitionMandatory(atLeastOne) {
      this.dslMethods.repetitionMandatory.push(atLeastOne);
    }
    visitRepetitionMandatoryWithSeparator(atLeastOneSep) {
      this.dslMethods.repetitionMandatoryWithSeparator.push(atLeastOneSep);
    }
    visitRepetition(many) {
      this.dslMethods.repetition.push(many);
    }
    visitAlternation(or) {
      this.dslMethods.alternation.push(or);
    }
  };
  var collectorVisitor = new DslMethodsCollectorVisitor();
  function collectMethods(rule) {
    collectorVisitor.reset();
    rule.accept(collectorVisitor);
    const dslMethods = collectorVisitor.dslMethods;
    collectorVisitor.reset();
    return dslMethods;
  }
  function setNodeLocationOnlyOffset(currNodeLocation, newLocationInfo) {
    if (isNaN(currNodeLocation.startOffset) === true) {
      currNodeLocation.startOffset = newLocationInfo.startOffset;
      currNodeLocation.endOffset = newLocationInfo.endOffset;
    } else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
      currNodeLocation.endOffset = newLocationInfo.endOffset;
    }
  }
  function setNodeLocationFull(currNodeLocation, newLocationInfo) {
    if (isNaN(currNodeLocation.startOffset) === true) {
      currNodeLocation.startOffset = newLocationInfo.startOffset;
      currNodeLocation.startColumn = newLocationInfo.startColumn;
      currNodeLocation.startLine = newLocationInfo.startLine;
      currNodeLocation.endOffset = newLocationInfo.endOffset;
      currNodeLocation.endColumn = newLocationInfo.endColumn;
      currNodeLocation.endLine = newLocationInfo.endLine;
    } else if (currNodeLocation.endOffset < newLocationInfo.endOffset === true) {
      currNodeLocation.endOffset = newLocationInfo.endOffset;
      currNodeLocation.endColumn = newLocationInfo.endColumn;
      currNodeLocation.endLine = newLocationInfo.endLine;
    }
  }
  function addTerminalToCst(node, token, tokenTypeName) {
    if (node.children[tokenTypeName] === void 0) {
      node.children[tokenTypeName] = [token];
    } else {
      node.children[tokenTypeName].push(token);
    }
  }
  function addNoneTerminalToCst(node, ruleName, ruleResult) {
    if (node.children[ruleName] === void 0) {
      node.children[ruleName] = [ruleResult];
    } else {
      node.children[ruleName].push(ruleResult);
    }
  }
  var NAME = "name";
  function defineNameProp(obj, nameValue) {
    Object.defineProperty(obj, NAME, {
      enumerable: false,
      configurable: true,
      writable: false,
      value: nameValue
    });
  }
  function defaultVisit(ctx, param) {
    const childrenNames = keys_default(ctx);
    const childrenNamesLength = childrenNames.length;
    for (let i = 0; i < childrenNamesLength; i++) {
      const currChildName = childrenNames[i];
      const currChildArray = ctx[currChildName];
      const currChildArrayLength = currChildArray.length;
      for (let j = 0; j < currChildArrayLength; j++) {
        const currChild = currChildArray[j];
        if (currChild.tokenTypeIdx === void 0) {
          this[currChild.name](currChild.children, param);
        }
      }
    }
  }
  function createBaseSemanticVisitorConstructor(grammarName, ruleNames) {
    const derivedConstructor = function() {
    };
    defineNameProp(derivedConstructor, grammarName + "BaseSemantics");
    const semanticProto = {
      visit: function(cstNode, param) {
        if (isArray_default(cstNode)) {
          cstNode = cstNode[0];
        }
        if (isUndefined_default(cstNode)) {
          return void 0;
        }
        return this[cstNode.name](cstNode.children, param);
      },
      validateVisitor: function() {
        const semanticDefinitionErrors = validateVisitor(this, ruleNames);
        if (!isEmpty_default(semanticDefinitionErrors)) {
          const errorMessages = map_default(semanticDefinitionErrors, (currDefError) => currDefError.msg);
          throw Error(`Errors Detected in CST Visitor <${this.constructor.name}>:
	${errorMessages.join("\n\n").replace(/\n/g, "\n	")}`);
        }
      }
    };
    derivedConstructor.prototype = semanticProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    derivedConstructor._RULE_NAMES = ruleNames;
    return derivedConstructor;
  }
  function createBaseVisitorConstructorWithDefaults(grammarName, ruleNames, baseConstructor) {
    const derivedConstructor = function() {
    };
    defineNameProp(derivedConstructor, grammarName + "BaseSemanticsWithDefaults");
    const withDefaultsProto = Object.create(baseConstructor.prototype);
    forEach_default(ruleNames, (ruleName) => {
      withDefaultsProto[ruleName] = defaultVisit;
    });
    derivedConstructor.prototype = withDefaultsProto;
    derivedConstructor.prototype.constructor = derivedConstructor;
    return derivedConstructor;
  }
  var CstVisitorDefinitionError;
  (function(CstVisitorDefinitionError2) {
    CstVisitorDefinitionError2[CstVisitorDefinitionError2["REDUNDANT_METHOD"] = 0] = "REDUNDANT_METHOD";
    CstVisitorDefinitionError2[CstVisitorDefinitionError2["MISSING_METHOD"] = 1] = "MISSING_METHOD";
  })(CstVisitorDefinitionError || (CstVisitorDefinitionError = {}));
  function validateVisitor(visitorInstance, ruleNames) {
    const missingErrors = validateMissingCstMethods(visitorInstance, ruleNames);
    return missingErrors;
  }
  function validateMissingCstMethods(visitorInstance, ruleNames) {
    const missingRuleNames = filter_default(ruleNames, (currRuleName) => {
      return isFunction_default(visitorInstance[currRuleName]) === false;
    });
    const errors = map_default(missingRuleNames, (currRuleName) => {
      return {
        msg: `Missing visitor method: <${currRuleName}> on ${visitorInstance.constructor.name} CST Visitor.`,
        type: CstVisitorDefinitionError.MISSING_METHOD,
        methodName: currRuleName
      };
    });
    return compact_default(errors);
  }
  var TreeBuilder = class {
    initTreeBuilder(config) {
      this.CST_STACK = [];
      this.outputCst = config.outputCst;
      this.nodeLocationTracking = has_default(config, "nodeLocationTracking") ? config.nodeLocationTracking : DEFAULT_PARSER_CONFIG.nodeLocationTracking;
      if (!this.outputCst) {
        this.cstInvocationStateUpdate = noop_default;
        this.cstFinallyStateUpdate = noop_default;
        this.cstPostTerminal = noop_default;
        this.cstPostNonTerminal = noop_default;
        this.cstPostRule = noop_default;
      } else {
        if (/full/i.test(this.nodeLocationTracking)) {
          if (this.recoveryEnabled) {
            this.setNodeLocationFromToken = setNodeLocationFull;
            this.setNodeLocationFromNode = setNodeLocationFull;
            this.cstPostRule = noop_default;
            this.setInitialNodeLocation = this.setInitialNodeLocationFullRecovery;
          } else {
            this.setNodeLocationFromToken = noop_default;
            this.setNodeLocationFromNode = noop_default;
            this.cstPostRule = this.cstPostRuleFull;
            this.setInitialNodeLocation = this.setInitialNodeLocationFullRegular;
          }
        } else if (/onlyOffset/i.test(this.nodeLocationTracking)) {
          if (this.recoveryEnabled) {
            this.setNodeLocationFromToken = setNodeLocationOnlyOffset;
            this.setNodeLocationFromNode = setNodeLocationOnlyOffset;
            this.cstPostRule = noop_default;
            this.setInitialNodeLocation = this.setInitialNodeLocationOnlyOffsetRecovery;
          } else {
            this.setNodeLocationFromToken = noop_default;
            this.setNodeLocationFromNode = noop_default;
            this.cstPostRule = this.cstPostRuleOnlyOffset;
            this.setInitialNodeLocation = this.setInitialNodeLocationOnlyOffsetRegular;
          }
        } else if (/none/i.test(this.nodeLocationTracking)) {
          this.setNodeLocationFromToken = noop_default;
          this.setNodeLocationFromNode = noop_default;
          this.cstPostRule = noop_default;
          this.setInitialNodeLocation = noop_default;
        } else {
          throw Error(`Invalid <nodeLocationTracking> config option: "${config.nodeLocationTracking}"`);
        }
      }
    }
    setInitialNodeLocationOnlyOffsetRecovery(cstNode) {
      cstNode.location = {
        startOffset: NaN,
        endOffset: NaN
      };
    }
    setInitialNodeLocationOnlyOffsetRegular(cstNode) {
      cstNode.location = {
        // without error recovery the starting Location of a new CstNode is guaranteed
        // To be the next Token's startOffset (for valid inputs).
        // For invalid inputs there won't be any CSTOutput so this potential
        // inaccuracy does not matter
        startOffset: this.LA_FAST(1).startOffset,
        endOffset: NaN
      };
    }
    setInitialNodeLocationFullRecovery(cstNode) {
      cstNode.location = {
        startOffset: NaN,
        startLine: NaN,
        startColumn: NaN,
        endOffset: NaN,
        endLine: NaN,
        endColumn: NaN
      };
    }
    /**
         *  @see setInitialNodeLocationOnlyOffsetRegular for explanation why this work
    
         * @param cstNode
         */
    setInitialNodeLocationFullRegular(cstNode) {
      const nextToken = this.LA_FAST(1);
      cstNode.location = {
        startOffset: nextToken.startOffset,
        startLine: nextToken.startLine,
        startColumn: nextToken.startColumn,
        endOffset: NaN,
        endLine: NaN,
        endColumn: NaN
      };
    }
    cstInvocationStateUpdate(fullRuleName) {
      const cstNode = {
        name: fullRuleName,
        children: /* @__PURE__ */ Object.create(null)
      };
      this.setInitialNodeLocation(cstNode);
      this.CST_STACK.push(cstNode);
    }
    cstFinallyStateUpdate() {
      this.CST_STACK.pop();
    }
    cstPostRuleFull(ruleCstNode) {
      const prevToken = this.LA(0);
      const loc = ruleCstNode.location;
      if (loc.startOffset <= prevToken.startOffset === true) {
        loc.endOffset = prevToken.endOffset;
        loc.endLine = prevToken.endLine;
        loc.endColumn = prevToken.endColumn;
      } else {
        loc.startOffset = NaN;
        loc.startLine = NaN;
        loc.startColumn = NaN;
      }
    }
    cstPostRuleOnlyOffset(ruleCstNode) {
      const prevToken = this.LA(0);
      const loc = ruleCstNode.location;
      if (loc.startOffset <= prevToken.startOffset === true) {
        loc.endOffset = prevToken.endOffset;
      } else {
        loc.startOffset = NaN;
      }
    }
    cstPostTerminal(key, consumedToken) {
      const rootCst = this.CST_STACK[this.CST_STACK.length - 1];
      addTerminalToCst(rootCst, consumedToken, key);
      this.setNodeLocationFromToken(rootCst.location, consumedToken);
    }
    cstPostNonTerminal(ruleCstResult, ruleName) {
      const preCstNode = this.CST_STACK[this.CST_STACK.length - 1];
      addNoneTerminalToCst(preCstNode, ruleName, ruleCstResult);
      this.setNodeLocationFromNode(preCstNode.location, ruleCstResult.location);
    }
    getBaseCstVisitorConstructor() {
      if (isUndefined_default(this.baseCstVisitorConstructor)) {
        const newBaseCstVisitorConstructor = createBaseSemanticVisitorConstructor(this.className, keys_default(this.gastProductionsCache));
        this.baseCstVisitorConstructor = newBaseCstVisitorConstructor;
        return newBaseCstVisitorConstructor;
      }
      return this.baseCstVisitorConstructor;
    }
    getBaseCstVisitorConstructorWithDefaults() {
      if (isUndefined_default(this.baseCstVisitorWithDefaultsConstructor)) {
        const newConstructor = createBaseVisitorConstructorWithDefaults(this.className, keys_default(this.gastProductionsCache), this.getBaseCstVisitorConstructor());
        this.baseCstVisitorWithDefaultsConstructor = newConstructor;
        return newConstructor;
      }
      return this.baseCstVisitorWithDefaultsConstructor;
    }
    getPreviousExplicitRuleShortName() {
      return this.RULE_STACK[this.RULE_STACK_IDX - 1];
    }
    getLastExplicitRuleOccurrenceIndex() {
      return this.RULE_OCCURRENCE_STACK[this.RULE_OCCURRENCE_STACK_IDX];
    }
  };
  var LexerAdapter = class {
    initLexerAdapter() {
      this.tokVector = [];
      this.tokVectorLength = 0;
      this.currIdx = -1;
    }
    set input(newInput) {
      if (this.selfAnalysisDone !== true) {
        throw Error(`Missing <performSelfAnalysis> invocation at the end of the Parser's constructor.`);
      }
      this.reset();
      this.tokVector = newInput;
      this.tokVectorLength = newInput.length;
    }
    get input() {
      return this.tokVector;
    }
    // skips a token and returns the next token
    SKIP_TOKEN() {
      if (this.currIdx <= this.tokVectorLength - 2) {
        this.consumeToken();
        return this.LA_FAST(1);
      } else {
        return END_OF_FILE;
      }
    }
    // Lexer (accessing Token vector) related methods which can be overridden to implement lazy lexers
    // or lexers dependent on parser context.
    // Performance Optimized version of LA without bound checks
    // note that token beyond the end of the token vector EOF Token will still be returned
    // due to using sentinels at the end of the token vector. (for K=max lookahead)
    LA_FAST(howMuch) {
      const soughtIdx = this.currIdx + howMuch;
      return this.tokVector[soughtIdx];
    }
    LA(howMuch) {
      const soughtIdx = this.currIdx + howMuch;
      if (soughtIdx < 0 || this.tokVectorLength <= soughtIdx) {
        return END_OF_FILE;
      } else {
        return this.tokVector[soughtIdx];
      }
    }
    consumeToken() {
      this.currIdx++;
    }
    exportLexerState() {
      return this.currIdx;
    }
    importLexerState(newState) {
      this.currIdx = newState;
    }
    resetLexerState() {
      this.currIdx = -1;
    }
    moveToTerminatedState() {
      this.currIdx = this.tokVectorLength - 1;
    }
    getLexerPosition() {
      return this.exportLexerState();
    }
  };
  var RecognizerApi = class {
    ACTION(impl) {
      return impl.call(this);
    }
    consume(idx, tokType, options) {
      return this.consumeInternal(tokType, idx, options);
    }
    subrule(idx, ruleToCall, options) {
      return this.subruleInternal(ruleToCall, idx, options);
    }
    option(idx, actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, idx);
    }
    or(idx, altsOrOpts) {
      return this.orInternal(altsOrOpts, idx);
    }
    many(idx, actionORMethodDef) {
      return this.manyInternal(idx, actionORMethodDef);
    }
    atLeastOne(idx, actionORMethodDef) {
      return this.atLeastOneInternal(idx, actionORMethodDef);
    }
    CONSUME(tokType, options) {
      return this.consumeInternal(tokType, 0, options);
    }
    CONSUME1(tokType, options) {
      return this.consumeInternal(tokType, 1, options);
    }
    CONSUME2(tokType, options) {
      return this.consumeInternal(tokType, 2, options);
    }
    CONSUME3(tokType, options) {
      return this.consumeInternal(tokType, 3, options);
    }
    CONSUME4(tokType, options) {
      return this.consumeInternal(tokType, 4, options);
    }
    CONSUME5(tokType, options) {
      return this.consumeInternal(tokType, 5, options);
    }
    CONSUME6(tokType, options) {
      return this.consumeInternal(tokType, 6, options);
    }
    CONSUME7(tokType, options) {
      return this.consumeInternal(tokType, 7, options);
    }
    CONSUME8(tokType, options) {
      return this.consumeInternal(tokType, 8, options);
    }
    CONSUME9(tokType, options) {
      return this.consumeInternal(tokType, 9, options);
    }
    SUBRULE(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 0, options);
    }
    SUBRULE1(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 1, options);
    }
    SUBRULE2(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 2, options);
    }
    SUBRULE3(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 3, options);
    }
    SUBRULE4(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 4, options);
    }
    SUBRULE5(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 5, options);
    }
    SUBRULE6(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 6, options);
    }
    SUBRULE7(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 7, options);
    }
    SUBRULE8(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 8, options);
    }
    SUBRULE9(ruleToCall, options) {
      return this.subruleInternal(ruleToCall, 9, options);
    }
    OPTION(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 0);
    }
    OPTION1(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 1);
    }
    OPTION2(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 2);
    }
    OPTION3(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 3);
    }
    OPTION4(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 4);
    }
    OPTION5(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 5);
    }
    OPTION6(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 6);
    }
    OPTION7(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 7);
    }
    OPTION8(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 8);
    }
    OPTION9(actionORMethodDef) {
      return this.optionInternal(actionORMethodDef, 9);
    }
    OR(altsOrOpts) {
      return this.orInternal(altsOrOpts, 0);
    }
    OR1(altsOrOpts) {
      return this.orInternal(altsOrOpts, 1);
    }
    OR2(altsOrOpts) {
      return this.orInternal(altsOrOpts, 2);
    }
    OR3(altsOrOpts) {
      return this.orInternal(altsOrOpts, 3);
    }
    OR4(altsOrOpts) {
      return this.orInternal(altsOrOpts, 4);
    }
    OR5(altsOrOpts) {
      return this.orInternal(altsOrOpts, 5);
    }
    OR6(altsOrOpts) {
      return this.orInternal(altsOrOpts, 6);
    }
    OR7(altsOrOpts) {
      return this.orInternal(altsOrOpts, 7);
    }
    OR8(altsOrOpts) {
      return this.orInternal(altsOrOpts, 8);
    }
    OR9(altsOrOpts) {
      return this.orInternal(altsOrOpts, 9);
    }
    MANY(actionORMethodDef) {
      this.manyInternal(0, actionORMethodDef);
    }
    MANY1(actionORMethodDef) {
      this.manyInternal(1, actionORMethodDef);
    }
    MANY2(actionORMethodDef) {
      this.manyInternal(2, actionORMethodDef);
    }
    MANY3(actionORMethodDef) {
      this.manyInternal(3, actionORMethodDef);
    }
    MANY4(actionORMethodDef) {
      this.manyInternal(4, actionORMethodDef);
    }
    MANY5(actionORMethodDef) {
      this.manyInternal(5, actionORMethodDef);
    }
    MANY6(actionORMethodDef) {
      this.manyInternal(6, actionORMethodDef);
    }
    MANY7(actionORMethodDef) {
      this.manyInternal(7, actionORMethodDef);
    }
    MANY8(actionORMethodDef) {
      this.manyInternal(8, actionORMethodDef);
    }
    MANY9(actionORMethodDef) {
      this.manyInternal(9, actionORMethodDef);
    }
    MANY_SEP(options) {
      this.manySepFirstInternal(0, options);
    }
    MANY_SEP1(options) {
      this.manySepFirstInternal(1, options);
    }
    MANY_SEP2(options) {
      this.manySepFirstInternal(2, options);
    }
    MANY_SEP3(options) {
      this.manySepFirstInternal(3, options);
    }
    MANY_SEP4(options) {
      this.manySepFirstInternal(4, options);
    }
    MANY_SEP5(options) {
      this.manySepFirstInternal(5, options);
    }
    MANY_SEP6(options) {
      this.manySepFirstInternal(6, options);
    }
    MANY_SEP7(options) {
      this.manySepFirstInternal(7, options);
    }
    MANY_SEP8(options) {
      this.manySepFirstInternal(8, options);
    }
    MANY_SEP9(options) {
      this.manySepFirstInternal(9, options);
    }
    AT_LEAST_ONE(actionORMethodDef) {
      this.atLeastOneInternal(0, actionORMethodDef);
    }
    AT_LEAST_ONE1(actionORMethodDef) {
      return this.atLeastOneInternal(1, actionORMethodDef);
    }
    AT_LEAST_ONE2(actionORMethodDef) {
      this.atLeastOneInternal(2, actionORMethodDef);
    }
    AT_LEAST_ONE3(actionORMethodDef) {
      this.atLeastOneInternal(3, actionORMethodDef);
    }
    AT_LEAST_ONE4(actionORMethodDef) {
      this.atLeastOneInternal(4, actionORMethodDef);
    }
    AT_LEAST_ONE5(actionORMethodDef) {
      this.atLeastOneInternal(5, actionORMethodDef);
    }
    AT_LEAST_ONE6(actionORMethodDef) {
      this.atLeastOneInternal(6, actionORMethodDef);
    }
    AT_LEAST_ONE7(actionORMethodDef) {
      this.atLeastOneInternal(7, actionORMethodDef);
    }
    AT_LEAST_ONE8(actionORMethodDef) {
      this.atLeastOneInternal(8, actionORMethodDef);
    }
    AT_LEAST_ONE9(actionORMethodDef) {
      this.atLeastOneInternal(9, actionORMethodDef);
    }
    AT_LEAST_ONE_SEP(options) {
      this.atLeastOneSepFirstInternal(0, options);
    }
    AT_LEAST_ONE_SEP1(options) {
      this.atLeastOneSepFirstInternal(1, options);
    }
    AT_LEAST_ONE_SEP2(options) {
      this.atLeastOneSepFirstInternal(2, options);
    }
    AT_LEAST_ONE_SEP3(options) {
      this.atLeastOneSepFirstInternal(3, options);
    }
    AT_LEAST_ONE_SEP4(options) {
      this.atLeastOneSepFirstInternal(4, options);
    }
    AT_LEAST_ONE_SEP5(options) {
      this.atLeastOneSepFirstInternal(5, options);
    }
    AT_LEAST_ONE_SEP6(options) {
      this.atLeastOneSepFirstInternal(6, options);
    }
    AT_LEAST_ONE_SEP7(options) {
      this.atLeastOneSepFirstInternal(7, options);
    }
    AT_LEAST_ONE_SEP8(options) {
      this.atLeastOneSepFirstInternal(8, options);
    }
    AT_LEAST_ONE_SEP9(options) {
      this.atLeastOneSepFirstInternal(9, options);
    }
    RULE(name, implementation, config = DEFAULT_RULE_CONFIG) {
      if (includes_default(this.definedRulesNames, name)) {
        const errMsg = defaultGrammarValidatorErrorProvider.buildDuplicateRuleNameError({
          topLevelRule: name,
          grammarName: this.className
        });
        const error = {
          message: errMsg,
          type: ParserDefinitionErrorType.DUPLICATE_RULE_NAME,
          ruleName: name
        };
        this.definitionErrors.push(error);
      }
      this.definedRulesNames.push(name);
      const ruleImplementation = this.defineRule(name, implementation, config);
      this[name] = ruleImplementation;
      return ruleImplementation;
    }
    OVERRIDE_RULE(name, impl, config = DEFAULT_RULE_CONFIG) {
      const ruleErrors = validateRuleIsOverridden(name, this.definedRulesNames, this.className);
      this.definitionErrors = this.definitionErrors.concat(ruleErrors);
      const ruleImplementation = this.defineRule(name, impl, config);
      this[name] = ruleImplementation;
      return ruleImplementation;
    }
    BACKTRACK(grammarRule, args) {
      var _a;
      const ruleToCall = (_a = grammarRule.coreRule) !== null && _a !== void 0 ? _a : grammarRule;
      return function() {
        this.isBackTrackingStack.push(1);
        const orgState = this.saveRecogState();
        try {
          ruleToCall.apply(this, args);
          return true;
        } catch (e) {
          if (isRecognitionException(e)) {
            return false;
          } else {
            throw e;
          }
        } finally {
          this.reloadRecogState(orgState);
          this.isBackTrackingStack.pop();
        }
      };
    }
    // GAST export APIs
    getGAstProductions() {
      return this.gastProductionsCache;
    }
    getSerializedGastProductions() {
      return serializeGrammar(values_default(this.gastProductionsCache));
    }
  };
  var RecognizerEngine = class {
    initRecognizerEngine(tokenVocabulary, config) {
      this.className = this.constructor.name;
      this.shortRuleNameToFull = {};
      this.fullRuleNameToShort = {};
      this.ruleShortNameIdx = 256;
      this.tokenMatcher = tokenStructuredMatcherNoCategories;
      this.subruleIdx = 0;
      this.currRuleShortName = 0;
      this.definedRulesNames = [];
      this.tokensMap = {};
      this.isBackTrackingStack = [];
      this.RULE_STACK = [];
      this.RULE_STACK_IDX = -1;
      this.RULE_OCCURRENCE_STACK = [];
      this.RULE_OCCURRENCE_STACK_IDX = -1;
      this.gastProductionsCache = {};
      if (has_default(config, "serializedGrammar")) {
        throw Error("The Parser's configuration can no longer contain a <serializedGrammar> property.\n	See: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_6-0-0\n	For Further details.");
      }
      if (isArray_default(tokenVocabulary)) {
        if (isEmpty_default(tokenVocabulary)) {
          throw Error("A Token Vocabulary cannot be empty.\n	Note that the first argument for the parser constructor\n	is no longer a Token vector (since v4.0).");
        }
        if (typeof tokenVocabulary[0].startOffset === "number") {
          throw Error("The Parser constructor no longer accepts a token vector as the first argument.\n	See: https://chevrotain.io/docs/changes/BREAKING_CHANGES.html#_4-0-0\n	For Further details.");
        }
      }
      if (isArray_default(tokenVocabulary)) {
        this.tokensMap = reduce_default(tokenVocabulary, (acc, tokType) => {
          acc[tokType.name] = tokType;
          return acc;
        }, {});
      } else if (has_default(tokenVocabulary, "modes") && every_default(flatten_default(values_default(tokenVocabulary.modes)), isTokenType)) {
        const allTokenTypes2 = flatten_default(values_default(tokenVocabulary.modes));
        const uniqueTokens = uniq_default(allTokenTypes2);
        this.tokensMap = reduce_default(uniqueTokens, (acc, tokType) => {
          acc[tokType.name] = tokType;
          return acc;
        }, {});
      } else if (isObject_default(tokenVocabulary)) {
        this.tokensMap = clone_default(tokenVocabulary);
      } else {
        throw new Error("<tokensDictionary> argument must be An Array of Token constructors, A dictionary of Token constructors or an IMultiModeLexerDefinition");
      }
      this.tokensMap["EOF"] = EOF;
      const allTokenTypes = has_default(tokenVocabulary, "modes") ? flatten_default(values_default(tokenVocabulary.modes)) : values_default(tokenVocabulary);
      const noTokenCategoriesUsed = every_default(allTokenTypes, (tokenConstructor) => isEmpty_default(tokenConstructor.categoryMatches));
      this.tokenMatcher = noTokenCategoriesUsed ? tokenStructuredMatcherNoCategories : tokenStructuredMatcher;
      augmentTokenTypes(values_default(this.tokensMap));
    }
    defineRule(ruleName, impl, config) {
      if (this.selfAnalysisDone) {
        throw Error(`Grammar rule <${ruleName}> may not be defined after the 'performSelfAnalysis' method has been called'
Make sure that all grammar rule definitions are done before 'performSelfAnalysis' is called.`);
      }
      const resyncEnabled = has_default(config, "resyncEnabled") ? config.resyncEnabled : DEFAULT_RULE_CONFIG.resyncEnabled;
      const recoveryValueFunc = has_default(config, "recoveryValueFunc") ? config.recoveryValueFunc : DEFAULT_RULE_CONFIG.recoveryValueFunc;
      const shortName = this.ruleShortNameIdx << BITS_FOR_METHOD_TYPE + BITS_FOR_OCCURRENCE_IDX;
      this.ruleShortNameIdx++;
      this.shortRuleNameToFull[shortName] = ruleName;
      this.fullRuleNameToShort[ruleName] = shortName;
      let coreRuleFunction;
      if (this.outputCst === true) {
        coreRuleFunction = function invokeRuleWithTry(...args) {
          try {
            this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
            impl.apply(this, args);
            const cst = this.CST_STACK[this.CST_STACK.length - 1];
            this.cstPostRule(cst);
            return cst;
          } catch (e) {
            return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
          } finally {
            this.ruleFinallyStateUpdate();
          }
        };
      } else {
        coreRuleFunction = function invokeRuleWithTryCst(...args) {
          try {
            this.ruleInvocationStateUpdate(shortName, ruleName, this.subruleIdx);
            return impl.apply(this, args);
          } catch (e) {
            return this.invokeRuleCatch(e, resyncEnabled, recoveryValueFunc);
          } finally {
            this.ruleFinallyStateUpdate();
          }
        };
      }
      const rootRuleFunction = function rootRule(...args) {
        this.onBeforeParse(ruleName);
        try {
          return coreRuleFunction.apply(this, args);
        } finally {
          this.onAfterParse(ruleName);
        }
      };
      const wrappedGrammarRule = Object.assign(rootRuleFunction, { ruleName, originalGrammarAction: impl, coreRule: coreRuleFunction });
      return wrappedGrammarRule;
    }
    invokeRuleCatch(e, resyncEnabledConfig, recoveryValueFunc) {
      const isFirstInvokedRule = this.RULE_STACK_IDX === 0;
      const reSyncEnabled = resyncEnabledConfig && !this.isBackTracking() && this.recoveryEnabled;
      if (isRecognitionException(e)) {
        const recogError = e;
        if (reSyncEnabled) {
          const reSyncTokType = this.findReSyncTokenType();
          if (this.isInCurrentRuleReSyncSet(reSyncTokType)) {
            recogError.resyncedTokens = this.reSyncTo(reSyncTokType);
            if (this.outputCst) {
              const partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
              partialCstResult.recoveredNode = true;
              return partialCstResult;
            } else {
              return recoveryValueFunc(e);
            }
          } else {
            if (this.outputCst) {
              const partialCstResult = this.CST_STACK[this.CST_STACK.length - 1];
              partialCstResult.recoveredNode = true;
              recogError.partialCstResult = partialCstResult;
            }
            throw recogError;
          }
        } else if (isFirstInvokedRule) {
          this.moveToTerminatedState();
          return recoveryValueFunc(e);
        } else {
          throw recogError;
        }
      } else {
        throw e;
      }
    }
    // Implementation of parsing DSL
    optionInternal(actionORMethodDef, occurrence) {
      const key = this.getKeyForAutomaticLookahead(OPTION_IDX, occurrence);
      return this.optionInternalLogic(actionORMethodDef, occurrence, key);
    }
    optionInternalLogic(actionORMethodDef, occurrence, key) {
      let lookAheadFunc = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookAheadFunc;
          lookAheadFunc = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      if (lookAheadFunc.call(this) === true) {
        return action.call(this);
      }
      return void 0;
    }
    atLeastOneInternal(prodOccurrence, actionORMethodDef) {
      const laKey = this.getKeyForAutomaticLookahead(AT_LEAST_ONE_IDX, prodOccurrence);
      return this.atLeastOneInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    }
    atLeastOneInternalLogic(prodOccurrence, actionORMethodDef, key) {
      let lookAheadFunc = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookAheadFunc;
          lookAheadFunc = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      if (lookAheadFunc.call(this) === true) {
        let notStuck = this.doSingleRepetition(action);
        while (lookAheadFunc.call(this) === true && notStuck === true) {
          notStuck = this.doSingleRepetition(action);
        }
      } else {
        throw this.raiseEarlyExitException(prodOccurrence, PROD_TYPE.REPETITION_MANDATORY, actionORMethodDef.ERR_MSG);
      }
      this.attemptInRepetitionRecovery(this.atLeastOneInternal, [prodOccurrence, actionORMethodDef], lookAheadFunc, AT_LEAST_ONE_IDX, prodOccurrence, NextTerminalAfterAtLeastOneWalker);
    }
    atLeastOneSepFirstInternal(prodOccurrence, options) {
      const laKey = this.getKeyForAutomaticLookahead(AT_LEAST_ONE_SEP_IDX, prodOccurrence);
      this.atLeastOneSepFirstInternalLogic(prodOccurrence, options, laKey);
    }
    atLeastOneSepFirstInternalLogic(prodOccurrence, options, key) {
      const action = options.DEF;
      const separator2 = options.SEP;
      const firstIterationLookaheadFunc = this.getLaFuncFromCache(key);
      if (firstIterationLookaheadFunc.call(this) === true) {
        action.call(this);
        const separatorLookAheadFunc = () => {
          return this.tokenMatcher(this.LA_FAST(1), separator2);
        };
        while (this.tokenMatcher(this.LA_FAST(1), separator2) === true) {
          this.CONSUME(separator2);
          action.call(this);
        }
        this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
          prodOccurrence,
          separator2,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterAtLeastOneSepWalker
        ], separatorLookAheadFunc, AT_LEAST_ONE_SEP_IDX, prodOccurrence, NextTerminalAfterAtLeastOneSepWalker);
      } else {
        throw this.raiseEarlyExitException(prodOccurrence, PROD_TYPE.REPETITION_MANDATORY_WITH_SEPARATOR, options.ERR_MSG);
      }
    }
    manyInternal(prodOccurrence, actionORMethodDef) {
      const laKey = this.getKeyForAutomaticLookahead(MANY_IDX, prodOccurrence);
      return this.manyInternalLogic(prodOccurrence, actionORMethodDef, laKey);
    }
    manyInternalLogic(prodOccurrence, actionORMethodDef, key) {
      let lookaheadFunction = this.getLaFuncFromCache(key);
      let action;
      if (typeof actionORMethodDef !== "function") {
        action = actionORMethodDef.DEF;
        const predicate = actionORMethodDef.GATE;
        if (predicate !== void 0) {
          const orgLookaheadFunction = lookaheadFunction;
          lookaheadFunction = () => {
            return predicate.call(this) && orgLookaheadFunction.call(this);
          };
        }
      } else {
        action = actionORMethodDef;
      }
      let notStuck = true;
      while (lookaheadFunction.call(this) === true && notStuck === true) {
        notStuck = this.doSingleRepetition(action);
      }
      this.attemptInRepetitionRecovery(
        this.manyInternal,
        [prodOccurrence, actionORMethodDef],
        lookaheadFunction,
        MANY_IDX,
        prodOccurrence,
        NextTerminalAfterManyWalker,
        // The notStuck parameter is only relevant when "attemptInRepetitionRecovery"
        // is invoked from manyInternal, in the MANY_SEP case and AT_LEAST_ONE[_SEP]
        // An infinite loop cannot occur as:
        // - Either the lookahead is guaranteed to consume something (Single Token Separator)
        // - AT_LEAST_ONE by definition is guaranteed to consume something (or error out).
        notStuck
      );
    }
    manySepFirstInternal(prodOccurrence, options) {
      const laKey = this.getKeyForAutomaticLookahead(MANY_SEP_IDX, prodOccurrence);
      this.manySepFirstInternalLogic(prodOccurrence, options, laKey);
    }
    manySepFirstInternalLogic(prodOccurrence, options, key) {
      const action = options.DEF;
      const separator2 = options.SEP;
      const firstIterationLaFunc = this.getLaFuncFromCache(key);
      if (firstIterationLaFunc.call(this) === true) {
        action.call(this);
        const separatorLookAheadFunc = () => {
          return this.tokenMatcher(this.LA_FAST(1), separator2);
        };
        while (this.tokenMatcher(this.LA_FAST(1), separator2) === true) {
          this.CONSUME(separator2);
          action.call(this);
        }
        this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
          prodOccurrence,
          separator2,
          separatorLookAheadFunc,
          action,
          NextTerminalAfterManySepWalker
        ], separatorLookAheadFunc, MANY_SEP_IDX, prodOccurrence, NextTerminalAfterManySepWalker);
      }
    }
    repetitionSepSecondInternal(prodOccurrence, separator2, separatorLookAheadFunc, action, nextTerminalAfterWalker) {
      while (separatorLookAheadFunc()) {
        this.CONSUME(separator2);
        action.call(this);
      }
      this.attemptInRepetitionRecovery(this.repetitionSepSecondInternal, [
        prodOccurrence,
        separator2,
        separatorLookAheadFunc,
        action,
        nextTerminalAfterWalker
      ], separatorLookAheadFunc, AT_LEAST_ONE_SEP_IDX, prodOccurrence, nextTerminalAfterWalker);
    }
    doSingleRepetition(action) {
      const beforeIteration = this.getLexerPosition();
      action.call(this);
      const afterIteration = this.getLexerPosition();
      return afterIteration > beforeIteration;
    }
    orInternal(altsOrOpts, occurrence) {
      const laKey = this.getKeyForAutomaticLookahead(OR_IDX, occurrence);
      const alts = isArray_default(altsOrOpts) ? altsOrOpts : altsOrOpts.DEF;
      const laFunc = this.getLaFuncFromCache(laKey);
      const altIdxToTake = laFunc.call(this, alts);
      if (altIdxToTake !== void 0) {
        const chosenAlternative = alts[altIdxToTake];
        return chosenAlternative.ALT.call(this);
      }
      this.raiseNoAltException(occurrence, altsOrOpts.ERR_MSG);
    }
    ruleFinallyStateUpdate() {
      this.RULE_STACK_IDX--;
      this.RULE_OCCURRENCE_STACK_IDX--;
      if (this.RULE_STACK_IDX >= 0) {
        this.currRuleShortName = this.RULE_STACK[this.RULE_STACK_IDX];
      }
      this.cstFinallyStateUpdate();
    }
    subruleInternal(ruleToCall, idx, options) {
      let ruleResult;
      try {
        const args = options !== void 0 ? options.ARGS : void 0;
        this.subruleIdx = idx;
        ruleResult = ruleToCall.coreRule.apply(this, args);
        this.cstPostNonTerminal(ruleResult, options !== void 0 && options.LABEL !== void 0 ? options.LABEL : ruleToCall.ruleName);
        return ruleResult;
      } catch (e) {
        throw this.subruleInternalError(e, options, ruleToCall.ruleName);
      }
    }
    subruleInternalError(e, options, ruleName) {
      if (isRecognitionException(e) && e.partialCstResult !== void 0) {
        this.cstPostNonTerminal(e.partialCstResult, options !== void 0 && options.LABEL !== void 0 ? options.LABEL : ruleName);
        delete e.partialCstResult;
      }
      throw e;
    }
    consumeInternal(tokType, idx, options) {
      let consumedToken;
      try {
        const nextToken = this.LA_FAST(1);
        if (this.tokenMatcher(nextToken, tokType) === true) {
          this.consumeToken();
          consumedToken = nextToken;
        } else {
          this.consumeInternalError(tokType, nextToken, options);
        }
      } catch (eFromConsumption) {
        consumedToken = this.consumeInternalRecovery(tokType, idx, eFromConsumption);
      }
      this.cstPostTerminal(options !== void 0 && options.LABEL !== void 0 ? options.LABEL : tokType.name, consumedToken);
      return consumedToken;
    }
    consumeInternalError(tokType, nextToken, options) {
      let msg;
      const previousToken = this.LA(0);
      if (options !== void 0 && options.ERR_MSG) {
        msg = options.ERR_MSG;
      } else {
        msg = this.errorMessageProvider.buildMismatchTokenMessage({
          expected: tokType,
          actual: nextToken,
          previous: previousToken,
          ruleName: this.getCurrRuleFullName()
        });
      }
      throw this.SAVE_ERROR(new MismatchedTokenException(msg, nextToken, previousToken));
    }
    consumeInternalRecovery(tokType, idx, eFromConsumption) {
      if (this.recoveryEnabled && // TODO: more robust checking of the exception type. Perhaps Typescript extending expressions?
      eFromConsumption.name === "MismatchedTokenException" && !this.isBackTracking()) {
        const follows = this.getFollowsForInRuleRecovery(tokType, idx);
        try {
          return this.tryInRuleRecovery(tokType, follows);
        } catch (eFromInRuleRecovery) {
          if (eFromInRuleRecovery.name === IN_RULE_RECOVERY_EXCEPTION) {
            throw eFromConsumption;
          } else {
            throw eFromInRuleRecovery;
          }
        }
      } else {
        throw eFromConsumption;
      }
    }
    saveRecogState() {
      const savedErrors = this.errors;
      const savedRuleStack = this.RULE_STACK.slice(0, this.RULE_STACK_IDX + 1);
      return {
        errors: savedErrors,
        lexerState: this.exportLexerState(),
        RULE_STACK: savedRuleStack,
        CST_STACK: this.CST_STACK
      };
    }
    reloadRecogState(newState) {
      this.errors = newState.errors;
      this.importLexerState(newState.lexerState);
      const saved = newState.RULE_STACK;
      for (let i = 0; i < saved.length; i++) {
        this.RULE_STACK[i] = saved[i];
      }
      this.RULE_STACK_IDX = saved.length - 1;
      if (this.RULE_STACK_IDX >= 0) {
        this.currRuleShortName = this.RULE_STACK[this.RULE_STACK_IDX];
      }
    }
    ruleInvocationStateUpdate(shortName, fullName, idxInCallingRule) {
      this.RULE_OCCURRENCE_STACK[++this.RULE_OCCURRENCE_STACK_IDX] = idxInCallingRule;
      this.RULE_STACK[++this.RULE_STACK_IDX] = shortName;
      this.currRuleShortName = shortName;
      this.cstInvocationStateUpdate(fullName);
    }
    isBackTracking() {
      return this.isBackTrackingStack.length !== 0;
    }
    getCurrRuleFullName() {
      const shortName = this.currRuleShortName;
      return this.shortRuleNameToFull[shortName];
    }
    shortRuleNameToFullName(shortName) {
      return this.shortRuleNameToFull[shortName];
    }
    isAtEndOfInput() {
      return this.tokenMatcher(this.LA(1), EOF);
    }
    reset() {
      this.resetLexerState();
      this.subruleIdx = 0;
      this.currRuleShortName = 0;
      this.isBackTrackingStack = [];
      this.errors = [];
      this.RULE_STACK_IDX = -1;
      this.RULE_OCCURRENCE_STACK_IDX = -1;
      this.CST_STACK = [];
    }
    /**
     * Hook called before the root-level parsing rule is invoked.
     * This is only called when a rule is invoked directly by the consumer
     * (e.g., `parser.json()`), not when invoked as a sub-rule via SUBRULE.
     *
     * Override this method to perform actions before parsing begins.
     * The default implementation is a no-op.
     *
     * @param ruleName - The name of the root rule being invoked.
     */
    onBeforeParse(ruleName) {
      for (let i = 0; i < this.maxLookahead + 1; i++) {
        this.tokVector.push(END_OF_FILE);
      }
    }
    /**
     * Hook called after the root-level parsing rule has completed (or thrown).
     * This is only called when a rule is invoked directly by the consumer
     * (e.g., `parser.json()`), not when invoked as a sub-rule via SUBRULE.
     *
     * This hook is called in a `finally` block, so it executes regardless of
     * whether parsing succeeded or threw an error.
     *
     * Override this method to perform actions after parsing completes.
     * The default implementation is a no-op.
     *
     * @param ruleName - The name of the root rule that was invoked.
     */
    onAfterParse(ruleName) {
      if (this.isAtEndOfInput() === false) {
        const firstRedundantTok = this.LA(1);
        const errMsg = this.errorMessageProvider.buildNotAllInputParsedMessage({
          firstRedundant: firstRedundantTok,
          ruleName: this.getCurrRuleFullName()
        });
        this.SAVE_ERROR(new NotAllInputParsedException(errMsg, firstRedundantTok));
      }
      while (this.tokVector.at(-1) === END_OF_FILE) {
        this.tokVector.pop();
      }
    }
  };
  var ErrorHandler = class {
    initErrorHandler(config) {
      this._errors = [];
      this.errorMessageProvider = has_default(config, "errorMessageProvider") ? config.errorMessageProvider : DEFAULT_PARSER_CONFIG.errorMessageProvider;
    }
    SAVE_ERROR(error) {
      if (isRecognitionException(error)) {
        error.context = {
          ruleStack: this.getHumanReadableRuleStack(),
          ruleOccurrenceStack: this.RULE_OCCURRENCE_STACK.slice(0, this.RULE_OCCURRENCE_STACK_IDX + 1)
        };
        this._errors.push(error);
        return error;
      } else {
        throw Error("Trying to save an Error which is not a RecognitionException");
      }
    }
    get errors() {
      return clone_default(this._errors);
    }
    set errors(newErrors) {
      this._errors = newErrors;
    }
    // TODO: consider caching the error message computed information
    raiseEarlyExitException(occurrence, prodType, userDefinedErrMsg) {
      const ruleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[ruleName];
      const lookAheadPathsPerAlternative = getLookaheadPathsForOptionalProd(occurrence, ruleGrammar, prodType, this.maxLookahead);
      const insideProdPaths = lookAheadPathsPerAlternative[0];
      const actualTokens = [];
      for (let i = 1; i <= this.maxLookahead; i++) {
        actualTokens.push(this.LA(i));
      }
      const msg = this.errorMessageProvider.buildEarlyExitMessage({
        expectedIterationPaths: insideProdPaths,
        actual: actualTokens,
        previous: this.LA(0),
        customUserDescription: userDefinedErrMsg,
        ruleName
      });
      throw this.SAVE_ERROR(new EarlyExitException(msg, this.LA(1), this.LA(0)));
    }
    // TODO: consider caching the error message computed information
    raiseNoAltException(occurrence, errMsgTypes) {
      const ruleName = this.getCurrRuleFullName();
      const ruleGrammar = this.getGAstProductions()[ruleName];
      const lookAheadPathsPerAlternative = getLookaheadPathsForOr(occurrence, ruleGrammar, this.maxLookahead);
      const actualTokens = [];
      for (let i = 1; i <= this.maxLookahead; i++) {
        actualTokens.push(this.LA(i));
      }
      const previousToken = this.LA(0);
      const errMsg = this.errorMessageProvider.buildNoViableAltMessage({
        expectedPathsPerAlt: lookAheadPathsPerAlternative,
        actual: actualTokens,
        previous: previousToken,
        customUserDescription: errMsgTypes,
        ruleName: this.getCurrRuleFullName()
      });
      throw this.SAVE_ERROR(new NoViableAltException(errMsg, this.LA(1), previousToken));
    }
  };
  var ContentAssist = class {
    initContentAssist() {
    }
    computeContentAssist(startRuleName, precedingInput) {
      const startRuleGast = this.gastProductionsCache[startRuleName];
      if (isUndefined_default(startRuleGast)) {
        throw Error(`Rule ->${startRuleName}<- does not exist in this grammar.`);
      }
      return nextPossibleTokensAfter([startRuleGast], precedingInput, this.tokenMatcher, this.maxLookahead);
    }
    // TODO: should this be a member method or a utility? it does not have any state or usage of 'this'...
    // TODO: should this be more explicitly part of the public API?
    getNextPossibleTokenTypes(grammarPath) {
      const topRuleName = head_default(grammarPath.ruleStack);
      const gastProductions = this.getGAstProductions();
      const topProduction = gastProductions[topRuleName];
      const nextPossibleTokenTypes = new NextAfterTokenWalker(topProduction, grammarPath).startWalking();
      return nextPossibleTokenTypes;
    }
  };
  var RECORDING_NULL_OBJECT = {
    description: "This Object indicates the Parser is during Recording Phase"
  };
  Object.freeze(RECORDING_NULL_OBJECT);
  var HANDLE_SEPARATOR = true;
  var MAX_METHOD_IDX = Math.pow(2, BITS_FOR_OCCURRENCE_IDX) - 1;
  var RFT = createToken({ name: "RECORDING_PHASE_TOKEN", pattern: Lexer.NA });
  augmentTokenTypes([RFT]);
  var RECORDING_PHASE_TOKEN = createTokenInstance(
    RFT,
    "This IToken indicates the Parser is in Recording Phase\n	See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
    // Using "-1" instead of NaN (as in EOF) because an actual number is less likely to
    // cause errors if the output of LA or CONSUME would be (incorrectly) used during the recording phase.
    -1,
    -1,
    -1,
    -1,
    -1,
    -1
  );
  Object.freeze(RECORDING_PHASE_TOKEN);
  var RECORDING_PHASE_CSTNODE = {
    name: "This CSTNode indicates the Parser is in Recording Phase\n	See: https://chevrotain.io/docs/guide/internals.html#grammar-recording for details",
    children: {}
  };
  var GastRecorder = class {
    initGastRecorder(config) {
      this.recordingProdStack = [];
      this.RECORDING_PHASE = false;
    }
    enableRecording() {
      this.RECORDING_PHASE = true;
      this.TRACE_INIT("Enable Recording", () => {
        for (let i = 0; i < 10; i++) {
          const idx = i > 0 ? i : "";
          this[`CONSUME${idx}`] = function(arg1, arg2) {
            return this.consumeInternalRecord(arg1, i, arg2);
          };
          this[`SUBRULE${idx}`] = function(arg1, arg2) {
            return this.subruleInternalRecord(arg1, i, arg2);
          };
          this[`OPTION${idx}`] = function(arg1) {
            return this.optionInternalRecord(arg1, i);
          };
          this[`OR${idx}`] = function(arg1) {
            return this.orInternalRecord(arg1, i);
          };
          this[`MANY${idx}`] = function(arg1) {
            this.manyInternalRecord(i, arg1);
          };
          this[`MANY_SEP${idx}`] = function(arg1) {
            this.manySepFirstInternalRecord(i, arg1);
          };
          this[`AT_LEAST_ONE${idx}`] = function(arg1) {
            this.atLeastOneInternalRecord(i, arg1);
          };
          this[`AT_LEAST_ONE_SEP${idx}`] = function(arg1) {
            this.atLeastOneSepFirstInternalRecord(i, arg1);
          };
        }
        this[`consume`] = function(idx, arg1, arg2) {
          return this.consumeInternalRecord(arg1, idx, arg2);
        };
        this[`subrule`] = function(idx, arg1, arg2) {
          return this.subruleInternalRecord(arg1, idx, arg2);
        };
        this[`option`] = function(idx, arg1) {
          return this.optionInternalRecord(arg1, idx);
        };
        this[`or`] = function(idx, arg1) {
          return this.orInternalRecord(arg1, idx);
        };
        this[`many`] = function(idx, arg1) {
          this.manyInternalRecord(idx, arg1);
        };
        this[`atLeastOne`] = function(idx, arg1) {
          this.atLeastOneInternalRecord(idx, arg1);
        };
        this.ACTION = this.ACTION_RECORD;
        this.BACKTRACK = this.BACKTRACK_RECORD;
        this.LA = this.LA_RECORD;
      });
    }
    disableRecording() {
      this.RECORDING_PHASE = false;
      this.TRACE_INIT("Deleting Recording methods", () => {
        const that = this;
        for (let i = 0; i < 10; i++) {
          const idx = i > 0 ? i : "";
          delete that[`CONSUME${idx}`];
          delete that[`SUBRULE${idx}`];
          delete that[`OPTION${idx}`];
          delete that[`OR${idx}`];
          delete that[`MANY${idx}`];
          delete that[`MANY_SEP${idx}`];
          delete that[`AT_LEAST_ONE${idx}`];
          delete that[`AT_LEAST_ONE_SEP${idx}`];
        }
        delete that[`consume`];
        delete that[`subrule`];
        delete that[`option`];
        delete that[`or`];
        delete that[`many`];
        delete that[`atLeastOne`];
        delete that.ACTION;
        delete that.BACKTRACK;
        delete that.LA;
      });
    }
    //   Parser methods are called inside an ACTION?
    //   Maybe try/catch/finally on ACTIONS while disabling the recorders state changes?
    // @ts-expect-error -- noop place holder
    ACTION_RECORD(impl) {
    }
    // Executing backtracking logic will break our recording logic assumptions
    BACKTRACK_RECORD(grammarRule, args) {
      return () => true;
    }
    // LA is part of the official API and may be used for custom lookahead logic
    // by end users who may forget to wrap it in ACTION or inside a GATE
    LA_RECORD(howMuch) {
      return END_OF_FILE;
    }
    topLevelRuleRecord(name, def) {
      try {
        const newTopLevelRule = new Rule({ definition: [], name });
        newTopLevelRule.name = name;
        this.recordingProdStack.push(newTopLevelRule);
        def.call(this);
        this.recordingProdStack.pop();
        return newTopLevelRule;
      } catch (originalError) {
        if (originalError.KNOWN_RECORDER_ERROR !== true) {
          try {
            originalError.message = originalError.message + '\n	 This error was thrown during the "grammar recording phase" For more info see:\n	https://chevrotain.io/docs/guide/internals.html#grammar-recording';
          } catch (mutabilityError) {
            throw originalError;
          }
        }
        throw originalError;
      }
    }
    // Implementation of parsing DSL
    optionInternalRecord(actionORMethodDef, occurrence) {
      return recordProd.call(this, Option, actionORMethodDef, occurrence);
    }
    atLeastOneInternalRecord(occurrence, actionORMethodDef) {
      recordProd.call(this, RepetitionMandatory, actionORMethodDef, occurrence);
    }
    atLeastOneSepFirstInternalRecord(occurrence, options) {
      recordProd.call(this, RepetitionMandatoryWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    }
    manyInternalRecord(occurrence, actionORMethodDef) {
      recordProd.call(this, Repetition, actionORMethodDef, occurrence);
    }
    manySepFirstInternalRecord(occurrence, options) {
      recordProd.call(this, RepetitionWithSeparator, options, occurrence, HANDLE_SEPARATOR);
    }
    orInternalRecord(altsOrOpts, occurrence) {
      return recordOrProd.call(this, altsOrOpts, occurrence);
    }
    subruleInternalRecord(ruleToCall, occurrence, options) {
      assertMethodIdxIsValid(occurrence);
      if (!ruleToCall || has_default(ruleToCall, "ruleName") === false) {
        const error = new Error(`<SUBRULE${getIdxSuffix(occurrence)}> argument is invalid expecting a Parser method reference but got: <${JSON.stringify(ruleToCall)}>
 inside top level rule: <${this.recordingProdStack[0].name}>`);
        error.KNOWN_RECORDER_ERROR = true;
        throw error;
      }
      const prevProd = last_default(this.recordingProdStack);
      const ruleName = ruleToCall.ruleName;
      const newNoneTerminal = new NonTerminal({
        idx: occurrence,
        nonTerminalName: ruleName,
        label: options === null || options === void 0 ? void 0 : options.LABEL,
        // The resolving of the `referencedRule` property will be done once all the Rule's GASTs have been created
        referencedRule: void 0
      });
      prevProd.definition.push(newNoneTerminal);
      return this.outputCst ? RECORDING_PHASE_CSTNODE : RECORDING_NULL_OBJECT;
    }
    consumeInternalRecord(tokType, occurrence, options) {
      assertMethodIdxIsValid(occurrence);
      if (!hasShortKeyProperty(tokType)) {
        const error = new Error(`<CONSUME${getIdxSuffix(occurrence)}> argument is invalid expecting a TokenType reference but got: <${JSON.stringify(tokType)}>
 inside top level rule: <${this.recordingProdStack[0].name}>`);
        error.KNOWN_RECORDER_ERROR = true;
        throw error;
      }
      const prevProd = last_default(this.recordingProdStack);
      const newNoneTerminal = new Terminal({
        idx: occurrence,
        terminalType: tokType,
        label: options === null || options === void 0 ? void 0 : options.LABEL
      });
      prevProd.definition.push(newNoneTerminal);
      return RECORDING_PHASE_TOKEN;
    }
  };
  function recordProd(prodConstructor, mainProdArg, occurrence, handleSep = false) {
    assertMethodIdxIsValid(occurrence);
    const prevProd = last_default(this.recordingProdStack);
    const grammarAction = isFunction_default(mainProdArg) ? mainProdArg : mainProdArg.DEF;
    const newProd = new prodConstructor({ definition: [], idx: occurrence });
    if (handleSep) {
      newProd.separator = mainProdArg.SEP;
    }
    if (has_default(mainProdArg, "MAX_LOOKAHEAD")) {
      newProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    this.recordingProdStack.push(newProd);
    grammarAction.call(this);
    prevProd.definition.push(newProd);
    this.recordingProdStack.pop();
    return RECORDING_NULL_OBJECT;
  }
  function recordOrProd(mainProdArg, occurrence) {
    assertMethodIdxIsValid(occurrence);
    const prevProd = last_default(this.recordingProdStack);
    const hasOptions = isArray_default(mainProdArg) === false;
    const alts = hasOptions === false ? mainProdArg : mainProdArg.DEF;
    const newOrProd = new Alternation({
      definition: [],
      idx: occurrence,
      ignoreAmbiguities: hasOptions && mainProdArg.IGNORE_AMBIGUITIES === true
    });
    if (has_default(mainProdArg, "MAX_LOOKAHEAD")) {
      newOrProd.maxLookahead = mainProdArg.MAX_LOOKAHEAD;
    }
    const hasPredicates = some_default(alts, (currAlt) => isFunction_default(currAlt.GATE));
    newOrProd.hasPredicates = hasPredicates;
    prevProd.definition.push(newOrProd);
    forEach_default(alts, (currAlt) => {
      const currAltFlat = new Alternative({ definition: [] });
      newOrProd.definition.push(currAltFlat);
      if (has_default(currAlt, "IGNORE_AMBIGUITIES")) {
        currAltFlat.ignoreAmbiguities = currAlt.IGNORE_AMBIGUITIES;
      } else if (has_default(currAlt, "GATE")) {
        currAltFlat.ignoreAmbiguities = true;
      }
      this.recordingProdStack.push(currAltFlat);
      currAlt.ALT.call(this);
      this.recordingProdStack.pop();
    });
    return RECORDING_NULL_OBJECT;
  }
  function getIdxSuffix(idx) {
    return idx === 0 ? "" : `${idx}`;
  }
  function assertMethodIdxIsValid(idx) {
    if (idx < 0 || idx > MAX_METHOD_IDX) {
      const error = new Error(
        // The stack trace will contain all the needed details
        `Invalid DSL Method idx value: <${idx}>
	Idx value must be a none negative value smaller than ${MAX_METHOD_IDX + 1}`
      );
      error.KNOWN_RECORDER_ERROR = true;
      throw error;
    }
  }
  var PerformanceTracer = class {
    initPerformanceTracer(config) {
      if (has_default(config, "traceInitPerf")) {
        const userTraceInitPerf = config.traceInitPerf;
        const traceIsNumber = typeof userTraceInitPerf === "number";
        this.traceInitMaxIdent = traceIsNumber ? userTraceInitPerf : Infinity;
        this.traceInitPerf = traceIsNumber ? userTraceInitPerf > 0 : userTraceInitPerf;
      } else {
        this.traceInitMaxIdent = 0;
        this.traceInitPerf = DEFAULT_PARSER_CONFIG.traceInitPerf;
      }
      this.traceInitIndent = -1;
    }
    TRACE_INIT(phaseDesc, phaseImpl) {
      if (this.traceInitPerf === true) {
        this.traceInitIndent++;
        const indent = new Array(this.traceInitIndent + 1).join("	");
        if (this.traceInitIndent < this.traceInitMaxIdent) {
          console.log(`${indent}--> <${phaseDesc}>`);
        }
        const { time, value } = timer(phaseImpl);
        const traceMethod = time > 10 ? console.warn : console.log;
        if (this.traceInitIndent < this.traceInitMaxIdent) {
          traceMethod(`${indent}<-- <${phaseDesc}> time: ${time}ms`);
        }
        this.traceInitIndent--;
        return value;
      } else {
        return phaseImpl();
      }
    }
  };
  function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach((baseCtor) => {
      const baseProto = baseCtor.prototype;
      Object.getOwnPropertyNames(baseProto).forEach((propName) => {
        if (propName === "constructor") {
          return;
        }
        const basePropDescriptor = Object.getOwnPropertyDescriptor(baseProto, propName);
        if (basePropDescriptor && (basePropDescriptor.get || basePropDescriptor.set)) {
          Object.defineProperty(derivedCtor.prototype, propName, basePropDescriptor);
        } else {
          derivedCtor.prototype[propName] = baseCtor.prototype[propName];
        }
      });
    });
  }
  var END_OF_FILE = createTokenInstance(EOF, "", NaN, NaN, NaN, NaN, NaN, NaN);
  Object.freeze(END_OF_FILE);
  var DEFAULT_PARSER_CONFIG = Object.freeze({
    recoveryEnabled: false,
    maxLookahead: 3,
    dynamicTokensEnabled: false,
    outputCst: true,
    errorMessageProvider: defaultParserErrorProvider,
    nodeLocationTracking: "none",
    traceInitPerf: false,
    skipValidations: false
  });
  var DEFAULT_RULE_CONFIG = Object.freeze({
    recoveryValueFunc: () => void 0,
    resyncEnabled: true
  });
  var ParserDefinitionErrorType;
  (function(ParserDefinitionErrorType2) {
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_RULE_NAME"] = 0] = "INVALID_RULE_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["DUPLICATE_RULE_NAME"] = 1] = "DUPLICATE_RULE_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_RULE_OVERRIDE"] = 2] = "INVALID_RULE_OVERRIDE";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["DUPLICATE_PRODUCTIONS"] = 3] = "DUPLICATE_PRODUCTIONS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["UNRESOLVED_SUBRULE_REF"] = 4] = "UNRESOLVED_SUBRULE_REF";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["LEFT_RECURSION"] = 5] = "LEFT_RECURSION";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["NONE_LAST_EMPTY_ALT"] = 6] = "NONE_LAST_EMPTY_ALT";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["AMBIGUOUS_ALTS"] = 7] = "AMBIGUOUS_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["CONFLICT_TOKENS_RULES_NAMESPACE"] = 8] = "CONFLICT_TOKENS_RULES_NAMESPACE";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["INVALID_TOKEN_NAME"] = 9] = "INVALID_TOKEN_NAME";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["NO_NON_EMPTY_LOOKAHEAD"] = 10] = "NO_NON_EMPTY_LOOKAHEAD";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["AMBIGUOUS_PREFIX_ALTS"] = 11] = "AMBIGUOUS_PREFIX_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["TOO_MANY_ALTS"] = 12] = "TOO_MANY_ALTS";
    ParserDefinitionErrorType2[ParserDefinitionErrorType2["CUSTOM_LOOKAHEAD_VALIDATION"] = 13] = "CUSTOM_LOOKAHEAD_VALIDATION";
  })(ParserDefinitionErrorType || (ParserDefinitionErrorType = {}));
  var Parser = class _Parser {
    /**
     *  @deprecated use the **instance** method with the same name instead
     */
    static performSelfAnalysis(parserInstance) {
      throw Error("The **static** `performSelfAnalysis` method has been deprecated.	\nUse the **instance** method with the same name instead.");
    }
    performSelfAnalysis() {
      this.TRACE_INIT("performSelfAnalysis", () => {
        let defErrorsMsgs;
        this.selfAnalysisDone = true;
        const className = this.className;
        this.TRACE_INIT("toFastProps", () => {
          toFastProperties(this);
        });
        this.TRACE_INIT("Grammar Recording", () => {
          try {
            this.enableRecording();
            forEach_default(this.definedRulesNames, (currRuleName) => {
              const wrappedRule = this[currRuleName];
              const originalGrammarAction = wrappedRule["originalGrammarAction"];
              let recordedRuleGast;
              this.TRACE_INIT(`${currRuleName} Rule`, () => {
                recordedRuleGast = this.topLevelRuleRecord(currRuleName, originalGrammarAction);
              });
              this.gastProductionsCache[currRuleName] = recordedRuleGast;
            });
          } finally {
            this.disableRecording();
          }
        });
        let resolverErrors = [];
        this.TRACE_INIT("Grammar Resolving", () => {
          resolverErrors = resolveGrammar2({
            rules: values_default(this.gastProductionsCache)
          });
          this.definitionErrors = this.definitionErrors.concat(resolverErrors);
        });
        this.TRACE_INIT("Grammar Validations", () => {
          if (isEmpty_default(resolverErrors) && this.skipValidations === false) {
            const validationErrors = validateGrammar2({
              rules: values_default(this.gastProductionsCache),
              tokenTypes: values_default(this.tokensMap),
              errMsgProvider: defaultGrammarValidatorErrorProvider,
              grammarName: className
            });
            const lookaheadValidationErrors = validateLookahead({
              lookaheadStrategy: this.lookaheadStrategy,
              rules: values_default(this.gastProductionsCache),
              tokenTypes: values_default(this.tokensMap),
              grammarName: className
            });
            this.definitionErrors = this.definitionErrors.concat(validationErrors, lookaheadValidationErrors);
          }
        });
        if (isEmpty_default(this.definitionErrors)) {
          if (this.recoveryEnabled) {
            this.TRACE_INIT("computeAllProdsFollows", () => {
              const allFollows = computeAllProdsFollows(values_default(this.gastProductionsCache));
              this.resyncFollows = allFollows;
            });
          }
          this.TRACE_INIT("ComputeLookaheadFunctions", () => {
            var _a, _b;
            (_b = (_a = this.lookaheadStrategy).initialize) === null || _b === void 0 ? void 0 : _b.call(_a, {
              rules: values_default(this.gastProductionsCache)
            });
            this.preComputeLookaheadFunctions(values_default(this.gastProductionsCache));
          });
        }
        if (!_Parser.DEFER_DEFINITION_ERRORS_HANDLING && !isEmpty_default(this.definitionErrors)) {
          defErrorsMsgs = map_default(this.definitionErrors, (defError) => defError.message);
          throw new Error(`Parser Definition Errors detected:
 ${defErrorsMsgs.join("\n-------------------------------\n")}`);
        }
      });
    }
    constructor(tokenVocabulary, config) {
      this.definitionErrors = [];
      this.selfAnalysisDone = false;
      const that = this;
      that.initErrorHandler(config);
      that.initLexerAdapter();
      that.initLooksAhead(config);
      that.initRecognizerEngine(tokenVocabulary, config);
      that.initRecoverable(config);
      that.initTreeBuilder(config);
      that.initContentAssist();
      that.initGastRecorder(config);
      that.initPerformanceTracer(config);
      if (has_default(config, "ignoredIssues")) {
        throw new Error("The <ignoredIssues> IParserConfig property has been deprecated.\n	Please use the <IGNORE_AMBIGUITIES> flag on the relevant DSL method instead.\n	See: https://chevrotain.io/docs/guide/resolving_grammar_errors.html#IGNORING_AMBIGUITIES\n	For further details.");
      }
      this.skipValidations = has_default(config, "skipValidations") ? config.skipValidations : DEFAULT_PARSER_CONFIG.skipValidations;
    }
  };
  Parser.DEFER_DEFINITION_ERRORS_HANDLING = false;
  applyMixins(Parser, [
    Recoverable,
    LooksAhead,
    TreeBuilder,
    LexerAdapter,
    RecognizerEngine,
    RecognizerApi,
    ErrorHandler,
    ContentAssist,
    GastRecorder,
    PerformanceTracer
  ]);
  var EmbeddedActionsParser = class extends Parser {
    constructor(tokenVocabulary, config = DEFAULT_PARSER_CONFIG) {
      const configClone = clone_default(config);
      configClone.outputCst = false;
      super(tokenVocabulary, configClone);
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/utils.js
  function unCapitalize(str2) {
    return str2.charAt(0).toLowerCase() + str2.slice(1);
  }
  function createToken2(config) {
    return createToken(config);
  }
  var traqulaIndentation = "When you use this string, you expect traqula to handle indentation after every newline";

  // node_modules/@traqula/core/dist/esm/lib/lexer-builder/LexerBuilder.js
  var LexerBuilder = class _LexerBuilder {
    tokens;
    /**
     * Create a new LexerBuilder, optionally copying from an existing one.
     * @param starter - An existing builder to copy tokens from. If omitted, starts empty.
     */
    static create(starter) {
      return new _LexerBuilder(starter);
    }
    constructor(starter) {
      this.tokens = starter?.tokens ? [...starter.tokens] : [];
    }
    /**
     * Merge tokens from another LexerBuilder into this one.
     * Duplicate tokens (by reference) are skipped. Different tokens with the same name
     * cause an error unless an override is provided.
     * @param merge - The other builder whose tokens to merge.
     * @param overwrite - Tokens that take precedence when names conflict.
     */
    merge(merge, overwrite = []) {
      const extraTokens = merge.tokens.filter((token) => {
        const overwriteToken = overwrite.find((t) => t.name === token.name);
        if (overwriteToken) {
          return false;
        }
        const match = this.tokens.find((t) => t.name === token.name);
        if (match) {
          if (match !== token) {
            throw new Error(`Token with name ${token.name} already exists. Implementation is different and no overwrite was provided.`);
          }
          return false;
        }
        return true;
      });
      this.tokens.push(...extraTokens);
      return this;
    }
    /**
     * Append tokens to the end of the builder's token list.
     * TypeScript errors if a token name already exists.
     * @param token - One or more tokens to add.
     */
    add(...token) {
      this.tokens.push(...token);
      return this;
    }
    /**
     * Insert tokens before a specified reference token in the ordering.
     * @param before - The existing token to insert before.
     * @param token - One or more tokens to insert.
     */
    addBefore(before, ...token) {
      const index = this.tokens.indexOf(before);
      if (index === -1) {
        throw new Error("Token not found");
      }
      this.tokens.splice(index, 0, ...token);
      return this;
    }
    moveBeforeOrAfter(beforeOrAfter, before, ...tokens) {
      const beforeIndex = this.tokens.indexOf(before) + (beforeOrAfter === "before" ? 0 : 1);
      if (beforeIndex === -1) {
        throw new Error("BeforeToken not found");
      }
      for (const token of tokens) {
        const tokenIndex = this.tokens.indexOf(token);
        if (tokenIndex === -1) {
          throw new Error("Token not found");
        }
        this.tokens.splice(tokenIndex, 1);
        this.tokens.splice(beforeIndex, 0, token);
      }
      return this;
    }
    /**
     * Move existing tokens so they appear before a specified reference token.
     * The tokens must already exist in the builder.
     * @param before - The reference token to move before.
     * @param tokens - The tokens to reposition.
     */
    moveBefore(before, ...tokens) {
      return this.moveBeforeOrAfter("before", before, ...tokens);
    }
    /**
     * Move existing tokens so they appear after a specified reference token.
     * The tokens must already exist in the builder.
     * @param after - The reference token to move after.
     * @param tokens - The tokens to reposition.
     */
    moveAfter(after, ...tokens) {
      return this.moveBeforeOrAfter("after", after, ...tokens);
    }
    /**
     * Insert tokens after a specified reference token in the ordering.
     * @param after - The existing token to insert after.
     * @param token - One or more tokens to insert.
     */
    addAfter(after, ...token) {
      const index = this.tokens.indexOf(after);
      if (index === -1) {
        throw new Error("Token not found");
      }
      this.tokens.splice(index + 1, 0, ...token);
      return this;
    }
    /**
     * Remove tokens from the builder by reference.
     * @param token - One or more tokens to remove. Throws if a token is not found.
     * @deprecated use deleteName instead. (This function will be removed in next major)
     *    It does not work under replaced tokens.
     */
    delete(...token) {
      for (const t of token) {
        const index = this.tokens.indexOf(t);
        if (index === -1) {
          throw new Error("Token not found");
        }
        this.tokens.splice(index, 1);
      }
      return this;
    }
    /**
     * Delete a token based on its name.
     */
    deleteToken(...names) {
      for (const name of names) {
        const index = this.tokens.findIndex((x) => x.name === name);
        if (index === -1) {
          throw new Error(`Token with name "${name}" not found`);
        }
        this.tokens.splice(index, 1);
      }
      return this;
    }
    /**
     * Replace token with the same name with a new one.
     * @param token
     */
    replace(token) {
      const index = this.tokens.findIndex((x) => x.name === token.name);
      if (index === -1) {
        throw new Error(`Token with name "${token.name}" not found`);
      }
      this.tokens[index] = token;
      return this;
    }
    /**
     * Construct a Chevrotain {@link Lexer} from the current token ordering.
     * @param lexerConfig - Optional Chevrotain lexer configuration overrides.
     */
    build(lexerConfig) {
      return new Lexer(this.tokens, {
        positionTracking: "onlyStart",
        recoveryEnabled: false,
        ensureOptimizations: true,
        // SafeMode: true,
        // SkipValidations: true,
        ...lexerConfig
      });
    }
    /**
     * Get the current token list (readonly).
     * Useful for passing to {@link ParserBuilder.build} as the `tokenVocabulary` argument.
     */
    get tokenVocabulary() {
      return this.tokens;
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/parser-builder/dynamicParser.js
  var DynamicParser = class extends EmbeddedActionsParser {
    context;
    setContext(context) {
      this.context = context;
    }
    constructor(rules5, tokenVocabulary, config = {}) {
      super(tokenVocabulary, {
        // RecoveryEnabled: true,
        maxLookahead: 1,
        skipValidations: true,
        dynamicTokensEnabled: false,
        ...config
      });
      this.context = void 0;
      const selfRef = this.constructSelfRef();
      const implArgs = {
        ...selfRef,
        cache: /* @__PURE__ */ new WeakMap()
      };
      for (const rule of Object.values(rules5)) {
        this[rule.name] = this.RULE(rule.name, rule.impl(implArgs));
      }
      this.performSelfAnalysis();
    }
    constructSelfRef() {
      const subRuleImpl = (chevrotainSubrule) => ((cstDef, ...arg) => chevrotainSubrule(this[cstDef.name], { ARGS: [this.context, ...arg] }));
      return {
        CONSUME: (tokenType, option) => this.CONSUME(tokenType, option),
        CONSUME1: (tokenType, option) => this.CONSUME1(tokenType, option),
        CONSUME2: (tokenType, option) => this.CONSUME2(tokenType, option),
        CONSUME3: (tokenType, option) => this.CONSUME3(tokenType, option),
        CONSUME4: (tokenType, option) => this.CONSUME4(tokenType, option),
        CONSUME5: (tokenType, option) => this.CONSUME5(tokenType, option),
        CONSUME6: (tokenType, option) => this.CONSUME6(tokenType, option),
        CONSUME7: (tokenType, option) => this.CONSUME7(tokenType, option),
        CONSUME8: (tokenType, option) => this.CONSUME8(tokenType, option),
        CONSUME9: (tokenType, option) => this.CONSUME9(tokenType, option),
        OPTION: (actionORMethodDef) => this.OPTION(actionORMethodDef),
        OPTION1: (actionORMethodDef) => this.OPTION1(actionORMethodDef),
        OPTION2: (actionORMethodDef) => this.OPTION2(actionORMethodDef),
        OPTION3: (actionORMethodDef) => this.OPTION3(actionORMethodDef),
        OPTION4: (actionORMethodDef) => this.OPTION4(actionORMethodDef),
        OPTION5: (actionORMethodDef) => this.OPTION5(actionORMethodDef),
        OPTION6: (actionORMethodDef) => this.OPTION6(actionORMethodDef),
        OPTION7: (actionORMethodDef) => this.OPTION7(actionORMethodDef),
        OPTION8: (actionORMethodDef) => this.OPTION8(actionORMethodDef),
        OPTION9: (actionORMethodDef) => this.OPTION9(actionORMethodDef),
        OR: (altsOrOpts) => this.OR(altsOrOpts),
        OR1: (altsOrOpts) => this.OR1(altsOrOpts),
        OR2: (altsOrOpts) => this.OR2(altsOrOpts),
        OR3: (altsOrOpts) => this.OR3(altsOrOpts),
        OR4: (altsOrOpts) => this.OR4(altsOrOpts),
        OR5: (altsOrOpts) => this.OR5(altsOrOpts),
        OR6: (altsOrOpts) => this.OR6(altsOrOpts),
        OR7: (altsOrOpts) => this.OR7(altsOrOpts),
        OR8: (altsOrOpts) => this.OR8(altsOrOpts),
        OR9: (altsOrOpts) => this.OR9(altsOrOpts),
        MANY: (actionORMethodDef) => this.MANY(actionORMethodDef),
        MANY1: (actionORMethodDef) => this.MANY1(actionORMethodDef),
        MANY2: (actionORMethodDef) => this.MANY2(actionORMethodDef),
        MANY3: (actionORMethodDef) => this.MANY3(actionORMethodDef),
        MANY4: (actionORMethodDef) => this.MANY4(actionORMethodDef),
        MANY5: (actionORMethodDef) => this.MANY5(actionORMethodDef),
        MANY6: (actionORMethodDef) => this.MANY6(actionORMethodDef),
        MANY7: (actionORMethodDef) => this.MANY7(actionORMethodDef),
        MANY8: (actionORMethodDef) => this.MANY8(actionORMethodDef),
        MANY9: (actionORMethodDef) => this.MANY9(actionORMethodDef),
        MANY_SEP: (options) => this.MANY_SEP(options),
        MANY_SEP1: (options) => this.MANY_SEP1(options),
        MANY_SEP2: (options) => this.MANY_SEP2(options),
        MANY_SEP3: (options) => this.MANY_SEP3(options),
        MANY_SEP4: (options) => this.MANY_SEP4(options),
        MANY_SEP5: (options) => this.MANY_SEP5(options),
        MANY_SEP6: (options) => this.MANY_SEP6(options),
        MANY_SEP7: (options) => this.MANY_SEP7(options),
        MANY_SEP8: (options) => this.MANY_SEP8(options),
        MANY_SEP9: (options) => this.MANY_SEP9(options),
        AT_LEAST_ONE: (actionORMethodDef) => this.AT_LEAST_ONE(actionORMethodDef),
        AT_LEAST_ONE1: (actionORMethodDef) => this.AT_LEAST_ONE1(actionORMethodDef),
        AT_LEAST_ONE2: (actionORMethodDef) => this.AT_LEAST_ONE2(actionORMethodDef),
        AT_LEAST_ONE3: (actionORMethodDef) => this.AT_LEAST_ONE3(actionORMethodDef),
        AT_LEAST_ONE4: (actionORMethodDef) => this.AT_LEAST_ONE4(actionORMethodDef),
        AT_LEAST_ONE5: (actionORMethodDef) => this.AT_LEAST_ONE5(actionORMethodDef),
        AT_LEAST_ONE6: (actionORMethodDef) => this.AT_LEAST_ONE6(actionORMethodDef),
        AT_LEAST_ONE7: (actionORMethodDef) => this.AT_LEAST_ONE7(actionORMethodDef),
        AT_LEAST_ONE8: (actionORMethodDef) => this.AT_LEAST_ONE8(actionORMethodDef),
        AT_LEAST_ONE9: (actionORMethodDef) => this.AT_LEAST_ONE9(actionORMethodDef),
        AT_LEAST_ONE_SEP: (options) => this.AT_LEAST_ONE_SEP(options),
        AT_LEAST_ONE_SEP1: (options) => this.AT_LEAST_ONE_SEP1(options),
        AT_LEAST_ONE_SEP2: (options) => this.AT_LEAST_ONE_SEP2(options),
        AT_LEAST_ONE_SEP3: (options) => this.AT_LEAST_ONE_SEP3(options),
        AT_LEAST_ONE_SEP4: (options) => this.AT_LEAST_ONE_SEP4(options),
        AT_LEAST_ONE_SEP5: (options) => this.AT_LEAST_ONE_SEP5(options),
        AT_LEAST_ONE_SEP6: (options) => this.AT_LEAST_ONE_SEP6(options),
        AT_LEAST_ONE_SEP7: (options) => this.AT_LEAST_ONE_SEP7(options),
        AT_LEAST_ONE_SEP8: (options) => this.AT_LEAST_ONE_SEP8(options),
        AT_LEAST_ONE_SEP9: (options) => this.AT_LEAST_ONE_SEP9(options),
        ACTION: (func) => this.ACTION(func),
        BACKTRACK: (cstDef, ...args) => this.BACKTRACK(this[cstDef.name], { ARGS: args }),
        SUBRULE: subRuleImpl((rule, args) => this.SUBRULE(rule, args)),
        SUBRULE1: subRuleImpl((rule, args) => this.SUBRULE1(rule, args)),
        SUBRULE2: subRuleImpl((rule, args) => this.SUBRULE2(rule, args)),
        SUBRULE3: subRuleImpl((rule, args) => this.SUBRULE3(rule, args)),
        SUBRULE4: subRuleImpl((rule, args) => this.SUBRULE4(rule, args)),
        SUBRULE5: subRuleImpl((rule, args) => this.SUBRULE5(rule, args)),
        SUBRULE6: subRuleImpl((rule, args) => this.SUBRULE6(rule, args)),
        SUBRULE7: subRuleImpl((rule, args) => this.SUBRULE7(rule, args)),
        SUBRULE8: subRuleImpl((rule, args) => this.SUBRULE8(rule, args)),
        SUBRULE9: subRuleImpl((rule, args) => this.SUBRULE9(rule, args))
      };
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/parser-builder/parserBuilder.js
  function listToRuleDefMap(rules5) {
    const newRules = /* @__PURE__ */ Object.create(null);
    for (const rule of rules5) {
      newRules[rule.name] = rule;
    }
    return newRules;
  }
  var ParserBuilder = class _ParserBuilder {
    /**
     * Create a builder from some initial grammar rules or an existing builder.
     * If a builder is provided, a new copy will be created.
     */
    static create(start) {
      if (Array.isArray(start)) {
        return new _ParserBuilder(listToRuleDefMap(start));
      }
      return new _ParserBuilder({ ...start.rules });
    }
    rules;
    constructor(startRules) {
      this.rules = startRules;
    }
    /**
     * Narrow the builder's context type parameter to a more specific subtype.
     * This is a zero-cost type-level operation — the builder instance is returned as-is
     * but with updated type parameters.
     */
    widenContext() {
      return this;
    }
    /**
     * Update the type signatures (return types and/or parameter types) of existing rules
     * without changing their implementations. Use this when a patched rule changes the types
     * flowing through downstream rules that don't need new implementations.
     * This is a zero-cost type-level operation.
     */
    typePatch() {
      return this;
    }
    /**
     * Change the implementation of an existing grammar rule.
     */
    patchRule(patch) {
      const self2 = this;
      self2.rules[patch.name] = patch;
      return self2;
    }
    /**
     * Add a rule to the grammar. If the rule already exists, but the implementation differs, an error will be thrown.
     */
    addRuleRedundant(rule) {
      const self2 = this;
      const rules5 = self2.rules;
      if (rules5[rule.name] !== void 0 && rules5[rule.name] !== rule) {
        throw new Error(`Rule ${rule.name} already exists in the builder`);
      }
      rules5[rule.name] = rule;
      return self2;
    }
    /**
     * Add a rule to the grammar. Will raise a typescript error if the rule already exists in the grammar.
     */
    addRule(rule) {
      return this.addRuleRedundant(rule);
    }
    /**
     * Add multiple rules at once using rest parameters.
     * Provides better TypeScript type inference than calling {@link addRule} in a loop,
     * but avoid passing too many rules at once as this can cause TypeScript compilation slowdowns.
     * TypeScript errors if any rule name conflicts with an existing one.
     */
    addMany(...rules5) {
      this.rules = { ...this.rules, ...listToRuleDefMap(rules5) };
      return this;
    }
    /**
     * Delete a grammar rule by its name.
     */
    deleteRule(ruleName) {
      delete this.rules[ruleName];
      return this;
    }
    /**
     * Delete multiple rules by name in a single call.
     * @param ruleNames - Names of the rules to delete.
     */
    deleteMany(...ruleNames) {
      for (const ruleName of ruleNames) {
        delete this.rules[ruleName];
      }
      return this;
    }
    /**
     * Retrieve a grammar rule definition by its name.
     * Useful for inspecting or wrapping existing rules when extending a parser.
     * @param ruleName - The name of the rule, type-checked against the builder's known rule names.
     */
    getRule(ruleName) {
      return this.rules[ruleName];
    }
    /**
     * Merge this grammar builder with another.
     * It is best to merge the bigger grammar with the smaller one.
     * If the two builders both have a grammar rule with the same name,
     * no error will be thrown case they map to the same ruledef object.
     * If they map to a different object, an error will be thrown.
     * To fix this problem, the overridingRules array should contain a rule with the same conflicting name,
     * this rule implementation will be used.
     */
    merge(builder, overridingRules) {
      const otherRules = Object.assign(/* @__PURE__ */ Object.create(null), builder.rules);
      const myRules = this.rules;
      for (const rule of Object.values(myRules)) {
        if (otherRules[rule.name] === void 0) {
          otherRules[rule.name] = rule;
        } else {
          const existingRule = otherRules[rule.name];
          if (existingRule !== rule) {
            const override = overridingRules.find((x) => x.name === rule.name);
            if (override) {
              otherRules[rule.name] = override;
            } else {
              throw new Error(`Rule with name "${rule.name}" already exists in the builder, specify an override to resolve conflict`);
            }
          }
        }
      }
      this.rules = otherRules;
      return this;
    }
    defaultErrorHandler(input, errors) {
      const firstError = errors[0];
      const messageBuilder = ["Parse error"];
      const lineIdx = firstError.token.startLine;
      if (lineIdx !== void 0 && !Number.isNaN(lineIdx)) {
        const errorLine = input.split("\n")[lineIdx - 1];
        messageBuilder.push(` on line ${lineIdx}
${errorLine}`);
        const columnIdx = firstError.token.startColumn;
        if (columnIdx !== void 0) {
          messageBuilder.push(`
${"-".repeat(columnIdx - 1)}^`);
        }
      }
      messageBuilder.push(`
${firstError.message}`);
      throw new Error(messageBuilder.join(""));
    }
    /**
     * Construct a self-sufficient parser from the registered rules and token vocabulary.
     * Building a parser is expensive (Chevrotain performs grammar recording), so the result
     * should be reused across parse calls.
     * @returns An object with a method for each registered rule name.
     */
    build({ tokenVocabulary, parserConfig = {}, lexerConfig = {}, queryPreProcessor = (s) => s, errorHandler }) {
      const lexer = LexerBuilder.create().add(...tokenVocabulary).build({
        positionTracking: "onlyOffset",
        recoveryEnabled: false,
        ensureOptimizations: true,
        safeMode: false,
        skipValidations: true,
        ...lexerConfig
      });
      const parser = this.consume({
        tokenVocabulary,
        config: parserConfig
      });
      const selfSufficientParser = {};
      for (const rule of Object.values(this.rules)) {
        selfSufficientParser[rule.name] = ((input, context, ...args) => {
          const processedInput = queryPreProcessor(input);
          const lexResult = lexer.tokenize(processedInput);
          if (lexResult.errors.length > 0) {
            throw new Error(lexResult.errors[0].message);
          }
          parser.input = lexResult.tokens;
          parser.setContext(context);
          const result = parser[rule.name](context, ...args);
          if (parser.errors.length > 0) {
            if (errorHandler) {
              errorHandler(parser.errors);
            } else {
              this.defaultErrorHandler(processedInput, parser.errors);
            }
          }
          return result;
        });
      }
      return selfSufficientParser;
    }
    consume({ tokenVocabulary, config = {} }) {
      return new DynamicParser(this.rules, tokenVocabulary, config);
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/transformers/TransformerObject.js
  var TransformerObject = class _TransformerObject {
    defaultContext;
    maxStackSize = 1e6;
    /**
     * The number of times {@link transformObjectPreOrder} may hand the same position in the tree back to the
     * traversal - by remapping it, or by wrapping it in an array - before we assume the rules do not converge.
     */
    maxNodeRewrites = 1e3;
    /**
     * Creates stateless transformer.
     * @param defaultContext
     */
    constructor(defaultContext = {}) {
      this.defaultContext = defaultContext;
    }
    clone(newDefaultContext = {}) {
      return new _TransformerObject({ ...this.defaultContext, ...newDefaultContext });
    }
    /**
     * Function to shallow clone any type.
     * @param obj
     * @protected
     */
    cloneObj(obj) {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      const proto = Object.getPrototypeOf(obj);
      if (proto === Object.prototype || proto === null) {
        return { ...obj };
      }
      return Object.assign(Object.create(proto), obj);
    }
    /**
     * Recursively transforms all objects that are not arrays. Mapper is called on deeper objects first.
     * @param startObject object to start iterating from
     * @param postMapper postMapper to transform the various objects - argument is a copy of the original
     * @param preVisitor callback that is evaluated before iterating deeper.
     *   If continues is false, we do not iterate deeper, current object is still mapped. - default: true
     *   If shortcut is true, we do not iterate deeper, nor do we branch out, this postMapper will be the last one called.
     *    - Default false
     */
    transformObject(startObject, postMapper, preVisitor = () => ({})) {
      const defaults2 = this.defaultContext;
      const defaultCopyFlag = defaults2.copy ?? true;
      const defaultContinues = defaults2.continue ?? true;
      const defaultIgnoreKeys = defaults2.ignoreKeys;
      const defaultShallowKeys = defaults2.shallowKeys;
      const defaultDidShortCut = defaults2.shortcut ?? false;
      let didShortCut = false;
      const resultWrap = { res: startObject };
      const stack = [startObject];
      const stackParent = [resultWrap];
      const stackParentKey = ["res"];
      const handleMapperOnLen = [];
      const mapperCopyStack = [];
      const mapperOrigStack = [];
      const mapperParent = [];
      const mapperParentKey = [];
      function handleMapper() {
        while (stack.length === handleMapperOnLen.at(-1)) {
          handleMapperOnLen.pop();
          const copyToMap = mapperCopyStack.pop();
          const origToMap = mapperOrigStack.pop();
          const parent = mapperParent.pop();
          const parentKey = mapperParentKey.pop();
          parent[parentKey] = postMapper(copyToMap, origToMap);
        }
      }
      while (stack.length > 0 && stack.length < this.maxStackSize) {
        const curObject = stack.pop();
        const curParent = stackParent.pop();
        const curKey = stackParentKey.pop();
        if (!didShortCut) {
          if (Array.isArray(curObject)) {
            const newArr = [...curObject];
            handleMapperOnLen.push(stack.length);
            mapperCopyStack.push(newArr);
            mapperOrigStack.push(curObject);
            mapperParent.push(curParent);
            mapperParentKey.push(curKey);
            for (let index = curObject.length - 1; index >= 0; index--) {
              const val = curObject[index];
              if (val !== null && typeof val === "object") {
                stack.push(val);
                stackParent.push(newArr);
                stackParentKey.push(index.toString());
              }
            }
            handleMapper();
            continue;
          }
          const context = preVisitor(curObject);
          const copyFlag = context.copy ?? defaultCopyFlag;
          const continues = context.continue ?? defaultContinues;
          const ignoreKeys = context.ignoreKeys ?? defaultIgnoreKeys;
          const shallowKeys = context.shallowKeys ?? defaultShallowKeys;
          didShortCut = context.shortcut ?? defaultDidShortCut;
          const copy3 = copyFlag ? this.cloneObj(curObject) : curObject;
          handleMapperOnLen.push(stack.length);
          mapperCopyStack.push(copy3);
          mapperOrigStack.push(curObject);
          mapperParent.push(curParent);
          mapperParentKey.push(curKey);
          if (continues && !didShortCut) {
            for (const key in copy3) {
              if (!Object.hasOwn(copy3, key)) {
                continue;
              }
              const val = copy3[key];
              const onlyShallow = shallowKeys && shallowKeys?.has(key);
              if (onlyShallow) {
                copy3[key] = this.cloneObj(val);
              }
              if (ignoreKeys && ignoreKeys.has(key)) {
                continue;
              }
              if (!onlyShallow && val !== null && typeof val === "object") {
                stack.push(val);
                stackParentKey.push(key);
                stackParent.push(copy3);
              }
            }
          }
        }
        handleMapper();
      }
      if (stack.length >= this.maxStackSize) {
        throw new Error("Transform object stack overflowed");
      }
      handleMapper();
      return resultWrap.res;
    }
    /**
     * Recursively transforms all objects that are not arrays, calling the preMapper on an object _before_
     * iterating into its descendants, and iterating into the *result* of that preMapper.
     * It should be noted that the preMapper is called using a *shallow* copy of the object.
     * Meaning manipulation of nested objects changes the original!
     * @param startObject object to start iterating from
     * @param preMapper mapper to transform the various objects -
     *   first argument is a copy of the original if default setup says to copy.
     *   It returns a {@link PreOrderMappingReturn}: the value taking the place of the object - the value we
     *   iterate into - together with the {@link TransformContext} steering that iteration. Since the mapper
     *   is the one deciding what the descendants of that value are, it hands us that context itself, there is
     *   no separate preVisitor. Whether we copy is therefore not up to the mapper either,
     *   the default context of this transformer decides that.
     *   The returned value is only handed back to the traversal - and thus mapped again - when the mapper
     *   asked for {@link TransformContext.reTransform}, in any other case we iterate straight into its
     *   descendants. An array is the exception: it is never mapped as a whole, its elements are handed back
     *   and mapped in turn. Either way the rules have to settle a position within {@link maxNodeRewrites}
     *   hand-backs of that position, or we assume they do not converge and throw.
     *   A {@link VisitContext.shortcut} simply ends the traversal - since an object is already mapped when we
     *   iterate into it, there is nothing left to unwind - leaving the objects still on the stack in the place
     *   they have in the (shallow) copy of their parent.
     */
    transformObjectPreOrder(startObject, preMapper) {
      const defaults2 = this.defaultContext;
      const defaultCopyFlag = defaults2.copy ?? true;
      const defaultContinues = defaults2.continue ?? true;
      const defaultIgnoreKeys = defaults2.ignoreKeys;
      const defaultShallowKeys = defaults2.shallowKeys;
      const defaultDidShortCut = defaults2.shortcut ?? false;
      const defaultReTransform = defaults2.reTransform ?? false;
      let didShortCut = false;
      const resultWrap = { res: startObject };
      const stack = [startObject];
      const stackParent = [resultWrap];
      const stackParentKey = ["res"];
      const stackRewriteCount = [0];
      function pushArrayOnStack(array, rewriteCount) {
        for (let index = array.length - 1; index >= 0; index--) {
          const val = array[index];
          if (val !== null && typeof val === "object") {
            stack.push(val);
            stackParent.push(array);
            stackParentKey.push(index.toString());
            stackRewriteCount.push(rewriteCount);
          }
        }
      }
      while (!didShortCut && stack.length > 0 && stack.length < this.maxStackSize) {
        const curObject = stack.pop();
        const curParent = stackParent.pop();
        const curKey = stackParentKey.pop();
        const rewriteCount = stackRewriteCount.pop();
        if (rewriteCount >= this.maxNodeRewrites) {
          throw new Error(`Pre order transform did not converge: rewrote the same position ${this.maxNodeRewrites} times.`, { cause: curObject });
        }
        if (Array.isArray(curObject)) {
          const newArr = [...curObject];
          curParent[curKey] = newArr;
          pushArrayOnStack(newArr, rewriteCount);
          continue;
        }
        const copy3 = defaultCopyFlag ? this.cloneObj(curObject) : curObject;
        const mapperResult = preMapper(copy3, curObject);
        const newValue = mapperResult.newValue;
        curParent[curKey] = newValue;
        const continues = mapperResult.continue ?? defaultContinues;
        const ignoreKeys = mapperResult.ignoreKeys ?? defaultIgnoreKeys;
        const shallowKeys = mapperResult.shallowKeys ?? defaultShallowKeys;
        const reTransform = mapperResult.reTransform ?? defaultReTransform;
        didShortCut = mapperResult.shortcut ?? defaultDidShortCut;
        if (!continues || didShortCut || (newValue === null || typeof newValue !== "object")) {
          continue;
        }
        if (Array.isArray(newValue)) {
          pushArrayOnStack(newValue, rewriteCount + 1);
          continue;
        }
        if (reTransform) {
          stack.push(newValue);
          stackParent.push(curParent);
          stackParentKey.push(curKey);
          stackRewriteCount.push(rewriteCount + 1);
          continue;
        }
        const newAsRecord = newValue;
        for (const key in newAsRecord) {
          if (!Object.hasOwn(newAsRecord, key) || ignoreKeys?.has(key)) {
            continue;
          }
          const val = newAsRecord[key];
          if (val !== null && typeof val === "object") {
            if (shallowKeys?.has(key)) {
              newAsRecord[key] = this.cloneObj(val);
            } else {
              stack.push(val);
              stackParent.push(newAsRecord);
              stackParentKey.push(key);
              stackRewriteCount.push(0);
            }
          }
        }
      }
      if (stack.length >= this.maxStackSize) {
        throw new Error("Transform object stack overflowed");
      }
      return resultWrap.res;
    }
    /**
     * Visitor that visits all objects. Visits deeper objects first.
     */
    visitObject(startObject, visitor, preVisitor = () => ({})) {
      const defaults2 = this.defaultContext;
      const defaultContinues = defaults2.continue ?? true;
      const defaultIgnoreKeys = defaults2.ignoreKeys;
      const defaultShortcut = defaults2.shortcut ?? false;
      let didShortCut = false;
      const stack = [startObject];
      const handleVisitorOnLen = [];
      const visitorStack = [];
      function handleVisitor() {
        while (stack.length === handleVisitorOnLen.at(-1)) {
          handleVisitorOnLen.pop();
          const toVisit = visitorStack.pop();
          visitor(toVisit);
        }
      }
      while (stack.length > 0 && stack.length < this.maxStackSize) {
        const curObject = stack.pop();
        if (!didShortCut) {
          if (Array.isArray(curObject)) {
            for (let i = curObject.length - 1; i >= 0; i--) {
              const val = curObject[i];
              if (val !== null && typeof val === "object") {
                stack.push(val);
              }
            }
            handleVisitor();
            continue;
          }
          const context = preVisitor(curObject);
          didShortCut = context.shortcut ?? defaultShortcut;
          const continues = context.continue ?? defaultContinues;
          const ignoreKeys = context.ignoreKeys ?? defaultIgnoreKeys;
          handleVisitorOnLen.push(stack.length);
          visitorStack.push(curObject);
          if (continues && !didShortCut) {
            for (const key in curObject) {
              if (!Object.hasOwn(curObject, key)) {
                continue;
              }
              if (ignoreKeys && ignoreKeys.has(key)) {
                continue;
              }
              const val = curObject[key];
              if (val && typeof val === "object") {
                stack.push(val);
              }
            }
          }
        }
        handleVisitor();
      }
      if (stack.length >= this.maxStackSize) {
        throw new Error("Transform object stack overflowed");
      }
      handleVisitor();
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/transformers/TransformerTyped.js
  var TransformerTyped = class _TransformerTyped extends TransformerObject {
    defaultNodePreVisitor;
    constructor(defaultContext = {}, defaultNodePreVisitor = {}) {
      super(defaultContext);
      this.defaultNodePreVisitor = defaultNodePreVisitor;
    }
    clone(newDefaultContext = {}, newDefaultNodePreVisitor = {}) {
      return new _TransformerTyped({ ...this.defaultContext, ...newDefaultContext }, { ...this.defaultNodePreVisitor, ...newDefaultNodePreVisitor });
    }
    /**
     * Transform a single node ({@link Typed}).
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various node types to objects optionally
     *    containing preVisitor and transformer.
     *    The preVisitor allows you to provide {@link TransformContext} for the current object,
     *    altering how it will be transformed.
     *    The transformer allows you to manipulate the copy of the current object,
     *    and expects you to return the value that should take the current objects place.
     * @return the result of transforming the requested descendant operations (based on the preVisitor)
     * using a transformer that works its way back up from the descendant to the startObject.
     */
    transformNode(startObject, nodeCallBacks) {
      const transformWrapper = (copy3, orig) => {
        let ogTransform;
        const casted = copy3;
        if (casted.type) {
          ogTransform = nodeCallBacks[casted.type]?.transform;
        }
        return ogTransform ? ogTransform(casted, orig) : copy3;
      };
      const nodeDefaults = this.defaultNodePreVisitor;
      const preVisitWrapper = (curObject) => {
        let ogPreVisit;
        let nodeContext = {};
        const casted = curObject;
        if (casted.type) {
          ogPreVisit = nodeCallBacks[casted.type]?.preVisitor;
          nodeContext = nodeDefaults[casted.type] ?? nodeContext;
        }
        return ogPreVisit ? { ...nodeContext, ...ogPreVisit(casted) } : nodeContext;
      };
      return this.transformObject(startObject, transformWrapper, preVisitWrapper);
    }
    /**
     * Transform a single node ({@link Typed}) pre-order,
     * the dual of {@link this.transformObjectPreOrder} with the same type specification as {@link this.transformNode}:
     * a node is transformed _before_ its descendants, and we iterate into the result of that transformation.
     * This is what you want when a node has to travel deeper into the tree:
     * the callback only describes how a node swaps places with the node right below it,
     * the copy it sank into is dispatched in turn, and swaps places with the node below that one.
     *
     * Contrary to {@link this.transformNode}, a callback does not just return the value taking the place of
     * the node, it returns a {@link PreOrderMappingReturn}: that value, plus the {@link TransformContext} of
     * that value. Since the callback decides what we iterate into, it is the one telling us how to iterate
     * into it, so there is no separate preVisitor - it only completes the per type defaults of this
     * transformer, which are looked up using the type of the node it was called on.
     * A node without a callback is left alone: it keeps those defaults, but is never re-transformed.
     *
     * Also contrary to {@link this.transformNode}, the descendants of the node given to the callback are not
     * transformed yet: they are the nodes of the input tree itself.
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various node types to a mapper.
     *    The mapper allows you to manipulate the copy of the current node, and expects you to return the
     *    value that should take the current nodes place, together with the context of that value.
     *    That context steers how we iterate into the returned value.
     * @return the result of transforming the startObject and the descendants of its rewrites.
     */
    transformNodePreOrder(startObject, nodeCallBacks) {
      const nodeDefaults = this.defaultNodePreVisitor;
      const preTransformWrapper = (copy3, orig) => {
        let ogPreTransform;
        let nodeContext = {};
        const casted = copy3;
        if (casted.type) {
          ogPreTransform = nodeCallBacks[casted.type];
          nodeContext = nodeDefaults[casted.type] ?? nodeContext;
        }
        return ogPreTransform ? { ...nodeContext, ...ogPreTransform(copy3, orig) } : { ...nodeContext, newValue: copy3, reTransform: false };
      };
      return this.transformObjectPreOrder(startObject, preTransformWrapper);
    }
    /**
     * Visit a selected subTree given a startObject, steering the visits based on {@link Typed} nodes.
     * Will first call the preVisitor on the project and notice it should not iterate on its descendants.
     * It then visits the project, and the outermost distinct, printing '21'.
     * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
     * @param startObject the object from which we will start visiting,
     *   potentially visiting its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and visitor.
     *    The preVisitor allows you to provide {@link VisitContext} for the current object,
     *    altering how it will be visited.
     *    The visitor allows you to visit the object from deepest to the outermost object.
     *    This is useful if you for example want to manipulate the objects you visit during your visits,
     *    similar to {@link this.transformNode}.
     */
    visitNode(startObject, nodeCallBacks) {
      const visitorWrapper = (curObject) => {
        const casted = curObject;
        if (casted.type) {
          const ogTransform = nodeCallBacks[casted.type]?.visitor;
          if (ogTransform) {
            ogTransform(casted);
          }
        }
      };
      const nodeDefaults = this.defaultNodePreVisitor;
      const preVisitWrapper = (curObject) => {
        let ogPreVisit;
        let nodeContext = {};
        const casted = curObject;
        if (casted.type) {
          ogPreVisit = nodeCallBacks[casted.type]?.preVisitor;
          nodeContext = nodeDefaults[casted.type] ?? nodeContext;
        }
        return ogPreVisit ? { ...nodeContext, ...ogPreVisit(casted) } : nodeContext;
      };
      return this.visitObject(startObject, visitorWrapper, preVisitWrapper);
    }
  };

  // node_modules/@traqula/core/dist/esm/lib/transformers/TransformerSubTyped.js
  var TransformerSubTyped = class _TransformerSubTyped extends TransformerTyped {
    // TODO(major): these functions here should care about the default pre visitor provided to the constructor!
    constructor(defaultContext = {}, defaultNodePreVisitor = {}) {
      super(defaultContext, defaultNodePreVisitor);
    }
    clone(newDefaultContext = {}, newDefaultNodePreVisitor = {}) {
      return new _TransformerSubTyped({ ...this.defaultContext, ...newDefaultContext }, { ...this.defaultNodePreVisitor, ...newDefaultNodePreVisitor });
    }
    /**
     * Transform a single node ({@link Typed}).
     * Similar to {@link this.transformNode} but also allowing you to target the subTypes.
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and transformer.
     *    The preVisitor allows you to provide {@link TransformContext} for the current object,
     *    altering how it will be transformed.
     *    The transformer allows you to manipulate the copy of the current object,
     *    and expects you to return the value that should take the current objects place.
     * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
     *     indicate the subType.
     * @return the result of transforming the requested descendant operations (based on the preVisitor)
     * using a transformer that works its way back up from the descendant to the startObject.
     */
    transformNodeSpecific(startObject, nodeCallBacks, nodeSpecificCallBacks) {
      const transformWrapper = (copy3, orig) => {
        let ogTransform;
        const casted = copy3;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogTransform = specific[casted.subType]?.transform;
          }
          if (!ogTransform) {
            ogTransform = nodeCallBacks[casted.type]?.transform;
          }
        }
        return ogTransform ? ogTransform(casted, orig) : copy3;
      };
      const preVisitWrapper = (curObject) => {
        let ogPreVisit;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogPreVisit = specific[casted.subType]?.preVisitor;
          }
          if (!ogPreVisit) {
            ogPreVisit = nodeCallBacks[casted.type]?.preVisitor;
          }
        }
        return ogPreVisit ? ogPreVisit(casted) : {};
      };
      return this.transformObject(startObject, transformWrapper, preVisitWrapper);
    }
    /**
     * Transform a single node pre-order,
     * the dual of {@link this.transformObjectPreOrder} with the same type specification
     * as {@link this.transformNodeSpecific}:
     * Similar to {@link TransformerTyped.transformNodePreOrder}, but also allowing you to target the subTypes:
     * the node is transformed _before_ its descendants, and we iterate into the result of that transformation,
     * making it the tool of choice for nodes that have to travel deeper into the tree, like a filter pushdown.
     *
     * Contrary to {@link this.transformNodeSpecific}, a callback does not just return the value taking the
     * place of the node, it returns a {@link PreOrderMappingReturn}: that value, plus the
     * {@link TransformContext} of that value, so there is no separate preVisitor.
     * Also contrary to {@link this.transformNodeSpecific}, the descendants of the node given to the callback
     * are not transformed yet: they are the nodes of the input tree itself.
     * @param startObject the object from which we will start the transformation,
     *   potentially visiting and transforming its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various node types to a mapper.
     *    The mapper allows you to manipulate the copy of the current node, and expects you to return the
     *    value that should take the current nodes place, together with the context of that value.
     *    That context steers how we iterate into the returned value.
     * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
     *     indicate the subType.
     * @return the result of transforming the startObject and the descendants of its rewrites.
     */
    transformNodeSpecificPreOrder(startObject, nodeCallBacks, nodeSpecificCallBacks) {
      const preTransformWrapper = (copy3, orig) => {
        let ogPreTransform;
        const casted = copy3;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogPreTransform = specific[casted.subType];
          }
          if (!ogPreTransform) {
            ogPreTransform = nodeCallBacks[casted.type];
          }
        }
        return ogPreTransform ? ogPreTransform(copy3, orig) : { newValue: copy3 };
      };
      return this.transformObjectPreOrder(startObject, preTransformWrapper);
    }
    /**
     * Visit a selected subTree given a startObject, steering the visits based on {@link Typed} nodes.
     * Similar to {@link this.visitNode}, but also allowing you to target subTypes.
     * Will call the preVisitor on the outer distinct, then the visitor of the special distinct,
     * followed by the visiting the outer distinct, printing '231'.
     * The pre-visitor visits starting from the root, going deeper, while the actual visitor goes in reverse.
     * @param startObject the object from which we will start visiting,
     *   potentially visiting its descendants along the way.
     * @param nodeCallBacks a dictionary mapping the various operation types to objects optionally
     *    containing preVisitor and visitor.
     *    The preVisitor allows you to provide {@link VisitContext} for the current object,
     *    altering how it will be visited.
     *    The visitor allows you to visit the object from deepest to the outermost object.
     *    This is useful if you for example want to manipulate the objects you visit during your visits,
     *    similar to {@link mapOperation}.
     * @param nodeSpecificCallBacks Same as nodeCallBacks but using an additional level of indirection to
     *     indicate the subType.
     */
    visitNodeSpecific(startObject, nodeCallBacks, nodeSpecificCallBacks) {
      const visitWrapper = (curObject) => {
        let ogTransform;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogTransform = specific[casted.subType]?.visitor;
          }
          if (!ogTransform) {
            ogTransform = nodeCallBacks[casted.type]?.visitor;
          }
        }
        if (ogTransform) {
          ogTransform(casted);
        }
      };
      const preVisitWrapper = (curObject) => {
        let ogPreVisit;
        const casted = curObject;
        if (casted.type && casted.subType) {
          const specific = nodeSpecificCallBacks[casted.type];
          if (specific) {
            ogPreVisit = specific[casted.subType]?.preVisitor;
          }
          if (!ogPreVisit) {
            ogPreVisit = nodeCallBacks[casted.type]?.preVisitor;
          }
        }
        return ogPreVisit ? ogPreVisit(casted) : {};
      };
      this.visitObject(startObject, visitWrapper, preVisitWrapper);
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/index.js
  var grammar_exports = {};
  __export(grammar_exports, {
    add: () => add2,
    additiveExpression: () => additiveExpression,
    aggregate: () => aggregate,
    aggregateAvg: () => aggregateAvg,
    aggregateCount: () => aggregateCount,
    aggregateGroup_concat: () => aggregateGroup_concat,
    aggregateMax: () => aggregateMax,
    aggregateMin: () => aggregateMin,
    aggregateSample: () => aggregateSample,
    aggregateSum: () => aggregateSum,
    argList: () => argList,
    askQuery: () => askQuery,
    baseAggregateFunc: () => baseAggregateFunc,
    baseDecl: () => baseDecl2,
    bind: () => bind2,
    blankNode: () => blankNode,
    blankNodePropertyList: () => blankNodePropertyList,
    blankNodePropertyListPath: () => blankNodePropertyListPath,
    booleanLiteral: () => booleanLiteral,
    brackettedExpression: () => brackettedExpression,
    builtInAbs: () => builtInAbs,
    builtInBnodeSparqlJs: () => builtInBnodeSparqlJs,
    builtInBound: () => builtInBound,
    builtInCall: () => builtInCall,
    builtInCallList: () => builtInCallList,
    builtInCeil: () => builtInCeil,
    builtInCoalesce: () => builtInCoalesce,
    builtInConcat: () => builtInConcat,
    builtInContains: () => builtInContains,
    builtInDatatype: () => builtInDatatype,
    builtInDay: () => builtInDay,
    builtInEncode_for_uri: () => builtInEncode_for_uri,
    builtInFloor: () => builtInFloor,
    builtInHours: () => builtInHours,
    builtInIf: () => builtInIf,
    builtInIri: () => builtInIri,
    builtInIsblank: () => builtInIsblank,
    builtInIsiri: () => builtInIsiri,
    builtInIsliteral: () => builtInIsliteral,
    builtInIsnumeric: () => builtInIsnumeric,
    builtInIsuri: () => builtInIsuri,
    builtInLang: () => builtInLang,
    builtInLangmatches: () => builtInLangmatches,
    builtInLcase: () => builtInLcase,
    builtInMd5: () => builtInMd5,
    builtInMinutes: () => builtInMinutes,
    builtInMonth: () => builtInMonth,
    builtInNow: () => builtInNow,
    builtInRand: () => builtInRand,
    builtInRound: () => builtInRound,
    builtInSameterm: () => builtInSameterm,
    builtInSeconds: () => builtInSeconds,
    builtInSha1: () => builtInSha1,
    builtInSha256: () => builtInSha256,
    builtInSha384: () => builtInSha384,
    builtInSha512: () => builtInSha512,
    builtInStr: () => builtInStr,
    builtInStrafter: () => builtInStrafter,
    builtInStrbefore: () => builtInStrbefore,
    builtInStrdt: () => builtInStrdt,
    builtInStrends: () => builtInStrends,
    builtInStrlang: () => builtInStrlang,
    builtInStrlen: () => builtInStrlen,
    builtInStrstarts: () => builtInStrstarts,
    builtInStruuid: () => builtInStruuid,
    builtInTimezone: () => builtInTimezone,
    builtInTz: () => builtInTz,
    builtInUcase: () => builtInUcase,
    builtInUri: () => builtInUri,
    builtInUuid: () => builtInUuid,
    builtInYear: () => builtInYear,
    canCreateBlankNodes: () => canCreateBlankNodes,
    clear: () => clear2,
    collection: () => collection,
    collectionPath: () => collectionPath,
    conditionalAndExpression: () => conditionalAndExpression,
    conditionalOrExpression: () => conditionalOrExpression,
    constraint: () => constraint,
    constructQuery: () => constructQuery,
    constructTemplate: () => constructTemplate,
    constructTriples: () => constructTriples,
    copy: () => copy2,
    create: () => create2,
    dataBlock: () => dataBlock,
    dataBlockValue: () => dataBlockValue,
    datasetClause: () => datasetClause,
    datasetClauseStar: () => datasetClauseStar,
    datasetClauseUsing: () => datasetClauseUsing,
    datasetClauseUsingStar: () => datasetClauseUsingStar,
    defaultGraphClause: () => defaultGraphClause,
    deleteClause: () => deleteClause2,
    deleteData: () => deleteData,
    deleteWhere: () => deleteWhere,
    describeQuery: () => describeQuery,
    drop: () => drop3,
    existsFunc: () => existsFunc,
    expression: () => expression,
    expressionList: () => expressionList,
    filter: () => filter3,
    funcExpr1: () => funcExpr1,
    funcExpr2: () => funcExpr2,
    funcExpr2or3: () => funcExpr2or3,
    funcExpr3: () => funcExpr3,
    funcExpr3or4: () => funcExpr3or4,
    funcExprList1: () => funcExprList1,
    funcExprOrNil1: () => funcExprOrNil1,
    funcGroupGraphPattern: () => funcGroupGraphPattern,
    funcNil1: () => funcNil1,
    funcVar1: () => funcVar1,
    functionCall: () => functionCall,
    generatePattern: () => generatePattern,
    graphGraphPattern: () => graphGraphPattern,
    graphNode: () => graphNode,
    graphNodePath: () => graphNodePath,
    graphOrDefault: () => graphOrDefault,
    graphPatternNotTriples: () => graphPatternNotTriples,
    graphRef: () => graphRef,
    graphRefAll: () => graphRefAll,
    graphTerm: () => graphTerm,
    groupClause: () => groupClause,
    groupCondition: () => groupCondition,
    groupGraphPattern: () => groupGraphPattern,
    groupGraphPatternSub: () => groupGraphPatternSub,
    groupOrUnionGraphPattern: () => groupOrUnionGraphPattern,
    havingClause: () => havingClause,
    havingCondition: () => havingCondition,
    inlineData: () => inlineData,
    inlineDataFull: () => inlineDataFull,
    inlineDataOneVar: () => inlineDataOneVar,
    insertClause: () => insertClause2,
    insertData: () => insertData,
    iri: () => iri2,
    iriFull: () => iriFull,
    iriOrFunction: () => iriOrFunction,
    limitClause: () => limitClause,
    limitOffsetClauses: () => limitOffsetClauses,
    load: () => load2,
    minusGraphPattern: () => minusGraphPattern,
    modify: () => modify,
    move: () => move2,
    multiplicativeExpression: () => multiplicativeExpression,
    namedGraphClause: () => namedGraphClause,
    notExistsFunc: () => notExistsFunc,
    numericExpression: () => numericExpression,
    numericLiteral: () => numericLiteral,
    numericLiteralNegative: () => numericLiteralNegative,
    numericLiteralPositive: () => numericLiteralPositive,
    numericLiteralUnsigned: () => numericLiteralUnsigned,
    object: () => object,
    objectList: () => objectList,
    objectListPath: () => objectListPath,
    objectPath: () => objectPath,
    offsetClause: () => offsetClause,
    optionalGraphPattern: () => optionalGraphPattern,
    orderClause: () => orderClause,
    orderCondition: () => orderCondition,
    path: () => path,
    pathAlternative: () => pathAlternative,
    pathChainHelper: () => pathChainHelper,
    pathElt: () => pathElt,
    pathEltOrInverse: () => pathEltOrInverse,
    pathGenerator: () => pathGenerator,
    pathMod: () => pathMod,
    pathNegatedPropertySet: () => pathNegatedPropertySet,
    pathOneInPropertySet: () => pathOneInPropertySet,
    pathPrimary: () => pathPrimary,
    pathSequence: () => pathSequence,
    prefixDecl: () => prefixDecl2,
    prefixedName: () => prefixedName,
    primaryExpression: () => primaryExpression,
    prologue: () => prologue,
    propertyList: () => propertyList,
    propertyListNotEmpty: () => propertyListNotEmpty,
    propertyListPath: () => propertyListPath,
    propertyListPathNotEmpty: () => propertyListPathNotEmpty,
    quadData: () => quadData,
    quadPattern: () => quadPattern,
    quads: () => quads,
    quadsNotTriples: () => quadsNotTriples,
    query: () => query,
    queryOrUpdate: () => queryOrUpdate,
    queryUnit: () => queryUnit,
    rdfLiteral: () => rdfLiteral,
    regexExpression: () => regexExpression,
    relationalExpression: () => relationalExpression,
    selectClause: () => selectClause,
    selectQuery: () => selectQuery,
    serviceGraphPattern: () => serviceGraphPattern,
    solutionModifier: () => solutionModifier,
    sourceSelector: () => sourceSelector,
    strReplaceExpression: () => strReplaceExpression,
    string: () => string,
    stringEscapedLexical: () => stringEscapedLexical,
    subSelect: () => subSelect,
    substringExpression: () => substringExpression,
    triplesBlock: () => triplesBlock,
    triplesNode: () => triplesNode,
    triplesNodePath: () => triplesNodePath,
    triplesSameSubject: () => triplesSameSubject,
    triplesSameSubjectPath: () => triplesSameSubjectPath,
    triplesTemplate: () => triplesTemplate,
    unaryExpression: () => unaryExpression,
    update: () => update,
    update1: () => update1,
    updateUnit: () => updateUnit,
    usingClause: () => usingClause2,
    usingClauseStar: () => usingClauseStar,
    valueLogical: () => valueLogical,
    valuesClause: () => valuesClause,
    varOrIri: () => varOrIri,
    varOrTerm: () => varOrTerm,
    var_: () => var_,
    verb: () => verb,
    verbA: () => verbA,
    verbPath: () => verbPath,
    verbSimple: () => verbSimple,
    whereClause: () => whereClause
  });

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/index.js
  var lexer_exports = {};
  __export(lexer_exports, {
    a: () => a,
    add: () => add,
    allBaseTokens: () => allBaseTokens,
    as: () => as,
    ask: () => ask,
    baseDecl: () => baseDecl,
    bind: () => bind,
    builtIn: () => BuiltInCalls_exports,
    by: () => by,
    clear: () => clear,
    construct: () => construct,
    copy: () => copy,
    create: () => create,
    deleteClause: () => deleteClause,
    deleteDataClause: () => deleteDataClause,
    deleteWhereClause: () => deleteWhereClause,
    describe: () => describe,
    distinct: () => distinct,
    drop: () => drop2,
    false_: () => false_,
    filter: () => filter2,
    from: () => from,
    graph: () => graph_exports,
    groupByGroup: () => groupByGroup,
    having: () => having,
    in_: () => in_,
    insertClause: () => insertClause,
    insertDataClause: () => insertDataClause,
    limit: () => limit,
    load: () => load,
    loadInto: () => loadInto,
    minus: () => minus,
    modifyWith: () => modifyWith,
    move: () => move,
    notIn: () => notIn,
    offset: () => offset,
    optional: () => optional,
    order: () => order,
    orderAsc: () => orderAsc,
    orderDesc: () => orderDesc,
    prefixDecl: () => prefixDecl,
    reduced: () => reduced,
    select: () => select,
    separator: () => separator,
    service: () => service,
    silent: () => silent,
    sparql11LexerBuilder: () => sparql11LexerBuilder,
    symbols: () => symbols_exports,
    terminals: () => terminals_exports,
    to: () => to,
    true_: () => true_,
    undef: () => undef,
    union: () => union,
    usingClause: () => usingClause,
    values: () => values2,
    where: () => where
  });

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/BuiltInCalls.js
  var BuiltInCalls_exports = {};
  __export(BuiltInCalls_exports, {
    BuiltInCalls: () => BuiltInCalls,
    abs: () => abs,
    allBuiltInCalls: () => allBuiltInCalls,
    avg: () => avg,
    bnode: () => bnode,
    bound: () => bound,
    ceil: () => ceil,
    coalesce: () => coalesce,
    concat: () => concat,
    contains: () => contains,
    count: () => count,
    datatype: () => datatype,
    day: () => day,
    encode_for_uri: () => encode_for_uri,
    exists: () => exists,
    floor: () => floor,
    groupConcat: () => groupConcat,
    hours: () => hours,
    if_: () => if_,
    iri: () => iri,
    isblank: () => isblank,
    isiri: () => isiri,
    isliteral: () => isliteral,
    isnumeric: () => isnumeric,
    isuri: () => isuri,
    lang: () => lang,
    langmatches: () => langmatches,
    lcase: () => lcase,
    max: () => max,
    md5: () => md5,
    min: () => min,
    minutes: () => minutes,
    month: () => month,
    notexists: () => notexists,
    now: () => now,
    rand: () => rand,
    regex: () => regex,
    replace: () => replace,
    round: () => round,
    sameterm: () => sameterm,
    sample: () => sample,
    seconds: () => seconds,
    sha1: () => sha1,
    sha256: () => sha256,
    sha384: () => sha384,
    sha512: () => sha512,
    str: () => str,
    strafter: () => strafter,
    strbefore: () => strbefore,
    strdt: () => strdt,
    strends: () => strends,
    strlang: () => strlang,
    strlen: () => strlen,
    strstarts: () => strstarts,
    struuid: () => struuid,
    substr: () => substr,
    sum: () => sum,
    timezone: () => timezone,
    tz: () => tz,
    ucase: () => ucase,
    uri: () => uri,
    uuid: () => uuid,
    year: () => year
  });
  var BuiltInCalls;
  (function(BuiltInCalls2) {
    BuiltInCalls2["Str"] = "builtInStr";
    BuiltInCalls2["Lang"] = "builtInLang";
    BuiltInCalls2["Langmatches"] = "builtInLangmatches";
    BuiltInCalls2["Datatype"] = "builtInDatatype";
    BuiltInCalls2["Bound"] = "builtInBound";
    BuiltInCalls2["Iri"] = "builtInIri";
    BuiltInCalls2["Uri"] = "builtInUri";
    BuiltInCalls2["Bnode"] = "builtInBnode";
    BuiltInCalls2["Rand"] = "builtInRand";
    BuiltInCalls2["Abs"] = "builtInAbs";
    BuiltInCalls2["Ceil"] = "builtInCeil";
    BuiltInCalls2["Floor"] = "builtInFloor";
    BuiltInCalls2["Round"] = "builtInRound";
    BuiltInCalls2["Concat"] = "builtInConcat";
    BuiltInCalls2["Strlen"] = "builtInStrlen";
    BuiltInCalls2["Ucase"] = "builtInUcase";
    BuiltInCalls2["Lcase"] = "builtInLcase";
    BuiltInCalls2["Encode_for_uri"] = "builtInEncode_for_uri";
    BuiltInCalls2["Contains"] = "builtInContains";
    BuiltInCalls2["Strstarts"] = "builtInStrstarts";
    BuiltInCalls2["Strends"] = "builtInStrends";
    BuiltInCalls2["Strbefore"] = "builtInStrbefore";
    BuiltInCalls2["Strafter"] = "builtInStrafter";
    BuiltInCalls2["Year"] = "builtInYear";
    BuiltInCalls2["Month"] = "builtInMonth";
    BuiltInCalls2["Day"] = "builtInDay";
    BuiltInCalls2["Hours"] = "builtInHours";
    BuiltInCalls2["Minutes"] = "builtInMinutes";
    BuiltInCalls2["Seconds"] = "builtInSeconds";
    BuiltInCalls2["Timezone"] = "builtInTimezone";
    BuiltInCalls2["Tz"] = "builtInTz";
    BuiltInCalls2["Now"] = "builtInNow";
    BuiltInCalls2["Uuid"] = "builtInUuid";
    BuiltInCalls2["Struuid"] = "builtInStruuid";
    BuiltInCalls2["Md5"] = "builtInMd5";
    BuiltInCalls2["Sha1"] = "builtInSha1";
    BuiltInCalls2["Sha256"] = "builtInSha256";
    BuiltInCalls2["Sha384"] = "builtInSha384";
    BuiltInCalls2["Sha512"] = "builtInSha512";
    BuiltInCalls2["Coalesce"] = "builtInCoalesce";
    BuiltInCalls2["If"] = "builtInIf";
    BuiltInCalls2["Strlang"] = "builtInStrlang";
    BuiltInCalls2["Strdt"] = "builtInStrdt";
    BuiltInCalls2["Sameterm"] = "builtInSameterm";
    BuiltInCalls2["Isiri"] = "builtInIsiri";
    BuiltInCalls2["Isuri"] = "builtInIsuri";
    BuiltInCalls2["Isblank"] = "builtInIsblank";
    BuiltInCalls2["Isliteral"] = "builtInIsliteral";
    BuiltInCalls2["Isnumeric"] = "builtInIsnumeric";
    BuiltInCalls2["Regex"] = "builtInRegex";
    BuiltInCalls2["Substr"] = "builtInSubstr";
    BuiltInCalls2["Replace"] = "builtInReplace";
    BuiltInCalls2["Exists"] = "builtInExists";
    BuiltInCalls2["Notexists"] = "builtInNotexists";
    BuiltInCalls2["Count"] = "builtInCount";
    BuiltInCalls2["Sum"] = "builtInSum";
    BuiltInCalls2["Min"] = "builtInMin";
    BuiltInCalls2["Max"] = "builtInMax";
    BuiltInCalls2["Avg"] = "builtInAvg";
    BuiltInCalls2["Sample"] = "builtInSample";
    BuiltInCalls2["Group_concat"] = "builtInGroup_concat";
  })(BuiltInCalls || (BuiltInCalls = {}));
  function capitalize(string2) {
    return string2.charAt(0).toUpperCase() + string2.slice(1);
  }
  var str = createToken2({ name: capitalize(BuiltInCalls.Str), pattern: /str/i, label: "STR" });
  var lang = createToken2({ name: capitalize(BuiltInCalls.Lang), pattern: /lang/i, label: "LANG" });
  var langmatches = createToken2({
    name: capitalize(BuiltInCalls.Langmatches),
    pattern: /langmatches/i,
    label: "LANGMATCHES"
  });
  var datatype = createToken2({
    name: capitalize(BuiltInCalls.Datatype),
    pattern: /datatype/i,
    label: "DATATYPE"
  });
  var bound = createToken2({ name: capitalize(BuiltInCalls.Bound), pattern: /bound/i, label: "BOUND" });
  var iri = createToken2({ name: capitalize(BuiltInCalls.Iri), pattern: /iri/i, label: "IRI" });
  var uri = createToken2({ name: capitalize(BuiltInCalls.Uri), pattern: /uri/i, label: "URI" });
  var bnode = createToken2({ name: capitalize(BuiltInCalls.Bnode), pattern: /bnode/i, label: "BNODE" });
  var rand = createToken2({ name: capitalize(BuiltInCalls.Rand), pattern: /rand/i, label: "RAND" });
  var abs = createToken2({ name: capitalize(BuiltInCalls.Abs), pattern: /abs/i, label: "ABS" });
  var ceil = createToken2({ name: capitalize(BuiltInCalls.Ceil), pattern: /ceil/i, label: "CEIL" });
  var floor = createToken2({ name: capitalize(BuiltInCalls.Floor), pattern: /floor/i, label: "FLOOR" });
  var round = createToken2({ name: capitalize(BuiltInCalls.Round), pattern: /round/i, label: "ROUND" });
  var concat = createToken2({ name: capitalize(BuiltInCalls.Concat), pattern: /concat/i, label: "CONCAT" });
  var strlen = createToken2({ name: capitalize(BuiltInCalls.Strlen), pattern: /strlen/i, label: "STRLEN" });
  var ucase = createToken2({ name: capitalize(BuiltInCalls.Ucase), pattern: /ucase/i, label: "UCASE" });
  var lcase = createToken2({ name: capitalize(BuiltInCalls.Lcase), pattern: /lcase/i, label: "LCASE" });
  var encode_for_uri = createToken2({
    name: capitalize(BuiltInCalls.Encode_for_uri),
    pattern: /encode_for_uri/i,
    label: "ENCODE_FOR_URI"
  });
  var contains = createToken2({
    name: capitalize(BuiltInCalls.Contains),
    pattern: /contains/i,
    label: "CONTAINS"
  });
  var strstarts = createToken2({
    name: capitalize(BuiltInCalls.Strstarts),
    pattern: /strstarts/i,
    label: "STRSTARTS"
  });
  var strends = createToken2({ name: capitalize(BuiltInCalls.Strends), pattern: /strends/i, label: "STRENDS" });
  var strbefore = createToken2({
    name: capitalize(BuiltInCalls.Strbefore),
    pattern: /strbefore/i,
    label: "STRBEFORE"
  });
  var strafter = createToken2({
    name: capitalize(BuiltInCalls.Strafter),
    pattern: /strafter/i,
    label: "STRAFTER"
  });
  var year = createToken2({ name: capitalize(BuiltInCalls.Year), pattern: /year/i, label: "YEAR" });
  var month = createToken2({ name: capitalize(BuiltInCalls.Month), pattern: /month/i, label: "MONTH" });
  var day = createToken2({ name: capitalize(BuiltInCalls.Day), pattern: /day/i, label: "DAY" });
  var hours = createToken2({ name: capitalize(BuiltInCalls.Hours), pattern: /hours/i, label: "HOURS" });
  var minutes = createToken2({ name: capitalize(BuiltInCalls.Minutes), pattern: /minutes/i, label: "MINUTES" });
  var seconds = createToken2({ name: capitalize(BuiltInCalls.Seconds), pattern: /seconds/i, label: "SECONDS" });
  var timezone = createToken2({
    name: capitalize(BuiltInCalls.Timezone),
    pattern: /timezone/i,
    label: "TIMEZONE"
  });
  var tz = createToken2({ name: capitalize(BuiltInCalls.Tz), pattern: /tz/i, label: "TZ" });
  var now = createToken2({ name: capitalize(BuiltInCalls.Now), pattern: /now/i, label: "NOW" });
  var uuid = createToken2({ name: capitalize(BuiltInCalls.Uuid), pattern: /uuid/i, label: "UUID" });
  var struuid = createToken2({ name: capitalize(BuiltInCalls.Struuid), pattern: /struuid/i, label: "STRUUID" });
  var md5 = createToken2({ name: capitalize(BuiltInCalls.Md5), pattern: /md5/i, label: "MD5" });
  var sha1 = createToken2({ name: capitalize(BuiltInCalls.Sha1), pattern: /sha1/i, label: "SHA1" });
  var sha256 = createToken2({ name: capitalize(BuiltInCalls.Sha256), pattern: /sha256/i, label: "SHA256" });
  var sha384 = createToken2({ name: capitalize(BuiltInCalls.Sha384), pattern: /sha384/i, label: "SHA384" });
  var sha512 = createToken2({ name: capitalize(BuiltInCalls.Sha512), pattern: /sha512/i, label: "SHA512" });
  var coalesce = createToken2({
    name: capitalize(BuiltInCalls.Coalesce),
    pattern: /coalesce/i,
    label: "COALESCE"
  });
  var if_ = createToken2({ name: capitalize(BuiltInCalls.If), pattern: /if/i, label: "IF" });
  var strlang = createToken2({ name: capitalize(BuiltInCalls.Strlang), pattern: /strlang/i, label: "STRLANG" });
  var strdt = createToken2({ name: capitalize(BuiltInCalls.Strdt), pattern: /strdt/i, label: "STRDT" });
  var sameterm = createToken2({
    name: capitalize(BuiltInCalls.Sameterm),
    pattern: /sameterm/i,
    label: "SAMETERM"
  });
  var isiri = createToken2({ name: capitalize(BuiltInCalls.Isiri), pattern: /isiri/i, label: "ISIRI" });
  var isuri = createToken2({ name: capitalize(BuiltInCalls.Isuri), pattern: /isuri/i, label: "ISURI" });
  var isblank = createToken2({ name: capitalize(BuiltInCalls.Isblank), pattern: /isblank/i, label: "ISBLANK" });
  var isliteral = createToken2({
    name: capitalize(BuiltInCalls.Isliteral),
    pattern: /isliteral/i,
    label: "ISLITERAL"
  });
  var isnumeric = createToken2({
    name: capitalize(BuiltInCalls.Isnumeric),
    pattern: /isnumeric/i,
    label: "ISNUMERIC"
  });
  var regex = createToken2({ name: capitalize(BuiltInCalls.Regex), pattern: /regex/i, label: "REGEX" });
  var substr = createToken2({ name: capitalize(BuiltInCalls.Substr), pattern: /substr/i, label: "SUBSTR" });
  var replace = createToken2({ name: capitalize(BuiltInCalls.Replace), pattern: /replace/i, label: "REPLACE" });
  var exists = createToken2({ name: capitalize(BuiltInCalls.Exists), pattern: /exists/i, label: "EXISTS" });
  var notexists = createToken2({
    name: capitalize(BuiltInCalls.Notexists),
    pattern: /not exists/i,
    label: "NOT EXISTS"
  });
  var count = createToken2({ name: capitalize(BuiltInCalls.Count), pattern: /count/i, label: "COUNT" });
  var sum = createToken2({ name: capitalize(BuiltInCalls.Sum), pattern: /sum/i, label: "SUM" });
  var min = createToken2({ name: capitalize(BuiltInCalls.Min), pattern: /min/i, label: "MIN" });
  var max = createToken2({ name: capitalize(BuiltInCalls.Max), pattern: /max/i, label: "MAX" });
  var avg = createToken2({ name: capitalize(BuiltInCalls.Avg), pattern: /avg/i, label: "AVG" });
  var sample = createToken2({ name: capitalize(BuiltInCalls.Sample), pattern: /sample/i, label: "SAMPLE" });
  var groupConcat = createToken2({
    name: capitalize(BuiltInCalls.Group_concat),
    pattern: /group_concat/i,
    label: "GROUP_CONCAT"
  });
  var allBuiltInCalls = LexerBuilder.create().add(langmatches, datatype, lang, bound, iri, uri, bnode, rand, abs, ceil, floor, round, concat, strlen, ucase, lcase, encode_for_uri, contains, strstarts, strends, strbefore, strafter, year, month, day, hours, minutes, seconds, timezone, tz, now, uuid, struuid, md5, sha1, sha256, sha384, sha512, coalesce, if_, strlang, strdt, sameterm, isiri, isuri, isblank, isliteral, isnumeric, regex, substr, replace, exists, notexists, count, sum, min, max, avg, sample, groupConcat, str);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/graph.js
  var graph_exports = {};
  __export(graph_exports, {
    allGraphTokens: () => allGraphTokens,
    default_: () => default_,
    graph: () => graph,
    graphAll: () => graphAll,
    named: () => named
  });
  var named = createToken2({ name: "NamedGraph", pattern: /named/i, label: "NAMED" });
  var default_ = createToken2({ name: "DefaultGraph", pattern: /default/i, label: "DEFAULT" });
  var graph = createToken2({ name: "Graph", pattern: /graph/i, label: "GRAPH" });
  var graphAll = createToken2({ name: "GraphAll", pattern: /all/i, label: "ALL" });
  var allGraphTokens = LexerBuilder.create().add(named, default_, graph, graphAll);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/lexerPatterns.js
  var pnCharsBasePattern = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF]/;
  var pnCharsUPattern = new RegExp(`(${pnCharsBasePattern.source})|_`);
  var varNamePattern = new RegExp(`((${pnCharsUPattern.source})|[0-9])((${pnCharsUPattern.source})|[0-9]|[\xB7\u0300-\u036F\u203F-\u2040])*`);
  var iriRefPattern = /<([^\u0000-\u0020"<>\\^`{|}])*>/;
  var pnCharsPattern = new RegExp(`(${pnCharsUPattern.source})|[\\-0-9\xB7\u0300-\u036F\u203F-\u2040]`);
  var pnPrefixPattern = new RegExp(`(${pnCharsBasePattern.source})(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
  var pNameNsPattern = new RegExp(`(${pnPrefixPattern.source})?:`);
  var percentPattern = /%[\dA-Fa-f]{2}/;
  var pnLocalEscPattern = /\\[!#$%&'()*+,./;=?@\\_~-]/;
  var plxPattern = new RegExp(`(${percentPattern.source})|(${pnLocalEscPattern.source})`);
  var pnLocalPattern = new RegExp(`((${pnCharsUPattern.source})|:|[0-9]|(${plxPattern.source}))(((${pnCharsPattern.source})|\\.|:|(${plxPattern.source}))*((${pnCharsPattern.source})|:|(${plxPattern.source})))?`);
  var pNameLnPattern = new RegExp(`(${pNameNsPattern.source})(${pnLocalPattern.source})`);
  var blankNodeLabelPattern = new RegExp(`_:((${pnCharsUPattern.source})|[0-9])(((${pnCharsPattern.source})|\\.)*(${pnCharsPattern.source}))?`);
  var var1Pattern = new RegExp(`\\?(${varNamePattern.source})`);
  var var2Pattern = new RegExp(`\\$(${varNamePattern.source})`);
  var langTagPattern = /@[A-Za-z]+(-[\dA-Za-z]+)*/;
  var integerPattern = /\d+/;
  var decimalPattern2 = /\d+\.\d+/;
  var exponentPattern = /[Ee][+-]?\d+/;
  var doublePattern = new RegExp(`([0-9]+\\.[0-9]*(${exponentPattern.source}))|(\\.[0-9]+(${exponentPattern.source}))|([0-9]+(${exponentPattern.source}))`);
  var integerPositivePattern = new RegExp(`\\+(${integerPattern.source})`);
  var decimalPositivePattern = new RegExp(`\\+(${decimalPattern2.source})`);
  var doublePositivePattern = new RegExp(`\\+(${doublePattern.source})`);
  var integerNegativePattern = new RegExp(`-(${integerPattern.source})`);
  var decimalNegativePattern = new RegExp(`-(${decimalPattern2.source})`);
  var doubleNegativePattern = new RegExp(`-(${doublePattern.source})`);
  var echarPattern = /\\["'\\bfnrt]/;
  var stringLiteral1Pattern = new RegExp(`'(([^\\u0027\\u005C\\u000A\r])|(${echarPattern.source}))*'`);
  var stringLiteral2Pattern = new RegExp(`"(([^\\u0022\\u005C\\u000A\\u000D])|(${echarPattern.source}))*"`);
  var stringLiteralLong1Pattern = new RegExp(`'''(('|(''))?([^'\\\\]|(${echarPattern.source})))*'''`);
  var stringLiteralLong2Pattern = new RegExp(`"""(("|(""))?([^"\\\\]|(${echarPattern.source})))*"""`);
  var wsPattern = /[\u0009\u000A\u000D ]/;
  var nilPattern = new RegExp(`\\((${wsPattern.source})*\\)`);
  var anonPattern = new RegExp(`\\[(${wsPattern.source})*\\]`);
  var commentPattern = /#[^\n]*/;
  var atLeastOneBlankPattern = new RegExp(`(((${wsPattern.source})+)|((${commentPattern.source})
))+`);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/symbols.js
  var symbols_exports = {};
  __export(symbols_exports, {
    LCurly: () => LCurly,
    LParen: () => LParen,
    LSquare: () => LSquare,
    RCurly: () => RCurly,
    RParen: () => RParen,
    RSquare: () => RSquare,
    allSymbols: () => allSymbols,
    comma: () => comma,
    dot: () => dot,
    equal: () => equal,
    exclamation: () => exclamation,
    greaterThan: () => greaterThan,
    greaterThanEqual: () => greaterThanEqual,
    hat: () => hat,
    hathat: () => hathat,
    lessThan: () => lessThan,
    lessThanEqual: () => lessThanEqual,
    logicAnd: () => logicAnd,
    logicOr: () => logicOr,
    notEqual: () => notEqual,
    opMinus: () => opMinus,
    opPlus: () => opPlus,
    pipe: () => pipe,
    question: () => question,
    semi: () => semi,
    slash: () => slash,
    star: () => star
  });
  var LCurly = createToken2({ name: "LCurly", pattern: "{", label: "{" });
  var RCurly = createToken2({ name: "RCurly", pattern: "}", label: "}" });
  var dot = createToken2({ name: "Dot", pattern: ".", label: "." });
  var comma = createToken2({ name: "Comma", pattern: ",", label: "," });
  var semi = createToken2({ name: "Semi", pattern: ";", label: ";" });
  var LParen = createToken2({ name: "LParen", pattern: "(", label: "(" });
  var RParen = createToken2({ name: "RParen", pattern: ")", label: ")" });
  var LSquare = createToken2({ name: "LSquare", pattern: "[", label: "[" });
  var RSquare = createToken2({ name: "RSquare", pattern: "]", label: "]" });
  var pipe = createToken2({ name: "Pipe", pattern: "|", label: "|" });
  var slash = createToken2({ name: "Slash", pattern: "/", label: "/" });
  var hat = createToken2({ name: "Hat", pattern: "^", label: "^" });
  var question = createToken2({ name: "Question", pattern: "?", label: "?" });
  var star = createToken2({ name: "Star", pattern: "*", label: "*" });
  var opPlus = createToken2({ name: "OpPlus", pattern: "+", label: "+" });
  var opMinus = createToken2({ name: "OpMinus", pattern: "-", label: "-" });
  var exclamation = createToken2({ name: "Exclamation", pattern: "!", label: "!" });
  var logicAnd = createToken2({ name: "LogicAnd", pattern: "&&", label: "&&" });
  var logicOr = createToken2({ name: "LogicOr", pattern: "||", label: "||" });
  var equal = createToken2({ name: "Equal", pattern: "=", label: "=" });
  var notEqual = createToken2({ name: "NotEqual", pattern: "!=", label: "!=" });
  var lessThan = createToken2({ name: "LessThan", pattern: "<", label: "<" });
  var greaterThan = createToken2({ name: "GreaterThan", pattern: ">", label: ">" });
  var lessThanEqual = createToken2({ name: "LessThanEqual", pattern: "<=", label: "<=" });
  var greaterThanEqual = createToken2({ name: "GreaterThanEqual", pattern: ">=", label: ">=" });
  var hathat = createToken2({ name: "Hathat", pattern: "^^", label: "^^" });
  var allSymbols = LexerBuilder.create().add(logicAnd, logicOr, notEqual, lessThanEqual, greaterThanEqual, LCurly, RCurly, dot, comma, semi, LParen, RParen, LSquare, RSquare, pipe, slash, hathat, hat, question, star, opPlus, opMinus, exclamation, equal, lessThan, greaterThan);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/terminals.js
  var terminals_exports = {};
  __export(terminals_exports, {
    allTerminals: () => allTerminals,
    anon: () => anon,
    blankNodeLabel: () => blankNodeLabel,
    comment: () => comment,
    decimal: () => decimal,
    decimalNegative: () => decimalNegative,
    decimalPositive: () => decimalPositive,
    double: () => double,
    doubleNegative: () => doubleNegative,
    doublePositive: () => doublePositive,
    integer: () => integer,
    integerNegative: () => integerNegative,
    integerPositive: () => integerPositive,
    iriRef: () => iriRef,
    langTag: () => langTag,
    nil: () => nil,
    pNameLn: () => pNameLn,
    pNameNs: () => pNameNs,
    stringLiteral1: () => stringLiteral1,
    stringLiteral2: () => stringLiteral2,
    stringLiteralLong1: () => stringLiteralLong1,
    stringLiteralLong2: () => stringLiteralLong2,
    var1: () => var1,
    var2: () => var2,
    ws: () => ws
  });
  var iriRef = createToken2({ name: "IriRef", pattern: iriRefPattern });
  var pNameLn = createToken2({ name: "PNameLn", pattern: pNameLnPattern });
  var pNameNs = createToken2({ name: "PNameNs", pattern: pNameNsPattern, longer_alt: [pNameLn] });
  var blankNodeLabel = createToken2({ name: "BlankNodeLabel", pattern: blankNodeLabelPattern });
  var var1 = createToken2({ name: "Var1", pattern: var1Pattern });
  var var2 = createToken2({ name: "Var2", pattern: var2Pattern });
  var langTag = createToken2({ name: "LangTag", pattern: langTagPattern });
  var integer = createToken2({ name: "Integer", pattern: integerPattern });
  var decimal = createToken2({ name: "Decimal", pattern: decimalPattern2 });
  var double = createToken2({ name: "Double", pattern: doublePattern });
  var integerPositive = createToken2({ name: "IntegerPositive", pattern: integerPositivePattern });
  var decimalPositive = createToken2({ name: "DecimalPositive", pattern: decimalPositivePattern });
  var doublePositive = createToken2({ name: "DoublePositive", pattern: doublePositivePattern });
  var integerNegative = createToken2({ name: "IntegerNegative", pattern: integerNegativePattern });
  var decimalNegative = createToken2({ name: "DecimalNegative", pattern: decimalNegativePattern });
  var doubleNegative = createToken2({ name: "DoubleNegative", pattern: doubleNegativePattern });
  var stringLiteral1 = createToken2({ name: "StringLiteral1", pattern: stringLiteral1Pattern });
  var stringLiteral2 = createToken2({ name: "StringLiteral2", pattern: stringLiteral2Pattern });
  var stringLiteralLong1 = createToken2({ name: "StringLiteralLong1", pattern: stringLiteralLong1Pattern });
  var stringLiteralLong2 = createToken2({ name: "StringLiteralLong2", pattern: stringLiteralLong2Pattern });
  var ws = createToken2({ name: "Ws", pattern: wsPattern, group: Lexer.SKIPPED });
  var comment = createToken2({ name: "Comment", pattern: commentPattern, group: Lexer.SKIPPED });
  var nil = createToken2({ name: "Nil", pattern: nilPattern });
  var anon = createToken2({ name: "Anon", pattern: anonPattern });
  var allTerminals = LexerBuilder.create().add(iriRef, pNameNs, pNameLn, blankNodeLabel, var1, var2, langTag, double, decimal, integer, doublePositive, decimalPositive, integerPositive, doubleNegative, decimalNegative, integerNegative, stringLiteralLong1, stringLiteralLong2, stringLiteral1, stringLiteral2, ws, comment, nil, anon);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/lexer/lexer.js
  var baseDecl = createToken2({ name: "BaseDecl", pattern: /base/i, label: "BASE" });
  var prefixDecl = createToken2({ name: "PrefixDecl", pattern: /prefix/i, label: "PREFIX" });
  var select = createToken2({ name: "Select", pattern: /select/i, label: "SELECT" });
  var distinct = createToken2({ name: "Distinct", pattern: /distinct/i, label: "DISTINCT" });
  var reduced = createToken2({ name: "Reduced", pattern: /reduced/i, label: "REDUCED" });
  var as = createToken2({ name: "As", pattern: /as/i, label: "AS" });
  var construct = createToken2({ name: "Construct", pattern: /construct/i, label: "CONSTRUCT" });
  var describe = createToken2({ name: "Describe", pattern: /describe/i, label: "DESCRIBE" });
  var ask = createToken2({ name: "Ask", pattern: /ask/i, label: "ASK" });
  var from = createToken2({ name: "From", pattern: /from/i, label: "FROM" });
  var where = createToken2({ name: "Where", pattern: /where/i, label: "WHERE" });
  var groupByGroup = createToken2({ name: "GroupByGroup", pattern: /group/i, label: "_GROUP_ BY" });
  var by = createToken2({ name: "By", pattern: /by/i, label: "BY" });
  var having = createToken2({ name: "Having", pattern: /having/i, label: "HAVING" });
  var order = createToken2({ name: "Order", pattern: /order/i, label: "_ORDER_ BY" });
  var orderAsc = createToken2({ name: "OrderAsc", pattern: /asc/i, label: "ASC" });
  var orderDesc = createToken2({ name: "OrderDesc", pattern: /desc/i, label: "DESC" });
  var limit = createToken2({ name: "Limit", pattern: /limit/i, label: "LIMIT" });
  var offset = createToken2({ name: "Offset", pattern: /offset/i, label: "OFFSET" });
  var values2 = createToken2({ name: "Values", pattern: /values/i, label: "VALUES" });
  var load = createToken2({ name: "Load", pattern: /load/i, label: "LOAD" });
  var silent = createToken2({ name: "Silent", pattern: /silent/i, label: "SILENT" });
  var loadInto = createToken2({ name: "LoadInto", pattern: /into/i, label: "INTO" });
  var clear = createToken2({ name: "Clear", pattern: /clear/i, label: "CLEAR" });
  var drop2 = createToken2({ name: "Drop", pattern: /drop/i, label: "DROP" });
  var create = createToken2({ name: "Create", pattern: /create/i, label: "CREATE" });
  var add = createToken2({ name: "Add", pattern: /add/i, label: "ADD" });
  var to = createToken2({ name: "To", pattern: /to/i, label: "TO" });
  var move = createToken2({ name: "Move", pattern: /move/i, label: "MOVE" });
  var copy = createToken2({ name: "Copy", pattern: /copy/i, label: "COPY" });
  var modifyWith = createToken2({ name: "ModifyWith", pattern: /with/i, label: "WITH" });
  var deleteDataClause = createToken2({
    name: "DeleteDataClause",
    pattern: new RegExp(`delete(${atLeastOneBlankPattern.source})data`, "i"),
    label: "DELETE DATA"
  });
  var deleteWhereClause = createToken2({
    name: "DeleteWhereClause",
    pattern: new RegExp(`delete(${atLeastOneBlankPattern.source})where`, "i"),
    label: "DELETE WHERE"
  });
  var deleteClause = createToken2({ name: "DeleteClause", pattern: /delete/i, label: "DELETE" });
  var insertDataClause = createToken2({
    name: "InsertDataClause",
    pattern: new RegExp(`insert(${atLeastOneBlankPattern.source})data`, "i"),
    label: "INSERT DATA"
  });
  var insertClause = createToken2({ name: "InsertClause", pattern: /insert/i, label: "insert" });
  var usingClause = createToken2({ name: "UsingClause", pattern: /using/i, label: "USING" });
  var optional = createToken2({ name: "Optional", pattern: /optional/i, label: "OPTIONAL" });
  var service = createToken2({ name: "Service", pattern: /service/i, label: "SERVICE" });
  var bind = createToken2({ name: "Bind", pattern: /bind/i, label: "BIND" });
  var undef = createToken2({ name: "Undef", pattern: /undef/i, label: "UNDEF" });
  var minus = createToken2({ name: "Minus", pattern: /minus/i, label: "MINUS" });
  var union = createToken2({ name: "Union", pattern: /union/i, label: "UNION" });
  var filter2 = createToken2({ name: "Filter", pattern: /filter/i, label: "FILTER" });
  var a = createToken2({ name: "a", pattern: "a", label: "type declaration 'a'" });
  var true_ = createToken2({ name: "True", pattern: /true/i, label: "true" });
  var false_ = createToken2({ name: "False", pattern: /false/i, label: "false" });
  var in_ = createToken2({ name: "In", pattern: /in/i, label: "IN" });
  var notIn = createToken2({ name: "NotIn", pattern: /not[\u0020\u0009\u000D\u000A]+in/i, label: "NOT IN" });
  var separator = createToken2({ name: "Separator", pattern: /separator/i, label: "SEPARATOR" });
  var allBaseTokens = LexerBuilder.create().add(baseDecl, prefixDecl, select, distinct, reduced, construct, describe, ask, from, where, having, groupByGroup, by, order, orderAsc, orderDesc, limit, offset, values2, load, silent, loadInto, clear, drop2, create, add, to, move, copy, modifyWith, deleteWhereClause, deleteDataClause, deleteClause, insertDataClause, insertClause, usingClause, optional, service, bind, undef, minus, union, filter2, as, a, true_, false_, in_, notIn, separator);
  var sparql11LexerBuilder = LexerBuilder.create(allTerminals).merge(allBaseTokens).merge(allBuiltInCalls).merge(allGraphTokens).merge(allSymbols).moveAfter(avg, a).moveBefore(a, graphAll).moveAfter(groupConcat, groupByGroup);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/ContextFactory.js
  var nodeType = "contextDef";
  function ContextFactoryMixin(Base) {
    return class ContextFactory extends Base {
      contextDefinitionPrefix(loc, key, value) {
        return {
          type: nodeType,
          subType: "prefix",
          key,
          value,
          loc
        };
      }
      isContextDefinitionPrefix(contextDef) {
        return this.isOfSubType(contextDef, nodeType, "prefix");
      }
      contextDefinitionBase(loc, value) {
        return {
          type: "contextDef",
          subType: "base",
          value,
          loc
        };
      }
      isContextDefinitionBase(contextDef) {
        return this.isOfSubType(contextDef, nodeType, "base");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/ExpressionFactory.js
  var nodeType2 = "expression";
  function ExpressionFactoryMixin(Base) {
    return class ExpressionFactory extends Base {
      isExpressionPure(obj) {
        return this.isOfType(obj, nodeType2);
      }
      formatOperator(operator) {
        return operator.toLowerCase().replaceAll(" ", "");
      }
      expressionOperation(operator, args, loc) {
        return {
          type: nodeType2,
          subType: "operation",
          operator: this.formatOperator(operator),
          args,
          loc
        };
      }
      isExpressionOperator(obj) {
        return this.isOfSubType(obj, nodeType2, "operation");
      }
      expressionFunctionCall(functionOp, args, distinct2, loc) {
        return {
          type: "expression",
          subType: "functionCall",
          function: functionOp,
          args,
          distinct: distinct2,
          loc
        };
      }
      isExpressionFunctionCall(obj) {
        return this.isOfSubType(obj, nodeType2, "functionCall");
      }
      expressionPatternOperation(operator, args, loc) {
        return {
          type: nodeType2,
          subType: "patternOperation",
          operator: this.formatOperator(operator),
          args,
          loc
        };
      }
      isExpressionPatternOperation(obj) {
        return this.isOfSubType(obj, nodeType2, "patternOperation");
      }
      aggregate(aggregation, distinct2, arg, separator2, loc) {
        const base = {
          type: "expression",
          subType: "aggregate",
          aggregation: this.formatOperator(aggregation),
          distinct: distinct2,
          loc
        };
        if (this.isOfType(arg, "wildcard")) {
          return { ...base, expression: [arg] };
        }
        if (separator2 === void 0) {
          return { ...base, expression: [arg] };
        }
        return { ...base, expression: [arg], separator: separator2 };
      }
      isExpressionAggregate(obj) {
        return this.isOfSubType(obj, nodeType2, "aggregate");
      }
      isExpressionAggregateSeparator(obj) {
        return this.isOfSubType(obj, nodeType2, "aggregate") && typeof obj.separator === "string";
      }
      isExpressionAggregateOnWildcard(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType2, "aggregate") && Array.isArray(casted.expression) && casted.expression.length === 1 && this.isOfType(casted.expression[0], "wildcard");
      }
      isExpressionAggregateDefault(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType2, "operation") && Array.isArray(casted.expression) && casted.expression.length === 1 && !this.isOfType(casted.expression[0], "wildcard");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/GraphRefFactory.js
  var nodeType3 = "graphRef";
  function GraphRefFactoryMixin(Base) {
    return class GraphRefFactory extends Base {
      isGraphRef(obj) {
        return this.isOfType(obj, nodeType3);
      }
      graphRefDefault(loc) {
        return {
          type: nodeType3,
          subType: "default",
          loc
        };
      }
      isGraphRefDefault(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType3, "default");
      }
      graphRefNamed(loc) {
        return {
          type: nodeType3,
          subType: "named",
          loc
        };
      }
      isGraphRefNamed(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType3, "named");
      }
      graphRefAll(loc) {
        return {
          type: nodeType3,
          subType: "all",
          loc
        };
      }
      isGraphRefAll(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType3, "all");
      }
      graphRefSpecific(graph2, loc) {
        return {
          type: nodeType3,
          subType: "specific",
          graph: graph2,
          loc
        };
      }
      isGraphRefSpecific(graphRef2) {
        return this.isOfSubType(graphRef2, nodeType3, "specific");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/mixins.js
  function asArg(arg) {
    return new FlatCall(arg);
  }
  var FlatCall = class {
    input;
    constructor(input) {
      this.input = input;
    }
    call(func) {
      this.input = func(this.input);
      return this;
    }
    returns() {
      return this.input;
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/PathFactory.js
  var nodeType4 = "path";
  function PathFactoryMixin(Base) {
    return class PathFactory extends Base {
      isPathPure(obj) {
        return this.isOfType(obj, nodeType4);
      }
      path(subType, items, loc) {
        const base = {
          type: nodeType4,
          loc,
          items
        };
        if (subType === "|" || subType === "/") {
          return {
            ...base,
            subType
          };
        }
        if ((subType === "?" || subType === "*" || subType === "+" || subType === "^" && this.isPathPure(items[0])) && items.length === 1) {
          return {
            ...base,
            subType,
            items
          };
        }
        if (subType === "^" && items.length === 1 && !this.isPathPure(items[0])) {
          return {
            ...base,
            subType,
            items
          };
        }
        if (subType === "!" && items.length === 1 && (this.isPathAlternativeLimited(items[0]) || !this.isPathPure(items[0]) || this.isPathNegatedElt(items[0]))) {
          return {
            ...base,
            subType,
            items
          };
        }
        throw new Error("Invalid path type");
      }
      isPathOfType(obj, subTypes) {
        return this.isOfType(obj, nodeType4) && subTypes.includes(obj.subType);
      }
      isPathChain(obj) {
        return this.isOfSubType(obj, nodeType4, "/") || this.isOfSubType(obj, nodeType4, "|");
      }
      isPathModified(obj) {
        return this.isOfSubType(obj, nodeType4, "?") || this.isOfSubType(obj, nodeType4, "*") || this.isOfSubType(obj, nodeType4, "+") || this.isOfSubType(obj, nodeType4, "^");
      }
      isPathNegatedElt(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType4, "^") && Array.isArray(casted.items) && casted.items.length === 1 && casted.items[0] !== null && typeof casted.items[0] === "object" && !this.isPathPure(casted.items[0]);
      }
      isPathNegated(obj) {
        return this.isOfSubType(obj, nodeType4, "!");
      }
      isPathAlternativeLimited(obj) {
        const casted = obj;
        return this.isOfSubType(obj, nodeType4, "|") && Array.isArray(casted.items) && casted.items.every((item) => !this.isPathPure(item) || this.isPathNegatedElt(item));
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/Patternfactory.js
  var nodeType5 = "pattern";
  function PatternFactoryMixin(Base) {
    return class PatternFactory extends Base {
      isPattern(obj) {
        return this.isOfType(obj, nodeType5);
      }
      patternBgp(triples, loc) {
        return { type: nodeType5, subType: "bgp", triples, loc };
      }
      isPatternBgp(obj) {
        return this.isOfSubType(obj, nodeType5, "bgp");
      }
      patternGroup(patterns, loc) {
        return { type: nodeType5, subType: "group", patterns, loc };
      }
      isPatternGroup(obj) {
        return this.isOfSubType(obj, nodeType5, "group");
      }
      patternGraph(name, patterns, loc) {
        return { type: nodeType5, subType: "graph", name, patterns, loc };
      }
      isPatternGraph(obj) {
        return this.isOfSubType(obj, nodeType5, "graph");
      }
      patternOptional(patterns, loc) {
        return { type: nodeType5, subType: "optional", patterns, loc };
      }
      isPatternOptional(obj) {
        return this.isOfSubType(obj, nodeType5, "optional");
      }
      patternValues(variables, values3, loc) {
        return { type: nodeType5, subType: "values", variables, values: values3, loc };
      }
      isPatternValues(obj) {
        return this.isOfSubType(obj, nodeType5, "values");
      }
      patternFilter(expression2, loc) {
        return {
          type: nodeType5,
          subType: "filter",
          expression: expression2,
          loc
        };
      }
      isPatternFilter(obj) {
        return this.isOfSubType(obj, nodeType5, "filter");
      }
      patternBind(expression2, variable, loc) {
        return {
          type: nodeType5,
          subType: "bind",
          expression: expression2,
          variable,
          loc
        };
      }
      isPatternBind(obj) {
        return this.isOfSubType(obj, nodeType5, "bind");
      }
      patternUnion(patterns, loc) {
        return {
          type: nodeType5,
          subType: "union",
          patterns,
          loc
        };
      }
      isPatternUnion(obj) {
        return this.isOfSubType(obj, nodeType5, "union");
      }
      patternMinus(patterns, loc) {
        return {
          type: nodeType5,
          subType: "minus",
          patterns,
          loc
        };
      }
      isPatternMinus(obj) {
        return this.isOfSubType(obj, nodeType5, "minus");
      }
      patternService(name, patterns, silent2, loc) {
        return {
          type: nodeType5,
          subType: "service",
          silent: silent2,
          name,
          patterns,
          loc
        };
      }
      isPatternService(obj) {
        return this.isOfSubType(obj, nodeType5, "service");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/QueryFactory.js
  var nodeType6 = "query";
  function QueryFactoryMixin(Base) {
    return class QueryFactory extends Base {
      isQuery(obj) {
        return this.isOfType(obj, nodeType6);
      }
      isQuerySelect(obj) {
        return this.isOfSubType(obj, nodeType6, "select");
      }
      queryConstruct(loc, context, template, where2, solutionModifiers, datasets, values3) {
        return {
          type: "query",
          subType: "construct",
          context,
          template,
          where: where2,
          solutionModifiers,
          datasets,
          values: values3,
          loc
        };
      }
      isQueryConstruct(obj) {
        return this.isOfSubType(obj, nodeType6, "construct");
      }
      isQueryDescribe(obj) {
        return this.isOfSubType(obj, nodeType6, "describe");
      }
      isQueryAsk(obj) {
        return this.isOfSubType(obj, nodeType6, "ask");
      }
      querySelect(arg, loc) {
        return {
          type: nodeType6,
          subType: "select",
          ...arg,
          loc
        };
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/SolutionModifiersFactory.js
  var nodeType7 = "solutionModifier";
  function SolutionModifiersFactoryMixin(Base) {
    return class SolutionModifiersFactory extends Base {
      isSolutionModifier(obj) {
        return this.isOfType(obj, nodeType7);
      }
      solutionModifierHaving(having2, loc) {
        return {
          type: nodeType7,
          subType: "having",
          having: having2,
          loc
        };
      }
      isSolutionModifierHaving(obj) {
        return this.isOfSubType(obj, nodeType7, "having");
      }
      solutionModifierOrder(orderDefs, loc) {
        return {
          type: nodeType7,
          subType: "order",
          orderDefs,
          loc
        };
      }
      isSolutionModifierOrder(obj) {
        return this.isOfSubType(obj, nodeType7, "order");
      }
      solutionModifierLimitOffset(limit2, offset2, loc) {
        return {
          type: nodeType7,
          subType: "limitOffset",
          limit: limit2,
          offset: offset2,
          loc
        };
      }
      isSolutionModifierLimitOffset(obj) {
        return this.isOfSubType(obj, nodeType7, "limitOffset");
      }
      solutionModifierGroup(groupings, loc) {
        return {
          type: "solutionModifier",
          subType: "group",
          groupings,
          loc
        };
      }
      isSolutionModifierGroup(obj) {
        return this.isOfSubType(obj, nodeType7, "group");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/TermFactory.js
  var nodeType8 = "term";
  function TermFactoryMixin(Base) {
    return class TermFactory extends Base {
      __blankNodeCounter = 0;
      resetBlankNodeCounter() {
        this.__blankNodeCounter = 0;
      }
      isTerm(x) {
        return this.isOfType(x, "term");
      }
      termBlank(label, loc) {
        const base = {
          type: "term",
          subType: "blankNode",
          loc
        };
        if (label === void 0) {
          return { ...base, label: `g_${this.__blankNodeCounter++}` };
        }
        return { ...base, label: `e_${label}` };
      }
      isTermBlank(obj) {
        return this.isOfSubType(obj, nodeType8, "blankNode");
      }
      termLiteral(loc, value, langOrIri) {
        return {
          type: nodeType8,
          subType: "literal",
          value,
          langOrIri,
          loc
        };
      }
      isTermLiteral(obj) {
        return this.isOfSubType(obj, nodeType8, "literal");
      }
      isTermLiteralLangStr(obj) {
        return this.isTermLiteral(obj) && typeof obj.langOrIri === "string";
      }
      isTermLiteralStr(obj) {
        return this.isTermLiteral(obj) && typeof obj.langOrIri === "undefined";
      }
      isTermLiteralTyped(obj) {
        const casted = obj;
        return this.isTermLiteral(obj) && typeof casted.langOrIri === "object" && casted.langOrIri !== null && this.isTermNamed(casted.langOrIri);
      }
      termVariable(value, loc) {
        return {
          type: nodeType8,
          subType: "variable",
          value,
          loc
        };
      }
      isTermVariable(obj) {
        return this.isOfSubType(obj, nodeType8, "variable");
      }
      termNamed(loc, value, prefix) {
        const base = {
          type: nodeType8,
          subType: "namedNode",
          value,
          loc
        };
        if (prefix === void 0) {
          return base;
        }
        return { ...base, prefix };
      }
      isTermNamed(obj) {
        return this.isOfSubType(obj, nodeType8, "namedNode");
      }
      isTermNamedPrefixed(obj) {
        const casted = obj;
        return this.isTermNamed(obj) && typeof casted.prefix === "string";
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/factoryMixins/UpdateOperationFactory.js
  var nodeType9 = "updateOperation";
  function UpdateOperationFactoryMixin(Base) {
    return class UpdateOperationFactory extends Base {
      isUpdateOperation(obj) {
        return this.isOfType(obj, nodeType9);
      }
      updateOperationLoad(loc, source, silent2, destination) {
        return {
          type: nodeType9,
          subType: "load",
          silent: silent2,
          source,
          ...destination && { destination },
          loc
        };
      }
      isUpdateOperationLoad(obj) {
        return this.isOfSubType(obj, nodeType9, "load");
      }
      updateOperationClearDrop(subType, silent2, destination, loc) {
        return {
          type: "updateOperation",
          subType,
          silent: silent2,
          destination,
          loc
        };
      }
      updateOperationClear(destination, silent2, loc) {
        return this.updateOperationClearDrop("clear", silent2, destination, loc);
      }
      isUpdateOperationClear(obj) {
        return this.isOfSubType(obj, nodeType9, "clear");
      }
      updateOperationDrop(destination, silent2, loc) {
        return this.updateOperationClearDrop("drop", silent2, destination, loc);
      }
      isUpdateOperationDrop(obj) {
        return this.isOfSubType(obj, nodeType9, "drop");
      }
      updateOperationCreate(destination, silent2, loc) {
        return {
          type: "updateOperation",
          subType: "create",
          silent: silent2,
          destination,
          loc
        };
      }
      isUpdateOperationCreate(obj) {
        return this.isOfSubType(obj, nodeType9, "create");
      }
      updateOperationAddMoveCopy(subType, source, destination, silent2, loc) {
        return {
          type: "updateOperation",
          subType,
          silent: silent2,
          source,
          destination,
          loc
        };
      }
      updateOperationAdd(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("add", source, destination, silent2, loc);
      }
      isUpdateOperationAdd(obj) {
        return this.isOfSubType(obj, nodeType9, "add");
      }
      updateOperationMove(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("move", source, destination, silent2, loc);
      }
      isUpdateOperationMove(obj) {
        return this.isOfSubType(obj, nodeType9, "move");
      }
      updateOperationCopy(source, destination, silent2, loc) {
        return this.updateOperationAddMoveCopy("copy", source, destination, silent2, loc);
      }
      isUpdateOperationCopy(obj) {
        return this.isOfSubType(obj, nodeType9, "copy");
      }
      updateOperationInsDelDataWhere(subType, data, loc) {
        return {
          type: "updateOperation",
          subType,
          data,
          loc
        };
      }
      updateOperationInsertData(data, loc) {
        return this.updateOperationInsDelDataWhere("insertdata", data, loc);
      }
      isUpdateOperationInsertData(obj) {
        return this.isOfSubType(obj, nodeType9, "insertdata");
      }
      updateOperationDeleteData(data, loc) {
        return this.updateOperationInsDelDataWhere("deletedata", data, loc);
      }
      isUpdateOperationDeleteData(obj) {
        return this.isOfSubType(obj, nodeType9, "deletedata");
      }
      updateOperationDeleteWhere(data, loc) {
        return this.updateOperationInsDelDataWhere("deletewhere", data, loc);
      }
      isUpdateOperationDeleteWhere(obj) {
        return this.isOfSubType(obj, nodeType9, "deletewhere");
      }
      updateOperationModify(loc, insert, del, where2, from2, graph2) {
        return {
          type: "updateOperation",
          subType: "modify",
          insert: insert ?? [],
          delete: del ?? [],
          graph: graph2,
          where: where2,
          from: from2,
          loc
        };
      }
      isUpdateOperationModify(obj) {
        return this.isOfSubType(obj, nodeType9, "modify");
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/astFactory.js
  var AstFactory = class extends asArg(AstCoreFactory).call(ContextFactoryMixin).call(ExpressionFactoryMixin).call(GraphRefFactoryMixin).call(PathFactoryMixin).call(PatternFactoryMixin).call(QueryFactoryMixin).call(SolutionModifiersFactoryMixin).call(TermFactoryMixin).call(UpdateOperationFactoryMixin).returns() {
    alwaysSparql11(obj) {
      return true;
    }
    isPath(obj) {
      return this.isPathPure(obj) || this.isTermNamed(obj);
    }
    isExpression(obj) {
      return this.isExpressionPure(obj) || this.isTermNamed(obj) || this.isTermVariable(obj) || this.isTermLiteral(obj);
    }
    graphNodeIdentifier(graphNode2) {
      return graphNode2.type === "tripleCollection" ? graphNode2.identifier : graphNode2;
    }
    triple(subject, predicate, object2, loc) {
      return {
        type: "triple",
        subject,
        predicate,
        object: object2,
        loc: loc ?? this.sourceLocation(subject, predicate, object2)
      };
    }
    isTriple(obj) {
      return this.isOfType(obj, "triple");
    }
    datasetClauses(clauses, loc) {
      return {
        type: "datasetClauses",
        clauses,
        loc
      };
    }
    isDatasetClauses(obj) {
      return this.isOfType(obj, "datasetClauses");
    }
    wildcard(loc) {
      return { type: "wildcard", loc };
    }
    isWildcard(obj) {
      return this.isOfType(obj, "wildcard");
    }
    isTripleCollection(obj) {
      return this.isOfType(obj, "tripleCollection");
    }
    tripleCollectionBlankNodeProperties(identifier, triples, loc) {
      return {
        type: "tripleCollection",
        subType: "blankNodeProperties",
        identifier,
        triples,
        loc
      };
    }
    isTripleCollectionBlankNodeProperties(obj) {
      return this.isOfSubType(obj, "tripleCollection", "blankNodeProperties");
    }
    tripleCollectionList(identifier, triples, loc) {
      return {
        type: "tripleCollection",
        subType: "list",
        identifier,
        triples,
        loc
      };
    }
    isTripleCollectionList(obj) {
      return this.isOfSubType(obj, "tripleCollection", "list");
    }
    graphQuads(graph2, triples, loc) {
      return {
        type: "graph",
        graph: graph2,
        triples,
        loc
      };
    }
    isGraphQuads(obj) {
      return super.isOfType(obj, "graph");
    }
    isUpdate(obj) {
      return super.isOfType(obj, "update");
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/utils.js
  function sparqlCodepointEscape(input) {
    const sanitizedInput = input.replaceAll(/\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{8})/gu, (_, unicode4, unicode8) => {
      if (unicode4) {
        const charCode2 = Number.parseInt(unicode4, 16);
        return String.fromCodePoint(charCode2);
      }
      const charCode = Number.parseInt(unicode8, 16);
      if (charCode < 65535) {
        return String.fromCodePoint(charCode);
      }
      const substractedCharCode = charCode - 65536;
      return String.fromCodePoint(55296 + (substractedCharCode >> 10), 56320 + (substractedCharCode & 1023));
    });
    if (/[\uD800-\uDBFF](?:[^\uDC00-\uDFFF]|$)/u.test(sanitizedInput)) {
      throw new Error(`Invalid unicode codepoint of surrogate pair without corresponding codepoint`);
    }
    return sanitizedInput;
  }
  var CommonIRIs;
  (function(CommonIRIs2) {
    CommonIRIs2["BOOLEAN"] = "http://www.w3.org/2001/XMLSchema#boolean";
    CommonIRIs2["INTEGER"] = "http://www.w3.org/2001/XMLSchema#integer";
    CommonIRIs2["DECIMAL"] = "http://www.w3.org/2001/XMLSchema#decimal";
    CommonIRIs2["DOUBLE"] = "http://www.w3.org/2001/XMLSchema#double";
    CommonIRIs2["STRING"] = "http://www.w3.org/2001/XMLSchema#string";
    CommonIRIs2["FIRST"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#first";
    CommonIRIs2["REST"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
    CommonIRIs2["NIL"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil";
    CommonIRIs2["TYPE"] = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
  })(CommonIRIs || (CommonIRIs = {}));
  var AstTransformer = class extends TransformerSubTyped {
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/validation/validators.js
  var F = new AstFactory();
  var transformer = new AstTransformer();
  function getAggregatesOfExpression(expression2) {
    if (F.isExpressionAggregate(expression2)) {
      return [expression2];
    }
    if (F.isExpressionOperator(expression2)) {
      const aggregates = [];
      for (const arg of expression2.args) {
        aggregates.push(...getAggregatesOfExpression(arg));
      }
      return aggregates;
    }
    return [];
  }
  function getExpressionId(expression2) {
    if (F.isTerm(expression2) && F.isTermVariable(expression2)) {
      return expression2.value;
    }
    if (F.isExpression(expression2)) {
      if (F.isExpressionAggregate(expression2) && F.isTermVariable(expression2.expression[0])) {
        return expression2.expression[0].value;
      }
      return void 0;
    }
    return expression2.variable.value;
  }
  function getVariablesFromExpression(expression2, variables) {
    if (F.isExpressionOperator(expression2)) {
      for (const expr of expression2.args) {
        getVariablesFromExpression(expr, variables);
      }
    } else if (F.isTerm(expression2) && F.isTermVariable(expression2)) {
      variables.add(expression2.value);
    }
  }
  function queryProjectionIsGood(query2) {
    if (query2.variables.length === 1 && F.isWildcard(query2.variables[0])) {
      if (query2.solutionModifiers.group !== void 0) {
        throw new Error("GROUP BY not allowed with wildcard");
      }
      return;
    }
    const variables = query2.variables;
    const hasCountAggregate = variables.flatMap((varVal) => F.isTerm(varVal) ? [] : getAggregatesOfExpression(varVal.expression)).some((agg) => agg.aggregation === "count" && !agg.expression.some((arg) => F.isWildcard(arg)));
    const groupBy2 = query2.solutionModifiers.group;
    if (hasCountAggregate || groupBy2) {
      for (const selectVar of variables) {
        if (F.isTerm(selectVar)) {
          if (!groupBy2 || !groupBy2.groupings.map((groupvar) => getExpressionId(groupvar)).includes(getExpressionId(selectVar))) {
            throw new Error("Variable not allowed in projection");
          }
        } else if (getAggregatesOfExpression(selectVar.expression).length === 0) {
          const usedvars = /* @__PURE__ */ new Set();
          getVariablesFromExpression(selectVar.expression, usedvars);
          for (const usedvar of usedvars) {
            if (!groupBy2 || !groupBy2.groupings.map((groupVar) => getExpressionId(groupVar)).includes(usedvar)) {
              throw new Error(`Use of ungrouped variable in projection of operation (?${usedvar})`);
            }
          }
        }
      }
    }
    const subqueries = query2.where.patterns.filter((pattern) => pattern.type === "query");
    if (subqueries.length > 0) {
      const selectBoundedVars = /* @__PURE__ */ new Set();
      for (const variable of variables) {
        if ("variable" in variable) {
          selectBoundedVars.add(variable.variable.value);
        }
      }
      const vars = subqueries.flatMap((sub) => sub.variables).map((v) => F.isTerm(v) ? v.value : F.isWildcard(v) ? "*" : v.variable.value);
      const subqueryIds = new Set(vars);
      for (const selectedVarId of selectBoundedVars) {
        if (subqueryIds.has(selectedVarId)) {
          throw new Error(`Target id of 'AS' (?${selectedVarId}) already used in subquery`);
        }
      }
    }
  }
  function findPatternBoundedVars(op, boundedVars) {
    function recurse(x) {
      findPatternBoundedVars(x, boundedVars);
    }
    if (op === void 0) {
      return;
    }
    if (Array.isArray(op)) {
      for (const iter of op) {
        recurse(iter);
      }
    } else if (F.isQuery(op)) {
      if (F.isQuerySelect(op) || F.isQueryDescribe(op)) {
        recurse([
          ...op.variables.some((x) => F.isWildcard(x)) ? [op.where] : op.variables,
          op.solutionModifiers.group,
          op.values
        ]);
      } else {
        recurse(op.solutionModifiers.group);
      }
    } else if (F.isTriple(op)) {
      recurse([op.subject, op.predicate, op.object]);
    } else if (F.isPathPure(op)) {
      recurse(op.items);
    } else if (F.isTripleCollection(op)) {
      recurse([op.identifier, ...op.triples]);
    } else if (F.isSolutionModifierGroup(op)) {
      recurse(op.groupings.filter((g) => "variable" in g).map((x) => x.variable));
    } else if (F.isSolutionModifierHaving(op)) {
      recurse(op.having);
    } else if (F.isSolutionModifierOrder(op)) {
      recurse(op.orderDefs.map((x) => x.expression));
    } else if (F.isPatternValues(op)) {
      for (const v of Object.keys(op.values.at(0) ?? {})) {
        boundedVars.add(v);
      }
    } else if (F.isPatternBgp(op)) {
      recurse(op.triples);
    } else if (F.isPatternGroup(op) || F.isPatternUnion(op) || F.isPatternOptional(op)) {
      recurse(op.patterns);
    } else if (F.isPatternService(op) || F.isPatternGraph(op)) {
      recurse([op.name, ...op.patterns]);
    } else if (F.isPatternBind(op)) {
      recurse(op.variable);
    } else if (F.isTermVariable(op)) {
      boundedVars.add(op.value);
    }
  }
  function checkNote13(patterns) {
    for (const [index, pattern] of patterns.entries()) {
      if (F.isPatternBind(pattern) && index > 0 && F.isPatternBgp(patterns[index - 1])) {
        const bgp = patterns[index - 1];
        const variables = [];
        transformer.visitNodeSpecific(bgp, {}, { term: { variable: { visitor: (var_2) => {
          variables.push(var_2);
        } } } });
        if (variables.some((var_2) => var_2.value === pattern.variable.value)) {
          throw new Error(`Variable used to bind is already bound (?${pattern.variable.value})`);
        }
      }
    }
    const boundedVars = /* @__PURE__ */ new Set();
    for (const pattern of patterns) {
      if (F.isPatternBind(pattern)) {
        if (boundedVars.has(pattern.variable.value)) {
          throw new Error(`Variable used to bind is already bound (?${pattern.variable.value})`);
        }
      } else {
        findPatternBoundedVars(pattern, boundedVars);
      }
    }
  }
  function updateNoReuseBlankNodeLabels(updateQuery) {
    const blankLabelsUsedInInsertData = /* @__PURE__ */ new Set();
    for (const update2 of updateQuery.updates) {
      if (!update2.operation) {
        continue;
      }
      const operation = update2.operation;
      if (operation.subType === "insertdata") {
        const blankNodesHere = /* @__PURE__ */ new Set();
        transformer.visitNodeSpecific(operation, {}, { term: { blankNode: { visitor: (blankNode2) => {
          blankNodesHere.add(blankNode2.label);
          if (blankLabelsUsedInInsertData.has(blankNode2.label)) {
            throw new Error("Detected reuse blank node across different INSERT DATA clauses");
          }
        } } } });
        for (const blankNode2 of blankNodesHere) {
          blankLabelsUsedInInsertData.add(blankNode2);
        }
      }
    }
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/literals.js
  var escapeMap = {
    "	": "\\t",
    "\n": "\\n",
    "\r": "\\r",
    "\b": "\\b",
    "\f": "\\f",
    '"': '\\"',
    "\\": "\\\\"
  };
  function stringEscapedLexical(str2) {
    const lexical = str2.replaceAll(/["\\\t\n\r\b\f]/gu, (char) => escapeMap[char]);
    return `"${lexical}"`;
  }
  var rdfLiteral = {
    name: "rdfLiteral",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION, OR }) => (C) => {
      const value = SUBRULE1(string);
      return OPTION(() => OR([
        { ALT: () => {
          const lang2 = CONSUME(terminals_exports.langTag);
          return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(value, lang2), value.value, lang2.image.slice(1).toLowerCase()));
        } },
        { ALT: () => {
          CONSUME(symbols_exports.hathat);
          const iriVal = SUBRULE1(iri2);
          return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(value, iriVal), value.value, iriVal));
        } }
      ])) ?? value;
    },
    gImpl: ({ SUBRULE, PRINT, PRINT_WORD }) => (ast, { astFactory }) => {
      if (!ast.langOrIri || typeof ast.langOrIri === "string") {
        astFactory.printFilter(ast, () => {
          PRINT_WORD("");
          PRINT(stringEscapedLexical(ast.value));
        });
        if (typeof ast.langOrIri === "string") {
          astFactory.printFilter(ast, () => PRINT("@", ast.langOrIri));
        }
      } else if (astFactory.isSourceLocationNoMaterialize(ast.langOrIri.loc)) {
        astFactory.printFilter(ast, () => {
          PRINT_WORD(ast.value);
        });
      } else {
        astFactory.printFilter(ast, () => {
          PRINT_WORD("");
          PRINT(stringEscapedLexical(ast.value), "^^");
        });
        SUBRULE(iri2, ast.langOrIri);
      }
    }
  };
  var numericLiteral = {
    name: "numericLiteral",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(numericLiteralUnsigned) },
      { ALT: () => SUBRULE(numericLiteralPositive) },
      { ALT: () => SUBRULE(numericLiteralNegative) }
    ])
  };
  var numericLiteralUnsigned = {
    name: "numericLiteralUnsigned",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(terminals_exports.integer), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(terminals_exports.decimal), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(terminals_exports.double), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  var numericLiteralPositive = {
    name: "numericLiteralPositive",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(terminals_exports.integerPositive), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(terminals_exports.decimalPositive), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(terminals_exports.doublePositive), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  var numericLiteralNegative = {
    name: "numericLiteralNegative",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const parsed = OR([
        { ALT: () => [CONSUME(terminals_exports.integerNegative), CommonIRIs.INTEGER] },
        { ALT: () => [CONSUME(terminals_exports.decimalNegative), CommonIRIs.DECIMAL] },
        { ALT: () => [CONSUME(terminals_exports.doubleNegative), CommonIRIs.DOUBLE] }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(parsed[0]), parsed[0].image, C.astFactory.termNamed(C.astFactory.sourceLocation(), parsed[1])));
    }
  };
  var booleanLiteral = {
    name: "booleanLiteral",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const token = OR([
        { ALT: () => CONSUME(true_) },
        { ALT: () => CONSUME(false_) }
      ]);
      return ACTION(() => C.astFactory.termLiteral(C.astFactory.sourceLocation(token), token.image.toLowerCase(), C.astFactory.termNamed(C.astFactory.sourceLocation(), CommonIRIs.BOOLEAN)));
    }
  };
  var string = {
    name: "string",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const x = OR([
        { ALT: () => {
          const token = CONSUME(terminals_exports.stringLiteral1);
          return [token, token.image.slice(1, -1)];
        } },
        { ALT: () => {
          const token = CONSUME(terminals_exports.stringLiteral2);
          return [token, token.image.slice(1, -1)];
        } },
        { ALT: () => {
          const token = CONSUME(terminals_exports.stringLiteralLong1);
          return [token, token.image.slice(3, -3)];
        } },
        { ALT: () => {
          const token = CONSUME(terminals_exports.stringLiteralLong2);
          return [token, token.image.slice(3, -3)];
        } }
      ]);
      return ACTION(() => {
        const F2 = C.astFactory;
        const value = x[1].replaceAll(/\\([tnrbf"'\\])/gu, (_, char) => {
          switch (char) {
            case "t":
              return "	";
            case "n":
              return "\n";
            case "r":
              return "\r";
            case "b":
              return "\b";
            case "f":
              return "\f";
            default:
              return char;
          }
        });
        return F2.termLiteral(F2.sourceLocation(x[0]), value);
      });
    }
  };
  var iri2 = {
    name: "iri",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(iriFull) },
      { ALT: () => SUBRULE(prefixedName) }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => F2.isTermNamedPrefixed(ast) ? SUBRULE(prefixedName, ast) : SUBRULE(iriFull, ast)
  };
  var iriFull = {
    name: "iriFull",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const iriToken = CONSUME(terminals_exports.iriRef);
      return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(iriToken), iriToken.image.slice(1, -1)));
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT("<", ast.value, ">"));
    }
  };
  var prefixedName = {
    name: "prefixedName",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      function verifyPrefix(prefix) {
        if (!C.skipValidation && C.prefixes[prefix] === void 0) {
          throw new Error(`Unknown prefix: ${prefix}`);
        }
      }
      return OR([{
        ALT: () => {
          const longName = CONSUME(terminals_exports.pNameLn);
          return ACTION(() => {
            const [prefix, localName] = longName.image.split(":");
            verifyPrefix(prefix);
            return C.astFactory.termNamed(C.astFactory.sourceLocation(longName), localName, prefix);
          });
        }
      }, {
        ALT: () => {
          const shortName = CONSUME(terminals_exports.pNameNs);
          return ACTION(() => {
            const prefix = shortName.image.slice(0, -1);
            verifyPrefix(prefix);
            return C.astFactory.termNamed(C.astFactory.sourceLocation(shortName), "", prefix);
          });
        }
      }]);
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT(ast.prefix, ":", ast.value));
    }
  };
  var canCreateBlankNodes = /* @__PURE__ */ Symbol("canCreateBlankNodes");
  var blankNode = {
    name: "blankNode",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const result = OR([
        { ALT: () => {
          const labelToken = CONSUME(terminals_exports.blankNodeLabel);
          return ACTION(() => C.astFactory.termBlank(labelToken.image.slice(2), C.astFactory.sourceLocation(labelToken)));
        } },
        { ALT: () => {
          const anonToken = CONSUME(terminals_exports.anon);
          return ACTION(() => C.astFactory.termBlank(void 0, C.astFactory.sourceLocation(anonToken)));
        } }
      ]);
      ACTION(() => {
        if (!C.parseMode.has("canCreateBlankNodes")) {
          throw new Error("Blank nodes are not allowed in this context");
        }
      });
      return result;
    },
    gImpl: ({ PRINT }) => (ast, { astFactory }) => {
      astFactory.printFilter(ast, () => PRINT("_:", ast.label.replace(/^e_/u, "")));
    }
  };
  var verbA = {
    name: "VerbA",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const token = CONSUME(a);
      return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(token), CommonIRIs.TYPE, void 0));
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/general.js
  var prologue = {
    name: "prologue",
    impl: ({ SUBRULE, MANY, OR }) => () => {
      const result = [];
      MANY(() => OR([
        { ALT: () => result.push(SUBRULE(baseDecl2)) },
        // TODO: the [spec](https://www.w3.org/TR/sparql11-query/#iriRefs) says you cannot redefine prefixes.
        //  We might need to check this.
        { ALT: () => result.push(SUBRULE(prefixDecl2)) }
      ]));
      return result;
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      for (const context of ast) {
        if (F2.isContextDefinitionBase(context)) {
          SUBRULE(baseDecl2, context);
        } else {
          SUBRULE(prefixDecl2, context);
        }
      }
    }
  };
  var baseDecl2 = {
    name: "baseDecl",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const base = CONSUME(baseDecl);
      const val = SUBRULE(iriFull);
      return ACTION(() => C.astFactory.contextDefinitionBase(C.astFactory.sourceLocation(base, val), val));
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("BASE "));
      SUBRULE(iri2, ast.value);
      F2.printFilter(ast, () => NEW_LINE());
    }
  };
  var prefixDecl2 = {
    name: "prefixDecl",
    impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
      const prefix = CONSUME(prefixDecl);
      const name = CONSUME(terminals_exports.pNameNs).image.slice(0, -1);
      const value = SUBRULE(iriFull);
      return ACTION(() => {
        C.prefixes[name] = value.value;
        return C.astFactory.contextDefinitionPrefix(C.astFactory.sourceLocation(prefix, value), name, value);
      });
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("PREFIX ", `${ast.key}: `);
      });
      SUBRULE(iri2, ast.value);
      F2.printFilter(ast, () => NEW_LINE());
    }
  };
  var verb = {
    name: "verb",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(varOrIri) },
      { ALT: () => SUBRULE(verbA) }
    ])
  };
  var varOrTerm = {
    name: "varOrTerm",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(graphTerm) }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermVariable(ast)) {
        return SUBRULE(var_, ast);
      }
      return SUBRULE(graphTerm, ast);
    }
  };
  var varOrIri = {
    name: "varOrIri",
    impl: ({ SUBRULE, OR }) => (C) => OR([
      { GATE: () => C.parseMode.has("canParseVars"), ALT: () => SUBRULE(var_) },
      { ALT: () => SUBRULE(iri2) }
    ])
  };
  var var_ = {
    name: "var",
    impl: ({ ACTION, CONSUME, OR }) => (C) => {
      const varToken = OR([
        { ALT: () => CONSUME(terminals_exports.var1) },
        { ALT: () => CONSUME(terminals_exports.var2) }
      ]);
      return ACTION(() => C.astFactory.termVariable(varToken.image.slice(1), C.astFactory.sourceLocation(varToken)));
    },
    gImpl: ({ PRINT }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT(`?${ast.value}`));
    }
  };
  var graphTerm = {
    name: "graphTerm",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => OR([
      { ALT: () => SUBRULE(iri2) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { GATE: () => C.parseMode.has("canCreateBlankNodes"), ALT: () => SUBRULE(blankNode) },
      { ALT: () => {
        const tokenNil = CONSUME(terminals_exports.nil);
        return ACTION(() => C.astFactory.termNamed(C.astFactory.sourceLocation(tokenNil), CommonIRIs.NIL));
      } }
    ]),
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermNamed(ast)) {
        SUBRULE(iri2, ast);
      } else if (F2.isTermLiteral(ast)) {
        SUBRULE(rdfLiteral, ast);
      } else {
        SUBRULE(blankNode, ast);
      }
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/dataSetClause.js
  function datasetClauseUsing(name, token) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => {
        const start = CONSUME(token);
        return OR([
          { ALT: () => {
            const iri3 = SUBRULE(defaultGraphClause);
            return ACTION(() => C.astFactory.wrap({ clauseType: "default", value: iri3 }, C.astFactory.sourceLocation(start, iri3)));
          } },
          { ALT: () => {
            const namedClause = SUBRULE(namedGraphClause);
            return ACTION(() => C.astFactory.wrap({
              clauseType: "named",
              value: namedClause.val
            }, C.astFactory.sourceLocation(start, namedClause)));
          } }
        ]);
      }
    };
  }
  var datasetClause = datasetClauseUsing("datasetClause", from);
  var defaultGraphClause = {
    name: "defaultGraphClause",
    impl: ({ SUBRULE }) => () => SUBRULE(sourceSelector)
  };
  var usingClause2 = datasetClauseUsing("usingClause", usingClause);
  function datasetClauseUsingStar(name, subRule, fromUsing) {
    return {
      name,
      impl: ({ ACTION, MANY, SUBRULE }) => (C) => {
        const clauses = [];
        MANY(() => {
          const clause = SUBRULE(subRule);
          clauses.push(clause);
        });
        return ACTION(() => C.astFactory.datasetClauses(clauses.map((clause) => clause.val), C.astFactory.sourceLocation(...clauses)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
        for (const clause of ast.clauses) {
          F2.printFilter(ast, () => PRINT_WORD(fromUsing));
          if (clause.clauseType === "named") {
            F2.printFilter(ast, () => PRINT_WORD("NAMED"));
          }
          SUBRULE(iri2, clause.value);
        }
      }
    };
  }
  var datasetClauseStar = datasetClauseUsingStar("datasetClauses", datasetClause, "FROM");
  var usingClauseStar = datasetClauseUsingStar("usingClauses", usingClause2, "USING");
  var namedGraphClause = {
    name: "namedGraphClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const named2 = CONSUME(graph_exports.named);
      const iri3 = SUBRULE(sourceSelector);
      return ACTION(() => C.astFactory.wrap(iri3, C.astFactory.sourceLocation(named2, iri3)));
    }
  };
  var sourceSelector = {
    name: "sourceSelector",
    impl: ({ SUBRULE }) => () => SUBRULE(iri2)
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/expressionHelpers.js
  function funcExpr1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg = SUBRULE(expression);
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr2(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME(symbols_exports.comma);
        const arg2 = SUBRULE2(expression);
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg1, arg2], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr3(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, CONSUME1, CONSUME2, SUBRULE1, SUBRULE2, SUBRULE3 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(symbols_exports.comma);
        const arg2 = SUBRULE2(expression);
        CONSUME2(symbols_exports.comma);
        const arg3 = SUBRULE3(expression);
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg1, arg2, arg3], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcVar1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg = SUBRULE(var_);
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExprOrNil1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, OR, SUBRULE }) => (C) => {
        const operator = CONSUME(func);
        return OR([
          { ALT: () => {
            CONSUME(symbols_exports.LParen);
            const arg = SUBRULE(expression);
            const close = CONSUME(symbols_exports.RParen);
            return ACTION(() => C.astFactory.expressionOperation(operator.image, [arg], C.astFactory.sourceLocation(operator, close)));
          } },
          { ALT: () => {
            const nil2 = CONSUME(terminals_exports.nil);
            return ACTION(() => C.astFactory.expressionOperation(operator.image, [], C.astFactory.sourceLocation(operator, nil2)));
          } }
        ]);
      }
    };
  }
  function funcNil1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        const nil2 = CONSUME(terminals_exports.nil);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, [], C.astFactory.sourceLocation(operator, nil2)));
      }
    };
  }
  function funcExprList1(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE }) => (C) => {
        const operator = CONSUME(func);
        const args = SUBRULE(expressionList);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, args.val, C.astFactory.sourceLocation(operator, args)));
      }
    };
  }
  function funcExpr2or3(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, CONSUME1, OPTION, CONSUME2 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(symbols_exports.comma);
        const arg2 = SUBRULE2(expression);
        const arg3 = OPTION(() => {
          CONSUME2(symbols_exports.comma);
          return SUBRULE3(expression);
        });
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, arg3 ? [arg1, arg2, arg3] : [arg1, arg2], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcExpr3or4(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, SUBRULE4, CONSUME1, OPTION, CONSUME2, CONSUME3 }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const arg1 = SUBRULE1(expression);
        CONSUME1(symbols_exports.comma);
        const arg2 = SUBRULE2(expression);
        CONSUME2(symbols_exports.comma);
        const arg3 = SUBRULE3(expression);
        const arg4 = OPTION(() => {
          CONSUME3(symbols_exports.comma);
          return SUBRULE4(expression);
        });
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.expressionOperation(operator.image, arg4 ? [arg1, arg2, arg3, arg4] : [arg1, arg2, arg3], C.astFactory.sourceLocation(operator, close)));
      }
    };
  }
  function funcGroupGraphPattern(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const operator = CONSUME(func);
        const group = SUBRULE(groupGraphPattern);
        return ACTION(() => C.astFactory.expressionPatternOperation(operator.image, group, C.astFactory.sourceLocation(operator, group)));
      }
    };
  }
  function baseAggregateFunc(func) {
    return {
      name: unCapitalize(func.name),
      impl: ({ ACTION, CONSUME, SUBRULE, OPTION }) => (C) => {
        const operator = CONSUME(func);
        CONSUME(symbols_exports.LParen);
        const distinct2 = OPTION(() => CONSUME(distinct));
        const expr1 = SUBRULE(expression);
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.aggregate(operator.image, distinct2 !== void 0, expr1, void 0, C.astFactory.sourceLocation(operator, close)));
      }
    };
  }

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/builtIn.js
  var builtInStr = funcExpr1(BuiltInCalls_exports.str);
  var builtInLang = funcExpr1(BuiltInCalls_exports.lang);
  var builtInLangmatches = funcExpr2(BuiltInCalls_exports.langmatches);
  var builtInDatatype = funcExpr1(BuiltInCalls_exports.datatype);
  var builtInBound = funcVar1(BuiltInCalls_exports.bound);
  var builtInIri = funcExpr1(BuiltInCalls_exports.iri);
  var builtInUri = funcExpr1(BuiltInCalls_exports.uri);
  var builtInBnodeSparqlJs = funcExprOrNil1(BuiltInCalls_exports.bnode);
  var builtInRand = funcNil1(BuiltInCalls_exports.rand);
  var builtInAbs = funcExpr1(BuiltInCalls_exports.abs);
  var builtInCeil = funcExpr1(BuiltInCalls_exports.ceil);
  var builtInFloor = funcExpr1(BuiltInCalls_exports.floor);
  var builtInRound = funcExpr1(BuiltInCalls_exports.round);
  var builtInConcat = funcExprList1(BuiltInCalls_exports.concat);
  var builtInStrlen = funcExpr1(BuiltInCalls_exports.strlen);
  var builtInUcase = funcExpr1(BuiltInCalls_exports.ucase);
  var builtInLcase = funcExpr1(BuiltInCalls_exports.lcase);
  var builtInEncode_for_uri = funcExpr1(BuiltInCalls_exports.encode_for_uri);
  var builtInContains = funcExpr2(BuiltInCalls_exports.contains);
  var builtInStrstarts = funcExpr2(BuiltInCalls_exports.strstarts);
  var builtInStrends = funcExpr2(BuiltInCalls_exports.strends);
  var builtInStrbefore = funcExpr2(BuiltInCalls_exports.strbefore);
  var builtInStrafter = funcExpr2(BuiltInCalls_exports.strafter);
  var builtInYear = funcExpr1(BuiltInCalls_exports.year);
  var builtInMonth = funcExpr1(BuiltInCalls_exports.month);
  var builtInDay = funcExpr1(BuiltInCalls_exports.day);
  var builtInHours = funcExpr1(BuiltInCalls_exports.hours);
  var builtInMinutes = funcExpr1(BuiltInCalls_exports.minutes);
  var builtInSeconds = funcExpr1(BuiltInCalls_exports.seconds);
  var builtInTimezone = funcExpr1(BuiltInCalls_exports.timezone);
  var builtInTz = funcExpr1(BuiltInCalls_exports.tz);
  var builtInNow = funcNil1(BuiltInCalls_exports.now);
  var builtInUuid = funcNil1(BuiltInCalls_exports.uuid);
  var builtInStruuid = funcNil1(BuiltInCalls_exports.struuid);
  var builtInMd5 = funcExpr1(BuiltInCalls_exports.md5);
  var builtInSha1 = funcExpr1(BuiltInCalls_exports.sha1);
  var builtInSha256 = funcExpr1(BuiltInCalls_exports.sha256);
  var builtInSha384 = funcExpr1(BuiltInCalls_exports.sha384);
  var builtInSha512 = funcExpr1(BuiltInCalls_exports.sha512);
  var builtInCoalesce = funcExprList1(BuiltInCalls_exports.coalesce);
  var builtInIf = funcExpr3(BuiltInCalls_exports.if_);
  var builtInStrlang = funcExpr2(BuiltInCalls_exports.strlang);
  var builtInStrdt = funcExpr2(BuiltInCalls_exports.strdt);
  var builtInSameterm = funcExpr2(BuiltInCalls_exports.sameterm);
  var builtInIsiri = funcExpr1(BuiltInCalls_exports.isiri);
  var builtInIsuri = funcExpr1(BuiltInCalls_exports.isuri);
  var builtInIsblank = funcExpr1(BuiltInCalls_exports.isblank);
  var builtInIsliteral = funcExpr1(BuiltInCalls_exports.isliteral);
  var builtInIsnumeric = funcExpr1(BuiltInCalls_exports.isnumeric);
  function builtInCallList(SUBRULE) {
    return [
      { ALT: () => SUBRULE(aggregate) },
      { ALT: () => SUBRULE(builtInStr) },
      { ALT: () => SUBRULE(builtInLang) },
      { ALT: () => SUBRULE(builtInLangmatches) },
      { ALT: () => SUBRULE(builtInDatatype) },
      { ALT: () => SUBRULE(builtInBound) },
      { ALT: () => SUBRULE(builtInIri) },
      { ALT: () => SUBRULE(builtInUri) },
      { ALT: () => SUBRULE(builtInBnodeSparqlJs) },
      { ALT: () => SUBRULE(builtInRand) },
      { ALT: () => SUBRULE(builtInAbs) },
      { ALT: () => SUBRULE(builtInCeil) },
      { ALT: () => SUBRULE(builtInFloor) },
      { ALT: () => SUBRULE(builtInRound) },
      { ALT: () => SUBRULE(builtInConcat) },
      { ALT: () => SUBRULE(substringExpression) },
      { ALT: () => SUBRULE(builtInStrlen) },
      { ALT: () => SUBRULE(strReplaceExpression) },
      { ALT: () => SUBRULE(builtInUcase) },
      { ALT: () => SUBRULE(builtInLcase) },
      { ALT: () => SUBRULE(builtInEncode_for_uri) },
      { ALT: () => SUBRULE(builtInContains) },
      { ALT: () => SUBRULE(builtInStrstarts) },
      { ALT: () => SUBRULE(builtInStrends) },
      { ALT: () => SUBRULE(builtInStrbefore) },
      { ALT: () => SUBRULE(builtInStrafter) },
      { ALT: () => SUBRULE(builtInYear) },
      { ALT: () => SUBRULE(builtInMonth) },
      { ALT: () => SUBRULE(builtInDay) },
      { ALT: () => SUBRULE(builtInHours) },
      { ALT: () => SUBRULE(builtInMinutes) },
      { ALT: () => SUBRULE(builtInSeconds) },
      { ALT: () => SUBRULE(builtInTimezone) },
      { ALT: () => SUBRULE(builtInTz) },
      { ALT: () => SUBRULE(builtInNow) },
      { ALT: () => SUBRULE(builtInUuid) },
      { ALT: () => SUBRULE(builtInStruuid) },
      { ALT: () => SUBRULE(builtInMd5) },
      { ALT: () => SUBRULE(builtInSha1) },
      { ALT: () => SUBRULE(builtInSha256) },
      { ALT: () => SUBRULE(builtInSha384) },
      { ALT: () => SUBRULE(builtInSha512) },
      { ALT: () => SUBRULE(builtInCoalesce) },
      { ALT: () => SUBRULE(builtInIf) },
      { ALT: () => SUBRULE(builtInStrlang) },
      { ALT: () => SUBRULE(builtInStrdt) },
      { ALT: () => SUBRULE(builtInSameterm) },
      { ALT: () => SUBRULE(builtInIsiri) },
      { ALT: () => SUBRULE(builtInIsuri) },
      { ALT: () => SUBRULE(builtInIsblank) },
      { ALT: () => SUBRULE(builtInIsliteral) },
      { ALT: () => SUBRULE(builtInIsnumeric) },
      { ALT: () => SUBRULE(regexExpression) },
      { ALT: () => SUBRULE(existsFunc) },
      { ALT: () => SUBRULE(notExistsFunc) }
    ];
  }
  var builtInCall = {
    name: "builtInCall",
    impl: ({ OR, SUBRULE, cache }) => () => {
      const cached = cache.get(builtInCall);
      if (cached) {
        return OR(cached);
      }
      const builtIns = builtInCallList(SUBRULE);
      cache.set(builtInCall, builtIns);
      return OR(builtIns);
    }
  };
  var regexExpression = funcExpr2or3(BuiltInCalls_exports.regex);
  var substringExpression = funcExpr2or3(BuiltInCalls_exports.substr);
  var strReplaceExpression = funcExpr3or4(BuiltInCalls_exports.replace);
  var existsFunc = funcGroupGraphPattern(BuiltInCalls_exports.exists);
  var notExistsFunc = funcGroupGraphPattern(BuiltInCalls_exports.notexists);
  var aggregateCount = {
    name: unCapitalize(BuiltInCalls_exports.count.name),
    impl: ({ ACTION, CONSUME, SUBRULE, OR, OPTION }) => (C) => {
      const operatorToken = CONSUME(BuiltInCalls_exports.count);
      CONSUME(symbols_exports.LParen);
      const distinctToken = OPTION(() => CONSUME(distinct));
      const expressionVal = OR([
        { ALT: () => {
          const starToken = CONSUME(symbols_exports.star);
          return ACTION(() => C.astFactory.wildcard(C.astFactory.sourceLocation(starToken)));
        } },
        { ALT: () => SUBRULE(expression) }
      ]);
      const closeToken = CONSUME(symbols_exports.RParen);
      return ACTION(() => {
        const F2 = C.astFactory;
        if (C.astFactory.isWildcard(expressionVal)) {
          return F2.aggregate(operatorToken.image, Boolean(distinctToken), expressionVal, void 0, C.astFactory.sourceLocation(operatorToken, closeToken));
        }
        return F2.aggregate(operatorToken.image, Boolean(distinctToken), expressionVal, void 0, C.astFactory.sourceLocation(operatorToken, closeToken));
      });
    }
  };
  var aggregateSum = baseAggregateFunc(BuiltInCalls_exports.sum);
  var aggregateMin = baseAggregateFunc(BuiltInCalls_exports.min);
  var aggregateMax = baseAggregateFunc(BuiltInCalls_exports.max);
  var aggregateAvg = baseAggregateFunc(BuiltInCalls_exports.avg);
  var aggregateSample = baseAggregateFunc(BuiltInCalls_exports.sample);
  var aggregateGroup_concat = {
    name: unCapitalize(BuiltInCalls_exports.groupConcat.name),
    impl: ({ ACTION, CONSUME, OPTION1, SUBRULE, OPTION2 }) => (C) => {
      const operatorToken = CONSUME(BuiltInCalls_exports.groupConcat);
      CONSUME(symbols_exports.LParen);
      const distinctToken = OPTION1(() => CONSUME(distinct));
      const expr = SUBRULE(expression);
      const sep = OPTION2(() => {
        CONSUME(symbols_exports.semi);
        CONSUME(separator);
        CONSUME(symbols_exports.equal);
        return SUBRULE(string);
      });
      const closeToken = CONSUME(symbols_exports.RParen);
      return ACTION(() => {
        const F2 = C.astFactory;
        return F2.aggregate(operatorToken.image, Boolean(distinctToken), expr, sep?.value ?? " ", F2.sourceLocation(operatorToken, closeToken));
      });
    }
  };
  var aggregate = {
    name: "aggregate",
    impl: ({ ACTION, SUBRULE, OR }) => (C) => {
      const wasInAggregate = ACTION(() => C.parseMode.has("inAggregate"));
      ACTION(() => C.parseMode.add("inAggregate"));
      const result = OR([
        { ALT: () => SUBRULE(aggregateCount) },
        { ALT: () => SUBRULE(aggregateSum) },
        { ALT: () => SUBRULE(aggregateMin) },
        { ALT: () => SUBRULE(aggregateMax) },
        { ALT: () => SUBRULE(aggregateAvg) },
        { ALT: () => SUBRULE(aggregateSample) },
        { ALT: () => SUBRULE(aggregateGroup_concat) }
      ]);
      ACTION(() => !wasInAggregate && C.parseMode.delete("inAggregate"));
      ACTION(() => {
        if (!C.parseMode.has("canParseAggregate")) {
          throw new Error("Aggregates are only allowed in SELECT, HAVING, and ORDER BY clauses.");
        }
        if (C.parseMode.has("inAggregate")) {
          throw new Error("An aggregate function is not allowed within an aggregate function.");
        }
      });
      return result;
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD(ast.aggregation.toUpperCase(), "(");
        if (ast.distinct) {
          PRINT_WORD("DISTINCT");
        }
      });
      const arg = ast.expression[0];
      if (F2.isWildcard(arg)) {
        F2.printFilter(ast, () => PRINT_WORD("*"));
      } else {
        SUBRULE(expression, arg);
      }
      if (F2.isExpressionAggregateSeparator(ast)) {
        F2.printFilter(ast, () => PRINT_WORD(";", "SEPARATOR", "=", stringEscapedLexical(ast.separator)));
      }
      F2.printFilter(ast, () => PRINT_WORD(")"));
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/propertyPaths.js
  var path = {
    name: "path",
    impl: ({ SUBRULE }) => () => SUBRULE(pathAlternative)
  };
  var pathGenerator = {
    name: "path",
    gImpl: ({ PRINT, SUBRULE }) => (ast, { astFactory: F2 }, braces = true) => {
      if (F2.isTerm(ast) && F2.isTermNamed(ast)) {
        SUBRULE(iri2, ast);
      } else {
        F2.printFilter(ast, () => braces && PRINT("("));
        switch (ast.subType) {
          case "|":
          case "/": {
            const [head2, ...tail] = ast.items;
            SUBRULE(pathGenerator, head2, braces);
            for (const val of tail) {
              F2.printFilter(ast, () => PRINT(ast.subType));
              SUBRULE(pathGenerator, val, braces);
            }
            break;
          }
          case "^":
            F2.printFilter(ast, () => PRINT("^"));
            SUBRULE(pathGenerator, ast.items[0], braces);
            break;
          case "?":
          case "*":
          case "+":
            SUBRULE(pathGenerator, ast.items[0], braces);
            F2.printFilter(ast, () => PRINT(ast.subType));
            break;
          case "!":
            F2.printFilter(ast, () => PRINT("!"));
            F2.printFilter(ast, () => PRINT("("));
            SUBRULE(pathGenerator, ast.items[0], false);
            F2.printFilter(ast, () => PRINT(")"));
            break;
        }
        F2.printFilter(ast, () => braces && PRINT(")"));
      }
    }
  };
  function pathChainHelper(name, SEP, subType, subRule) {
    return {
      name,
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, MANY }) => (C) => {
        const head2 = SUBRULE1(subRule);
        let tailEnd = head2;
        const tail = [];
        MANY(() => {
          CONSUME(SEP);
          tailEnd = SUBRULE2(subRule);
          tail.push(tailEnd);
        });
        return ACTION(() => tail.length === 0 ? head2 : C.astFactory.path(subType, [head2, ...tail], C.astFactory.sourceLocation(head2, tailEnd)));
      }
    };
  }
  var pathEltOrInverse = {
    name: "pathEltOrInverse",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR }) => (C) => OR([
      { ALT: () => SUBRULE1(pathElt) },
      { ALT: () => {
        const hat2 = CONSUME(symbols_exports.hat);
        const item = SUBRULE2(pathElt);
        return ACTION(() => C.astFactory.path("^", [item], C.astFactory.sourceLocation(hat2, item)));
      } }
    ])
  };
  var pathSequence = pathChainHelper("pathSequence", symbols_exports.slash, "/", pathEltOrInverse);
  var pathAlternative = pathChainHelper("pathAlternative", symbols_exports.pipe, "|", pathSequence);
  var pathElt = {
    name: "pathElt",
    impl: ({ ACTION, SUBRULE, OPTION }) => (C) => {
      const item = SUBRULE(pathPrimary);
      const modification = OPTION(() => SUBRULE(pathMod));
      return ACTION(() => modification === void 0 ? item : C.astFactory.path(modification.image, [item], C.astFactory.sourceLocation(item, modification)));
    }
  };
  var pathMod = {
    name: "pathMod",
    impl: ({ CONSUME, OR }) => () => OR([
      { ALT: () => CONSUME(symbols_exports.question) },
      { ALT: () => CONSUME(symbols_exports.star) },
      { ALT: () => CONSUME(symbols_exports.opPlus) }
    ])
  };
  var pathPrimary = {
    name: "pathPrimary",
    impl: ({ SUBRULE, CONSUME, OR }) => () => OR([
      { ALT: () => SUBRULE(iri2) },
      { ALT: () => SUBRULE(verbA) },
      { ALT: () => SUBRULE(pathNegatedPropertySet) },
      { ALT: () => {
        CONSUME(symbols_exports.LParen);
        const resRecursive = SUBRULE(path);
        CONSUME(symbols_exports.RParen);
        return resRecursive;
      } }
    ])
  };
  var pathNegatedPropertySet = {
    name: "pathNegatedPropertySet",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, SUBRULE3, OR, MANY }) => (C) => {
      const exclamation2 = CONSUME(symbols_exports.exclamation);
      return OR([
        { ALT: () => {
          const noAlternative = SUBRULE1(pathOneInPropertySet);
          return ACTION(() => C.astFactory.path("!", [noAlternative], C.astFactory.sourceLocation(exclamation2, noAlternative)));
        } },
        { ALT: () => {
          const open = CONSUME(symbols_exports.LParen);
          const head2 = SUBRULE2(pathOneInPropertySet);
          const tail = [];
          MANY(() => {
            CONSUME(symbols_exports.pipe);
            const item = SUBRULE3(pathOneInPropertySet);
            tail.push(item);
          });
          const close = CONSUME(symbols_exports.RParen);
          return ACTION(() => {
            const F2 = C.astFactory;
            if (tail.length === 0) {
              return F2.path("!", [head2], F2.sourceLocation(exclamation2, close));
            }
            return F2.path("!", [F2.path("|", [head2, ...tail], F2.sourceLocation(open, close))], F2.sourceLocation(exclamation2, close));
          });
        } }
      ]);
    }
  };
  var pathOneInPropertySet = {
    name: "pathOneInPropertySet",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR1, OR2 }) => (C) => OR1([
      { ALT: () => SUBRULE1(iri2) },
      { ALT: () => SUBRULE1(verbA) },
      { ALT: () => {
        const hat2 = CONSUME(symbols_exports.hat);
        const item = OR2([
          { ALT: () => SUBRULE2(iri2) },
          { ALT: () => SUBRULE2(verbA) }
        ]);
        return ACTION(() => C.astFactory.path("^", [item], C.astFactory.sourceLocation(hat2, item)));
      } }
    ])
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/tripleBlock.js
  function triplesDotSeperated(triplesSameSubjectSubrule) {
    return ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME, OPTION }) => (C) => {
      const triples = [];
      let parsedDot = true;
      let dotToken;
      AT_LEAST_ONE({
        GATE: () => parsedDot,
        DEF: () => {
          parsedDot = false;
          const template = SUBRULE(triplesSameSubjectSubrule);
          ACTION(() => {
            triples.push(...template);
          });
          OPTION(() => {
            dotToken = CONSUME(symbols_exports.dot);
            parsedDot = true;
          });
        }
      });
      return ACTION(() => C.astFactory.patternBgp(triples, C.astFactory.sourceLocation(...triples, dotToken)));
    };
  }
  var triplesBlock = {
    name: "triplesBlock",
    impl: (implArgs) => (C) => triplesDotSeperated(triplesSameSubjectPath)(implArgs)(C),
    gImpl: ({ SUBRULE, PRINT_WORD, HANDLE_LOC, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      for (const [index, triple] of ast.triples.entries()) {
        HANDLE_LOC(triple, () => {
          const nextTriple = ast.triples.at(index + 1);
          if (F2.isTripleCollection(triple)) {
            SUBRULE(graphNodePath, triple);
            F2.printFilter(triple, () => {
              PRINT_WORD(".");
              NEW_LINE();
            });
          } else {
            SUBRULE(graphNodePath, triple.subject);
            F2.printFilter(triple, () => PRINT_WORD(""));
            if (F2.isTerm(triple.predicate) && F2.isTermVariable(triple.predicate)) {
              SUBRULE(varOrTerm, triple.predicate);
            } else {
              SUBRULE(pathGenerator, triple.predicate, void 0);
            }
            F2.printFilter(triple, () => PRINT_WORD(""));
            SUBRULE(graphNodePath, triple.object);
            if (nextTriple === void 0 || F2.isTripleCollection(nextTriple) || !F2.isSourceLocationNoMaterialize(nextTriple.subject.loc)) {
              F2.printFilter(ast, () => {
                PRINT_WORD(".");
                NEW_LINE();
              });
            } else if (F2.isSourceLocationNoMaterialize(nextTriple.predicate.loc)) {
              F2.printFilter(ast, () => PRINT_WORD(","));
            } else {
              F2.printFilter(ast, () => {
                PRINT_WORD(";");
                NEW_LINE();
              });
            }
          }
        });
      }
    }
  };
  function triplesSameSubjectImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, OR }) => (C) => OR([
        { ALT: () => {
          const subject = SUBRULE(varOrTerm);
          const res = SUBRULE(allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty, ACTION(() => C.astFactory.dematerialized(subject)));
          return ACTION(() => {
            res[0].subject = subject;
            res[0].loc = C.astFactory.sourceLocation(subject, res[0]);
            return res;
          });
        } },
        { ALT: () => {
          const subjectNode = SUBRULE(allowPaths ? triplesNodePath : triplesNode);
          const restNode = SUBRULE(allowPaths ? propertyListPath : propertyList, ACTION(() => C.astFactory.graphNodeIdentifier(subjectNode)));
          return ACTION(() => {
            if (restNode.length === 0) {
              return [subjectNode];
            }
            restNode[0].subject = subjectNode;
            restNode[0].loc = C.astFactory.sourceLocation(subjectNode, restNode[0]);
            return restNode;
          });
        } }
      ])
    };
  }
  var triplesSameSubject = triplesSameSubjectImpl("triplesSameSubject", false);
  var triplesSameSubjectPath = triplesSameSubjectImpl("triplesSameSubjectPath", true);
  var triplesTemplate = {
    name: "triplesTemplate",
    impl: triplesDotSeperated(triplesSameSubject)
  };
  function propertyListImpl(name, allowPaths) {
    return {
      name,
      impl: ({ SUBRULE, OPTION }) => (_, subject) => OPTION(() => SUBRULE(allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty, subject)) ?? []
    };
  }
  var propertyList = propertyListImpl("propertyList", false);
  var propertyListPath = propertyListImpl("propertyListPath", true);
  function propertyListNotEmptyImplementation(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, CONSUME, AT_LEAST_ONE, SUBRULE1, MANY2, OR1 }) => (_, subject) => {
        const result = [];
        let parsedSemi = true;
        AT_LEAST_ONE({
          GATE: () => parsedSemi,
          DEF: () => {
            parsedSemi = false;
            const predicate = allowPaths ? OR1([
              { ALT: () => SUBRULE1(verbPath) },
              { ALT: () => SUBRULE1(verbSimple) }
            ]) : SUBRULE1(verb);
            const triples = SUBRULE1(allowPaths ? objectListPath : objectList, subject, predicate);
            MANY2(() => {
              CONSUME(symbols_exports.semi);
              parsedSemi = true;
            });
            ACTION(() => {
              result.push(...triples);
            });
          }
        });
        return result;
      }
    };
  }
  var propertyListNotEmpty = propertyListNotEmptyImplementation("propertyListNotEmpty", false);
  var propertyListPathNotEmpty = propertyListNotEmptyImplementation("propertyListPathNotEmpty", true);
  var verbPath = {
    name: "verbPath",
    impl: ({ SUBRULE }) => () => SUBRULE(path)
  };
  var verbSimple = {
    name: "verbSimple",
    impl: ({ SUBRULE }) => () => SUBRULE(var_)
  };
  function objectListImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE, AT_LEAST_ONE_SEP }) => (_, subj, pred) => {
        const objects = [];
        AT_LEAST_ONE_SEP({
          SEP: symbols_exports.comma,
          DEF: () => {
            const objectTriple = SUBRULE(allowPaths ? objectPath : object, subj, pred);
            ACTION(() => {
              objects.push(objectTriple);
            });
          }
        });
        return objects;
      }
    };
  }
  var objectList = objectListImpl("objectList", false);
  var objectListPath = objectListImpl("objectListPath", true);
  function objectImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, SUBRULE }) => (C, subject, predicate) => {
        const node = SUBRULE(allowPaths ? graphNodePath : graphNode);
        return ACTION(() => C.astFactory.triple(subject, predicate, node));
      }
    };
  }
  var object = objectImpl("object", false);
  var objectPath = objectImpl("objectPath", true);
  function collectionImpl(name, allowPaths) {
    return {
      name,
      impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
        const terms = [];
        const startToken = CONSUME(symbols_exports.LParen);
        AT_LEAST_ONE(() => {
          terms.push(SUBRULE(allowPaths ? graphNodePath : graphNode));
        });
        const endToken = CONSUME(symbols_exports.RParen);
        return ACTION(() => {
          const F2 = C.astFactory;
          const triples = [];
          const predFirst = F2.termNamed(F2.sourceLocation(), CommonIRIs.FIRST, void 0);
          const predRest = F2.termNamed(F2.sourceLocation(), CommonIRIs.REST, void 0);
          const predNil = F2.termNamed(F2.sourceLocation(), CommonIRIs.NIL, void 0);
          const listHead = F2.termBlank(void 0, F2.sourceLocation());
          let iterHead = listHead;
          for (const [index, term] of terms.entries()) {
            const lastInList = index === terms.length - 1;
            const headTriple = F2.triple(iterHead, predFirst, term);
            triples.push(headTriple);
            if (lastInList) {
              const nilTriple = F2.triple(iterHead, predRest, predNil);
              triples.push(nilTriple);
            } else {
              const tail = F2.termBlank(void 0, F2.sourceLocation());
              const linkTriple = F2.triple(iterHead, predRest, tail);
              triples.push(linkTriple);
              iterHead = tail;
            }
          }
          return F2.tripleCollectionList(listHead, triples, F2.sourceLocation(startToken, endToken));
        });
      },
      gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => PRINT_WORD("("));
        for (const [idx, triple] of ast.triples.entries()) {
          if (idx % 2 === 0) {
            SUBRULE(graphNodePath, triple.object);
          }
        }
        F2.printFilter(ast, () => PRINT_WORD(")"));
      }
    };
  }
  var collection = collectionImpl("collection", false);
  var collectionPath = collectionImpl("collectionPath", true);
  function triplesNodeImpl(name, allowPaths) {
    return {
      name,
      impl: ({ SUBRULE, OR }) => () => OR([
        { ALT: () => SUBRULE(allowPaths ? collectionPath : collection) },
        { ALT: () => SUBRULE(allowPaths ? blankNodePropertyListPath : blankNodePropertyList) }
      ]),
      gImpl: ({ SUBRULE }) => (ast) => ast.subType === "list" ? SUBRULE(collectionPath, ast) : SUBRULE(blankNodePropertyListPath, ast)
    };
  }
  var triplesNode = triplesNodeImpl("triplesNode", false);
  var triplesNodePath = triplesNodeImpl("triplesNodePath", true);
  function blankNodePropertyListImpl(name, allowPaths) {
    const propertyPathNotEmptyImpl = allowPaths ? propertyListPathNotEmpty : propertyListNotEmpty;
    return {
      name,
      impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
        const startToken = CONSUME(symbols_exports.LSquare);
        const blankNode2 = ACTION(() => C.astFactory.termBlank(void 0, C.astFactory.sourceLocation()));
        const propList = SUBRULE(propertyPathNotEmptyImpl, blankNode2);
        const endToken = CONSUME(symbols_exports.RSquare);
        return ACTION(() => C.astFactory.tripleCollectionBlankNodeProperties(blankNode2, propList, C.astFactory.sourceLocation(startToken, endToken)));
      },
      gImpl: ({ SUBRULE, PRINT, PRINT_WORD, HANDLE_LOC, PRINT_ON_EMPTY, NEW_LINE }) => (ast, c) => {
        const { astFactory: F2, indentInc } = c;
        F2.printFilter(ast, () => {
          c[traqulaIndentation] += indentInc;
          PRINT("[");
          NEW_LINE();
        });
        for (const triple of ast.triples) {
          HANDLE_LOC(triple, () => {
            if (F2.isTerm(triple.predicate) && F2.isTermVariable(triple.predicate)) {
              SUBRULE(varOrTerm, triple.predicate);
            } else {
              SUBRULE(pathGenerator, triple.predicate, void 0);
            }
            F2.printFilter(triple, () => PRINT_WORD(""));
            SUBRULE(graphNodePath, triple.object);
            F2.printFilter(ast, () => {
              PRINT_WORD(";");
              NEW_LINE();
            });
          });
        }
        F2.printFilter(ast, () => {
          c[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("]");
        });
      }
    };
  }
  var blankNodePropertyList = blankNodePropertyListImpl("blankNodePropertyList", false);
  var blankNodePropertyListPath = blankNodePropertyListImpl("blankNodePropertyListPath", true);
  function graphNodeImpl(name, allowPaths) {
    const triplesNodeRule = allowPaths ? triplesNodePath : triplesNode;
    return {
      name,
      impl: ({ SUBRULE, OR }) => (C) => OR([
        { ALT: () => SUBRULE(varOrTerm) },
        {
          GATE: () => C.parseMode.has("canCreateBlankNodes"),
          ALT: () => SUBRULE(triplesNodeRule)
        }
      ]),
      gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
        if (F2.isTerm(ast)) {
          SUBRULE(varOrTerm, ast);
        } else {
          SUBRULE(triplesNodeRule, ast);
        }
      }
    };
  }
  var graphNode = graphNodeImpl("graphNode", false);
  var graphNodePath = graphNodeImpl("graphNodePath", true);

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/whereClause.js
  var whereClause = {
    name: "whereClause",
    impl: ({ ACTION, SUBRULE, CONSUME, OPTION }) => (C) => {
      const where2 = OPTION(() => CONSUME(where));
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.wrap(group, C.astFactory.sourceLocation(where2, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("WHERE"));
      SUBRULE(groupGraphPattern, ast.val);
    }
  };
  var groupGraphPattern = {
    name: "groupGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => {
      const open = CONSUME(symbols_exports.LCurly);
      const patterns = OR([
        { ALT: () => [SUBRULE(subSelect)] },
        { ALT: () => SUBRULE(groupGraphPatternSub) }
      ]);
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.patternGroup(patterns, C.astFactory.sourceLocation(open, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD("{");
        NEW_LINE();
      });
      for (const pattern of ast.patterns) {
        SUBRULE(generatePattern, pattern);
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };
  var generatePattern = {
    name: "generatePattern",
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (ast.type === "query") {
        SUBRULE(query, F2.querySelect({
          context: [],
          datasets: F2.datasetClauses([], F2.sourceLocation()),
          where: ast.where,
          variables: ast.variables,
          solutionModifiers: ast.solutionModifiers,
          values: ast.values,
          distinct: ast.distinct,
          reduced: ast.reduced
        }, ast.loc));
      } else if (ast.subType === "group") {
        SUBRULE(groupGraphPattern, ast);
      } else if (ast.subType === "bgp") {
        SUBRULE(triplesBlock, ast);
      } else {
        SUBRULE(graphPatternNotTriples, ast);
      }
    }
  };
  var groupGraphPatternSub = {
    name: "groupGraphPatternSub",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OPTION3 }) => (C) => {
      const patterns = [];
      const bgpPattern = OPTION1(() => SUBRULE1(triplesBlock));
      if (bgpPattern) {
        patterns.push(bgpPattern);
      }
      MANY(() => {
        const notTriples = SUBRULE(graphPatternNotTriples);
        patterns.push(notTriples);
        OPTION2(() => CONSUME(symbols_exports.dot));
        const moreTriples = OPTION3(() => SUBRULE2(triplesBlock));
        if (moreTriples) {
          patterns.push(moreTriples);
        }
      });
      ACTION(() => !C.skipValidation && checkNote13(patterns));
      return patterns;
    }
  };
  var graphPatternNotTriples = {
    name: "graphPatternNotTriples",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(groupOrUnionGraphPattern) },
      { ALT: () => SUBRULE(optionalGraphPattern) },
      { ALT: () => SUBRULE(minusGraphPattern) },
      { ALT: () => SUBRULE(graphGraphPattern) },
      { ALT: () => SUBRULE(serviceGraphPattern) },
      { ALT: () => SUBRULE(filter3) },
      { ALT: () => SUBRULE(bind2) },
      { ALT: () => SUBRULE(inlineData) }
    ]),
    gImpl: ({ SUBRULE }) => (ast) => {
      switch (ast.subType) {
        case "group":
        case "union":
          SUBRULE(groupOrUnionGraphPattern, ast);
          break;
        case "optional":
          SUBRULE(optionalGraphPattern, ast);
          break;
        case "minus":
          SUBRULE(minusGraphPattern, ast);
          break;
        case "graph":
          SUBRULE(graphGraphPattern, ast);
          break;
        case "service":
          SUBRULE(serviceGraphPattern, ast);
          break;
        case "filter":
          SUBRULE(filter3, ast);
          break;
        case "bind":
          SUBRULE(bind2, ast);
          break;
        case "values":
          SUBRULE(inlineData, ast);
          break;
      }
    }
  };
  var optionalGraphPattern = {
    name: "optionalGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const optional2 = CONSUME(optional);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternOptional(group.patterns, C.astFactory.sourceLocation(optional2, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("OPTIONAL"));
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  var graphGraphPattern = {
    name: "graphGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const graph2 = CONSUME(graph_exports.graph);
      const name = SUBRULE(varOrIri);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternGraph(name, group.patterns, C.astFactory.sourceLocation(graph2, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(varOrTerm, ast.name);
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  var serviceGraphPattern = {
    name: "serviceGraphPattern",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const service2 = CONSUME(service);
      const silent2 = OPTION(() => {
        CONSUME(silent);
        return true;
      }) ?? false;
      const name = SUBRULE1(varOrIri);
      const group = SUBRULE1(groupGraphPattern);
      return ACTION(() => C.astFactory.patternService(name, group.patterns, silent2, C.astFactory.sourceLocation(service2, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD("SERVICE");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(varOrTerm, ast.name);
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  var bind2 = {
    name: "bind",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const bind3 = CONSUME(bind);
      CONSUME(symbols_exports.LParen);
      const expressionVal = SUBRULE(expression);
      CONSUME(as);
      const variable = SUBRULE(var_);
      const close = CONSUME(symbols_exports.RParen);
      return ACTION(() => C.astFactory.patternBind(expressionVal, variable, C.astFactory.sourceLocation(bind3, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("BIND", "("));
      SUBRULE(expression, ast.expression);
      F2.printFilter(ast, () => PRINT_WORD("AS"));
      SUBRULE(var_, ast.variable);
      F2.printFilter(ast, () => {
        PRINT_WORD(")");
        NEW_LINE();
      });
    }
  };
  var inlineData = {
    name: "inlineData",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const values3 = CONSUME(values2);
      const datablock = SUBRULE(dataBlock);
      return ACTION(() => {
        datablock.loc = C.astFactory.sourceLocation(values3, datablock);
        return datablock;
      });
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      const variables = ast.variables;
      const singleVar = variables.length === 1;
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("VALUES", singleVar ? "" : "( ");
      });
      for (const variable of variables) {
        F2.printFilter(ast, () => PRINT_WORD(""));
        SUBRULE(varOrTerm, variable);
        F2.printFilter(ast, () => PRINT_WORD(""));
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD(singleVar ? "" : ")", "{");
        NEW_LINE();
      });
      for (const mapping of ast.values) {
        F2.printFilter(ast, () => !singleVar && PRINT_WORD("("));
        for (const variable of variables) {
          const var_2 = variable.value;
          if (mapping[var_2] === void 0) {
            F2.printFilter(ast, () => PRINT_WORD("UNDEF"));
          } else {
            SUBRULE(graphNodePath, mapping[var_2]);
            F2.printFilter(ast, () => PRINT_WORD(""));
          }
        }
        F2.printFilter(ast, () => {
          PRINT_WORD(singleVar ? "" : ")");
          NEW_LINE();
        });
      }
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };
  var dataBlock = {
    name: "dataBlock",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(inlineDataOneVar) },
      { ALT: () => SUBRULE(inlineDataFull) }
    ])
  };
  var inlineDataOneVar = {
    name: "inlineDataOneVar",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY }) => (C) => {
      const res = [];
      const varVal = SUBRULE(var_);
      CONSUME(symbols_exports.LCurly);
      MANY(() => {
        const value = SUBRULE(dataBlockValue);
        ACTION(() => {
          res.push(Object.assign(/* @__PURE__ */ Object.create(null), { [varVal.value]: value }));
        });
      });
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.patternValues([varVal], res, C.astFactory.sourceLocation(varVal, close)));
    }
  };
  var inlineDataFull = {
    name: "inlineDataFull",
    impl: ({ ACTION, OR, MANY1, MANY2, MANY3, MANY4, SUBRULE, CONSUME1, CONSUME2 }) => (C) => {
      const res = [];
      const vars = [];
      return OR([
        { ALT: () => {
          const nil2 = CONSUME1(terminals_exports.nil);
          CONSUME1(symbols_exports.LCurly);
          MANY1(() => {
            CONSUME2(terminals_exports.nil);
            res.push(/* @__PURE__ */ Object.create(null));
          });
          const close = CONSUME1(symbols_exports.RCurly);
          return ACTION(() => C.astFactory.patternValues(vars, res, C.astFactory.sourceLocation(nil2, close)));
        } },
        { ALT: () => {
          const open = CONSUME1(symbols_exports.LParen);
          MANY2(() => {
            vars.push(SUBRULE(var_));
          });
          CONSUME1(symbols_exports.RParen);
          CONSUME2(symbols_exports.LCurly);
          MANY3(() => {
            let parsedValues = 0;
            const currentRow = /* @__PURE__ */ Object.create(null);
            CONSUME2(symbols_exports.LParen);
            MANY4(() => {
              ACTION(() => {
                if (!C.skipValidation && parsedValues >= vars.length) {
                  throw new Error("Number of dataBlockValues does not match number of variables. Too much values.");
                }
              });
              const value = SUBRULE(dataBlockValue);
              ACTION(() => {
                currentRow[vars[parsedValues].value] = value;
                parsedValues++;
              });
            });
            CONSUME2(symbols_exports.RParen);
            ACTION(() => {
              res.push(currentRow);
              if (!C.skipValidation && vars.length !== parsedValues) {
                throw new Error("Number of dataBlockValues does not match number of variables. Too few values.");
              }
            });
          });
          const close = CONSUME2(symbols_exports.RCurly);
          return ACTION(() => C.astFactory.patternValues(vars, res, C.astFactory.sourceLocation(open, close)));
        } }
      ]);
    }
  };
  var dataBlockValue = {
    name: "dataBlockValue",
    impl: ({ SUBRULE, CONSUME, OR }) => () => OR([
      { ALT: () => SUBRULE(iri2) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => {
        CONSUME(undef);
        return void 0;
      } }
    ])
  };
  var minusGraphPattern = {
    name: "minusGraphPattern",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const minus2 = CONSUME(minus);
      const group = SUBRULE(groupGraphPattern);
      return ACTION(() => C.astFactory.patternMinus(group.patterns, C.astFactory.sourceLocation(minus2, group)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("MINUS"));
      SUBRULE(groupGraphPattern, F2.patternGroup(ast.patterns, ast.loc));
    }
  };
  var groupOrUnionGraphPattern = {
    name: "groupOrUnionGraphPattern",
    impl: ({ ACTION, MANY, SUBRULE1, SUBRULE2, CONSUME }) => (C) => {
      const groups = [];
      const group = SUBRULE1(groupGraphPattern);
      groups.push(group);
      MANY(() => {
        CONSUME(union);
        const group2 = SUBRULE2(groupGraphPattern);
        groups.push(group2);
      });
      return ACTION(() => groups.length === 1 ? groups[0] : C.astFactory.patternUnion(groups, C.astFactory.sourceLocation(group, groups.at(-1))));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isPatternUnion(ast)) {
        const [head2, ...tail] = ast.patterns;
        SUBRULE(groupGraphPattern, head2);
        for (const pattern of tail) {
          F2.printFilter(ast, () => PRINT_WORD("UNION"));
          SUBRULE(groupGraphPattern, pattern);
        }
      } else {
        SUBRULE(groupGraphPattern, ast);
      }
    }
  };
  var filter3 = {
    name: "filter",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const filterToken = CONSUME(filter2);
      const expression2 = SUBRULE(constraint);
      return ACTION(() => C.astFactory.patternFilter(expression2, C.astFactory.sourceLocation(filterToken, expression2)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("FILTER ("));
      SUBRULE(expression, ast.expression);
      F2.printFilter(ast, () => {
        PRINT_WORD(")");
        NEW_LINE();
      });
    }
  };
  var constraint = {
    name: "constraint",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(brackettedExpression) },
      { ALT: () => SUBRULE(builtInCall) },
      { ALT: () => SUBRULE(functionCall) }
    ])
  };
  var functionCall = {
    name: "functionCall",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const func = SUBRULE(iri2);
      const args = SUBRULE(argList);
      return ACTION(() => C.astFactory.expressionFunctionCall(func, args.val.args, args.val.distinct, C.astFactory.sourceLocation(func, args)));
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/expression.js
  var argList = {
    name: "argList",
    impl: ({ ACTION, CONSUME, SUBRULE1, OPTION, OR, AT_LEAST_ONE_SEP }) => (C) => OR([
      { ALT: () => {
        const nil2 = CONSUME(terminals_exports.nil);
        return ACTION(() => C.astFactory.wrap({ args: [], distinct: false }, C.astFactory.sourceLocation(nil2)));
      } },
      { ALT: () => {
        const args = [];
        const open = CONSUME(symbols_exports.LParen);
        const distinct2 = OPTION(() => {
          CONSUME(distinct);
          return true;
        }) ?? false;
        AT_LEAST_ONE_SEP({
          SEP: symbols_exports.comma,
          DEF: () => {
            const arg = SUBRULE1(expression);
            args.push(arg);
          }
        });
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.wrap({ args, distinct: distinct2 }, C.astFactory.sourceLocation(open, close)));
      } }
    ]),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_WORD("(");
        if (ast.val.distinct) {
          PRINT_WORD("DISTINCT");
        }
      });
      const [head2, ...tail] = ast.val.args;
      if (head2) {
        SUBRULE(expression, head2);
      }
      for (const expr of tail) {
        F2.printFilter(ast, () => PRINT_WORD(","));
        SUBRULE(expression, expr);
      }
      F2.printFilter(ast, () => PRINT_WORD(")"));
    }
  };
  var expressionList = {
    name: "expressionList",
    impl: ({ ACTION, CONSUME, MANY, OR, SUBRULE1, SUBRULE2 }) => (C) => OR([
      { ALT: () => {
        const nil2 = CONSUME(terminals_exports.nil);
        return ACTION(() => C.astFactory.wrap([], C.astFactory.sourceLocation(nil2)));
      } },
      { ALT: () => {
        const open = CONSUME(symbols_exports.LParen);
        const expr1 = SUBRULE1(expression);
        const args = [expr1];
        MANY(() => {
          CONSUME(symbols_exports.comma);
          const expr = SUBRULE2(expression);
          args.push(expr);
        });
        const close = CONSUME(symbols_exports.RParen);
        return ACTION(() => C.astFactory.wrap(args, C.astFactory.sourceLocation(open, close)));
      } }
    ])
  };
  var optimizedBracketsInfixOperator = /* @__PURE__ */ new Set(["||", "&&", "=", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/"]);
  var infixOperators = /* @__PURE__ */ new Set(["in", "notin", "||", "&&", "=", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/"]);
  var prefixOperator = { "!": "", uplus: "+", uminus: "-" };
  var expression = {
    name: "expression",
    impl: ({ SUBRULE }) => () => SUBRULE(conditionalOrExpression),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isTerm(ast)) {
        SUBRULE(varOrTerm, ast);
      } else if (F2.isExpressionPatternOperation(ast)) {
        const patterns = ast.args;
        F2.printFilter(ast, () => PRINT_WORD(ast.operator === "exists" ? "EXISTS" : "NOT EXISTS"));
        SUBRULE(groupGraphPattern, patterns);
      } else if (F2.isExpressionFunctionCall(ast)) {
        SUBRULE(iriOrFunction, ast);
      } else if (F2.isExpressionAggregate(ast)) {
        SUBRULE(aggregate, ast);
      } else if (infixOperators.has(ast.operator)) {
        const [left, ...right] = ast.args;
        F2.printFilter(ast, () => PRINT_WORD("("));
        SUBRULE(expression, left);
        F2.printFilter(ast, () => {
          if (ast.operator === "notin") {
            PRINT_WORD("NOT IN");
          } else if (ast.operator === "in") {
            PRINT_WORD("IN");
          } else {
            PRINT_WORD(ast.operator.toUpperCase());
          }
        });
        if (right.length === 1 && optimizedBracketsInfixOperator.has(ast.operator)) {
          SUBRULE(expression, right[0]);
        } else {
          SUBRULE(argList, F2.wrap({ args: right, distinct: false }, ast.loc));
        }
        F2.printFilter(ast, () => PRINT_WORD(")"));
      } else if (typeof prefixOperator[ast.operator] === "string") {
        const [expr] = ast.args;
        F2.printFilter(ast, () => PRINT_WORD(prefixOperator[ast.operator] || ast.operator.toUpperCase()));
        SUBRULE(expression, expr);
      } else {
        F2.printFilter(ast, () => PRINT_WORD(ast.operator.toUpperCase(), "("));
        const [head2, ...tail] = ast.args;
        if (head2) {
          SUBRULE(expression, head2);
        }
        for (const arg of tail) {
          F2.printFilter(ast, () => PRINT_WORD(","));
          SUBRULE(expression, arg);
        }
        F2.printFilter(ast, () => PRINT_WORD(")"));
      }
    }
  };
  function constructLeftDeep(startGenerator, restGenerator, ACTION, MANY) {
    let iterExpr = startGenerator();
    MANY(() => {
      const res = restGenerator();
      ACTION(() => {
        iterExpr = res(iterExpr);
      });
    });
    return iterExpr;
  }
  var conditionalOrExpression = {
    name: "conditionalOrExpression",
    impl: ({ ACTION, MANY, CONSUME, SUBRULE1, SUBRULE2 }) => (C) => constructLeftDeep(() => SUBRULE1(conditionalAndExpression), () => {
      CONSUME(symbols_exports.logicOr);
      const args = SUBRULE2(conditionalAndExpression);
      return (left) => ACTION(() => C.astFactory.expressionOperation("||", [left, args], C.astFactory.sourceLocation(left, args)));
    }, ACTION, MANY)
  };
  var conditionalAndExpression = {
    name: "conditionalAndExpression",
    impl: ({ ACTION, MANY, SUBRULE1, SUBRULE2, CONSUME }) => (C) => constructLeftDeep(() => SUBRULE1(valueLogical), () => {
      CONSUME(symbols_exports.logicAnd);
      const arg = SUBRULE2(valueLogical);
      return (left) => ACTION(() => C.astFactory.expressionOperation("&&", [left, arg], C.astFactory.sourceLocation(left, arg)));
    }, ACTION, MANY)
  };
  var valueLogical = {
    name: "valueLogical",
    impl: ({ SUBRULE }) => () => SUBRULE(relationalExpression)
  };
  var relationalExpression = {
    name: "relationalExpression",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION, OR1, OR2, OR3 }) => (C) => {
      const args1 = SUBRULE1(numericExpression);
      const expression2 = OPTION(() => OR1([
        { ALT: () => {
          const operator = OR2([
            { ALT: () => CONSUME(symbols_exports.equal) },
            { ALT: () => CONSUME(symbols_exports.notEqual) },
            { ALT: () => CONSUME(symbols_exports.lessThan) },
            { ALT: () => CONSUME(symbols_exports.greaterThan) },
            { ALT: () => CONSUME(symbols_exports.lessThanEqual) },
            { ALT: () => CONSUME(symbols_exports.greaterThanEqual) }
          ]);
          const expr = SUBRULE2(numericExpression);
          return ACTION(() => C.astFactory.expressionOperation(operator.image, [args1, expr], C.astFactory.sourceLocation(args1, expr)));
        } },
        { ALT: () => {
          const operator = OR3([
            { ALT: () => CONSUME(in_) },
            { ALT: () => CONSUME(notIn) }
          ]);
          const args = SUBRULE1(expressionList);
          return ACTION(() => C.astFactory.expressionOperation(operator.image, [args1, ...args.val], C.astFactory.sourceLocation(args1, args)));
        } }
      ]));
      return expression2 ?? args1;
    }
  };
  var numericExpression = {
    name: "numericExpression",
    impl: ({ SUBRULE }) => () => SUBRULE(additiveExpression)
  };
  var additiveExpression = {
    name: "additiveExpression",
    impl: ({ ACTION, SUBRULE, CONSUME, SUBRULE1, SUBRULE2, MANY1, MANY2, OR1, OR2, OR3, OR4 }) => (C) => constructLeftDeep(() => SUBRULE1(multiplicativeExpression), () => OR1([
      { ALT: () => {
        const operator = OR2([
          { ALT: () => CONSUME(symbols_exports.opPlus) },
          { ALT: () => CONSUME(symbols_exports.opMinus) }
        ]);
        const arg = SUBRULE2(multiplicativeExpression);
        return ACTION(() => (left) => C.astFactory.expressionOperation(operator.image, [left, arg], C.astFactory.sourceLocation(left, arg)));
      } },
      { ALT: () => {
        const { operator, startInt } = OR3([
          { ALT: () => {
            const integer2 = SUBRULE(numericLiteralPositive);
            return ACTION(() => {
              integer2.value = integer2.value.replace(/^\+/u, "");
              return {
                operator: "+",
                startInt: integer2
              };
            });
          } },
          { ALT: () => {
            const integer2 = SUBRULE(numericLiteralNegative);
            return ACTION(() => {
              integer2.value = integer2.value.replace(/^-/u, "");
              return {
                operator: "-",
                startInt: integer2
              };
            });
          } }
        ]);
        const multiplicativeExpr = constructLeftDeep(() => ACTION(() => startInt), () => {
          const innerOperator = OR4([
            { ALT: () => CONSUME(symbols_exports.star) },
            { ALT: () => CONSUME(symbols_exports.slash) }
          ]);
          const innerExpr = SUBRULE1(unaryExpression);
          return (leftInner) => ACTION(() => C.astFactory.expressionOperation(innerOperator.image, [leftInner, innerExpr], C.astFactory.sourceLocation(leftInner, innerExpr)));
        }, ACTION, MANY2);
        return (left) => C.astFactory.expressionOperation(operator, [left, multiplicativeExpr], C.astFactory.sourceLocation(left, multiplicativeExpr));
      } }
    ]), ACTION, MANY1)
  };
  var multiplicativeExpression = {
    name: "multiplicativeExpression",
    impl: ({ ACTION, CONSUME, MANY, SUBRULE1, SUBRULE2, OR }) => (C) => constructLeftDeep(() => SUBRULE1(unaryExpression), () => {
      const operator = OR([
        { ALT: () => CONSUME(symbols_exports.star) },
        { ALT: () => CONSUME(symbols_exports.slash) }
      ]);
      const expr = SUBRULE2(unaryExpression);
      return (left) => ({
        type: "expression",
        subType: "operation",
        operator: operator.image,
        args: [left, expr],
        loc: C.astFactory.sourceLocation(left, expr)
      });
    }, ACTION, MANY)
  };
  var unaryExpression = {
    name: "unaryExpression",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OR1, OR2 }) => (C) => OR1([
      { ALT: () => SUBRULE1(primaryExpression) },
      { ALT: () => {
        const operator = OR2([
          { ALT: () => CONSUME(symbols_exports.exclamation) },
          { ALT: () => CONSUME(symbols_exports.opPlus) },
          { ALT: () => CONSUME(symbols_exports.opMinus) }
        ]);
        const expr = SUBRULE2(primaryExpression);
        return ACTION(() => C.astFactory.expressionOperation(operator.image === "!" ? "!" : operator.image === "+" ? "UPLUS" : "UMINUS", [expr], C.astFactory.sourceLocation(operator, expr)));
      } }
    ])
  };
  var primaryExpression = {
    name: "primaryExpression",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(brackettedExpression) },
      { ALT: () => SUBRULE(builtInCall) },
      { ALT: () => SUBRULE(iriOrFunction) },
      { ALT: () => SUBRULE(rdfLiteral) },
      { ALT: () => SUBRULE(numericLiteral) },
      { ALT: () => SUBRULE(booleanLiteral) },
      { ALT: () => SUBRULE(var_) }
    ])
  };
  var brackettedExpression = {
    name: "brackettedExpression",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const open = CONSUME(symbols_exports.LParen);
      const expr = SUBRULE(expression);
      const close = CONSUME(symbols_exports.RParen);
      return ACTION(() => {
        expr.loc = C.astFactory.sourceLocation(open, close);
        return expr;
      });
    }
  };
  var iriOrFunction = {
    name: "iriOrFunction",
    impl: ({ ACTION, SUBRULE, OPTION }) => (C) => {
      const iriVal = SUBRULE(iri2);
      const functionCall2 = OPTION(() => {
        const args = SUBRULE(argList);
        return ACTION(() => {
          const distinct2 = args.val.distinct;
          if (!C.parseMode.has("canParseAggregate") && distinct2) {
            throw new Error(`DISTINCT implies that this function is an aggregated function, which is not allowed in this context.`);
          }
          return {
            type: "expression",
            subType: "functionCall",
            function: iriVal,
            args: args.val.args,
            distinct: distinct2,
            loc: C.astFactory.sourceLocation(iriVal, args)
          };
        });
      });
      return functionCall2 ?? iriVal;
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isTermNamed(ast)) {
        SUBRULE(iri2, ast);
      } else {
        SUBRULE(iri2, ast.function);
        SUBRULE(argList, F2.wrap({ args: ast.args, distinct: ast.distinct }, ast.loc));
      }
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/solutionModifier.js
  var solutionModifier = {
    name: "solutionModifier",
    impl: ({ ACTION, SUBRULE, OPTION1, OPTION2, OPTION3, OPTION4 }) => () => {
      const group = OPTION1(() => SUBRULE(groupClause));
      const having2 = OPTION2(() => SUBRULE(havingClause));
      const order2 = OPTION3(() => SUBRULE(orderClause));
      const limitOffset = OPTION4(() => SUBRULE(limitOffsetClauses));
      return ACTION(() => ({
        ...limitOffset && { limitOffset },
        ...group && { group },
        ...having2 && { having: having2 },
        ...order2 && { order: order2 }
      }));
    },
    gImpl: ({ SUBRULE }) => (ast) => {
      if (ast.group) {
        SUBRULE(groupClause, ast.group);
      }
      if (ast.having) {
        SUBRULE(havingClause, ast.having);
      }
      if (ast.order) {
        SUBRULE(orderClause, ast.order);
      }
      if (ast.limitOffset) {
        SUBRULE(limitOffsetClauses, ast.limitOffset);
      }
    }
  };
  var groupClause = {
    name: "groupClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME }) => (C) => {
      const groupings = [];
      const start = CONSUME(groupByGroup);
      CONSUME(by);
      AT_LEAST_ONE(() => {
        groupings.push(SUBRULE1(groupCondition));
      });
      return ACTION(() => ({
        type: "solutionModifier",
        subType: "group",
        groupings,
        loc: C.astFactory.sourceLocation(start, groupings.at(-1))
      }));
    },
    gImpl: ({ PRINT_WORDS, SUBRULE, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("GROUP BY ");
      });
      for (const grouping of ast.groupings) {
        if (F2.isExpression(grouping)) {
          SUBRULE(expression, grouping);
        } else {
          F2.printFilter(ast, () => PRINT_WORDS("("));
          SUBRULE(expression, grouping.value);
          F2.printFilter(ast, () => PRINT_WORDS("AS"));
          SUBRULE(var_, grouping.variable);
          F2.printFilter(ast, () => PRINT_WORDS(")"));
        }
      }
    }
  };
  var groupCondition = {
    name: "groupCondition",
    impl: ({ ACTION, SUBRULE, CONSUME, SUBRULE1, SUBRULE2, OPTION, OR }) => (C) => OR([
      { ALT: () => SUBRULE(builtInCall) },
      { ALT: () => SUBRULE(functionCall) },
      { ALT: () => SUBRULE2(var_) },
      {
        ALT: () => {
          const open = CONSUME(symbols_exports.LParen);
          const expressionValue = SUBRULE(expression);
          const variable = OPTION(() => {
            CONSUME(as);
            return SUBRULE1(var_);
          });
          const close = CONSUME(symbols_exports.RParen);
          return ACTION(() => {
            if (variable !== void 0) {
              return {
                variable,
                value: expressionValue,
                loc: C.astFactory.sourceLocation(open, close)
              };
            }
            return expressionValue;
          });
        }
      }
    ])
  };
  var havingClause = {
    name: "havingClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE, CONSUME }) => (C) => {
      const having2 = CONSUME(having);
      const expressions = [];
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      AT_LEAST_ONE(() => {
        expressions.push(SUBRULE(havingCondition));
      });
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.solutionModifierHaving(expressions, C.astFactory.sourceLocation(having2, expressions.at(-1))));
    },
    gImpl: ({ PRINT_ON_EMPTY, SUBRULE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("HAVING ");
      });
      for (const having2 of ast.having) {
        SUBRULE(expression, having2);
      }
    }
  };
  var havingCondition = {
    name: "havingCondition",
    impl: ({ SUBRULE }) => () => SUBRULE(constraint)
  };
  var orderClause = {
    name: "orderClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME }) => (C) => {
      const order2 = CONSUME(order);
      CONSUME(by);
      const orderings = [];
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      AT_LEAST_ONE(() => {
        orderings.push(SUBRULE1(orderCondition));
      });
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.solutionModifierOrder(orderings, C.astFactory.sourceLocation(order2, orderings.at(-1))));
    },
    gImpl: ({ PRINT_WORDS, PRINT_ON_EMPTY, SUBRULE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("ORDER BY ");
      });
      for (const ordering of ast.orderDefs) {
        if (ordering.descending) {
          F2.printFilter(ast, () => PRINT_WORDS("DESC"));
        } else {
          F2.printFilter(ast, () => PRINT_WORDS("ASC"));
        }
        F2.printFilter(ast, () => PRINT_WORDS("("));
        SUBRULE(expression, ordering.expression);
        F2.printFilter(ast, () => PRINT_WORDS(")"));
      }
    }
  };
  var orderCondition = {
    name: "orderCondition",
    impl: ({ ACTION, SUBRULE, CONSUME, OR1, OR2 }) => (C) => OR1([
      { ALT: () => {
        const descending = OR2([
          { ALT: () => {
            const token = CONSUME(orderAsc);
            return [false, token];
          } },
          { ALT: () => {
            const token = CONSUME(orderDesc);
            return [true, token];
          } }
        ]);
        const expr = SUBRULE(brackettedExpression);
        return ACTION(() => ({
          expression: expr,
          descending: descending[0],
          loc: C.astFactory.sourceLocation(descending[1], expr)
        }));
      } },
      { ALT: () => {
        const expr = SUBRULE(constraint);
        return ACTION(() => ({ expression: expr, descending: false, loc: expr.loc }));
      } },
      { ALT: () => {
        const expr = SUBRULE(var_);
        return ACTION(() => ({ expression: expr, descending: false, loc: expr.loc }));
      } }
    ])
  };
  var limitOffsetClauses = {
    name: "limitOffsetClauses",
    impl: ({ ACTION, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => (C) => OR([
      { ALT: () => {
        const limit2 = SUBRULE1(limitClause);
        const offset2 = OPTION1(() => SUBRULE1(offsetClause));
        return ACTION(() => C.astFactory.solutionModifierLimitOffset(limit2.val, offset2?.val, C.astFactory.sourceLocation(limit2, ...offset2 ? [offset2] : [])));
      } },
      { ALT: () => {
        const offset2 = SUBRULE2(offsetClause);
        const limit2 = OPTION2(() => SUBRULE2(limitClause));
        return ACTION(() => C.astFactory.solutionModifierLimitOffset(limit2?.val, offset2.val, C.astFactory.sourceLocation(offset2, limit2)));
      } }
    ]),
    gImpl: ({ PRINT_WORDS, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        NEW_LINE();
        if (ast.limit) {
          PRINT_WORDS("LIMIT", String(ast.limit));
        }
        if (ast.offset) {
          PRINT_WORDS("OFFSET", String(ast.offset));
        }
      });
    }
  };
  var limitClause = {
    name: "limitClause",
    impl: ({ ACTION, CONSUME }) => (C) => {
      const offset2 = CONSUME(limit);
      const value = CONSUME(terminals_exports.integer);
      const val = Number.parseInt(value.image, 10);
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(offset2, value)));
    }
  };
  var offsetClause = {
    name: "offsetClause",
    impl: ({ CONSUME, ACTION }) => (C) => {
      const offset2 = CONSUME(offset);
      const value = CONSUME(terminals_exports.integer);
      const val = Number.parseInt(value.image, 10);
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(offset2, value)));
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/queryUnit.js
  var queryUnit = {
    name: "queryUnit",
    impl: ({ SUBRULE }) => () => SUBRULE(query)
  };
  var query = {
    name: "query",
    impl: ({ ACTION, SUBRULE, OR }) => (C) => {
      const prologueValues = SUBRULE(prologue);
      const subType = OR([
        { ALT: () => SUBRULE(selectQuery) },
        { ALT: () => SUBRULE(constructQuery) },
        { ALT: () => SUBRULE(describeQuery) },
        { ALT: () => SUBRULE(askQuery) }
      ]);
      const values3 = SUBRULE(valuesClause);
      return ACTION(() => {
        const q = {
          context: prologueValues,
          ...subType,
          type: "query",
          loc: C.astFactory.sourceLocation(prologueValues.at(0), subType, values3)
        };
        if (values3) {
          q.values = values3;
        }
        return q;
      });
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      SUBRULE(prologue, ast.context);
      if (F2.isQuerySelect(ast)) {
        SUBRULE(selectQuery, ast);
      } else if (F2.isQueryConstruct(ast)) {
        SUBRULE(constructQuery, ast);
      } else if (F2.isQueryDescribe(ast)) {
        SUBRULE(describeQuery, ast);
      } else {
        SUBRULE(askQuery, ast);
      }
      if (ast.values) {
        SUBRULE(inlineData, ast.values);
      }
    }
  };
  var selectQuery = {
    name: "selectQuery",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const selectVal = SUBRULE(selectClause);
      const from2 = SUBRULE(datasetClauseStar);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      return ACTION(() => {
        const ret = {
          subType: "select",
          where: where2.val,
          solutionModifiers: modifiers,
          datasets: from2,
          ...selectVal.val,
          loc: C.astFactory.sourceLocation(selectVal, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
        };
        if (!C.skipValidation) {
          queryProjectionIsGood(ret);
        }
        return ret;
      });
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      SUBRULE(selectClause, F2.wrap({
        variables: ast.variables,
        distinct: ast.distinct,
        reduced: ast.reduced
      }, F2.sourceLocation(...ast.variables)));
      SUBRULE(datasetClauseStar, ast.datasets);
      SUBRULE(whereClause, F2.wrap(ast.where, ast.where.loc));
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  var subSelect = {
    name: "subSelect",
    impl: ({ ACTION, SUBRULE }) => (C) => {
      const selectVal = SUBRULE(selectClause);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      const values3 = SUBRULE(valuesClause);
      return ACTION(() => C.astFactory.querySelect({
        where: where2.val,
        datasets: C.astFactory.datasetClauses([], C.astFactory.sourceLocation()),
        context: [],
        solutionModifiers: modifiers,
        ...selectVal.val,
        ...values3 && { values: values3 }
      }, C.astFactory.sourceLocation(selectVal, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset, values3)));
    }
  };
  var selectClause = {
    name: "selectClause",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, SUBRULE2, CONSUME, OPTION, OR1, OR2, OR3 }) => (C) => {
      const select2 = CONSUME(select);
      const couldParseAgg = ACTION(() => C.parseMode.has("canParseAggregate") || !C.parseMode.add("canParseAggregate"));
      const distinctAndReduced = OPTION(() => OR1([
        { ALT: () => {
          CONSUME(distinct);
          return [true, false];
        } },
        { ALT: () => {
          CONSUME(reduced);
          return [false, true];
        } }
      ])) ?? [false, false];
      const distRed = ACTION(() => {
        const [distinct2, reduced2] = distinctAndReduced;
        return {
          ...distinct2 && { distinct: distinct2 },
          ...reduced2 && { reduced: reduced2 }
        };
      });
      let last2;
      const val = OR2([
        { ALT: () => {
          const star2 = CONSUME(symbols_exports.star);
          return ACTION(() => {
            last2 = star2;
            return { variables: [C.astFactory.wildcard(C.astFactory.sourceLocation(star2))], ...distRed };
          });
        } },
        { ALT: () => {
          const usedVars = [];
          const variables = [];
          AT_LEAST_ONE(() => OR3([
            { ALT: () => {
              const raw = SUBRULE1(var_);
              ACTION(() => {
                if (!C.skipValidation && usedVars.some((v) => v.value === raw.value)) {
                  throw new Error(`Variable ${raw.value} used more than once in SELECT clause`);
                }
                usedVars.push(raw);
                variables.push(raw);
                last2 = raw;
              });
            } },
            { ALT: () => {
              const open = CONSUME(symbols_exports.LParen);
              const expr = SUBRULE1(expression);
              CONSUME(as);
              const variable = SUBRULE2(var_);
              const close = CONSUME(symbols_exports.RParen);
              ACTION(() => {
                last2 = close;
                if (!C.skipValidation && usedVars.some((v) => v.value === variable.value)) {
                  throw new Error(`Variable ${variable.value} used more than once in SELECT clause`);
                }
                usedVars.push(variable);
                variables.push(C.astFactory.patternBind(expr, variable, C.astFactory.sourceLocation(open, last2)));
              });
            } }
          ]));
          return { variables, ...distRed };
        } }
      ]);
      ACTION(() => !couldParseAgg && C.parseMode.delete("canParseAggregate"));
      return ACTION(() => C.astFactory.wrap(val, C.astFactory.sourceLocation(select2, last2)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("SELECT ");
        if (ast.val.distinct) {
          PRINT_WORD("DISTINCT");
        } else if (ast.val.reduced) {
          PRINT_WORD("REDUCED");
        }
      });
      for (const variable of ast.val.variables) {
        if (F2.isWildcard(variable)) {
          F2.printFilter(ast, () => PRINT_WORD("*"));
        } else if (F2.isTerm(variable)) {
          SUBRULE(var_, variable);
        } else {
          F2.printFilter(ast, () => PRINT_WORD("("));
          SUBRULE(expression, variable.expression);
          F2.printFilter(ast, () => PRINT_WORD("AS"));
          SUBRULE(var_, variable.variable);
          F2.printFilter(ast, () => PRINT_WORD(")"));
        }
        F2.printFilter(ast, () => PRINT_WORD(""));
      }
      F2.printFilter(ast, () => PRINT_WORD(""));
    }
  };
  var constructQuery = {
    name: "constructQuery",
    impl: ({ ACTION, SUBRULE1, SUBRULE2, CONSUME, OR }) => (C) => {
      const construct2 = CONSUME(construct);
      return OR([
        { ALT: () => {
          const template = SUBRULE1(constructTemplate);
          const from2 = SUBRULE1(datasetClauseStar);
          const where2 = SUBRULE1(whereClause);
          const modifiers = SUBRULE1(solutionModifier);
          return ACTION(() => ({
            subType: "construct",
            template: template.val,
            datasets: from2,
            where: where2.val,
            solutionModifiers: modifiers,
            loc: C.astFactory.sourceLocation(construct2, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
          }));
        } },
        { ALT: () => {
          const from2 = SUBRULE2(datasetClauseStar);
          CONSUME(where);
          const template = SUBRULE2(constructTemplate);
          const modifiers = SUBRULE2(solutionModifier);
          return ACTION(() => ({
            subType: "construct",
            template: template.val,
            datasets: from2,
            where: C.astFactory.patternGroup([template.val], C.astFactory.sourceLocation()),
            solutionModifiers: modifiers,
            loc: C.astFactory.sourceLocation(construct2, template, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
          }));
        } }
      ]);
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, PRINT_ON_OWN_LINE, NEW_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => PRINT_ON_EMPTY("CONSTRUCT "));
      if (!F2.isSourceLocationNoMaterialize(ast.where.loc)) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORD("{");
          NEW_LINE();
        });
        SUBRULE(triplesBlock, ast.template);
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_OWN_LINE("}");
        });
      }
      SUBRULE(datasetClauseStar, ast.datasets);
      if (F2.isSourceLocationNoMaterialize(ast.where.loc)) {
        SUBRULE(whereClause, F2.wrap(F2.patternGroup([ast.template], ast.template.loc), ast.template.loc));
      } else {
        SUBRULE(whereClause, F2.wrap(ast.where, ast.where.loc));
      }
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  var describeQuery = {
    name: "describeQuery",
    impl: ({ ACTION, AT_LEAST_ONE, SUBRULE1, CONSUME, OPTION, OR }) => (C) => {
      const describe2 = CONSUME(describe);
      const variables = OR([
        { ALT: () => {
          const variables2 = [];
          AT_LEAST_ONE(() => {
            variables2.push(SUBRULE1(varOrIri));
          });
          return variables2;
        } },
        { ALT: () => {
          const star2 = CONSUME(symbols_exports.star);
          return [ACTION(() => C.astFactory.wildcard(C.astFactory.sourceLocation(star2)))];
        } }
      ]);
      const from2 = SUBRULE1(datasetClauseStar);
      const where2 = OPTION(() => SUBRULE1(whereClause));
      const modifiers = SUBRULE1(solutionModifier);
      return ACTION(() => ({
        subType: "describe",
        variables,
        datasets: from2,
        ...where2 && { where: where2.val },
        solutionModifiers: modifiers,
        loc: C.astFactory.sourceLocation(describe2, ...variables, from2, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
      }));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("DESCRIBE "));
      if (F2.isWildcard(ast.variables[0])) {
        F2.printFilter(ast, () => PRINT_WORD("*"));
      } else {
        for (const variable of ast.variables) {
          SUBRULE(varOrTerm, variable);
        }
      }
      SUBRULE(datasetClauseStar, ast.datasets);
      if (ast.where) {
        SUBRULE(whereClause, F2.wrap(ast.where, ast.loc));
      }
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  var askQuery = {
    name: "askQuery",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const ask2 = CONSUME(ask);
      const from2 = SUBRULE(datasetClauseStar);
      const where2 = SUBRULE(whereClause);
      const modifiers = SUBRULE(solutionModifier);
      return ACTION(() => ({
        subType: "ask",
        datasets: from2,
        where: where2.val,
        solutionModifiers: modifiers,
        loc: C.astFactory.sourceLocation(ask2, from2, where2, modifiers.group, modifiers.having, modifiers.order, modifiers.limitOffset)
      }));
    },
    gImpl: ({ SUBRULE, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_ON_EMPTY("ASK "));
      SUBRULE(datasetClauseStar, ast.datasets);
      SUBRULE(whereClause, F2.wrap(ast.where, ast.loc));
      SUBRULE(solutionModifier, ast.solutionModifiers);
    }
  };
  var valuesClause = {
    name: "valuesClause",
    impl: ({ OPTION, SUBRULE }) => () => OPTION(() => SUBRULE(inlineData))
  };
  var constructTemplate = {
    name: "constructTemplate",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const open = CONSUME(symbols_exports.LCurly);
      const triples = OPTION(() => SUBRULE1(constructTriples));
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.wrap(triples ?? C.astFactory.patternBgp([], C.astFactory.sourceLocation()), C.astFactory.sourceLocation(open, close)));
    }
  };
  var constructTriples = {
    name: "constructTriples",
    impl: triplesTemplate.impl
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/updateUnit.js
  var updateUnit = {
    name: "updateUnit",
    impl: ({ SUBRULE }) => () => SUBRULE(update)
  };
  var update = {
    name: "update",
    impl: ({ ACTION, SUBRULE, SUBRULE1, SUBRULE2, CONSUME, OPTION1, MANY }) => (C) => {
      const updates = [];
      const prologueValues = SUBRULE1(prologue);
      updates.push({ context: prologueValues });
      let parsedSemi = true;
      MANY({
        GATE: () => parsedSemi,
        DEF: () => {
          parsedSemi = false;
          updates.at(-1).operation = SUBRULE(update1);
          OPTION1(() => {
            CONSUME(symbols_exports.semi);
            parsedSemi = true;
            const innerPrologue = SUBRULE2(prologue);
            updates.push({ context: innerPrologue });
          });
        }
      });
      return ACTION(() => {
        const update2 = {
          type: "update",
          updates,
          loc: C.astFactory.sourceLocation(...updates.flatMap((x) => [...x.context, x.operation]))
        };
        if (!C.skipValidation) {
          updateNoReuseBlankNodeLabels(update2);
        }
        return update2;
      });
    },
    gImpl: ({ SUBRULE, PRINT, NEW_LINE }) => (ast, { astFactory: F2 }) => {
      const [head2, ...tail] = ast.updates;
      if (head2) {
        SUBRULE(prologue, head2.context);
        if (head2.operation) {
          SUBRULE(update1, head2.operation);
        }
      }
      for (const update2 of tail) {
        F2.printFilter(ast, () => {
          PRINT(";");
          NEW_LINE();
        });
        SUBRULE(prologue, update2.context);
        if (update2.operation) {
          SUBRULE(update1, update2.operation);
        }
      }
    }
  };
  var update1 = {
    name: "update1",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(load2) },
      { ALT: () => SUBRULE(clear2) },
      { ALT: () => SUBRULE(drop3) },
      { ALT: () => SUBRULE(add2) },
      { ALT: () => SUBRULE(move2) },
      { ALT: () => SUBRULE(copy2) },
      { ALT: () => SUBRULE(create2) },
      { ALT: () => SUBRULE(insertData) },
      { ALT: () => SUBRULE(deleteData) },
      { ALT: () => SUBRULE(deleteWhere) },
      { ALT: () => SUBRULE(modify) }
    ]),
    gImpl: ({ SUBRULE }) => (ast) => {
      switch (ast.subType) {
        case "load":
          SUBRULE(load2, ast);
          break;
        case "clear":
          SUBRULE(clear2, ast);
          break;
        case "drop":
          SUBRULE(drop3, ast);
          break;
        case "add":
          SUBRULE(add2, ast);
          break;
        case "move":
          SUBRULE(move2, ast);
          break;
        case "copy":
          SUBRULE(copy2, ast);
          break;
        case "create":
          SUBRULE(create2, ast);
          break;
        case "insertdata":
          SUBRULE(insertData, ast);
          break;
        case "deletedata":
          SUBRULE(deleteData, ast);
          break;
        case "deletewhere":
          SUBRULE(deleteWhere, ast);
          break;
        case "modify":
          SUBRULE(modify, ast);
          break;
      }
    }
  };
  var load2 = {
    name: "load",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION1, OPTION2 }) => (C) => {
      const loadToken = CONSUME(load);
      const silent2 = OPTION1(() => CONSUME(silent));
      const source = SUBRULE1(iri2);
      const destination = OPTION2(() => {
        CONSUME(loadInto);
        return SUBRULE1(graphRef);
      });
      return ACTION(() => C.astFactory.updateOperationLoad(C.astFactory.sourceLocation(loadToken, source, destination), source, Boolean(silent2), destination));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("LOAD ");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(iri2, ast.source);
      if (ast.destination) {
        F2.printFilter(ast, () => PRINT_WORD("INTO"));
        SUBRULE(graphRefAll, ast.destination);
      }
    }
  };
  function clearOrDrop(operation) {
    return {
      name: unCapitalize(operation.name),
      impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
        const opToken = CONSUME(operation);
        const silent2 = OPTION(() => CONSUME(silent));
        const destination = SUBRULE1(graphRefAll);
        return ACTION(() => C.astFactory.updateOperationClearDrop(unCapitalize(operation.name), Boolean(silent2), destination, C.astFactory.sourceLocation(opToken, destination)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => {
          PRINT_ON_EMPTY(operation.name.toUpperCase(), " ");
          if (ast.silent) {
            PRINT_WORD("SILENT");
          }
        });
        SUBRULE(graphRefAll, ast.destination);
      }
    };
  }
  var clear2 = clearOrDrop(clear);
  var drop3 = clearOrDrop(drop2);
  var create2 = {
    name: "create",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const createToken3 = CONSUME(create);
      const silent2 = OPTION(() => CONSUME(silent));
      const destination = SUBRULE1(graphRef);
      return ACTION(() => C.astFactory.updateOperationCreate(destination, Boolean(silent2), C.astFactory.sourceLocation(createToken3, destination)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => {
        PRINT_ON_EMPTY("CREATE ");
        if (ast.silent) {
          PRINT_WORD("SILENT");
        }
      });
      SUBRULE(graphRefAll, ast.destination);
    }
  };
  function copyMoveAddOperation(operation) {
    return {
      name: unCapitalize(operation.name),
      impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION }) => (C) => {
        const op = CONSUME(operation);
        const silent2 = OPTION(() => CONSUME(silent));
        const source = SUBRULE1(graphOrDefault);
        CONSUME(to);
        const destination = SUBRULE2(graphOrDefault);
        return ACTION(() => C.astFactory.updateOperationAddMoveCopy(unCapitalize(operation.name), source, destination, Boolean(silent2), C.astFactory.sourceLocation(op, destination)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY }) => (ast, { astFactory: F2 }) => {
        F2.printFilter(ast, () => {
          PRINT_ON_EMPTY(operation.name.toUpperCase(), " ");
          if (ast.silent) {
            PRINT_WORD("SILENT");
          }
        });
        SUBRULE(graphRefAll, ast.source);
        F2.printFilter(ast, () => PRINT_WORD("TO"));
        SUBRULE(graphRefAll, ast.destination);
      }
    };
  }
  var add2 = copyMoveAddOperation(add);
  var move2 = copyMoveAddOperation(move);
  var copy2 = copyMoveAddOperation(copy);
  var quadPattern = {
    name: "quadPattern",
    impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
      const open = CONSUME(symbols_exports.LCurly);
      const val = SUBRULE1(quads);
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.wrap(val.val, C.astFactory.sourceLocation(open, close)));
    }
  };
  var quadData = {
    name: "quadData",
    impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
      const open = CONSUME(symbols_exports.LCurly);
      const couldParseVars = ACTION(() => C.parseMode.delete("canParseVars"));
      const val = SUBRULE1(quads);
      ACTION(() => couldParseVars && C.parseMode.add("canParseVars"));
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.wrap(val.val, C.astFactory.sourceLocation(open, close)));
    }
  };
  function insertDeleteDelWhere(name, subType, cons1, dataRule) {
    return {
      name,
      impl: ({ ACTION, SUBRULE1, CONSUME }) => (C) => {
        const insDelToken = CONSUME(cons1);
        let couldCreateBlankNodes = true;
        if (name !== "insertData") {
          couldCreateBlankNodes = ACTION(() => C.parseMode.delete("canCreateBlankNodes"));
        }
        const data = SUBRULE1(dataRule);
        if (name !== "insertData") {
          ACTION(() => couldCreateBlankNodes && C.parseMode.add("canCreateBlankNodes"));
        }
        return ACTION(() => C.astFactory.updateOperationInsDelDataWhere(subType, data.val, C.astFactory.sourceLocation(insDelToken, data)));
      },
      gImpl: ({ SUBRULE, PRINT_WORD, PRINT_ON_EMPTY, PRINT_ON_OWN_LINE, NEW_LINE }) => (ast, C) => {
        const { astFactory: F2, indentInc } = C;
        F2.printFilter(ast, () => {
          if (subType === "insertdata") {
            PRINT_ON_EMPTY("INSERT DATA ");
          } else if (subType === "deletedata") {
            PRINT_ON_EMPTY("DELETE DATA ");
          } else {
            PRINT_ON_EMPTY("DELETE WHERE ");
          }
          C[traqulaIndentation] += indentInc;
          PRINT_WORD("{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.data, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_OWN_LINE("}");
        });
      }
    };
  }
  var insertData = insertDeleteDelWhere("insertData", "insertdata", insertDataClause, quadData);
  var deleteData = insertDeleteDelWhere("deleteData", "deletedata", deleteDataClause, quadData);
  var deleteWhere = insertDeleteDelWhere("deleteWhere", "deletewhere", deleteWhereClause, quadPattern);
  var modify = {
    name: "modify",
    impl: ({ ACTION, CONSUME, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OR }) => (C) => {
      const graph2 = OPTION1(() => {
        const withToken = CONSUME(modifyWith);
        const graph3 = SUBRULE1(iri2);
        return { withToken, graph: graph3 };
      });
      const { insert, del } = OR([
        { ALT: () => {
          const del2 = SUBRULE1(deleteClause2);
          const insert2 = OPTION2(() => SUBRULE1(insertClause2));
          return { del: del2, insert: insert2 };
        } },
        { ALT: () => {
          const insert2 = SUBRULE2(insertClause2);
          return { insert: insert2, del: void 0 };
        } }
      ]);
      const using = SUBRULE1(usingClauseStar);
      CONSUME(where);
      const where2 = SUBRULE1(groupGraphPattern);
      return ACTION(() => C.astFactory.updateOperationModify(C.astFactory.sourceLocation(graph2?.withToken, del, insert, where2), insert?.val ?? [], del?.val ?? [], where2, using, graph2?.graph));
    },
    gImpl: ({ SUBRULE, PRINT_WORDS, PRINT_ON_EMPTY, NEW_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      if (ast.graph) {
        F2.printFilter(ast, () => PRINT_WORDS("WITH"));
        SUBRULE(iri2, ast.graph);
      }
      if (ast.delete.length > 0) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORDS("DELETE", "{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.delete, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("}");
          NEW_LINE();
        });
      }
      if (ast.insert.length > 0) {
        F2.printFilter(ast, () => {
          C[traqulaIndentation] += indentInc;
          PRINT_WORDS("INSERT", "{");
          NEW_LINE();
        });
        SUBRULE(quads, F2.wrap(ast.insert, ast.loc));
        F2.printFilter(ast, () => {
          C[traqulaIndentation] -= indentInc;
          PRINT_ON_EMPTY("} ");
          NEW_LINE();
        });
      }
      SUBRULE(usingClauseStar, ast.from);
      F2.printFilter(ast, () => PRINT_WORDS("WHERE"));
      SUBRULE(groupGraphPattern, ast.where);
    }
  };
  var deleteClause2 = {
    name: "deleteClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const delToken = CONSUME(deleteClause);
      const couldCreateBlankNodes = ACTION(() => C.parseMode.delete("canCreateBlankNodes"));
      const del = SUBRULE(quadPattern);
      ACTION(() => couldCreateBlankNodes && C.parseMode.add("canCreateBlankNodes"));
      return ACTION(() => C.astFactory.wrap(del.val, C.astFactory.sourceLocation(delToken, del)));
    }
  };
  var insertClause2 = {
    name: "insertClause",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const insertToken = CONSUME(insertClause);
      const insert = SUBRULE(quadPattern);
      return ACTION(() => C.astFactory.wrap(insert.val, C.astFactory.sourceLocation(insertToken, insert)));
    }
  };
  var graphOrDefault = {
    name: "graphOrDefault",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION, OR }) => (C) => OR([
      { ALT: () => {
        const def = CONSUME(graph_exports.default_);
        return ACTION(() => C.astFactory.graphRefDefault(C.astFactory.sourceLocation(def)));
      } },
      { ALT: () => {
        const graph2 = OPTION(() => CONSUME(graph_exports.graph));
        const name = SUBRULE1(iri2);
        return ACTION(() => C.astFactory.graphRefSpecific(name, C.astFactory.sourceLocation(graph2, name)));
      } }
    ])
  };
  var graphRef = {
    name: "graphRef",
    impl: ({ ACTION, SUBRULE, CONSUME }) => (C) => {
      const graph2 = CONSUME(graph_exports.graph);
      const val = SUBRULE(iri2);
      return ACTION(() => C.astFactory.graphRefSpecific(val, C.astFactory.sourceLocation(graph2, val)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(iri2, ast.graph);
    }
  };
  var graphRefAll = {
    name: "graphRefAll",
    impl: ({ ACTION, SUBRULE, CONSUME, OR }) => (C) => OR([
      { ALT: () => SUBRULE(graphRef) },
      { ALT: () => {
        const def = CONSUME(graph_exports.default_);
        return ACTION(() => C.astFactory.graphRefDefault(C.astFactory.sourceLocation(def)));
      } },
      { ALT: () => {
        const named2 = CONSUME(graph_exports.named);
        return ACTION(() => C.astFactory.graphRefNamed(C.astFactory.sourceLocation(named2)));
      } },
      { ALT: () => {
        const graphAll2 = CONSUME(graph_exports.graphAll);
        return ACTION(() => C.astFactory.graphRefAll(C.astFactory.sourceLocation(graphAll2)));
      } }
    ]),
    gImpl: ({ SUBRULE, PRINT_WORD }) => (ast, { astFactory: F2 }) => {
      if (F2.isGraphRefSpecific(ast)) {
        SUBRULE(graphRef, ast);
      } else if (F2.isGraphRefDefault(ast)) {
        F2.printFilter(ast, () => PRINT_WORD("DEFAULT"));
      } else if (F2.isGraphRefNamed(ast)) {
        F2.printFilter(ast, () => PRINT_WORD("NAMED"));
      } else {
        F2.printFilter(ast, () => PRINT_WORD("ALL"));
      }
    }
  };
  var quads = {
    name: "quads",
    impl: ({ ACTION, SUBRULE, CONSUME, MANY, SUBRULE1, SUBRULE2, OPTION1, OPTION2, OPTION3 }) => (C) => {
      const quads2 = [];
      let last2;
      OPTION1(() => {
        const triples = SUBRULE1(triplesTemplate);
        last2 = triples;
        ACTION(() => quads2.push(triples));
      });
      MANY(() => {
        const notTriples = SUBRULE(quadsNotTriples);
        last2 = notTriples;
        quads2.push(notTriples);
        OPTION2(() => {
          const dotToken = CONSUME(symbols_exports.dot);
          last2 = dotToken;
          return dotToken;
        });
        OPTION3(() => {
          const triples = SUBRULE2(triplesTemplate);
          last2 = triples;
          ACTION(() => quads2.push(triples));
        });
      });
      return ACTION(() => C.astFactory.wrap(quads2, C.astFactory.sourceLocation(quads2.at(0), last2)));
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      for (const quad of ast.val) {
        if (F2.isPattern(quad)) {
          SUBRULE(triplesBlock, quad);
        } else {
          SUBRULE(quadsNotTriples, quad);
        }
      }
    }
  };
  var quadsNotTriples = {
    name: "quadsNotTriples",
    impl: ({ ACTION, SUBRULE1, CONSUME, OPTION }) => (C) => {
      const graph2 = CONSUME(graph_exports.graph);
      const name = SUBRULE1(varOrIri);
      CONSUME(symbols_exports.LCurly);
      const triples = OPTION(() => SUBRULE1(triplesTemplate));
      const close = CONSUME(symbols_exports.RCurly);
      return ACTION(() => C.astFactory.graphQuads(name, triples ?? C.astFactory.patternBgp([], C.astFactory.sourceLocation()), C.astFactory.sourceLocation(graph2, close)));
    },
    gImpl: ({ SUBRULE, PRINT_WORD, NEW_LINE, PRINT_ON_OWN_LINE }) => (ast, C) => {
      const { astFactory: F2, indentInc } = C;
      F2.printFilter(ast, () => PRINT_WORD("GRAPH"));
      SUBRULE(varOrTerm, ast.graph);
      F2.printFilter(ast, () => {
        C[traqulaIndentation] += indentInc;
        PRINT_WORD("{");
        NEW_LINE();
      });
      SUBRULE(triplesBlock, ast.triples);
      F2.printFilter(ast, () => {
        C[traqulaIndentation] -= indentInc;
        PRINT_ON_OWN_LINE("}");
      });
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/grammar/index.js
  var queryOrUpdate = {
    name: "queryOrUpdate",
    impl: ({ ACTION, SUBRULE, OR1, OR2, MANY, OPTION1, CONSUME, SUBRULE2 }) => (C) => {
      const prologueValues = SUBRULE(prologue);
      return OR1([
        { ALT: () => {
          const subType = OR2([
            { ALT: () => SUBRULE(selectQuery) },
            { ALT: () => SUBRULE(constructQuery) },
            { ALT: () => SUBRULE(describeQuery) },
            { ALT: () => SUBRULE(askQuery) }
          ]);
          const values3 = SUBRULE(valuesClause);
          return ACTION(() => ({
            context: prologueValues,
            ...subType,
            type: "query",
            ...values3 && { values: values3 },
            loc: C.astFactory.sourceLocation(prologueValues.at(0), subType, values3)
          }));
        } },
        { ALT: () => {
          const updates = [];
          updates.push({ context: prologueValues });
          let parsedSemi = true;
          MANY({
            GATE: () => parsedSemi,
            DEF: () => {
              parsedSemi = false;
              updates.at(-1).operation = SUBRULE(update1);
              OPTION1(() => {
                CONSUME(symbols_exports.semi);
                parsedSemi = true;
                const innerPrologue = SUBRULE2(prologue);
                updates.push({ context: innerPrologue });
              });
            }
          });
          return ACTION(() => {
            const update2 = {
              type: "update",
              updates,
              loc: C.astFactory.sourceLocation(...updates.flatMap((x) => [...x.context, x.operation]))
            };
            if (!C.skipValidation) {
              updateNoReuseBlankNodeLabels(update2);
            }
            return update2;
          });
        } }
      ]);
    },
    gImpl: ({ SUBRULE }) => (ast, { astFactory: F2 }) => {
      if (F2.isQuery(ast)) {
        SUBRULE(query, ast);
      } else {
        SUBRULE(update, ast);
      }
    }
  };

  // node_modules/@traqula/rules-sparql-1-1/dist/esm/lib/MinimalSparqlParser.js
  function completeParseContext(context) {
    return {
      astFactory: context.astFactory ?? new AstFactory({ tracksSourceLocation: false }),
      baseIRI: context.baseIRI,
      prefixes: Object.assign(/* @__PURE__ */ Object.create(null), context.prefixes),
      parseMode: context.parseMode ? new Set(context.parseMode) : /* @__PURE__ */ new Set(["canParseVars", "canCreateBlankNodes"]),
      skipValidation: context.skipValidation ?? false
    };
  }
  function copyParseContext(context) {
    return {
      ...context,
      prefixes: Object.assign(/* @__PURE__ */ Object.create(null), context.prefixes),
      parseMode: new Set(context.parseMode)
    };
  }
  var MinimalSparqlParser = class {
    parser;
    defaultContext;
    coreTransformer = new TransformerObject();
    constructor(parser, defaultContext = {}) {
      this.parser = parser;
      this.defaultContext = completeParseContext(defaultContext);
    }
    /**
     * Parse a query string starting from the
     * [QueryUnit](https://www.w3.org/TR/sparql11-query/#rQueryUnit)
     * or [QueryUpdate](https://www.w3.org/TR/sparql11-query/#rUpdateUnit) rules.
     * @param query
     * @param context
     */
    parse(query2, context = {}) {
      const ast = this.parser.queryOrUpdate(query2, copyParseContext({ ...this.defaultContext, ...context }));
      ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query2, ast.loc, 0, Number.MAX_SAFE_INTEGER);
      return ast;
    }
    /**
     * Parse a query string starting from the [Path](https://www.w3.org/TR/sparql11-query/#rPath) grammar rule.
     * @param query
     * @param context
     */
    parsePath(query2, context = {}) {
      const ast = this.parser.path(query2, copyParseContext({ ...this.defaultContext, ...context }));
      ast.loc = this.defaultContext.astFactory.sourceLocationInlinedSource(query2, ast.loc, 0, Number.MAX_SAFE_INTEGER);
      if (this.defaultContext.astFactory.isPathPure(ast)) {
        return {
          ...ast,
          prefixes: /* @__PURE__ */ Object.create(null)
        };
      }
      return ast;
    }
  };

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/expressionParser.js
  var rulesNoBuiltIn = [
    grammar_exports.expression,
    grammar_exports.conditionalOrExpression,
    grammar_exports.conditionalAndExpression,
    grammar_exports.valueLogical,
    grammar_exports.relationalExpression,
    grammar_exports.numericExpression,
    grammar_exports.expressionList,
    grammar_exports.additiveExpression,
    grammar_exports.multiplicativeExpression,
    grammar_exports.unaryExpression,
    grammar_exports.primaryExpression,
    grammar_exports.brackettedExpression,
    // BuiltInCall,
    grammar_exports.iriOrFunction,
    grammar_exports.rdfLiteral,
    grammar_exports.numericLiteral,
    grammar_exports.numericLiteralUnsigned,
    grammar_exports.numericLiteralPositive,
    grammar_exports.numericLiteralNegative,
    grammar_exports.booleanLiteral,
    grammar_exports.var_,
    grammar_exports.builtInStr,
    grammar_exports.builtInLang,
    grammar_exports.builtInLangmatches,
    grammar_exports.builtInDatatype,
    grammar_exports.builtInBound,
    grammar_exports.builtInIri,
    grammar_exports.builtInUri,
    grammar_exports.builtInBnodeSparqlJs,
    grammar_exports.builtInRand,
    grammar_exports.builtInAbs,
    grammar_exports.builtInCeil,
    grammar_exports.builtInFloor,
    grammar_exports.builtInRound,
    grammar_exports.builtInConcat,
    grammar_exports.builtInStrlen,
    grammar_exports.builtInUcase,
    grammar_exports.builtInLcase,
    grammar_exports.builtInEncode_for_uri
  ];
  var builtInPatch = {
    name: "builtInCall",
    impl: ({ OR, SUBRULE }) => () => OR(grammar_exports.builtInCallList(SUBRULE).slice(0, -2))
  };
  var expressionParserBuilder = ParserBuilder.create(rulesNoBuiltIn).addMany(grammar_exports.builtInContains, grammar_exports.builtInStrstarts, grammar_exports.builtInStrends, grammar_exports.builtInStrbefore, grammar_exports.builtInStrafter, grammar_exports.builtInYear, grammar_exports.builtInMonth, grammar_exports.builtInDay, grammar_exports.builtInHours, grammar_exports.builtInMinutes, grammar_exports.builtInSeconds, grammar_exports.builtInTimezone, grammar_exports.builtInTz, grammar_exports.builtInNow, grammar_exports.builtInUuid, grammar_exports.builtInStruuid, grammar_exports.builtInMd5, grammar_exports.builtInSha1, grammar_exports.builtInSha256, grammar_exports.builtInSha384, grammar_exports.builtInSha512, grammar_exports.builtInCoalesce, grammar_exports.builtInIf, grammar_exports.builtInStrlang, grammar_exports.builtInStrdt, grammar_exports.builtInSameterm, grammar_exports.builtInIsiri, grammar_exports.builtInIsuri, grammar_exports.builtInIsblank, grammar_exports.builtInIsliteral, grammar_exports.builtInIsnumeric, grammar_exports.regexExpression, grammar_exports.substringExpression, grammar_exports.strReplaceExpression, grammar_exports.aggregateCount, grammar_exports.aggregateSum, grammar_exports.aggregateMin, grammar_exports.aggregateMax, grammar_exports.aggregateAvg, grammar_exports.aggregateSample, grammar_exports.aggregateGroup_concat, grammar_exports.aggregate, grammar_exports.iri, grammar_exports.iriFull, grammar_exports.prefixedName, grammar_exports.argList, grammar_exports.string).addRule(builtInPatch);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/objectListParser.js
  var rules = [
    grammar_exports.objectList,
    grammar_exports.object,
    grammar_exports.graphNode,
    grammar_exports.varOrTerm,
    grammar_exports.triplesNode,
    grammar_exports.collection,
    grammar_exports.blankNodePropertyList,
    grammar_exports.propertyListNotEmpty,
    // PropertyListNotEmpty
    grammar_exports.verb,
    grammar_exports.verbA,
    grammar_exports.varOrIri,
    grammar_exports.var_,
    grammar_exports.iri,
    grammar_exports.iriFull,
    grammar_exports.prefixedName,
    grammar_exports.graphTerm,
    grammar_exports.rdfLiteral,
    grammar_exports.numericLiteral,
    grammar_exports.booleanLiteral,
    grammar_exports.blankNode,
    grammar_exports.string,
    grammar_exports.numericLiteralUnsigned,
    grammar_exports.numericLiteralPositive,
    grammar_exports.numericLiteralNegative
  ];
  var objectListParserBuilder = ParserBuilder.create(rules);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/triplesBlockParser.js
  var triplesBlockParserBuilder = ParserBuilder.create([
    grammar_exports.triplesBlock,
    grammar_exports.triplesSameSubjectPath,
    // VarOrTerm is included in the required ObjectList rule
    grammar_exports.propertyListPathNotEmpty,
    grammar_exports.triplesNodePath,
    grammar_exports.propertyListPath,
    // PropertyListNotEmpty
    grammar_exports.verbPath,
    grammar_exports.verbSimple,
    grammar_exports.objectListPath
  ]).merge(objectListParserBuilder, []).addMany(
    grammar_exports.path,
    grammar_exports.pathAlternative,
    grammar_exports.pathSequence,
    grammar_exports.pathEltOrInverse,
    grammar_exports.pathElt,
    grammar_exports.pathPrimary,
    grammar_exports.pathMod,
    grammar_exports.pathNegatedPropertySet,
    grammar_exports.pathOneInPropertySet,
    // ObjectListPath
    grammar_exports.objectPath,
    grammar_exports.graphNodePath,
    grammar_exports.collectionPath,
    grammar_exports.blankNodePropertyListPath
  );

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/subSelectParser.js
  var rules2 = [
    grammar_exports.subSelect,
    grammar_exports.selectClause,
    grammar_exports.whereClause,
    grammar_exports.solutionModifier,
    grammar_exports.valuesClause
  ];
  var subSelectParserBuilder = ParserBuilder.create(rules2).merge(expressionParserBuilder, []).patchRule(grammar_exports.builtInCall).addMany(grammar_exports.existsFunc, grammar_exports.notExistsFunc, grammar_exports.groupGraphPattern, grammar_exports.groupGraphPatternSub).merge(triplesBlockParserBuilder, []).addMany(
    grammar_exports.graphPatternNotTriples,
    grammar_exports.groupOrUnionGraphPattern,
    grammar_exports.optionalGraphPattern,
    grammar_exports.minusGraphPattern,
    grammar_exports.graphGraphPattern,
    grammar_exports.serviceGraphPattern,
    grammar_exports.filter,
    grammar_exports.bind,
    grammar_exports.inlineData,
    grammar_exports.constraint,
    grammar_exports.functionCall,
    grammar_exports.dataBlock,
    grammar_exports.inlineDataOneVar,
    grammar_exports.inlineDataFull,
    grammar_exports.dataBlockValue,
    // Solution modifier
    grammar_exports.groupClause,
    grammar_exports.havingClause,
    grammar_exports.orderClause,
    grammar_exports.limitOffsetClauses,
    grammar_exports.groupCondition,
    grammar_exports.havingCondition,
    grammar_exports.orderCondition,
    grammar_exports.limitClause,
    grammar_exports.offsetClause
  );

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/triplesTemplateParserBuilder.js
  var rules3 = [
    grammar_exports.triplesTemplate,
    grammar_exports.triplesSameSubject,
    grammar_exports.varOrTerm,
    grammar_exports.propertyListNotEmpty,
    grammar_exports.triplesNode,
    grammar_exports.propertyList,
    grammar_exports.var_,
    grammar_exports.graphTerm,
    grammar_exports.iri,
    grammar_exports.iriFull,
    grammar_exports.prefixedName,
    grammar_exports.rdfLiteral,
    grammar_exports.string,
    grammar_exports.numericLiteral,
    grammar_exports.numericLiteralUnsigned,
    grammar_exports.numericLiteralPositive,
    grammar_exports.numericLiteralNegative,
    grammar_exports.booleanLiteral,
    grammar_exports.blankNode,
    grammar_exports.verb,
    grammar_exports.verbA,
    grammar_exports.varOrIri,
    grammar_exports.objectList,
    grammar_exports.object,
    grammar_exports.collection,
    grammar_exports.blankNodePropertyList,
    grammar_exports.graphNode
  ];
  var triplesTemplateParserBuilder = ParserBuilder.create(rules3);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/queryUnitParser.js
  var rules4 = [
    grammar_exports.queryUnit,
    grammar_exports.query,
    grammar_exports.prologue,
    grammar_exports.selectQuery,
    grammar_exports.constructQuery,
    grammar_exports.describeQuery,
    grammar_exports.askQuery,
    grammar_exports.valuesClause,
    grammar_exports.baseDecl,
    grammar_exports.prefixDecl
  ];
  var queryUnitParserBuilder = ParserBuilder.create(rules4).merge(subSelectParserBuilder, []).addRule(grammar_exports.datasetClause).addRule(grammar_exports.datasetClauseStar).addRule(grammar_exports.defaultGraphClause).addRule(grammar_exports.namedGraphClause).addRule(grammar_exports.sourceSelector).addRule(grammar_exports.constructTemplate).merge(triplesTemplateParserBuilder, []).addRule(grammar_exports.constructTriples);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/updateNoModifyParser.js
  var update1Patch = {
    name: "update1",
    impl: ({ SUBRULE, OR }) => () => OR([
      { ALT: () => SUBRULE(grammar_exports.load) },
      { ALT: () => SUBRULE(grammar_exports.clear) },
      { ALT: () => SUBRULE(grammar_exports.drop) },
      { ALT: () => SUBRULE(grammar_exports.add) },
      { ALT: () => SUBRULE(grammar_exports.move) },
      { ALT: () => SUBRULE(grammar_exports.copy) },
      { ALT: () => SUBRULE(grammar_exports.create) },
      { ALT: () => SUBRULE(grammar_exports.insertData) },
      { ALT: () => SUBRULE(grammar_exports.deleteData) },
      { ALT: () => SUBRULE(grammar_exports.deleteWhere) }
    ]),
    gImpl: grammar_exports.update1.gImpl
  };
  var rulesNoUpdate1 = [
    grammar_exports.updateUnit,
    grammar_exports.update,
    grammar_exports.prologue,
    // Update1,
    grammar_exports.baseDecl,
    grammar_exports.prefixDecl,
    grammar_exports.load,
    grammar_exports.clear,
    grammar_exports.drop,
    grammar_exports.add,
    grammar_exports.move,
    grammar_exports.copy,
    grammar_exports.create,
    grammar_exports.insertData,
    grammar_exports.deleteData,
    grammar_exports.deleteWhere,
    grammar_exports.iri,
    grammar_exports.prefixedName,
    grammar_exports.graphRef,
    grammar_exports.graphRefAll,
    grammar_exports.graphOrDefault,
    grammar_exports.quadData,
    grammar_exports.quads
  ];
  var updateNoModifyParserBuilder = ParserBuilder.create(rulesNoUpdate1).addRule(update1Patch).merge(triplesTemplateParserBuilder, []).addRule(grammar_exports.quadPattern).addRule(grammar_exports.quadsNotTriples);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/updateUnitParser.js
  var updateParserBuilder = ParserBuilder.create(updateNoModifyParserBuilder).patchRule(grammar_exports.update1).addMany(grammar_exports.modify, grammar_exports.deleteClause, grammar_exports.insertClause, grammar_exports.usingClause, grammar_exports.defaultGraphClause, grammar_exports.namedGraphClause, grammar_exports.sourceSelector, grammar_exports.usingClauseStar, grammar_exports.groupGraphPattern).merge(objectListParserBuilder, []).merge(subSelectParserBuilder, []);

  // node_modules/@traqula/parser-sparql-1-1/dist/esm/lib/Parser.js
  var sparql11ParserBuilder = ParserBuilder.create(queryUnitParserBuilder).merge(updateParserBuilder, []).addRule(grammar_exports.queryOrUpdate);
  var Parser2 = class extends MinimalSparqlParser {
    constructor(args = {}) {
      const parser = sparql11ParserBuilder.build({
        ...args,
        tokenVocabulary: lexer_exports.sparql11LexerBuilder.tokenVocabulary,
        queryPreProcessor: sparqlCodepointEscape
      });
      super(parser, args.defaultContext);
    }
  };
  return __toCommonJS(lib_exports);
})();
/*! Bundled license information:

@traqula/chevrotain/dist/esm/lib/index.js:
  (*! Bundled license information:
  
  lodash-es/lodash.js:
    (**
     * @license
     * Lodash (Custom Build) <https://lodash.com/>
     * Build: `lodash modularize exports="es" --repo lodash/lodash#4.18.1 -o ./`
     * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
     * Released under MIT license <https://lodash.com/license>
     * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
     * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
     *)
  *)
*/
