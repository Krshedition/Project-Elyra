#include "automation.h"
#include <iostream>
#include <algorithm>
#include <vector>
#include <stdlib.h>
#include <sstream>
#include <comdef.h>
#include <Wbemidl.h>
#include <wlanapi.h>
#include <mmdeviceapi.h>
#include <endpointvolume.h>
#include <Functiondiscoverykeys_devpkey.h>
#include <roapi.h>
#include <windows.devices.radios.h>
#include <wrl.h>

#pragma comment(lib, "wbemuuid.lib")
#pragma comment(lib, "wlanapi.lib")
#pragma comment(lib, "runtimeobject.lib")

using namespace Microsoft::WRL;
using namespace ABI::Windows::Foundation;
using namespace ABI::Windows::Devices::Radios;

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
        
        // Replace all spaces with '+' to handle "alt f4" or "alt+f4"
        std::replace(k.begin(), k.end(), L' ', L'+');

        size_t pos = 0;
        while ((pos = k.find(L"+")) != std::wstring::npos) {
            if (pos > 0) { // Avoid empty tokens if there are multiple delimiters
                keys.push_back(k.substr(0, pos));
            }
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

    bool SystemAction(const std::wstring& action) {
        if (action == L"shutdown") {
            return _wsystem(L"shutdown /s /t 10") == 0;
        } else if (action == L"restart") {
            return _wsystem(L"shutdown /r /t 10") == 0;
        } else if (action == L"cancel_shutdown") {
            return _wsystem(L"shutdown /a") == 0;
        } else if (action == L"lock") {
            return LockWorkStation() != 0;
        }
        return false;
    }

    struct EnumAllData {
        std::wstring titles;
    };

    BOOL CALLBACK EnumAllWindowsProc(HWND hwnd, LPARAM lParam) {
        EnumAllData* data = reinterpret_cast<EnumAllData*>(lParam);
        if (!IsWindowVisible(hwnd)) return TRUE;
        
        int length = GetWindowTextLengthW(hwnd);
        if (length == 0) return TRUE;

        std::vector<wchar_t> buffer(length + 1);
        GetWindowTextW(hwnd, buffer.data(), length + 1);
        std::wstring title(buffer.data());

        // Skip system shell windows
        if (title == L"Program Manager" || title == L"Settings") return TRUE;

        if (!data->titles.empty()) {
            data->titles += L" | ";
        }
        data->titles += title;
        return TRUE;
    }

    std::wstring GetRunningProcesses() {
        EnumAllData data;
        EnumWindows(EnumAllWindowsProc, reinterpret_cast<LPARAM>(&data));
        return data.titles;
    }

    BOOL CALLBACK CloseAllWindowsProc(HWND hwnd, LPARAM lParam) {
        if (!IsWindowVisible(hwnd)) return TRUE;
        int length = GetWindowTextLengthW(hwnd);
        if (length == 0) return TRUE;

        std::vector<wchar_t> buffer(length + 1);
        GetWindowTextW(hwnd, buffer.data(), length + 1);
        std::wstring title(buffer.data());

        // Do not close Elyra itself, Program Manager, or basic shell components
        std::wstring lowerTitle = title;
        std::transform(lowerTitle.begin(), lowerTitle.end(), lowerTitle.begin(), ::towlower);
        
        if (title == L"Program Manager") return TRUE;
        if (lowerTitle.find(L"elyra") != std::wstring::npos) return TRUE; 

        PostMessage(hwnd, WM_CLOSE, 0, 0);
        return TRUE;
    }

    bool CloseAllApplications() {
        EnumWindows(CloseAllWindowsProc, 0);
        return true;
    }

    std::wstring GetFocusedWindow() {
        HWND hwnd = GetForegroundWindow();
        if (hwnd == NULL) return L"";
        int length = GetWindowTextLengthW(hwnd);
        if (length == 0) return L"";
        std::vector<wchar_t> buffer(length + 1);
        GetWindowTextW(hwnd, buffer.data(), length + 1);
        return std::wstring(buffer.data());
    }

    bool KillProcess(const std::wstring& processName) {
        std::wstring cmd = L"taskkill /F /IM " + processName;
        return _wsystem(cmd.c_str()) == 0;
    }

    std::wstring GetSystemInfoStats() {
        MEMORYSTATUSEX memInfo;
        memInfo.dwLength = sizeof(MEMORYSTATUSEX);
        GlobalMemoryStatusEx(&memInfo);
        
        SYSTEM_POWER_STATUS powerStatus;
        GetSystemPowerStatus(&powerStatus);
        
        std::wstring cpuName = L"Unknown CPU";
        HKEY hKey;
        if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0", 0, KEY_READ, &hKey) == ERROR_SUCCESS) {
            wchar_t buffer[256];
            DWORD bufferSize = sizeof(buffer);
            if (RegQueryValueExW(hKey, L"ProcessorNameString", NULL, NULL, (LPBYTE)buffer, &bufferSize) == ERROR_SUCCESS) {
                cpuName = buffer;
            }
            RegCloseKey(hKey);
        }
        
        std::wstringstream ss;
        ss << L"{\"ram_percent\": " << memInfo.dwMemoryLoad << L", "
           << L"\"battery_percent\": " << (int)powerStatus.BatteryLifePercent << L", "
           << L"\"is_charging\": " << (powerStatus.ACLineStatus == 1 ? L"true" : L"false") << L", "
           << L"\"cpu_name\": \"" << cpuName << L"\"}";
           
        return ss.str();
    }

    template <typename T>
    HRESULT AwaitAsync(IAsyncOperation<T>* asyncOp, T* result) {
        ComPtr<IAsyncInfo> asyncInfo;
        HRESULT hr = asyncOp->QueryInterface(IID_PPV_ARGS(&asyncInfo));
        if (FAILED(hr)) return hr;
        
        AsyncStatus status;
        hr = asyncInfo->get_Status(&status);
        while (hr == S_OK && status == AsyncStatus::Started) {
            Sleep(10);
            hr = asyncInfo->get_Status(&status);
        }
        
        if (status == AsyncStatus::Completed) {
            return asyncOp->GetResults(result);
        }
        return E_FAIL;
    }

    bool SetVolume(int level) {
        CoInitializeEx(0, COINIT_MULTITHREADED);
        ComPtr<IMMDeviceEnumerator> deviceEnumerator;
        HRESULT hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&deviceEnumerator));
        if (FAILED(hr)) return false;

        ComPtr<IMMDevice> defaultDevice;
        hr = deviceEnumerator->GetDefaultAudioEndpoint(eRender, eConsole, &defaultDevice);
        if (FAILED(hr)) return false;

        ComPtr<IAudioEndpointVolume> endpointVolume;
        hr = defaultDevice->Activate(__uuidof(IAudioEndpointVolume), CLSCTX_INPROC_SERVER, NULL, (LPVOID*)&endpointVolume);
        if (FAILED(hr)) return false;

        float volumeLevel = (float)level / 100.0f;
        hr = endpointVolume->SetMasterVolumeLevelScalar(volumeLevel, NULL);
        return SUCCEEDED(hr);
    }

    bool SetBrightness(int level) {
        CoInitializeEx(0, COINIT_MULTITHREADED);
        ComPtr<IWbemLocator> pLoc;
        HRESULT hr = CoCreateInstance(CLSID_WbemLocator, 0, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&pLoc));
        if (FAILED(hr)) return false;

        ComPtr<IWbemServices> pSvc;
        hr = pLoc->ConnectServer(_bstr_t(L"ROOT\\WMI"), NULL, NULL, 0, NULL, 0, 0, &pSvc);
        if (FAILED(hr)) return false;

        hr = CoSetProxyBlanket(pSvc.Get(), RPC_C_AUTHN_WINNT, RPC_C_AUTHZ_NONE, NULL, RPC_C_AUTHN_LEVEL_CALL, RPC_C_IMP_LEVEL_IMPERSONATE, NULL, EOAC_NONE);

        ComPtr<IWbemClassObject> pClass;
        hr = pSvc->GetObject(_bstr_t(L"WmiMonitorBrightnessMethods"), 0, NULL, &pClass, NULL);
        if (FAILED(hr)) return false;

        ComPtr<IWbemClassObject> pInParamsDefinition;
        hr = pClass->GetMethod(_bstr_t(L"WmiSetBrightness"), 0, &pInParamsDefinition, NULL);
        
        ComPtr<IWbemClassObject> pClassInstance;
        hr = pInParamsDefinition->SpawnInstance(0, &pClassInstance);

        VARIANT varTime, varBright;
        VariantInit(&varTime);
        VariantInit(&varBright);
        varTime.vt = VT_I4; varTime.lVal = 1;
        varBright.vt = VT_I4; varBright.lVal = level;
        pClassInstance->Put(L"Timeout", 0, &varTime, 0);
        pClassInstance->Put(L"Brightness", 0, &varBright, 0);

        ComPtr<IEnumWbemClassObject> pEnum;
        hr = pSvc->CreateInstanceEnum(_bstr_t(L"WmiMonitorBrightnessMethods"), 0, NULL, &pEnum);
        if (FAILED(hr)) return false;
        
        ComPtr<IWbemClassObject> pInstance;
        ULONG uReturn = 0;
        bool success = false;
        while (pEnum->Next(WBEM_INFINITE, 1, &pInstance, &uReturn) == S_OK && uReturn > 0) {
            VARIANT varPath;
            pInstance->Get(L"__PATH", 0, &varPath, NULL, NULL);
            hr = pSvc->ExecMethod(varPath.bstrVal, _bstr_t(L"WmiSetBrightness"), 0, NULL, pClassInstance.Get(), NULL, NULL);
            if (SUCCEEDED(hr)) success = true;
            VariantClear(&varPath);
            pInstance.Reset();
        }
        return success;
    }

    bool ToggleWiFi(bool enable) {
        HANDLE hClient = NULL;
        DWORD dwMaxClient = 2;
        DWORD dwCurVersion = 0;
        DWORD dwResult = WlanOpenHandle(dwMaxClient, NULL, &dwCurVersion, &hClient);
        if (dwResult != ERROR_SUCCESS) return false;

        PWLAN_INTERFACE_INFO_LIST pIfList = NULL;
        dwResult = WlanEnumInterfaces(hClient, NULL, &pIfList);
        bool success = false;
        if (dwResult == ERROR_SUCCESS && pIfList != NULL) {
            for (int i = 0; i < (int)pIfList->dwNumberOfItems; i++) {
                WLAN_INTERFACE_INFO* pIfInfo = &pIfList->InterfaceInfo[i];
                WLAN_PHY_RADIO_STATE state;
                state.dwPhyIndex = 0;
                state.dot11SoftwareRadioState = enable ? dot11_radio_state_on : dot11_radio_state_off;
                state.dot11HardwareRadioState = enable ? dot11_radio_state_on : dot11_radio_state_off;

                if (WlanSetInterface(hClient, &pIfInfo->InterfaceGuid, wlan_intf_opcode_radio_state, sizeof(WLAN_PHY_RADIO_STATE), &state, NULL) == ERROR_SUCCESS) {
                    success = true;
                }
            }
            WlanFreeMemory(pIfList);
        }
        WlanCloseHandle(hClient, NULL);
        return success;
    }

    bool ToggleBluetooth(bool enable) {
        RoInitialize(RO_INIT_MULTITHREADED);
        
        HSTRING className;
        WindowsCreateString(RuntimeClass_Windows_Devices_Radios_Radio, wcslen(RuntimeClass_Windows_Devices_Radios_Radio), &className);
        
        ComPtr<IRadioStatics> radioStatics;
        HRESULT hr = RoGetActivationFactory(className, __uuidof(IRadioStatics), (void**)&radioStatics);
        WindowsDeleteString(className);
        
        if (FAILED(hr)) return false;
        
        ComPtr<IAsyncOperation<ABI::Windows::Foundation::Collections::IVectorView<Radio*>*>> getRadiosOp;
        hr = radioStatics->GetRadiosAsync(&getRadiosOp);
        if (FAILED(hr)) return false;
        
        ComPtr<ABI::Windows::Foundation::Collections::IVectorView<Radio*>> radiosView;
        hr = AwaitAsync(getRadiosOp.Get(), radiosView.GetAddressOf());
        if (FAILED(hr)) return false;
        
        unsigned int count = 0;
        radiosView->get_Size(&count);
        bool success = false;
        for (unsigned int i = 0; i < count; i++) {
            ComPtr<IRadio> radio;
            radiosView->GetAt(i, &radio);
            
            RadioKind kind;
            radio->get_Kind(&kind);
            if (kind == RadioKind_Bluetooth) {
                RadioState targetState = enable ? RadioState_On : RadioState_Off;
                ComPtr<IAsyncOperation<RadioAccessStatus>> setStateOp;
                radio->SetStateAsync(targetState, &setStateOp);
                
                RadioAccessStatus accessStatus;
                if (SUCCEEDED(AwaitAsync(setStateOp.Get(), &accessStatus))) {
                    success = true;
                }
            }
        }
        return success;
    }

    bool SetDisplayResolution(int width, int height) {
        DEVMODEW dm = {0};
        dm.dmSize = sizeof(DEVMODEW);
        if (EnumDisplaySettingsW(NULL, ENUM_CURRENT_SETTINGS, &dm)) {
            dm.dmPelsWidth = width;
            dm.dmPelsHeight = height;
            dm.dmFields = DM_PELSWIDTH | DM_PELSHEIGHT;
            LONG ret = ChangeDisplaySettingsW(&dm, CDS_UPDATEREGISTRY);
            return ret == DISP_CHANGE_SUCCESSFUL;
        }
        return false;
    }

    interface DECLSPEC_UUID("870af99c-171d-4f9e-af0d-e63df40c2bc9") IPolicyConfig : public IUnknown {
        virtual HRESULT STDMETHODCALLTYPE GetMixFormat(PCWSTR, WAVEFORMATEX**) = 0;
        virtual HRESULT STDMETHODCALLTYPE GetDeviceFormat(PCWSTR, INT, WAVEFORMATEX**) = 0;
        virtual HRESULT STDMETHODCALLTYPE ResetDeviceFormat(PCWSTR) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetDeviceFormat(PCWSTR, WAVEFORMATEX*, WAVEFORMATEX*) = 0;
        virtual HRESULT STDMETHODCALLTYPE GetProcessingPeriod(PCWSTR, INT, PINT, PINT) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetProcessingPeriod(PCWSTR, PINT) = 0;
        virtual HRESULT STDMETHODCALLTYPE GetShareMode(PCWSTR, INT*) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetShareMode(PCWSTR, INT*) = 0;
        virtual HRESULT STDMETHODCALLTYPE GetPropertyValue(PCWSTR, const PROPERTYKEY&, PROPVARIANT*) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetPropertyValue(PCWSTR, const PROPERTYKEY&, PROPVARIANT*) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetDefaultEndpoint(PCWSTR, ERole) = 0;
        virtual HRESULT STDMETHODCALLTYPE SetEndpointVisibility(PCWSTR, INT) = 0;
    };
    class DECLSPEC_UUID("870af99c-171d-4f9e-af0d-e63df40c2bc9") CPolicyConfigClient;

    std::wstring GetAudioDevices() {
        HRESULT hrInit = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (hrInit == RPC_E_CHANGED_MODE) {
            hrInit = CoInitializeEx(0, COINIT_APARTMENTTHREADED);
        }
        ComPtr<IMMDeviceEnumerator> pEnum;
        HRESULT hr = CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL, IID_PPV_ARGS(&pEnum));
        if (FAILED(hr)) return L"Error: Failed to create MMDeviceEnumerator. HR: " + std::to_wstring(hr);
        
        ComPtr<IMMDeviceCollection> pDevices;
        pEnum->EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE, &pDevices);
        
        UINT count = 0;
        pDevices->GetCount(&count);
        
        std::wstring result = L"";
        for (UINT i = 0; i < count; i++) {
            ComPtr<IMMDevice> pDevice;
            pDevices->Item(i, &pDevice);
            
            LPWSTR wstrID = NULL;
            pDevice->GetId(&wstrID);
            
            ComPtr<IPropertyStore> pStore;
            pDevice->OpenPropertyStore(STGM_READ, &pStore);
            
            PROPVARIANT prop;
            PropVariantInit(&prop);
            pStore->GetValue(PKEY_Device_FriendlyName, &prop);
            
            if (prop.vt == VT_LPWSTR) {
                result += std::wstring(prop.pwszVal) + L" (ID: " + wstrID + L")\n";
            }
            PropVariantClear(&prop);
            CoTaskMemFree(wstrID);
        }
        return result;
    }

    bool SetDefaultAudioDevice(const std::wstring& deviceName) {
        HRESULT hrInit = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (hrInit == RPC_E_CHANGED_MODE) {
            CoInitializeEx(0, COINIT_APARTMENTTHREADED);
        }
        ComPtr<IMMDeviceEnumerator> pEnum;
        HRESULT hrEnum = CoCreateInstance(__uuidof(MMDeviceEnumerator), NULL, CLSCTX_ALL, IID_PPV_ARGS(&pEnum));
        if (FAILED(hrEnum)) return false;
        
        ComPtr<IMMDeviceCollection> pDevices;
        pEnum->EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE, &pDevices);
        
        UINT count = 0;
        pDevices->GetCount(&count);
        
        std::wstring targetID = L"";
        for (UINT i = 0; i < count; i++) {
            ComPtr<IMMDevice> pDevice;
            pDevices->Item(i, &pDevice);
            
            ComPtr<IPropertyStore> pStore;
            pDevice->OpenPropertyStore(STGM_READ, &pStore);
            
            PROPVARIANT prop;
            PropVariantInit(&prop);
            pStore->GetValue(PKEY_Device_FriendlyName, &prop);
            
            if (prop.vt == VT_LPWSTR) {
                std::wstring friendlyName(prop.pwszVal);
                std::transform(friendlyName.begin(), friendlyName.end(), friendlyName.begin(), ::towlower);
                std::wstring searchName = deviceName;
                std::transform(searchName.begin(), searchName.end(), searchName.begin(), ::towlower);
                
                if (friendlyName.find(searchName) != std::wstring::npos) {
                    LPWSTR wstrID = NULL;
                    pDevice->GetId(&wstrID);
                    targetID = wstrID;
                    CoTaskMemFree(wstrID);
                    PropVariantClear(&prop);
                    break;
                }
            }
            PropVariantClear(&prop);
        }
        
        if (targetID.empty()) return false;

        ComPtr<IPolicyConfig> pPolicyConfig;
        HRESULT hrPolicy = CoCreateInstance(__uuidof(CPolicyConfigClient), NULL, CLSCTX_ALL, __uuidof(IPolicyConfig), (LPVOID*)&pPolicyConfig);
        if (SUCCEEDED(hrPolicy)) {
            pPolicyConfig->SetDefaultEndpoint(targetID.c_str(), eConsole);
            pPolicyConfig->SetDefaultEndpoint(targetID.c_str(), eMultimedia);
            pPolicyConfig->SetDefaultEndpoint(targetID.c_str(), eCommunications);
            return true;
        }
        return false;
    }

    // Group 4 File System
    bool IsPathSafe(const std::wstring& path) {
        wchar_t fullPath[MAX_PATH];
        if (GetFullPathNameW(path.c_str(), MAX_PATH, fullPath, nullptr) == 0) return false;
        
        std::wstring absPath(fullPath);
        for (auto& c : absPath) c = towlower(c);

        const std::vector<std::wstring> BLOCKED_PATHS = {
            L"c:\\windows",
            L"c:\\windows\\system32",
            L"c:\\windows\\syswow64",
            L"c:\\program files",
            L"c:\\program files (x86)",
            L"c:\\programdata\\microsoft"
        };

        for (const auto& blocked : BLOCKED_PATHS) {
            if (absPath.find(blocked) == 0) {
                if (absPath.length() == blocked.length() || absPath[blocked.length()] == L'\\') {
                    return false;
                }
            }
        }
        return true;
    }

    bool CreateDir(const std::wstring& path) {
        if (!IsPathSafe(path)) return false;
        return CreateDirectoryW(path.c_str(), NULL) != 0;
    }

    bool DeleteItem(const std::wstring& path) {
        if (!IsPathSafe(path)) return false;
        DWORD attr = GetFileAttributesW(path.c_str());
        if (attr == INVALID_FILE_ATTRIBUTES) return false;
        if (attr & FILE_ATTRIBUTE_DIRECTORY) {
            return RemoveDirectoryW(path.c_str()) != 0;
        } else {
            return DeleteFileW(path.c_str()) != 0;
        }
    }

    bool MoveItem(const std::wstring& src, const std::wstring& dest) {
        if (!IsPathSafe(src) || !IsPathSafe(dest)) return false;
        return MoveFileExW(src.c_str(), dest.c_str(), MOVEFILE_REPLACE_EXISTING) != 0;
    }

    bool CopyItem(const std::wstring& src, const std::wstring& dest) {
        if (!IsPathSafe(src) || !IsPathSafe(dest)) return false;
        return CopyFileW(src.c_str(), dest.c_str(), FALSE) != 0;
    }

    std::wstring ReadFileContent(const std::wstring& path) {
        if (!IsPathSafe(path)) return L"ERROR_UNSAFE_PATH";
        HANDLE hFile = CreateFileW(path.c_str(), GENERIC_READ, FILE_SHARE_READ, NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
        if (hFile == INVALID_HANDLE_VALUE) return L"ERROR_FILE_NOT_FOUND";
        
        DWORD fileSize = GetFileSize(hFile, NULL);
        if (fileSize == INVALID_FILE_SIZE || fileSize == 0) {
            CloseHandle(hFile);
            return L"";
        }
        
        std::string buffer(fileSize, '\0');
        DWORD bytesRead;
        ReadFile(hFile, &buffer[0], fileSize, &bytesRead, NULL);
        CloseHandle(hFile);

        int wideSize = MultiByteToWideChar(CP_UTF8, 0, buffer.c_str(), -1, NULL, 0);
        std::wstring wstr(wideSize, 0);
        MultiByteToWideChar(CP_UTF8, 0, buffer.c_str(), -1, &wstr[0], wideSize);
        if (!wstr.empty() && wstr.back() == L'\0') {
            wstr.pop_back();
        }
        return wstr;
    }

    bool WriteFileContent(const std::wstring& path, const std::wstring& content) {
        if (!IsPathSafe(path)) return false;
        int utf8Size = WideCharToMultiByte(CP_UTF8, 0, content.c_str(), -1, NULL, 0, NULL, NULL);
        std::string utf8Str(utf8Size, 0);
        WideCharToMultiByte(CP_UTF8, 0, content.c_str(), -1, &utf8Str[0], utf8Size, NULL, NULL);
        
        if (!utf8Str.empty() && utf8Str.back() == '\0') {
            utf8Str.pop_back();
        }

        HANDLE hFile = CreateFileW(path.c_str(), GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
        if (hFile == INVALID_HANDLE_VALUE) return false;
        DWORD bytesWritten;
        bool result = WriteFile(hFile, utf8Str.c_str(), utf8Str.length(), &bytesWritten, NULL);
        CloseHandle(hFile);
        return result;
    }

    // Group 5 Clipboard
    std::wstring ReadClipboardText() {
        if (!OpenClipboard(nullptr)) return L"";
        HANDLE hData = GetClipboardData(CF_UNICODETEXT);
        if (hData == nullptr) {
            CloseClipboard();
            return L"";
        }
        wchar_t* pszText = static_cast<wchar_t*>(GlobalLock(hData));
        if (pszText == nullptr) {
            CloseClipboard();
            return L"";
        }
        std::wstring text(pszText);
        GlobalUnlock(hData);
        CloseClipboard();
        return text;
    }

    bool WriteClipboardText(const std::wstring& text) {
        if (!OpenClipboard(nullptr)) return false;
        EmptyClipboard();
        HGLOBAL hMem = GlobalAlloc(GMEM_MOVEABLE, (text.length() + 1) * sizeof(wchar_t));
        if (hMem == nullptr) {
            CloseClipboard();
            return false;
        }
        wchar_t* pMem = static_cast<wchar_t*>(GlobalLock(hMem));
        wcscpy_s(pMem, text.length() + 1, text.c_str());
        GlobalUnlock(hMem);
        SetClipboardData(CF_UNICODETEXT, hMem);
        CloseClipboard();
        return true;
    }

}
