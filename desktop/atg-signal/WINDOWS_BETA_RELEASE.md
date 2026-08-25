# ATG Signal Windows beta release preparation

This copy is prepared for a future store update. It must not be activated, and no Windows
download button or URL may be added, until both unsigned Windows installers have built
successfully and the exact public GitHub Release URLs exist.

## Compatibility copy

- Browser: macOS, Windows and Linux
- Mac Beta: Apple Silicon, M1 or later, macOS 11+
- Windows Beta: Windows 10/11, 64-bit
- Intel Mac: browser version only
- Privacy: files remain on the device

## Initial beta disclosure

The initial Windows beta is unsigned. Microsoft Defender SmartScreen may warn before installation,
and organisation-managed computers may block the installer under local security policy. Code-sign
the executable and both installers before treating the Windows build as a broadly trusted release.

## Expected version 1.0.0 installer names

- `ATG Signal_1.0.0_x64-setup.exe`
- `ATG Signal_1.0.0_x64_en-US.msi`

The GitHub Actions workflow stores these as workflow artifacts only. It does not create a GitHub
Release, upload public release assets, sign binaries, or publish a download URL.
