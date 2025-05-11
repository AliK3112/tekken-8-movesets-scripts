#include <iostream>
#include <cstdint>
#include <Windows.h>
#include <string>
#include <sstream>
#include <Psapi.h>
#include <tlhelp32.h>
#include <vector>

#pragma comment(lib, "Psapi.lib")

class GameClass
{
private:
  DWORD processId;
  HANDLE processHandle;
  HMODULE baseModule;
  uintptr_t baseAddress;

public:
  GameClass() : processId(0), processHandle(nullptr), baseModule(nullptr), baseAddress(0) {}

  ~GameClass()
  {
    if (processHandle != nullptr)
      CloseHandle(processHandle);
  }

  uintptr_t getBaseAddress()
  {
    return baseAddress;
  }

  bool Attach(const wchar_t *processName)
  {
    processId = findProcessByName(processName);
    if (processId == 0)
    {
      std::cerr << "Error: Cannot find the game process." << std::endl;
      return false;
    }

    processHandle = OpenProcess(PROCESS_ALL_ACCESS, FALSE, processId);
    if (processHandle == NULL)
    {
      std::cerr << "Error: Failed to open the game process." << std::endl;
      return false;
    }

    // Get the module (executable) handle
    HMODULE hMods[1024];
    DWORD cbNeeded;
    if (EnumProcessModules(processHandle, hMods, sizeof(hMods), &cbNeeded))
    {
      baseModule = hMods[0]; // First module is the executable
      MODULEINFO moduleInfo;
      GetModuleInformation(processHandle, baseModule, &moduleInfo, sizeof(MODULEINFO));
      baseAddress = reinterpret_cast<uintptr_t>(moduleInfo.lpBaseOfDll); // Base address of the module
      printf("Base Address: 0x%llx\n", baseAddress);
    }
    else
    {
      std::cerr << "Error: Failed to obtain base module handle." << std::endl;
      return false;
    }

    std::cout << "Successfully attached to the game process." << std::endl;
    return true;
  }

  uintptr_t getAddress(uintptr_t *offsets, int size)
  {
    uintptr_t address = baseAddress;
    for (int i = 0; i < size; i++)
    {
      address = read<uintptr_t>(address + offsets[i]);
    }
    return address;
  }

  uintptr_t getAddress(const std::vector<DWORD> &offsets)
  {
    uintptr_t address = baseAddress;
    for (DWORD offset : offsets)
    {
      address = read<uintptr_t>(address + (uintptr_t)offset);
    }
    return address;
  }

  // Allocate memory in the target process
  template <typename T>
  T *allocateInTarget(size_t count)
  {
    return reinterpret_cast<T *>(VirtualAllocEx(processHandle, nullptr, sizeof(T) * count, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE));
  }

  // Batch call to decrypt multiple values
  template <typename ReturnType, typename ParamType>
  std::vector<ReturnType> callFunctionBatch(uintptr_t functionAddress, const std::vector<ParamType> &encryptedArray)
  {
    // Allocate remote buffer for encrypted array
    ParamType *remoteArray = allocateInTarget<ParamType>(encryptedArray.size());
    if (!remoteArray)
    {
      std::cerr << "Error: Failed to allocate memory in target process." << std::endl;
      return {};
    }

    // Write encrypted data to remote memory
    SIZE_T bytesWritten;
    WriteProcessMemory(processHandle, remoteArray, encryptedArray.data(), sizeof(ParamType) * encryptedArray.size(), &bytesWritten);

    // Create a vector to store decrypted values
    std::vector<ReturnType> decryptedValues;
    decryptedValues.reserve(encryptedArray.size());

    // Loop over each element in the remote array, calling the function
    for (size_t i = 0; i < encryptedArray.size(); i++)
    {
      // Call decryption function on each element
      ReturnType decryptedValue = callFunction<ReturnType, ParamType>(functionAddress, &remoteArray[i]);
      decryptedValues.push_back(decryptedValue);
    }

    // Free the remote array after processing
    freeInTarget(remoteArray);

    return decryptedValues;
  }

  // Free memory in the target process
  void freeInTarget(void *address)
  {
    VirtualFreeEx(processHandle, address, 0, MEM_RELEASE);
  }

  // Function to call an internal game function
  template <typename ReturnType, typename ParamType>
  ReturnType callFunction(uintptr_t functionAddress, ParamType *paramAddr, bool allocateMemory = false)
  {
    ParamType *remoteParamAddr = paramAddr; // Default to using the given address

    if (allocateMemory)
    {
      // Allocate memory in the target process for `ParamType`
      remoteParamAddr = allocateInTarget<ParamType>(1);
      if (!remoteParamAddr)
      {
        std::cerr << "Error: Failed to allocate memory in target process." << std::endl;
        return ReturnType();
      }

      // Write the parameter to the allocated memory
      SIZE_T bytesWritten;
      if (!WriteProcessMemory(processHandle, remoteParamAddr, paramAddr, sizeof(ParamType), &bytesWritten) || bytesWritten != sizeof(ParamType))
      {
        std::cerr << "Error: Failed to write parameter to target process memory." << std::endl;
        freeInTarget(remoteParamAddr); // Free memory if write fails
        return ReturnType();
      }
    }

    // Prepare the thread context to execute the function at `functionAddress` with `remoteParamAddr` as the argument
    HANDLE threadHandle = CreateRemoteThread(
        processHandle,
        nullptr,
        0,
        reinterpret_cast<LPTHREAD_START_ROUTINE>(functionAddress),
        remoteParamAddr,
        0,
        nullptr);

    if (!threadHandle)
    {
      std::cerr << "Error: Failed to create remote thread." << std::endl;
      if (allocateMemory)
        freeInTarget(remoteParamAddr); // Free if allocated
      return ReturnType();
    }

    // Wait for the function call to complete
    WaitForSingleObject(threadHandle, INFINITE);

    // Retrieve the return value from the thread
    DWORD exitCode;
    if (GetExitCodeThread(threadHandle, &exitCode))
    {
      CloseHandle(threadHandle);
      if (allocateMemory)
        freeInTarget(remoteParamAddr);
      return static_cast<ReturnType>(exitCode);
    }

    // Free the allocated memory in the target process, if allocated
    if (allocateMemory)
      freeInTarget(remoteParamAddr);

    std::cerr << "Error: Failed to get the return value from the thread." << std::endl;
    CloseHandle(threadHandle);
    return ReturnType{};
  }

  template <typename T>
  void write(uintptr_t address, T value)
  {
    if (!WriteProcessMemory(processHandle, reinterpret_cast<LPVOID>(address), &value, sizeof(T), nullptr))
    {
      std::cerr << "Error: Failed to write memory at address " << std::hex << address << std::endl;
    }
  }

  void writeString(uintptr_t address, const std::string &str)
  {
    if (!WriteProcessMemory(processHandle, reinterpret_cast<LPVOID>(address), str.c_str(), str.size() + 1, nullptr))
    {
      std::cerr << "Error: Failed to write string to memory at address " << std::hex << address << std::endl;
    }
  }

  template <typename T>
  std::vector<T> readArray(uintptr_t address, size_t count)
  {
    std::vector<T> buffer(count);
    SIZE_T bytesRead;
    if (ReadProcessMemory(processHandle, reinterpret_cast<LPCVOID>(address), buffer.data(), count * sizeof(T), &bytesRead))
    {
      if (bytesRead == count * sizeof(T))
      {
        return buffer;
      }
    }
    // std::cerr << "Error: Failed to read the memory array." << std::endl;
    return std::vector<T>();
  }

  template <typename T>
  T read(uintptr_t address)
  {
    T value;
    SIZE_T bytesRead;
    if (!ReadProcessMemory(processHandle, reinterpret_cast<LPVOID>(address), &value, sizeof(T), &bytesRead))
    {
      // std::cerr << "Error: Failed to read memory at address " << std::hex << address << std::endl;
    }
    if (bytesRead != sizeof(T))
    {
      // std::cerr << "Error: Incomplete read at address " << std::hex << address << std::endl;
    }
    return value;
  }

  BYTE ReadByte(uintptr_t address)
  {
    return read<BYTE>(address);
  }

  char ReadChar(uintptr_t address)
  {
    return read<char>(address);
  }

  short ReadSignedShort(uintptr_t address)
  {
    return read<short>(address);
  }

  unsigned short ReadUnsignedShort(uintptr_t address)
  {
    return read<unsigned short>(address);
  }

  int ReadSignedInt(uintptr_t address)
  {
    return read<int>(address);
  }

  unsigned int ReadUnsignedInt(uintptr_t address)
  {
    return read<unsigned int>(address);
  }

  long ReadLong(uintptr_t address)
  {
    return read<long>(address);
  }

  uintptr_t ReadUnsignedLong(uintptr_t address)
  {
    return read<uintptr_t>(address);
  }

  std::string ReadString(uintptr_t address, SIZE_T size)
  {
    std::string value(size, '\0');
    ReadProcessMemory(processHandle, (LPVOID)address, &value[0], size, nullptr);
    return value;
  }

  // Easier Named Methods
  char readByte(uintptr_t address)
  {
    return read<char>(address);
  }

  uint16_t readUInt16(uintptr_t address)
  {
    return read<uint16_t>(address);
  }

  int16_t readInt16(uintptr_t address)
  {
    return read<int16_t>(address);
  }

  uint32_t readUInt32(uintptr_t address)
  {
    return read<uint32_t>(address);
  }

  int readInt32(uintptr_t address)
  {
    return read<int>(address);
  }

  uint64_t readUInt64(uintptr_t address)
  {
    return read<uint64_t>(address);
  }

  int64_t readInt64(uintptr_t address)
  {
    return read<int64_t>(address);
  }

  uintptr_t FastAoBScan(const std::string &pattern, uintptr_t startAddress = 0, uintptr_t endAddress = 0)
  {
    if (!this->processHandle || this->baseAddress == 0)
    {
      std::cerr << "Error: Process not attached or base address not set." << std::endl;
      return 0;
    }

    MODULEINFO moduleInfo;
    if (!GetModuleInformation(this->processHandle, baseModule, &moduleInfo, sizeof(moduleInfo)))
    {
      std::cerr << "Error: Failed to get module information." << std::endl;
      return 0;
    }

    uintptr_t moduleStart = this->baseAddress;
    uintptr_t moduleEnd = moduleStart + moduleInfo.SizeOfImage;

    // Validate or assign start and end addresses
    if (startAddress == 0 || startAddress < moduleStart || startAddress >= moduleEnd)
      startAddress = moduleStart;
    if (endAddress == 0 || endAddress > moduleEnd || endAddress <= startAddress)
      endAddress = moduleEnd;

    // Convert pattern string to byte array and mask
    std::vector<uint8_t> patternBytes;
    std::vector<bool> mask; // False for wildcards, true for exact match

    std::istringstream ss(pattern);
    std::string byteStr;
    while (ss >> byteStr)
    {
      if (byteStr == "??" || byteStr == "?")
      {
        patternBytes.push_back(0);
        mask.push_back(false);
      }
      else
      {
        patternBytes.push_back(static_cast<uint8_t>(std::stoul(byteStr, nullptr, 16)));
        mask.push_back(true);
      }
    }

    size_t patternSize = patternBytes.size();
    if (patternSize == 0)
    {
      std::cerr << "Error: Invalid pattern format." << std::endl;
      return 0;
    }

    const size_t bufferSize = 0x10000; // 64 KB chunks
    std::vector<uint8_t> buffer(bufferSize);

    for (uintptr_t address = startAddress; address < endAddress - patternSize; address += bufferSize - patternSize)
    {
      SIZE_T bytesRead;
      if (!ReadProcessMemory(processHandle, reinterpret_cast<LPCVOID>(address), buffer.data(), bufferSize, &bytesRead))
      {
        continue; // Skip unreadable regions
      }

      for (size_t i = 0; i < bytesRead - patternSize; i++)
      {
        bool found = true;

        // Optimized pattern comparison using wildcards
        for (size_t j = 0; j < patternSize; j++)
        {
          if (mask[j] && buffer[i + j] != patternBytes[j]) // Only compare non-wildcard bytes
          {
            found = false;
            break;
          }
        }

        if (found)
        {
          return address + i; // Return the first found address
        }
      }
    }

    return 0; // Not found
  }

private:
  uintptr_t findProcessByName(const std::wstring &processName)
  {
    HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (snapshot != INVALID_HANDLE_VALUE)
    {
      PROCESSENTRY32W entry;
      entry.dwSize = sizeof(PROCESSENTRY32W);

      if (Process32FirstW(snapshot, &entry))
      {
        do
        {
          std::wstring currentProcessName = entry.szExeFile;
          if (currentProcessName == processName)
          {
            CloseHandle(snapshot);
            return static_cast<uintptr_t>(entry.th32ProcessID);
          }
        } while (Process32NextW(snapshot, &entry));
      }

      CloseHandle(snapshot);
    }

    return 0;
  }
};
