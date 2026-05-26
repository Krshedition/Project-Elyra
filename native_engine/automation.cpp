#include "automation.h"
#include <iostream>
#include <algorithm>
#include <vector>

namespace Automation {
    bool LaunchApplication(const std::wstring& appName) {
        HINSTANCE result = ShellExecuteW(NULL, L"open", appName.c_str(), NULL, NULL, SW_SHOWNORMAL);
        return (INT_PTR)result > 32; 
    }

    struct EnumData {
        std::wstring targetName;
        HWND resultHwnd;
    };

    std::wstring ToLower(std::wstring str) {
        std::transform(str.begin(), str.end(), str.begin(), ::towlower);
        return str;
    }

    BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
        EnumData* data = reinterpret_cast<EnumData*>(lParam);
        if (!IsWindowVisible(hwnd)) return TRUE;

        int length = GetWindowTextLengthW(hwnd);
        if (length == 0) return TRUE;

        std::vector<wchar_t> buffer(length + 1);
        GetWindowTextW(hwnd, buffer.data(), length + 1);
        std::wstring title(buffer.data());

        if (ToLower(title).find(ToLower(data->targetName)) != std::wstring::npos) {
            data->resultHwnd = hwnd;
            return FALSE; 
        }
        return TRUE;
    }

    HWND FindWindowHandle(const std::wstring& appName) {
        EnumData data;
        data.targetName = appName;
        data.resultHwnd = NULL;
        EnumWindows(EnumWindowsProc, reinterpret_cast<LPARAM>(&data));
        return data.resultHwnd;
    }

    bool InjectText(HWND hwnd, const std::wstring& text) {
        if (hwnd == NULL) return false;
        
        SetForegroundWindow(hwnd);
        
        // Robust polling: Wait up to 500ms for focus
        bool focused = false;
        for (int i = 0; i < 10; ++i) {
            if (GetForegroundWindow() == hwnd) {
                focused = true;
                break;
            }
            Sleep(50);
        }
        
        if (!focused) return false;

        for (wchar_t c : text) {
            INPUT inputDown = { 0 };
            inputDown.type = INPUT_KEYBOARD;
            inputDown.ki.wScan = c;
            inputDown.ki.dwFlags = KEYEVENTF_UNICODE;
            SendInput(1, &inputDown, sizeof(INPUT));
            
            Sleep(10); // Hold key for 10ms to simulate physical press
            
            INPUT inputUp = { 0 };
            inputUp.type = INPUT_KEYBOARD;
            inputUp.ki.wScan = c;
            inputUp.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
            SendInput(1, &inputUp, sizeof(INPUT));
            
            Sleep(30); // Wait 30ms before typing the next character
        }
        return true;
    }

    bool CloseApplication(HWND hwnd) {
        if (hwnd == NULL) return false;
        PostMessage(hwnd, WM_CLOSE, 0, 0);
        return true;
    }

    WORD GetVK(const std::wstring& k) {
        if (k == L"enter" || k == L"return") return VK_RETURN;
        if (k == L"space") return VK_SPACE;
        if (k == L"tab") return VK_TAB;
        if (k == L"escape" || k == L"esc") return VK_ESCAPE;
        if (k == L"backspace") return VK_BACK;
        if (k == L"delete" || k == L"del") return VK_DELETE;
        if (k == L"alt") return VK_MENU;
        if (k == L"ctrl" || k == L"control") return VK_CONTROL;
        if (k == L"shift") return VK_SHIFT;
        if (k == L"win" || k == L"command" || k == L"windows") return VK_LWIN;
        if (k.length() > 1 && k[0] == L'f') {
            int fNum = _wtoi(k.substr(1).c_str());
            if (fNum >= 1 && fNum <= 24) return VK_F1 + (fNum - 1);
        }
        if (k == L"left") return VK_LEFT;
        if (k == L"up") return VK_UP;
        if (k == L"right") return VK_RIGHT;
        if (k == L"down") return VK_DOWN;
        if (k.length() == 1) {
            SHORT scan = VkKeyScanW(k[0]);
            return scan & 0xFF;
        }
        return 0;
    }

    bool PressKey(HWND hwnd, const std::wstring& key) {
        if (hwnd != NULL) {
            SetForegroundWindow(hwnd);
            bool focused = false;
            for (int i = 0; i < 10; ++i) {
                if (GetForegroundWindow() == hwnd) {
                    focused = true;
                    break;
                }
                Sleep(50);
            }
        }
        
        std::vector<std::wstring> keys;
        std::wstring k = ToLower(key);
        size_t pos = 0;
        while ((pos = k.find(L"+")) != std::wstring::npos) {
            keys.push_back(k.substr(0, pos));
            k.erase(0, pos + 1);
        }
        if (!k.empty()) keys.push_back(k);

        std::vector<INPUT> inputs;
        std::vector<WORD> vks;
        for (const auto& token : keys) {
            WORD vk = GetVK(token);
            if (vk != 0) vks.push_back(vk);
        }

        // Key downs
        for (WORD vk : vks) {
            INPUT in = { 0 };
            in.type = INPUT_KEYBOARD;
            in.ki.wVk = vk;
            inputs.push_back(in);
        }
        // Key ups (reverse order)
        for (auto it = vks.rbegin(); it != vks.rend(); ++it) {
            INPUT in = { 0 };
            in.type = INPUT_KEYBOARD;
            in.ki.wVk = *it;
            in.ki.dwFlags = KEYEVENTF_KEYUP;
            inputs.push_back(in);
        }

        if (inputs.empty()) return false;
        UINT uSent = SendInput((UINT)inputs.size(), inputs.data(), sizeof(INPUT));
        return uSent == inputs.size();
    }
}
