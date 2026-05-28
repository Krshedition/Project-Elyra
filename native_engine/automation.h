#pragma once

#include <string>
#include <windows.h>

namespace Automation {
    bool LaunchApplication(const std::wstring& appName);
    HWND FindWindowHandle(const std::wstring& appName);
    bool InjectText(HWND hwnd, const std::wstring& text);
    bool CloseApplication(HWND hwnd);
    bool PressKey(HWND hwnd, const std::wstring& key);
    bool SystemAction(const std::wstring& action);
    std::wstring GetRunningProcesses();
    bool KillProcess(const std::wstring& processName);
    std::wstring GetFocusedWindow();
    bool CloseAllApplications();
    std::wstring GetSystemInfoStats();

    // Group 3 System Settings
    bool SetVolume(int level);
    bool SetBrightness(int level);
    bool ToggleWiFi(bool enable);
    bool ToggleBluetooth(bool enable);
    bool SetDisplayResolution(int width, int height);
    bool SetDefaultAudioDevice(const std::wstring& deviceName);
    std::wstring GetAudioDevices();

    // Group 4 File System
    bool IsPathSafe(const std::wstring& path);
    bool CreateDir(const std::wstring& path);
    bool DeleteItem(const std::wstring& path);
    bool MoveItem(const std::wstring& src, const std::wstring& dest);
    bool CopyItem(const std::wstring& src, const std::wstring& dest);
    std::wstring ReadFileContent(const std::wstring& path);
    bool WriteFileContent(const std::wstring& path, const std::wstring& content);

    // Group 5 Clipboard
    std::wstring ReadClipboardText();
    bool WriteClipboardText(const std::wstring& text);
}
