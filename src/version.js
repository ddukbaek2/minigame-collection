//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;
import { Version } from "../libs/vanilla.js/src/base/version.js";
import { CURRENT_VERSION_STRING } from "./version.generated.js";


//==============================================================================
// 엔진의 Version 을 그대로 다시 export. 프로젝트 안에서는 이 모듈을 통해 가져다 쓴다.
//==============================================================================
export { Version } from "../libs/vanilla.js/src/base/version.js";


//==============================================================================
// "x.y.z" 형식 문자열을 엔진 Version 인스턴스로 파싱.
//==============================================================================
/**
 * @param { string } versionString
 * @returns { Version }
 */
function parseVersionString(versionString) {
	const parts = String(versionString || "0.0.0").split(".");
	const majorRaw = System.parseInt(parts[0], 10);
	const minorRaw = System.parseInt(parts[1], 10);
	const patchRaw = System.parseInt(parts[2], 10);
	const major = System.Number.isFinite(majorRaw) ? majorRaw : 0;
	const minor = System.Number.isFinite(minorRaw) ? minorRaw : 0;
	const patch = System.Number.isFinite(patchRaw) ? patchRaw : 0;
	return Version.create(major, minor, patch);
}


//==============================================================================
// 현재 빌드 버전 (단일 인스턴스).
// - version.generated.js 의 값으로 한 번만 파싱해서 보관.
// - tools/bump-version.cjs 가 디플로이마다 patch 를 +1 한다.
//==============================================================================
const currentVersion = parseVersionString(CURRENT_VERSION_STRING);


//==============================================================================
// 현재 빌드의 Version 인스턴스 반환.
//==============================================================================
/**
 * @returns { Version }
 */
export function getCurrentVersion() {
	return currentVersion;
}
