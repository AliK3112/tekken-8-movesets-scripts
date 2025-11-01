// client.js
'use strict';
const frida = require('frida');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  // attach by process name (or use pid)
  const session = await frida.attach('Polaris-Win64-Shipping.exe');

  const agentSrc = await fs.readFile(path.join(__dirname, 'agent.js'), 'utf8');
  const script = await session.createScript(agentSrc);
  await script.load();

  // --- use the module-RVA variant ---
  const moduleName = 'Polaris-Win64-Shipping.exe';
  const rva = '0x5DC7740';    // your RVA as hex string
  const charId = 8;          // example charId
  const isUpper = false;       // example


  // try {
  //   // const result = await script.exports.callByModuleRva(moduleName, rva, charId, isUpper);
  //   const result = await script.exports.callGameFunc(moduleName, rva, {
  //     retType: 'pointer',
  //     argsTypes: ['int', 'int'],
  //     args: [8, 0]
  //   });
  //   const code = await script.exports.readCString(result);
  //   console.log('Result:', code);
  // } catch (err) {
  //   console.error('callByModuleRva failed:', err);
  // }

  // Read the function that seems to return the names for tkdata list files
  // const getFbsDataFileName = async (index) => {
  //   try {
  //     const result = await script.exports.callGameFunc(moduleName, 0x5912C80, {
  //       retType: 'pointer',
  //       argsTypes: ['int'],
  //       args: [index]
  //     });
  //     // console.log('retValue:', result);
  //     const code = await script.exports.readCString(result);
  //     // console.log('Result:', code);
  //     return code;
  //   } catch (err) {
  //     console.error('callGameFunc failed:', err);
  //     return null;
  //   }
  // };

  // for (let i = 0; i < 100; i++) {
  //   const name = await getFbsDataFileName(i);
  //   // console.log(`FbsData file name [${i}]:`, name);
  //   console.log(`${i}:`, name);
  // }


  // try {
  //   const result = await script.exports.callGameFunc(moduleName, 0x5B653B0, { retType: 'bool' });
  //   console.log('Result:', Boolean(result));
  // } catch (err) {
  //   console.error('callGameFunc failed:', err);
  // }

  // "Polaris-Win64-Shipping.exe"+5A03AF0 
  const deriveKey = async (index) => {
    try {
      const result = await script.exports.callGameFunc(moduleName, 0x5A03AF0, {
        retType: 'pointer',
        argsTypes: ['ulong', 'int'],
        args: [0, index]
      });
      // console.log('Result:', result);
      return await script.exports.readCString(result);
    } catch (err) {
      console.error('callGameFunc failed:', err);
    }
  }

  for (let i = 0; i < 120; i++) {
    const key = await deriveKey(i);
    console.log(`Derived key [${i}]: ${key} - (${key.length})`);
  }

  // --- optional: if you prefer to use a known base rather than Module.findBaseAddress ---
  // const knownBase = '0x140000000';
  // const result2 = await script.exports.callByBaseAndRva(knownBase, rva, charId, isUpper);
  // console.log('Result (known base):', result2);

  await session.detach();
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});