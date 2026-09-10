!ifndef BUILD_UNINSTALLER

!include nsDialogs.nsh
!include LogicLib.nsh

Var Dialog
Var LabelApiKey
Var TextApiKey
Var ApiKeyVal

Var LabelUserName
Var TextUserName
Var UserNameVal

Var LabelUserLocation
Var TextUserLocation
Var UserLocationVal

Var LabelUserBio
Var TextUserBio
Var UserBioVal

; ----------------------------------------------------------------------
; Page 1: Google Gemini API Key
; ----------------------------------------------------------------------
Function PageApiKeyCreate
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  !ifmacrodef MUI_HEADER_TEXT
    !insertmacro MUI_HEADER_TEXT "Gemini API Configuration" "Enter your Google Gemini API Key to power ELYRA's AI capabilities."
  !endif

  ${NSD_CreateLabel} 0 0 100% 30u "ELYRA requires a Google Gemini API Key for voice interaction, vision, and desktop automation.$\r$\nPlease paste your API key below:"
  Pop $LabelApiKey

  ${NSD_CreateText} 0 35u 100% 14u "$ApiKeyVal"
  Pop $TextApiKey

  ${NSD_CreateLabel} 0 60u 100% 40u "You can get a free Gemini API key from Google AI Studio:$\r$\nhttps://aistudio.google.com/$\r$\n$\r$\nYour API key will be saved securely on your PC in AppData and will not be shared."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function PageApiKeyLeave
  ${NSD_GetText} $TextApiKey $ApiKeyVal
FunctionEnd

; ----------------------------------------------------------------------
; Page 2: User Profile Details
; ----------------------------------------------------------------------
Function PageUserDetailsCreate
  nsDialogs::Create 1018
  Pop $Dialog
  ${If} $Dialog == error
    Abort
  ${EndIf}

  !ifmacrodef MUI_HEADER_TEXT
    !insertmacro MUI_HEADER_TEXT "User Profile Setup" "Personalize how ELYRA interacts with and assists you."
  !endif

  ${NSD_CreateLabel} 0 0 100% 12u "Your Name / What should ELYRA call you?"
  Pop $LabelUserName

  ${NSD_CreateText} 0 14u 100% 13u "$UserNameVal"
  Pop $TextUserName

  ${NSD_CreateLabel} 0 32u 100% 12u "Your Location (City, Country):"
  Pop $LabelUserLocation

  ${NSD_CreateText} 0 46u 100% 13u "$UserLocationVal"
  Pop $TextUserLocation

  ${NSD_CreateLabel} 0 64u 100% 12u "Brief Bio / Interests / Notes (e.g. Developer, Student, Gamer):"
  Pop $LabelUserBio

  ${NSD_CreateText} 0 78u 100% 30u "$UserBioVal"
  Pop $TextUserBio

  nsDialogs::Show
FunctionEnd

Function PageUserDetailsLeave
  ${NSD_GetText} $TextUserName $UserNameVal
  ${NSD_GetText} $TextUserLocation $UserLocationVal
  ${NSD_GetText} $TextUserBio $UserBioVal
FunctionEnd

; ----------------------------------------------------------------------
; Hook custom pages into the installer flow
; ----------------------------------------------------------------------
!macro customPageAfterChangeDir
  Page custom PageApiKeyCreate PageApiKeyLeave
  Page custom PageUserDetailsCreate PageUserDetailsLeave
!macroend

; ----------------------------------------------------------------------
; Save configuration during installation
; ----------------------------------------------------------------------
!macro customInstall
  CreateDirectory "$APPDATA\ELYRA"

  ; If user provided an API key or no config exists yet, write config
  ${If} $ApiKeyVal != ""
  ${OrIf} $UserNameVal != ""
  ${OrIfNot} ${FileExists} "$APPDATA\ELYRA\user_config.json"
    FileOpen $0 "$APPDATA\ELYRA\user_config.json" w
    FileWrite $0 "{"
    FileWrite $0 "$\r$\n  $\"apiKey$\": $\"$ApiKeyVal$\","
    FileWrite $0 "$\r$\n  $\"userName$\": $\"$UserNameVal$\","
    FileWrite $0 "$\r$\n  $\"userLocation$\": $\"$UserLocationVal$\","
    FileWrite $0 "$\r$\n  $\"userBio$\": $\"$UserBioVal$\""
    FileWrite $0 "$\r$\n}"
    FileClose $0
  ${EndIf}
!macroend

!endif
