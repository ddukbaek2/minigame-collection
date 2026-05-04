//==============================================================================
// 포함 모듈 목록.
//==============================================================================
import { CURRENT_VERSION_STRING } from "./version.generated.js";


//==============================================================================
// 시맨틱 버전.
// - major.minor.patch 의 단순 표현. parse / toString / 비교 지원.
// - 현재 빌드 버전은 Version.getCurrent() 로 얻는다. 값은 version.generated.js 에서
//   주입되며, tools/bump-version.cjs 가 디플로이마다 patch 를 +1 한다.
//==============================================================================
export class Version {
	//==============================================================================
	// 멤버 변수 목록.
	//==============================================================================
	/** @type { number } */ major;
	/** @type { number } */ minor;
	/** @type { number } */ patch;

	//==============================================================================
	// 생성.
	//==============================================================================
	/**
	 * @constructor
	 * @param { number } major
	 * @param { number } minor
	 * @param { number } patch
	 */
	constructor(major, minor, patch) {
		this.major = major | 0;
		this.minor = minor | 0;
		this.patch = patch | 0;
	}

	//==============================================================================
	// "x.y.z" 형식 문자열을 Version 으로 파싱.
	//==============================================================================
	/**
	 * @param { string } versionString
	 * @returns { Version }
	 */
	static parse(versionString) {
		const parts = String(versionString || "0.0.0").split(".");
		const major = parseInt(parts[0], 10);
		const minor = parseInt(parts[1], 10);
		const patch = parseInt(parts[2], 10);
		return new Version(
			isNaN(major) ? 0 : major,
			isNaN(minor) ? 0 : minor,
			isNaN(patch) ? 0 : patch,
		);
	}

	//==============================================================================
	// 현재 빌드의 버전 반환.
	//==============================================================================
	/**
	 * @returns { Version }
	 */
	static getCurrent() {
		return CURRENT;
	}

	//==============================================================================
	// "x.y.z" 형식 문자열로 변환.
	//==============================================================================
	/**
	 * @returns { string }
	 */
	toString() {
		return `${this.major}.${this.minor}.${this.patch}`;
	}

	//==============================================================================
	// 두 버전을 비교. (-1 / 0 / 1)
	//==============================================================================
	/**
	 * @param { Version } other
	 * @returns { number }
	 */
	compare(other) {
		if (this.major !== other.major) return this.major < other.major ? -1 : 1;
		if (this.minor !== other.minor) return this.minor < other.minor ? -1 : 1;
		if (this.patch !== other.patch) return this.patch < other.patch ? -1 : 1;
		return 0;
	}
}


//==============================================================================
// 현재 빌드 버전.
//==============================================================================
const CURRENT = Version.parse(CURRENT_VERSION_STRING);
