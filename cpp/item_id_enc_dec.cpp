#include <windows.h>
#include <string>
#include <cmath>
#include <cstdint>
#include <sstream>
#include <vector>
#include <cstdarg>
#include <process.h>

const char CLASS_NAME[] = "EncryptorWindow";

HWND hwndInput, hwndHexRadio, hwndDecRadio, hwndEncryptBtn, hwndDecryptBtn, hwndOutput, hwndLogBox;
bool ATTACHED = false;
int INPUT_MODE = 0; // 0 = Hex, 1 = Dec
// std::string ENC_BYTES = "48 89 5C 24 08 48 89 7C 24 10 44 8B 09 48 BF BA 0F A4 DC 96 FB CC ED 41 0F B6 C1 48 8B D9 4C 8B C7 24 1F 76 1C 0F B6 D0 0F 1F 84 00 00 00 00 00 49 8B C0 48 C1 E8 3F 4E 8D 04 40 48 83 EA 01 75 EF 41 83 E0 E0 45 33 DB 45 33 C1 45 8B CB 41 83 F0 1D 41 81 E0 FF FF FF 00 45 8B D0 0F 1F 40 00 41 0F B6 C9 48 8B C7 80 C1 08 74 15 0F B6 D1 90 48 8B C8 48 C1 E9 3F 48 8D 04 41 48 83 EA 01 75 EF 41 33 C2 41 83 C1 08 44 33 D8 41 C1 FA 08 41 83 F9 18 72 CB 48 8B 7C 24 10 45 84 DB 41 0F B6 C3 B9 01 00 00 00 0F 44 C1 C1 E0 18 41 03 C0 89 03 48 8B 5C 24 08 C3";
// std::string DEC_BYTES = "40 57 48 83 EC 20 8B 39 8B CF E8 ?? ?? ?? ?? 3B C7 75 5F 83 F7 1D 48 89 5C 24 30 40 0F B6 C7 48 BB BA 0F A4 DC 96 FB CC ED 24 1F 76 14 0F B6 C8 48 8B C3 48 C1 E8 3F 48 8D 1C 58 48 83 E9 01 75 EF F3 0F 10 0D ?? ?? ?? ?? F3 0F 10 05 ?? ?? ?? ?? E8 ?? ?? ?? ?? 83 E3 E0 33 DF C1 E3 08 8B C3 48 8B 5C 24 30 F3 0F 2C C8 99 F7 F9 48 83 C4 20 5F C3 33 C0 48 83 C4 20 5F C3";

void InitializeUI(HWND hwnd);
void SetInputMode();
LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);
void HandleEncrypt();
void HandleDecrypt();
bool GetParsedInput(uint32_t *outValue);
void UpdateOutputField();
uint32_t packChecksum(uint32_t input);
uint32_t decodeValue(uint32_t input);
uint32_t encodeValue(uint32_t input);

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int nCmdShow)
{
  WNDCLASSA wc = {};
  wc.lpfnWndProc = WindowProc;
  wc.hInstance = hInst;
  wc.lpszClassName = CLASS_NAME;
  RegisterClassA(&wc);

  HWND hwnd = CreateWindowA(CLASS_NAME, "Item ID Value Encryptor and Decryptor",
                            WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
                            CW_USEDEFAULT, CW_USEDEFAULT, 400, 200,
                            NULL, NULL, hInst, NULL);
  if (!hwnd)
    return 0;

  InitializeUI(hwnd);
  ShowWindow(hwnd, nCmdShow);

  MSG msg = {};
  while (GetMessageA(&msg, NULL, 0, 0))
  {
    TranslateMessage(&msg);
    DispatchMessageA(&msg);
  }
  return 0;
}

void InitializeUI(HWND hwnd)
{
  int padding = 20, spacing = 10, btnWidth = 100, btnHeight = 25;
  int labelWidth = 360, fieldWidth = 360, fieldHeight = 20;

  int y = padding;

  hwndInput = CreateWindowA("EDIT", "",
                            WS_CHILD | WS_VISIBLE | WS_BORDER | ES_AUTOHSCROLL,
                            padding, y, fieldWidth, fieldHeight,
                            hwnd, NULL, NULL, NULL);

  y += fieldHeight + spacing;

  hwndHexRadio = CreateWindowA("BUTTON", "Hexadecimal", WS_CHILD | WS_VISIBLE | BS_AUTORADIOBUTTON,
                               padding, y, 120, 20, hwnd, (HMENU)1, NULL, NULL);
  hwndDecRadio = CreateWindowA("BUTTON", "Decimal", WS_CHILD | WS_VISIBLE | BS_AUTORADIOBUTTON,
                               padding + 130, y, 120, 20, hwnd, (HMENU)2, NULL, NULL);
  SendMessageA(hwndHexRadio, BM_SETCHECK, BST_CHECKED, 0);

  y += 20 + spacing;

  hwndEncryptBtn = CreateWindowA("BUTTON", "Encrypt", WS_CHILD | WS_VISIBLE,
                                 padding, y, btnWidth, btnHeight,
                                 hwnd, (HMENU)3, NULL, NULL);
  hwndDecryptBtn = CreateWindowA("BUTTON", "Decrypt", WS_CHILD | WS_VISIBLE,
                                 padding + btnWidth + spacing, y, btnWidth, btnHeight,
                                 hwnd, (HMENU)4, NULL, NULL);

  y += btnHeight + spacing;

  hwndOutput = CreateWindowA("EDIT", "",
                             WS_CHILD | WS_VISIBLE | WS_BORDER | ES_READONLY,
                             padding, y, fieldWidth, fieldHeight,
                             hwnd, NULL, NULL, NULL);
}

void SetInputMode()
{
  if (SendMessageA(hwndHexRadio, BM_GETCHECK, 0, 0) == BST_CHECKED)
  {
    INPUT_MODE = 0; // Hexadecimal
  }
  else
  {
    INPUT_MODE = 1; // Decimal
  }
}

bool GetParsedInput(uint32_t *outValue)
{
  if (!outValue)
    return false;

  char inputBuffer[255];
  GetWindowTextA(hwndInput, inputBuffer, sizeof(inputBuffer));

  std::string inputStr(inputBuffer);
  std::istringstream iss(inputStr);
  uint32_t result = 0;

  if (SendMessageA(hwndHexRadio, BM_GETCHECK, 0, 0) == BST_CHECKED)
  {
    // Accept optional 0x prefix by trimming it if present
    if (inputStr.rfind("0x", 0) == 0 || inputStr.rfind("0X", 0) == 0)
      inputStr = inputStr.substr(2);

    iss.str(inputStr);
    if (!(iss >> std::hex >> result))
      return false;
  }
  else
  {
    if (!(iss >> std::dec >> result))
      return false;
  }

  *outValue = result;
  return true;
}

void HandleEncrypt()
{
  EnableWindow(hwndInput, FALSE);
  uint32_t value = 0;
  if (!GetParsedInput(&value))
  {
    SetWindowTextA(hwndOutput, "Invalid Input");
  }
  else
  {
    uint32_t encVal = encodeValue(value);
    char buffer[32];

    if (SendMessageA(hwndHexRadio, BM_GETCHECK, 0, 0) == BST_CHECKED)
    {
      sprintf_s(buffer, "0x%.8X", encVal);
    }
    else
    {
      sprintf_s(buffer, "%u", encVal);
    }

    SetWindowTextA(hwndOutput, buffer);
  }
  EnableWindow(hwndInput, TRUE);
}

void HandleDecrypt()
{
  EnableWindow(hwndInput, FALSE);
  uint32_t value = 0;
  if (!GetParsedInput(&value))
  {
    SetWindowTextA(hwndOutput, "Invalid Input");
  }
  else
  {
    std::string decryptedValue = "[Decrypted]";
    char buffer[32];
    if (true)
    {
      try
      {
        uint32_t decrypted = decodeValue(value);
        if (INPUT_MODE == 0)
        {
          std::stringstream stream;
          stream << std::hex << decrypted;
          decryptedValue = "0x" + stream.str();
          sprintf_s(buffer, "0x%.8X", decrypted);
        }
        else if (INPUT_MODE == 1)
        {
          decryptedValue = std::to_string(decrypted);
          sprintf_s(buffer, "%u", decrypted);
        }
      }
      catch (...)
      {
        SetWindowTextA(hwndOutput, "Some Error Occured");
      }
    }
    SetWindowTextA(hwndOutput, buffer);
  }
  EnableWindow(hwndInput, TRUE);
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
  switch (msg)
  {
  case WM_COMMAND:
    switch (LOWORD(wp))
    {
    case 1: // Hex Radio Button
    case 2: // Dec Radio Button
      SetInputMode();
      UpdateOutputField();
      break;
    case 3: // Encrypt Button
      HandleEncrypt();
      break;
    case 4: // Decrypt Button
      HandleDecrypt();
      break;
    }
    break;
  case WM_DESTROY:
    PostQuitMessage(0);
    break;
  default:
    return DefWindowProcA(hwnd, msg, wp, lp);
  }
  return 0;
}

void UpdateOutputField()
{
  char buffer[255];
  GetWindowTextA(hwndOutput, buffer, sizeof(buffer));
  std::string outputStr(buffer);

  int value = 0;

  if (outputStr.find("0x") == 0) // Check if it's in hex format
  {
    std::stringstream ss;
    ss << std::hex << outputStr.substr(2); // Remove "0x" prefix and convert
    ss >> value;
  }
  else
  {
    std::stringstream ss(outputStr);
    ss >> value;
  }

  if (SendMessageA(hwndHexRadio, BM_GETCHECK, 0, 0) == BST_CHECKED)
  {
    std::stringstream stream;
    stream << std::hex << value;
    std::string result = "0x" + stream.str();
    SetWindowTextA(hwndOutput, result.c_str());
  }
  else
  {
    SetWindowTextA(hwndOutput, std::to_string(value).c_str());
  }
}

uint32_t packChecksum(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint8_t checksum = 0;
  uint32_t remaining_bits = input & 0x0FFFFFFF; // Keep only 28 bits

  // Process 7 nibbles (4 bits each)
  for (uint32_t bit_offset = 0; bit_offset < 28; bit_offset += 4)
  {
    // Rotate magic constant based on position
    uint64_t rotated_magic = kMagic;
    uint8_t rotate_count = bit_offset + 4; // 4, 8, 12,...,28

    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
    }

    // Mix current nibble into checksum
    uint8_t current_nibble = remaining_bits & 0xF;
    checksum ^= current_nibble ^ (rotated_magic & 0xF);

    remaining_bits >>= 4;
  }

  // Ensure checksum is never 0
  if (checksum == 0)
    checksum = 1;

  // Pack into [checksum:4][input:28]
  return (input & 0x0FFFFFFF) | ((checksum & 0xF) << 28);
}

// ========================================================
// Validate and transform 28-bit value
// ========================================================

uint32_t decodeValue(uint32_t value)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  const uint32_t kXorKey = 0x1D;

  // Step 1: Validate checksum
  uint32_t input = value;
  if (packChecksum(input) != value)
  {
    return 0; // Validation failed
  }

  // Step 2: Initial transformation
  uint32_t transformed = input ^ kXorKey;

  // Step 3: Magic constant rotation
  uint64_t magic = kMagic;
  uint32_t rotate_bits = transformed & 0x1F; // Lower 5 bits

  while (rotate_bits--)
  {
    magic = (magic >> 63) | (magic << 1); // Rotate left
  }

  // Step 4: Final mixing and normalization
  uint32_t mixed = (transformed ^ (magic & 0xFFFFFFE0)) << 4; // Scale up
  float normalized = mixed / 16.0f;                           // 2^4 (for 28-bit input)

  return static_cast<uint32_t>(normalized);
}

uint32_t encodeValue(uint32_t input)
{
  const uint64_t kMagic = 0xEDCCFB96DCA40FBA;
  uint64_t rotated_magic;
  uint8_t checksum = 0;
  uint32_t transformed_value;
  uint32_t temp_value;

  // Initial rotation based on lower 5 bits
  rotated_magic = kMagic;
  uint8_t rotate_count = input & 0x1F;
  while (rotate_count--)
  {
    rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1); // Rotate left
  }

  // First transformation
  transformed_value = (input ^ (rotated_magic & 0xFFFFFFE0) ^ 0x1D) & 0x0FFFFFFF;

  // Calculate checksum
  temp_value = transformed_value;
  for (uint32_t i = 0; i < 28; i += 4)
  {
    rotated_magic = kMagic;
    rotate_count = i + 4;
    while (rotate_count--)
    {
      rotated_magic = (rotated_magic >> 63) | (rotated_magic << 1);
    }
    checksum ^= (temp_value ^ rotated_magic) & 0xF;
    temp_value >>= 4;
  }

  // Ensure checksum is never 0
  checksum &= 0xF;
  if (checksum == 0)
  {
    checksum = 1;
  }

  // Pack the checksum
  uint32_t packed_value = transformed_value | (checksum << 28);

  // Store the packed value
  return packed_value;
}