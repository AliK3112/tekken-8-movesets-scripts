'use strict';

function findModuleBase(moduleName) {
  if (typeof Module !== 'undefined' && typeof Module.findBaseAddress === 'function') {
    return Module.findBaseAddress(moduleName); // NativePointer or null
  }
  if (typeof Process !== 'undefined' && typeof Process.findModuleByName === 'function') {
    const m = Process.findModuleByName(moduleName); // module object or null
    return m ? m.base : null;
  }
  // neither API available — throw helpful error
  throw new Error('cannot find module base: neither Module.findBaseAddress nor Process.findModuleByName is available in this Frida runtime');
}

rpc.exports = {
  // call the target function by module name + rva
  callByModuleRva: function (moduleName, rva, charId, isUpper) {
    const rvaNum = (typeof rva === 'string') ? parseInt(rva, 16) : (rva >>> 0);

    const base = findModuleBase(moduleName);
    if (base === null) {
      throw new Error('Module not found: ' + moduleName);
    }

    // ensure base is a NativePointer
    const basePtr = ptr(base);
    const addr = basePtr.add(ptr(rvaNum));
    return callAndRead(addr, charId | 0, !!isUpper);
  },

  callByBaseAndRva: function (baseStrOrNum, rva, charId, isUpper) {
    const basePtr = ptr(baseStrOrNum);
    const rvaNum = (typeof rva === 'string') ? parseInt(rva, 16) : (rva >>> 0);
    const addr = basePtr.add(ptr(rvaNum));
    return callAndRead(addr, charId | 0, !!isUpper);
  },

  callGameFunc: function (moduleName, rva, { retType = 'void', argsTypes = [], args = [] } = {}) {
    const rvaNum = (typeof rva === 'string') ? parseInt(rva, 16) : (rva >>> 0);
    const base = findModuleBase(moduleName);
    if (base === null) {
      throw new Error('Module not found: ' + moduleName);
    }
    const basePtr = ptr(base);
    const addr = basePtr.add(ptr(rvaNum));
    const fn = new NativeFunction(addr, retType, argsTypes, 'default');
    try {
      const retValue = fn(...args);
      if (retType === 'pointer') return ptr(retValue);
      // if (retType === 'pointer' && !retValue.isNull()) {
      //   try {
      //     return retValue.readCString();
      //   } catch (e) {
      //     return '[error reading string at ' + retValue + ']: ' + e.message;
      //   }
      // }
      return retValue;
    } catch (e) {
      throw new Error('Native call threw: ' + e.message);
    }
  },

  readPtr: (address) => {
    const addrPtr = ptr(address);
    return addrPtr.readPointer();
  },
  readCString: (address) => {
    const addrPtr = ptr(address);
    return addrPtr.readCString();
  }
};

function callAndRead(funcPtr, charId, isUpper) {
  if (funcPtr.isNull()) throw new Error('Computed function pointer is NULL');

  // coerce args to integers explicitly
  const intCharId = charId | 0;               // 32-bit signed
  const intIsUpper = isUpper ? 1 : 0;        // 0/1 integer

  console.log("charId:", intCharId, "isUpper:", intIsUpper, "-> calling function at", funcPtr);

  // use 'int' for both params (more reliable than 'bool' in many cases)
  const fn = new NativeFunction(funcPtr, 'pointer', ['int', 'int'], 'default');

  let retPtr = ptr(0);
  try {
    retPtr = fn(intCharId, intIsUpper);
  } catch (e) {
    throw new Error('Native call threw: ' + e.message);
  }

  if (retPtr.isNull()) return null;

  try {
    // return Memory.readUtf8String(retPtr);
    return retPtr.readCString();
  } catch (e) {
    return '[error reading string at ' + retPtr + ']: ' + e.message;
  }
}
