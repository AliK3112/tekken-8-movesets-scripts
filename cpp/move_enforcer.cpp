#include <windows.h>
#include <string>
#include <sstream>
#include <cstdarg>
#include <process.h>
#include "game.h"
#include "tekken.h"
#include "resource.h"

const char CLASS_NAME[] = "EncryptorWindow";

struct EncryptedValue
{
  uintptr_t value;
  uintptr_t key;
};

HWND hwndPlayer1, hwndPlayer2, hwndMoveInput, hwndApplyBtn, hwndHexInput, hwndFindButton, hwndFoundMoveId, hwndLogBox;
GameClass game;
// TkMoveset moveset;
uintptr_t PLAYER_STRUCT_BASE = 0;
uintptr_t MOVESET_OFFSET = 0;
uintptr_t MOVE_ID_OFFSET = 0;
uintptr_t DECRYPT_FUNC_ADDR = 0;
bool ATTACHED = false;
bool READY = false;

void InitializeUI(HWND hwnd);
void AppendLog(const std::string &msg);
void AppendLog(const char *format, ...);
void AttachToGame();
LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp);
unsigned int __stdcall AttachToGameThread(void *param);
uintptr_t getPlayerAddress(int player);
uintptr_t getMovesetAddress(uintptr_t playerAddr);
uintptr_t getMoveAddress(uintptr_t moveset, int id);
int getCurrentMoveId(uintptr_t playerAddr);
int getMoveId(uintptr_t moveset, int moveNameKey, int start);
void scanAddresses();
void displayMoveIds();
bool movesetExists(uintptr_t moveset);
void setToField(HWND hwndField, int value);
void setToField(HWND hwndField, const char *text);
void setMoveId(int moveId);

int WINAPI WinMain(HINSTANCE hInst, HINSTANCE, LPSTR, int nCmdShow)
{
  WNDCLASSA wc = {};
  wc.lpfnWndProc = WindowProc;
  wc.hInstance = hInst;
  wc.lpszClassName = CLASS_NAME;
  RegisterClassA(&wc);

  HWND hwnd = CreateWindowA(CLASS_NAME, "Tekken Move Enforcer",
                            WS_CAPTION | WS_SYSMENU | WS_MINIMIZEBOX,
                            CW_USEDEFAULT, CW_USEDEFAULT, 400, 400,
                            NULL, NULL, hInst, NULL);
  if (!hwnd)
    return 0;

  InitializeUI(hwnd);
  ShowWindow(hwnd, nCmdShow);

  HANDLE hThread = (HANDLE)_beginthreadex(NULL, 0, AttachToGameThread, NULL, 0, NULL);
  if (hThread)
    CloseHandle(hThread);

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
  int padding = 20, spacing = 10, labelHeight = 20, fieldHeight = 20, fieldWidth = 150;
  int currentY = padding;

  // Current Move ID Label
  CreateWindowA("STATIC", "Current Move ID:", WS_CHILD | WS_VISIBLE,
                padding, currentY, 200, labelHeight, hwnd, NULL, NULL, NULL);
  currentY += labelHeight + spacing;

  // Player 1 Label + Field
  CreateWindowA("STATIC", "Player 1", WS_CHILD | WS_VISIBLE,
                padding, currentY, 100, labelHeight, hwnd, NULL, NULL, NULL);
  CreateWindowA("STATIC", "Player 2", WS_CHILD | WS_VISIBLE,
                padding + fieldWidth + spacing, currentY, 100, labelHeight, hwnd, NULL, NULL, NULL);
  currentY += labelHeight + spacing;

  hwndPlayer1 = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER | ES_READONLY,
                              padding, currentY, fieldWidth, fieldHeight, hwnd, NULL, NULL, NULL);
  hwndPlayer2 = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER | ES_READONLY,
                              padding + fieldWidth + spacing, currentY, fieldWidth, fieldHeight, hwnd, NULL, NULL, NULL);
  currentY += fieldHeight + spacing;

  // Force Move ID Label + Input + Button
  CreateWindowA("STATIC", "Force Move ID", WS_CHILD | WS_VISIBLE,
                padding, currentY, 150, labelHeight, hwnd, NULL, NULL, NULL);
  currentY += labelHeight + spacing;

  hwndMoveInput = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER,
                                padding, currentY, fieldWidth, fieldHeight, hwnd, NULL, NULL, NULL);
  hwndApplyBtn = CreateWindowA("BUTTON", "Apply", WS_CHILD | WS_VISIBLE,
                               padding + fieldWidth + spacing, currentY, 80, fieldHeight,
                               hwnd, (HMENU)1, NULL, NULL);
  currentY += fieldHeight + spacing;

  // New Hex Input Section
  CreateWindowA("STATIC", "Find Move ID (hex):", WS_CHILD | WS_VISIBLE,
                padding, currentY, 150, labelHeight, hwnd, NULL, NULL, NULL);
  currentY += labelHeight + spacing;

  hwndHexInput = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER,
                               padding, currentY, fieldWidth, fieldHeight,
                               hwnd, NULL, NULL, NULL);
  hwndFindButton = CreateWindowA("BUTTON", "Find P1 Move ID", WS_CHILD | WS_VISIBLE,
                                 padding + fieldWidth + spacing, currentY, 150, fieldHeight,
                                 hwnd, (HMENU)2, NULL, NULL);
  currentY += fieldHeight + spacing;

  hwndFoundMoveId = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER | ES_READONLY,
                                  padding, currentY, fieldWidth, fieldHeight,
                                  hwnd, NULL, NULL, NULL);
  currentY += fieldHeight + spacing;

  // Log Box
  hwndLogBox = CreateWindowA("EDIT", "", WS_CHILD | WS_VISIBLE | WS_BORDER | WS_VSCROLL | ES_MULTILINE | ES_AUTOVSCROLL | ES_READONLY,
                             padding, currentY, 360, 80, hwnd, NULL, NULL, NULL);
}

void AppendLog(const std::string &msg)
{
  if (msg.empty())
    return;
  int length = GetWindowTextLengthA(hwndLogBox);
  SendMessageA(hwndLogBox, EM_SETSEL, length, length);
  SendMessageA(hwndLogBox, EM_REPLACESEL, 0, (LPARAM)(msg + "\r\n").c_str());
}

void AppendLog(const char *format, ...)
{
  char buffer[255];
  va_list args;
  va_start(args, format);
  vsprintf_s(buffer, sizeof(buffer), format, args);
  va_end(args);
  AppendLog(std::string(buffer));
}

void AttachToGame()
{
  AppendLog("Waiting for game to start...");
  while (true)
  {
    if (game.Attach(L"Polaris-Win64-Shipping.exe"))
    {
      AppendLog("Successfully attached to game!");
      ATTACHED = true;
      break;
    }
    Sleep(1000);
  }
  scanAddresses();

  if (READY)
  {
    displayMoveIds();
  }
}

unsigned int __stdcall AttachToGameThread(void *param)
{
  AttachToGame();
  return 0;
}

LRESULT CALLBACK WindowProc(HWND hwnd, UINT msg, WPARAM wp, LPARAM lp)
{
  switch (msg)
  {
  case WM_COMMAND:
    switch (LOWORD(wp))
    {
    case 1:
    {
      char buffer[32];
      GetWindowTextA(hwndMoveInput, buffer, sizeof(buffer));
      try
      {
        int moveId = std::stoi(buffer);
        setMoveId(moveId);
      }
      catch (...)
      {
        setToField(hwndMoveInput, "Invalid Move ID input!");
      }
      break;
    }
    case 2: // Find Move ID button
    {
      char buffer[32];
      GetWindowTextA(hwndHexInput, buffer, sizeof(buffer));

      // Convert hex string to int
      unsigned int hexValue = 0;
      if (sscanf_s(buffer, "%x", &hexValue) == 1)
      {
        // Do your logic here — dummy example: echo it back as move ID
        try
        {
          uintptr_t player = getPlayerAddress(0);
          uintptr_t moveset = getMovesetAddress(player);
          setToField(hwndFoundMoveId, getMoveId(moveset, hexValue, 0));
        }
        catch (...)
        {
          setToField(hwndFoundMoveId, "Move ID Not Found");
        }

        // AppendLog("Hex input 0x%X -> Move ID %d", hexValue, hexValue);
      }
      else
      {
        setToField(hwndFoundMoveId, "Invalid hex!");
        // AppendLog("Invalid hex input: %s", buffer);
      }

      break;
    }
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

void scanAddresses()
{
  uintptr_t addr = 0;
  uintptr_t base = game.getBaseAddress();
  uintptr_t start = base;
  addr = game.FastAoBScan(Tekken::PLAYER_STRUCT_SIG_BYTES, base + 0x5A00000);
  if (addr != 0)
  {
    addr = addr + 7 + game.readUInt32(addr + 3) - base;
    PLAYER_STRUCT_BASE = addr;
    AppendLog("Player Struct Base Address: 0x%llx", addr);
  }
  else
  {
    PLAYER_STRUCT_BASE = 0;
    AppendLog("Player Struct Base Address not found!");
  }

  addr = game.FastAoBScan(Tekken::MOVSET_OFFSET_SIG_BYTES, base + 0x1800000);
  if (addr != 0)
  {
    addr = game.readUInt32(addr + 3);
    MOVESET_OFFSET = addr;
    AppendLog("Moveset Offset: 0x%llx", addr);
  }
  else
  {
    MOVESET_OFFSET = 0;
    AppendLog("Moveset Offset not found!");
  }

  addr = game.FastAoBScan(Tekken::ENC_SIG_BYTES, base + 0x1700000);
  if (addr != 0)
  {
    DECRYPT_FUNC_ADDR = addr;
    AppendLog("Decryption Function Address: 0x%llx", addr - base);
  }
  else
  {
    AppendLog("Decryption Function Address not found!");
  }

  addr = game.FastAoBScan(Tekken::P_MOVE_ID_SIG_BYTES, base + 0x1800000);
  if (addr != 0)
  {
    addr = game.readUInt32(addr + 2);
    MOVE_ID_OFFSET = addr;
    AppendLog("Moveset ID Offset: 0x%llx", addr);
  }
  else
  {
    MOVE_ID_OFFSET = 0;
    AppendLog("Moveset ID Offset not found!");
  }

  READY = true;
}

uintptr_t getPlayerAddress(int player)
{
  return game.getAddress({(DWORD)PLAYER_STRUCT_BASE, (DWORD)(0x30 + player * 8)});
}

uintptr_t getMovesetAddress(uintptr_t playerAddr)
{
  return playerAddr ? game.ReadUnsignedLong(playerAddr + MOVESET_OFFSET) : 0;
}

uintptr_t getAliasedMoveId(uintptr_t moveset, int id)
{
  if (id < 0x8000 || !moveset)
    return 0;
  return game.readUInt16(moveset + 0x30 + (id - 0x8000) * 2);
}

uintptr_t getMoveAddress(uintptr_t moveset, int id)
{
  if (!moveset || id < 0)
    return 0;
  id = id >= 0x8000 ? getAliasedMoveId(moveset, id) : id;
  uintptr_t header = game.readUInt64(moveset + Tekken::Offsets::Moveset::MovesHeader);
  uintptr_t count = game.readUInt64(moveset + Tekken::Offsets::Moveset::MovesCount);
  return header ? (header + (Tekken::Sizes::Move * (id % count))) : 0;
}

int getCurrentMoveId(uintptr_t playerAddr)
{
  return game.readUInt32(playerAddr + MOVE_ID_OFFSET);
}

int getMoveId(uintptr_t moveset, int moveNameKey, int start)
{
  uintptr_t movesHead = game.readUInt64(moveset + Tekken::Offsets::Moveset::MovesHeader);
  int movesCount = game.readUInt64(moveset + Tekken::Offsets::Moveset::MovesCount);
  start = start >= movesCount ? 0 : start;
  uintptr_t addr = 0;
  int rawIdx = -1;
  for (int i = start; i < movesCount; i++)
  {
    rawIdx = (i % 8) - 4;
    addr = movesHead + i * Tekken::Sizes::Moveset::Move;
    if (rawIdx > -1)
    {
      int value = game.readInt32(addr + 0x10 + rawIdx * 4);
      if (value == moveNameKey)
        return i;
    }
    else
    {
      EncryptedValue *paramAddr = reinterpret_cast<EncryptedValue *>(addr);
      uintptr_t decryptedValue = game.callFunction<uintptr_t, EncryptedValue>(DECRYPT_FUNC_ADDR, paramAddr);
      if ((int)decryptedValue == moveNameKey)
        return i;
    }
  }
  throw std::runtime_error("Move ID Not Found!");
  return -1;
}

void displayMoveIds()
{
  while (true)
  {
    Sleep(100);

    if (!getPlayerAddress(0))
    {
      setToField(hwndPlayer1, "???");
      setToField(hwndPlayer2, "???");
      continue;
    }
    // if (!movesetExists(getMovesetAddress(0)))
    //   continue;

    setToField(hwndPlayer1, getCurrentMoveId(getPlayerAddress(0)));
    setToField(hwndPlayer2, getCurrentMoveId(getPlayerAddress(1)));
  }
}

bool movesetExists(uintptr_t moveset)
{
  std::string str = game.ReadString(moveset + 8, 3);
  return str.compare("TEK") == 0;
}

void setToField(HWND hwndField, int value)
{
  char buffer[32];
  _snprintf_s(buffer, sizeof(buffer), "%d", value);
  SetWindowTextA(hwndField, buffer);
}

void setToField(HWND hwndField, const char *text)
{
  SetWindowTextA(hwndField, text);
}

uintptr_t getMoveExtrapropAddr(uintptr_t move)
{
  return move ? game.readUInt64(move + Tekken::Offsets::Move::ExtraPropList) : 0;
}

bool setForceMoveIdProp(uintptr_t moveset, uintptr_t extraprop, int moveId)
{
  if (!extraprop || !moveset || moveId < 0)
    return false;
  uintptr_t reqHeader = game.readUInt64(moveset + Tekken::Offsets::Moveset::RequirementsHeader);

  try
  {
    game.write<int>(extraprop + Tekken::Offsets::ExtraProp::Type, 5);
    game.write<uintptr_t>(extraprop + Tekken::Offsets::ExtraProp::RequirementAddr, reqHeader);
    game.write<int>(extraprop + Tekken::Offsets::ExtraProp::Prop, Tekken::ExtraMoveProperties::FORCE_MOVE);
    game.write<int>(extraprop + Tekken::Offsets::ExtraProp::Value, moveId);
  }
  catch (...)
  {
    return false;
  }

  return true;
}

void setMoveId(int moveId)
{
  uintptr_t player = getPlayerAddress(0);
  uintptr_t moveset = getMovesetAddress(player);
  int currMoveId = getCurrentMoveId(player);
  uintptr_t move = getMoveAddress(moveset, currMoveId);
  uintptr_t extraprops = getMoveExtrapropAddr(move);
  if (setForceMoveIdProp(moveset, extraprops, moveId))
  {
    AppendLog("Force Move Prop applied on move %d - target move: %d", currMoveId, moveId);
  }
}
