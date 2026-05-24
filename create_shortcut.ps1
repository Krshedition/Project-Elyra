$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\Krish Bhutiya\Desktop\ELYRA.lnk")
$Shortcut.TargetPath = "C:\Users\Krish Bhutiya\Desktop\Krish Codes\Project Elyra\dist-app\win-unpacked\ELYRA.exe"
$Shortcut.WorkingDirectory = "C:\Users\Krish Bhutiya\Desktop\Krish Codes\Project Elyra\dist-app\win-unpacked"
$Shortcut.Save()
