#pragma once

#include <string>
#include <windows.h>

namespace Automation {
    bool LaunchApplication(const std::wstring& appName);
    HWND FindWindowHandle(const std::wstring& appName);
    bool InjectText(HWND hwnd, const std::wstring& text);
    bool CloseApplication(HWND hwnd);
    bool PressKey(HWND hwnd, const std::wstring& key);
}
