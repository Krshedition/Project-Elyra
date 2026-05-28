{
  "targets": [
    {
      "target_name": "elyra_automation",
      "sources": [
        "native_engine/automation.cpp",
        "native_engine/addon.cpp"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      },
      "defines": [
        "NAPI_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE"
      ],
      "libraries": [
        "-lUser32.lib",
        "-lUIAutomationCore.lib",
        "-lShell32.lib",
        "-lWbemuuid.lib",
        "-lWlanapi.lib",
        "-lruntimeobject.lib",
        "-lole32.lib",
        "-loleaut32.lib"
      ]
    }
  ]
}
