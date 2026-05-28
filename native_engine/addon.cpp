#include <napi.h>
#include "automation.h"
#include <string>

// Helper to convert JavaScript strings to C++ wide strings (required for Windows API)
std::wstring GetWString(Napi::String str) {
    std::u16string str16 = str.Utf16Value();
    return std::wstring(str16.begin(), str16.end());
}

// Background thread worker for Launching Apps
class LaunchWorker : public Napi::AsyncWorker {
public:
    LaunchWorker(Napi::Env& env, std::wstring appName)
        : Napi::AsyncWorker(env), appName(appName), deferred(Napi::Promise::Deferred::New(env)), result(false) {}

    Napi::Promise GetPromise() { return deferred.Promise(); }

protected:
    void Execute() override {
        // Runs on a background C++ thread
        result = Automation::LaunchApplication(appName);
    }

    void OnOK() override {
        // Returns to the main Node.js event loop
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }

private:
    std::wstring appName;
    Napi::Promise::Deferred deferred;
    bool result;
};

// Background thread worker for Injecting Text
class InjectTextWorker : public Napi::AsyncWorker {
public:
    InjectTextWorker(Napi::Env& env, std::wstring appName, std::wstring text)
        : Napi::AsyncWorker(env), appName(appName), text(text), deferred(Napi::Promise::Deferred::New(env)), result(false) {}

    Napi::Promise GetPromise() { return deferred.Promise(); }

protected:
    void Execute() override {
        // Find the window and inject text natively without blocking Node
        HWND hwnd = Automation::FindWindowHandle(appName);
        if (hwnd == NULL) {
            result = false;
            return;
        }
        result = Automation::InjectText(hwnd, text);
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }

private:
    std::wstring appName;
    std::wstring text;
    Napi::Promise::Deferred deferred;
    bool result;
};

// Background thread worker for System Actions (Shutdown, Restart, Lock)
class SystemActionWorker : public Napi::AsyncWorker {
public:
    SystemActionWorker(Napi::Env& env, std::wstring action)
        : Napi::AsyncWorker(env), action(action), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override {
        if (action == L"shutdown") {
            Automation::CloseAllApplications(); // Graceful shutdown
        }
        result = Automation::SystemAction(action);
    }
    void OnOK() override {
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }
    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }
private:
    std::wstring action;
    Napi::Promise::Deferred deferred;
    bool result;
};

// Background thread worker for Enumerating Processes
class GetRunningProcessesWorker : public Napi::AsyncWorker {
public:
    GetRunningProcessesWorker(Napi::Env& env)
        : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override {
        result = Automation::GetRunningProcesses();
    }
    void OnOK() override {
        Napi::HandleScope scope(Env());
        // Convert wstring to utf16 string
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16));
    }
    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }
private:
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

// Background thread worker for Killing Processes
class KillProcessWorker : public Napi::AsyncWorker {
public:
    KillProcessWorker(Napi::Env& env, std::wstring processName)
        : Napi::AsyncWorker(env), processName(processName), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override {
        result = Automation::KillProcess(processName);
    }
    void OnOK() override {
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }
    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }
private:
    std::wstring processName;
    Napi::Promise::Deferred deferred;
    bool result;
};

// Background thread worker for Getting Focused Window
class GetFocusedWindowWorker : public Napi::AsyncWorker {
public:
    GetFocusedWindowWorker(Napi::Env& env)
        : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override {
        result = Automation::GetFocusedWindow();
    }
    void OnOK() override {
        Napi::HandleScope scope(Env());
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16));
    }
    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }
private:
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

// Background thread worker for Getting System Info
class GetSystemInfoStatsWorker : public Napi::AsyncWorker {
public:
    GetSystemInfoStatsWorker(Napi::Env& env)
        : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override {
        result = Automation::GetSystemInfoStats();
    }
    void OnOK() override {
        Napi::HandleScope scope(Env());
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16));
    }
    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }
private:
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

// JavaScript Export Bindings
Napi::Value LaunchAppJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for appName").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::wstring appName = GetWString(info[0].As<Napi::String>());
    LaunchWorker* worker = new LaunchWorker(env, appName);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise; // Returns a Promise to JavaScript
}

Napi::Value InjectTextJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Two strings expected (appName, text)").ThrowAsJavaScriptException();
        return env.Null();
    }

    std::wstring appName = GetWString(info[0].As<Napi::String>());
    std::wstring text = GetWString(info[1].As<Napi::String>());
    
    InjectTextWorker* worker = new InjectTextWorker(env, appName, text);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise; // Returns a Promise to JavaScript
}

// Background thread worker for Closing Apps
class CloseAppWorker : public Napi::AsyncWorker {
public:
    CloseAppWorker(Napi::Env& env, std::wstring appName)
        : Napi::AsyncWorker(env), appName(appName), deferred(Napi::Promise::Deferred::New(env)), result(false) {}

    Napi::Promise GetPromise() { return deferred.Promise(); }

protected:
    void Execute() override {
        HWND hwnd = Automation::FindWindowHandle(appName);
        if (hwnd == NULL) {
            result = false;
            return;
        }
        result = Automation::CloseApplication(hwnd);
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }

private:
    std::wstring appName;
    Napi::Promise::Deferred deferred;
    bool result;
};

// Background thread worker for Pressing Keys
class PressKeyWorker : public Napi::AsyncWorker {
public:
    PressKeyWorker(Napi::Env& env, std::wstring appName, std::wstring key)
        : Napi::AsyncWorker(env), appName(appName), key(key), deferred(Napi::Promise::Deferred::New(env)), result(false) {}

    Napi::Promise GetPromise() { return deferred.Promise(); }

protected:
    void Execute() override {
        HWND hwnd = NULL;
        if (!appName.empty()) {
            hwnd = Automation::FindWindowHandle(appName);
            if (hwnd == NULL) {
                result = false;
                return;
            }
        }
        result = Automation::PressKey(hwnd, key);
    }

    void OnOK() override {
        Napi::HandleScope scope(Env());
        deferred.Resolve(Napi::Boolean::New(Env(), result));
    }

    void OnError(const Napi::Error& e) override {
        Napi::HandleScope scope(Env());
        deferred.Reject(e.Value());
    }

private:
    std::wstring appName;
    std::wstring key;
    Napi::Promise::Deferred deferred;
    bool result;
};

Napi::Value CloseAppJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for appName").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::wstring appName = GetWString(info[0].As<Napi::String>());
    CloseAppWorker* worker = new CloseAppWorker(env, appName);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value PressKeyJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
        Napi::TypeError::New(env, "Two strings expected (appName, key)").ThrowAsJavaScriptException();
        return env.Null();
    }
    
    std::wstring appName = GetWString(info[0].As<Napi::String>());
    std::wstring key = GetWString(info[1].As<Napi::String>());
    
    PressKeyWorker* worker = new PressKeyWorker(env, appName, key);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SystemActionJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for action").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::wstring action = GetWString(info[0].As<Napi::String>());
    SystemActionWorker* worker = new SystemActionWorker(env, action);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value GetRunningProcessesJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    GetRunningProcessesWorker* worker = new GetRunningProcessesWorker(env);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value KillProcessJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for processName").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::wstring processName = GetWString(info[0].As<Napi::String>());
    KillProcessWorker* worker = new KillProcessWorker(env, processName);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value GetFocusedWindowJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    GetFocusedWindowWorker* worker = new GetFocusedWindowWorker(env);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value GetSystemInfoStatsJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    GetSystemInfoStatsWorker* worker = new GetSystemInfoStatsWorker(env);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

// Group 3 Workers
class SetVolumeWorker : public Napi::AsyncWorker {
public:
    SetVolumeWorker(Napi::Env& env, int level)
        : Napi::AsyncWorker(env), level(level), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::SetVolume(level); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    int level;
    Napi::Promise::Deferred deferred;
    bool result;
};

class SetBrightnessWorker : public Napi::AsyncWorker {
public:
    SetBrightnessWorker(Napi::Env& env, int level)
        : Napi::AsyncWorker(env), level(level), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::SetBrightness(level); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    int level;
    Napi::Promise::Deferred deferred;
    bool result;
};

class ToggleWiFiWorker : public Napi::AsyncWorker {
public:
    ToggleWiFiWorker(Napi::Env& env, bool enable)
        : Napi::AsyncWorker(env), enable(enable), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::ToggleWiFi(enable); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    bool enable;
    Napi::Promise::Deferred deferred;
    bool result;
};

class ToggleBluetoothWorker : public Napi::AsyncWorker {
public:
    ToggleBluetoothWorker(Napi::Env& env, bool enable)
        : Napi::AsyncWorker(env), enable(enable), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::ToggleBluetooth(enable); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    bool enable;
    Napi::Promise::Deferred deferred;
    bool result;
};

class SetDisplayResolutionWorker : public Napi::AsyncWorker {
public:
    SetDisplayResolutionWorker(Napi::Env& env, int width, int height)
        : Napi::AsyncWorker(env), width(width), height(height), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::SetDisplayResolution(width, height); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    int width;
    int height;
    Napi::Promise::Deferred deferred;
    bool result;
};

class SetDefaultAudioDeviceWorker : public Napi::AsyncWorker {
public:
    SetDefaultAudioDeviceWorker(Napi::Env& env, std::wstring deviceName)
        : Napi::AsyncWorker(env), deviceName(deviceName), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::SetDefaultAudioDevice(deviceName); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring deviceName;
    Napi::Promise::Deferred deferred;
    bool result;
};

class GetAudioDevicesWorker : public Napi::AsyncWorker {
public:
    GetAudioDevicesWorker(Napi::Env& env)
        : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::GetAudioDevices(); }
    void OnOK() override { 
        Napi::HandleScope scope(Env()); 
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16)); 
    }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

Napi::Value SetVolumeJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected for level").ThrowAsJavaScriptException();
        return env.Null();
    }
    SetVolumeWorker* worker = new SetVolumeWorker(env, info[0].As<Napi::Number>().Int32Value());
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SetBrightnessJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsNumber()) {
        Napi::TypeError::New(env, "Number expected for level").ThrowAsJavaScriptException();
        return env.Null();
    }
    SetBrightnessWorker* worker = new SetBrightnessWorker(env, info[0].As<Napi::Number>().Int32Value());
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value ToggleWiFiJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean expected for enable").ThrowAsJavaScriptException();
        return env.Null();
    }
    ToggleWiFiWorker* worker = new ToggleWiFiWorker(env, info[0].As<Napi::Boolean>().Value());
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value ToggleBluetoothJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsBoolean()) {
        Napi::TypeError::New(env, "Boolean expected for enable").ThrowAsJavaScriptException();
        return env.Null();
    }
    ToggleBluetoothWorker* worker = new ToggleBluetoothWorker(env, info[0].As<Napi::Boolean>().Value());
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SetDisplayResolutionJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
        Napi::TypeError::New(env, "Two numbers expected (width, height)").ThrowAsJavaScriptException();
        return env.Null();
    }
    SetDisplayResolutionWorker* worker = new SetDisplayResolutionWorker(env, info[0].As<Napi::Number>().Int32Value(), info[1].As<Napi::Number>().Int32Value());
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value SetDefaultAudioDeviceJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) {
        Napi::TypeError::New(env, "String expected for deviceName").ThrowAsJavaScriptException();
        return env.Null();
    }
    std::wstring deviceName = GetWString(info[0].As<Napi::String>());
    SetDefaultAudioDeviceWorker* worker = new SetDefaultAudioDeviceWorker(env, deviceName);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value GetAudioDevicesJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    GetAudioDevicesWorker* worker = new GetAudioDevicesWorker(env);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

// Group 4 File System
class CreateDirWorker : public Napi::AsyncWorker {
public:
    CreateDirWorker(Napi::Env& env, std::wstring path) : Napi::AsyncWorker(env), path(path), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::CreateDir(path); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring path;
    Napi::Promise::Deferred deferred;
    bool result;
};

class DeleteItemWorker : public Napi::AsyncWorker {
public:
    DeleteItemWorker(Napi::Env& env, std::wstring path) : Napi::AsyncWorker(env), path(path), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::DeleteItem(path); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring path;
    Napi::Promise::Deferred deferred;
    bool result;
};

class MoveItemWorker : public Napi::AsyncWorker {
public:
    MoveItemWorker(Napi::Env& env, std::wstring src, std::wstring dest) : Napi::AsyncWorker(env), src(src), dest(dest), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::MoveItem(src, dest); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring src, dest;
    Napi::Promise::Deferred deferred;
    bool result;
};

class CopyItemWorker : public Napi::AsyncWorker {
public:
    CopyItemWorker(Napi::Env& env, std::wstring src, std::wstring dest) : Napi::AsyncWorker(env), src(src), dest(dest), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::CopyItem(src, dest); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring src, dest;
    Napi::Promise::Deferred deferred;
    bool result;
};

class ReadFileContentWorker : public Napi::AsyncWorker {
public:
    ReadFileContentWorker(Napi::Env& env, std::wstring path) : Napi::AsyncWorker(env), path(path), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::ReadFileContent(path); }
    void OnOK() override { 
        Napi::HandleScope scope(Env()); 
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16)); 
    }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring path;
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

class WriteFileContentWorker : public Napi::AsyncWorker {
public:
    WriteFileContentWorker(Napi::Env& env, std::wstring path, std::wstring content) : Napi::AsyncWorker(env), path(path), content(content), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::WriteFileContent(path, content); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring path, content;
    Napi::Promise::Deferred deferred;
    bool result;
};

Napi::Value CreateDirJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) return env.Null();
    auto worker = new CreateDirWorker(env, GetWString(info[0].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value DeleteItemJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) return env.Null();
    auto worker = new DeleteItemWorker(env, GetWString(info[0].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value MoveItemJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) return env.Null();
    auto worker = new MoveItemWorker(env, GetWString(info[0].As<Napi::String>()), GetWString(info[1].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value CopyItemJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) return env.Null();
    auto worker = new CopyItemWorker(env, GetWString(info[0].As<Napi::String>()), GetWString(info[1].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value ReadFileContentJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) return env.Null();
    auto worker = new ReadFileContentWorker(env, GetWString(info[0].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value WriteFileContentJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) return env.Null();
    auto worker = new WriteFileContentWorker(env, GetWString(info[0].As<Napi::String>()), GetWString(info[1].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

// Group 5 Clipboard
class ReadClipboardWorker : public Napi::AsyncWorker {
public:
    ReadClipboardWorker(Napi::Env& env) : Napi::AsyncWorker(env), deferred(Napi::Promise::Deferred::New(env)), result(L"") {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::ReadClipboardText(); }
    void OnOK() override { 
        Napi::HandleScope scope(Env()); 
        std::u16string u16(result.begin(), result.end());
        deferred.Resolve(Napi::String::New(Env(), u16)); 
    }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    Napi::Promise::Deferred deferred;
    std::wstring result;
};

class WriteClipboardWorker : public Napi::AsyncWorker {
public:
    WriteClipboardWorker(Napi::Env& env, std::wstring text) : Napi::AsyncWorker(env), text(text), deferred(Napi::Promise::Deferred::New(env)), result(false) {}
    Napi::Promise GetPromise() { return deferred.Promise(); }
protected:
    void Execute() override { result = Automation::WriteClipboardText(text); }
    void OnOK() override { Napi::HandleScope scope(Env()); deferred.Resolve(Napi::Boolean::New(Env(), result)); }
    void OnError(const Napi::Error& e) override { Napi::HandleScope scope(Env()); deferred.Reject(e.Value()); }
private:
    std::wstring text;
    Napi::Promise::Deferred deferred;
    bool result;
};

Napi::Value ReadClipboardJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    auto worker = new ReadClipboardWorker(env);
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

Napi::Value WriteClipboardJs(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (info.Length() < 1 || !info[0].IsString()) return env.Null();
    auto worker = new WriteClipboardWorker(env, GetWString(info[0].As<Napi::String>()));
    auto promise = worker->GetPromise();
    worker->Queue();
    return promise;
}

// Module Initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "launchApp"), Napi::Function::New(env, LaunchAppJs));
    exports.Set(Napi::String::New(env, "injectText"), Napi::Function::New(env, InjectTextJs));
    exports.Set(Napi::String::New(env, "closeApp"), Napi::Function::New(env, CloseAppJs));
    exports.Set(Napi::String::New(env, "pressKey"), Napi::Function::New(env, PressKeyJs));
    exports.Set(Napi::String::New(env, "systemAction"), Napi::Function::New(env, SystemActionJs));
    exports.Set(Napi::String::New(env, "getRunningProcesses"), Napi::Function::New(env, GetRunningProcessesJs));
    exports.Set(Napi::String::New(env, "killProcess"), Napi::Function::New(env, KillProcessJs));
    exports.Set(Napi::String::New(env, "getFocusedWindow"), Napi::Function::New(env, GetFocusedWindowJs));
    exports.Set(Napi::String::New(env, "getSystemInfoStats"), Napi::Function::New(env, GetSystemInfoStatsJs));
    exports.Set(Napi::String::New(env, "setVolume"), Napi::Function::New(env, SetVolumeJs));
    exports.Set(Napi::String::New(env, "setBrightness"), Napi::Function::New(env, SetBrightnessJs));
    exports.Set(Napi::String::New(env, "toggleWiFi"), Napi::Function::New(env, ToggleWiFiJs));
    exports.Set(Napi::String::New(env, "toggleBluetooth"), Napi::Function::New(env, ToggleBluetoothJs));
    exports.Set(Napi::String::New(env, "setDisplayResolution"), Napi::Function::New(env, SetDisplayResolutionJs));
    exports.Set(Napi::String::New(env, "setDefaultAudioDevice"), Napi::Function::New(env, SetDefaultAudioDeviceJs));
    exports.Set(Napi::String::New(env, "getAudioDevices"), Napi::Function::New(env, GetAudioDevicesJs));

    // Group 4 File System
    exports.Set(Napi::String::New(env, "createDir"), Napi::Function::New(env, CreateDirJs));
    exports.Set(Napi::String::New(env, "deleteItem"), Napi::Function::New(env, DeleteItemJs));
    exports.Set(Napi::String::New(env, "moveItem"), Napi::Function::New(env, MoveItemJs));
    exports.Set(Napi::String::New(env, "copyItem"), Napi::Function::New(env, CopyItemJs));
    exports.Set(Napi::String::New(env, "readFileContent"), Napi::Function::New(env, ReadFileContentJs));
    exports.Set(Napi::String::New(env, "writeFileContent"), Napi::Function::New(env, WriteFileContentJs));

    // Group 5 Clipboard
    exports.Set(Napi::String::New(env, "readClipboard"), Napi::Function::New(env, ReadClipboardJs));
    exports.Set(Napi::String::New(env, "writeClipboard"), Napi::Function::New(env, WriteClipboardJs));

    return exports;
}

NODE_API_MODULE(elyra_automation, Init)
