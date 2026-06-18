BOLTX MobTrap package

Contents:
- behavior_pack/manifest.json
- behavior_pack/items/boltx_item.json
- behavior_pack/scripts/main.js  (MobTrap + Enderman builders)
- resource_pack/manifest.json
- resource_pack/textures/items/boltx_tool.png.b64

Installation instructions are included in the repository. To create boltx.mcpack locally:
1) Ensure the two folders behavior_pack/ and resource_pack/ are at the root of a folder (e.g. boltx_package/)
2) Decode the Base64 PNG into resource_pack/textures/items/boltx_tool.png (see commands in README below)
3) Zip the contents so that the zip root contains behavior_pack/ and resource_pack/ (not an enclosing parent folder)
   - Windows (PowerShell): Compress-Archive -Path .\boltx_package\* -DestinationPath .\boltx.zip
   - macOS / Linux: cd boltx_package && zip -r ../boltx.zip . && cd ..
4) Rename boltx.zip to boltx.mcpack and open it (double-click) to import into Minecraft Bedrock.

See README_INSTALL.txt for full instructions.
