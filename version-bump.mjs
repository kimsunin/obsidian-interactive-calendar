import { readFileSync, writeFileSync } from "fs";

// npm version 실행 시 업데이트된 새 버전 가져오기
const targetVersion = process.env.npm_package_version;

// 1. manifest.json 버전 업데이트
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;

manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, 2) + "\n");

// 2. versions.json 버전 등록
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

if (!(targetVersion in versions)) {
  versions[targetVersion] = minAppVersion;
  writeFileSync("versions.json", JSON.stringify(versions, null, 2) + "\n");
}
