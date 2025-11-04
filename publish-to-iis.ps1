# PowerShell Script to Publish Account Management App to IIS
# Target: D:\Publish Files
# Run this script as Administrator

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Configuration
$sourcePath = "D:\Cursor Project\Account_Management"
$targetPath = "D:\Publish Files"
$siteName = "AccountManagement"
$appPoolName = "AccountManagementPool"
$port = 80

Write-Host "=== IIS Publishing Script ===" -ForegroundColor Green
Write-Host "Source: $sourcePath" -ForegroundColor Cyan
Write-Host "Target: $targetPath" -ForegroundColor Cyan
Write-Host "Site Name: $siteName" -ForegroundColor Cyan
Write-Host "Port: $port" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Green

# Step 1: Verify source path
if (-not (Test-Path $sourcePath)) {
    Write-Host "ERROR: Source path does not exist: $sourcePath" -ForegroundColor Red
    Write-Host "Please update the sourcePath variable in this script." -ForegroundColor Yellow
    exit 1
}

# Step 2: Create target directory if it doesn't exist
if (-not (Test-Path $targetPath)) {
    Write-Host "Creating target directory: $targetPath" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
}

# Step 3: Copy files
Write-Host "`nStep 1: Copying files from source to target..." -ForegroundColor Cyan
try {
    # Copy all files and folders
    Copy-Item -Path "$sourcePath\*" -Destination $targetPath -Recurse -Force
    Write-Host "✓ Files copied successfully" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Failed to copy files: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Verify index.html exists
if (-not (Test-Path "$targetPath\index.html")) {
    Write-Host "WARNING: index.html not found in target directory!" -ForegroundColor Yellow
    Write-Host "Please check if files were copied correctly." -ForegroundColor Yellow
}

# Step 5: Copy web.config if it exists in source
if (Test-Path "$sourcePath\web.config") {
    Copy-Item -Path "$sourcePath\web.config" -Destination $targetPath -Force
    Write-Host "✓ web.config copied" -ForegroundColor Green
} else {
    Write-Host "NOTE: web.config not found in source. Creating default one..." -ForegroundColor Yellow
    # Create basic web.config
    $webConfig = @"
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <defaultDocument>
            <files>
                <clear />
                <add value="index.html" />
            </files>
        </defaultDocument>
    </system.webServer>
</configuration>
"@
    Set-Content -Path "$targetPath\web.config" -Value $webConfig
    Write-Host "✓ Default web.config created" -ForegroundColor Green
}

# Step 6: Import IIS module
Write-Host "`nStep 2: Importing IIS module..." -ForegroundColor Cyan
Import-Module WebAdministration -ErrorAction SilentlyContinue

if (-not (Get-Module WebAdministration)) {
    Write-Host "ERROR: IIS module not found. Please install IIS first." -ForegroundColor Red
    Write-Host "Install IIS from: Control Panel > Programs > Turn Windows features on or off" -ForegroundColor Yellow
    exit 1
}

# Step 7: Create Application Pool
Write-Host "`nStep 3: Creating Application Pool..." -ForegroundColor Cyan
if (Get-WebAppPoolState -Name $appPoolName -ErrorAction SilentlyContinue) {
    Write-Host "Application Pool '$appPoolName' already exists. Removing..." -ForegroundColor Yellow
    Remove-WebAppPool -Name $appPoolName
}

New-WebAppPool -Name $appPoolName
Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$appPoolName" -Name managedPipelineMode -Value "Integrated"
Start-Sleep -Seconds 2
Write-Host "✓ Application Pool created" -ForegroundColor Green

# Step 8: Create Website
Write-Host "`nStep 4: Creating Website..." -ForegroundColor Cyan
if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
    Write-Host "Website '$siteName' already exists. Removing..." -ForegroundColor Yellow
    Remove-Website -Name $siteName
}

New-Website -Name $siteName `
            -PhysicalPath $targetPath `
            -ApplicationPool $appPoolName `
            -Port $port `
            -Force

Write-Host "✓ Website created" -ForegroundColor Green

# Step 9: Set Default Document
Write-Host "`nStep 5: Configuring Default Document..." -ForegroundColor Cyan
$defaultDocs = Get-WebConfigurationProperty -Filter "system.webServer/defaultDocument/files" -PSPath "IIS:\Sites\$siteName" | Select-Object -ExpandProperty Collection
$indexExists = $defaultDocs | Where-Object { $_.value -eq "index.html" }

if (-not $indexExists) {
    Add-WebConfigurationProperty -Filter "system.webServer/defaultDocument/files" `
                                 -PSPath "IIS:\Sites\$siteName" `
                                 -Name "." `
                                 -Value @{value="index.html"}
}
Write-Host "✓ Default document configured" -ForegroundColor Green

# Step 10: Set Folder Permissions
Write-Host "`nStep 6: Setting Folder Permissions..." -ForegroundColor Cyan
try {
    $acl = Get-Acl $targetPath
    
    # Add IIS_IUSRS
    $permission = "IIS_IUSRS","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    
    # Add IUSR
    $permission = "IUSR","ReadAndExecute","ContainerInherit,ObjectInherit","None","Allow"
    $accessRule = New-Object System.Security.AccessControl.FileSystemAccessRule $permission
    $acl.SetAccessRule($accessRule)
    
    Set-Acl $targetPath $acl
    Write-Host "✓ Folder permissions set" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not set permissions automatically. Please set manually:" -ForegroundColor Yellow
    Write-Host "  - IIS_IUSRS: Read & Execute" -ForegroundColor Yellow
    Write-Host "  - IUSR: Read & Execute" -ForegroundColor Yellow
}

# Step 11: Start Website
Write-Host "`nStep 7: Starting Website..." -ForegroundColor Cyan
Start-WebAppPool -Name $appPoolName
Start-Website -Name $siteName
Start-Sleep -Seconds 2

$poolState = Get-WebAppPoolState -Name $appPoolName
$siteState = (Get-Website -Name $siteName).State

if ($poolState.Value -eq "Started" -and $siteState -eq "Started") {
    Write-Host "✓ Website is running" -ForegroundColor Green
} else {
    Write-Host "⚠ Website may not be running properly. Check IIS Manager." -ForegroundColor Yellow
}

# Step 12: Configure Firewall
$configureFirewall = Read-Host "`nConfigure Windows Firewall to allow port $port? (y/n)"
if ($configureFirewall -eq "y") {
    Write-Host "Configuring Firewall..." -ForegroundColor Cyan
    $firewallRule = Get-NetFirewallRule -DisplayName "IIS HTTP Port $port" -ErrorAction SilentlyContinue
    if (-not $firewallRule) {
        New-NetFirewallRule -DisplayName "IIS HTTP Port $port" `
                           -Direction Inbound `
                           -LocalPort $port `
                           -Protocol TCP `
                           -Action Allow | Out-Null
        Write-Host "✓ Firewall rule created" -ForegroundColor Green
    } else {
        Write-Host "✓ Firewall rule already exists" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n=== Publishing Complete ===" -ForegroundColor Green
Write-Host "Website Name: $siteName"
Write-Host "Application Pool: $appPoolName"
Write-Host "Physical Path: $targetPath"
Write-Host "Port: $port"
Write-Host "`nAccess URLs:" -ForegroundColor Cyan
Write-Host "  Local: http://localhost:$port"
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -notlike '*Loopback*'}).IPAddress
if ($ipAddress) {
    Write-Host "  Network: http://$ipAddress:$port"
}

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "1. Open browser and go to: http://localhost:$port"
Write-Host "2. Verify the login page displays correctly"
Write-Host "3. Check browser console (F12) for any errors"
Write-Host "4. Test registration and login functionality"
Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
