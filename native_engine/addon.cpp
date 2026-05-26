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

// Module Initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(Napi::String::New(env, "launchApp"), Napi::Function::New(env, LaunchAppJs));
    exports.Set(Napi::String::New(env, "injectText"), Napi::Function::New(env, InjectTextJs));
    exports.Set(Napi::String::New(env, "closeApp"), Napi::Function::New(env, CloseAppJs));
    exports.Set(Napi::String::New(env, "pressKey"), Napi::Function::New(env, PressKeyJs));
    return exports;
}

NODE_API_MODULE(elyra_automation, Init)
