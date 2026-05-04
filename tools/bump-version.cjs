//==============================================================================
// 버전 patch 자동 증가 스크립트.
// - package.json 의 version "x.y.z" 에서 patch 를 +1.
// - 동일 값을 src/version.generated.js 에도 기록해 런타임에서 읽을 수 있게 한다.
// - 디플로이용 build 스크립트 앞에 체이닝되어 디플로이마다 자동 실행된다.
//==============================================================================
const fs = require("fs");
const path = require("path");


//==============================================================================
// 경로 상수.
//==============================================================================
const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(REPO_ROOT, "package.json");
const VERSION_GENERATED_PATH = path.join(REPO_ROOT, "src", "version.generated.js");


//==============================================================================
// "x.y.z" 의 patch 를 +1.
//==============================================================================
function bumpPatch(versionString) {
	const parts = String(versionString || "0.0.0").split(".").map((value) => parseInt(value, 10));
	const major = isNaN(parts[0]) ? 0 : parts[0];
	const minor = isNaN(parts[1]) ? 0 : parts[1];
	const patch = isNaN(parts[2]) ? 0 : parts[2];
	return `${major}.${minor}.${patch + 1}`;
}


//==============================================================================
// package.json 갱신. (탭 들여쓰기 / 마지막 newline 유지)
//==============================================================================
function writePackageJson(json) {
	const content = JSON.stringify(json, null, "\t") + "\n";
	fs.writeFileSync(PACKAGE_JSON_PATH, content, "utf8");
}


//==============================================================================
// 자동 생성 파일 작성.
//==============================================================================
function writeVersionGenerated(versionString) {
	const content = [
		"//==============================================================================",
		"// 자동 생성 파일. tools/bump-version.cjs 가 디플로이 빌드 시 갱신.",
		"// 직접 수정하지 말 것 — 같은 값이 package.json 의 version 필드와 동기화된다.",
		"//==============================================================================",
		`export const CURRENT_VERSION_STRING = "${versionString}";`,
		"",
	].join("\n");
	fs.writeFileSync(VERSION_GENERATED_PATH, content, "utf8");
}


//==============================================================================
// 메인.
//==============================================================================
function main() {
	const raw = fs.readFileSync(PACKAGE_JSON_PATH, "utf8");
	const json = JSON.parse(raw);
	const previous = json.version || "0.0.0";
	const next = bumpPatch(previous);
	json.version = next;
	writePackageJson(json);
	writeVersionGenerated(next);
	console.log(`[bump-version] ${previous} -> ${next}`);
}


main();
