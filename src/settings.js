//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 설정 식별자.
//==============================================================================
export const SettingId = {
	bgmEnabled: "bgmEnabled",
	sfxEnabled: "sfxEnabled",
	vibrationEnabled: "vibrationEnabled",
	language: "language",
};


//==============================================================================
// 언어 식별자.
//==============================================================================
export const LanguageId = {
	ko: "ko",
	en: "en",
};


//==============================================================================
// 기본값.
//==============================================================================
const DEFAULTS = {
	bgmEnabled: true,
	sfxEnabled: true,
	vibrationEnabled: true,
	language: LanguageId.ko,
};


//==============================================================================
// 상태.
//==============================================================================
const STORAGE_KEY = "minigame-collection.settings";
const state = { ...DEFAULTS };
/** @type { Set<(key: string, value: any) => void> } */
const listeners = new System.Set();


//==============================================================================
// 초기 로드. (LocalStorage)
//==============================================================================
try {
	const saved = System.localStorage.getItem(STORAGE_KEY);
	if (saved) {
		const parsed = JSON.parse(saved);
		if (parsed && typeof parsed === "object") {
			for (const key of System.Object.keys(DEFAULTS)) {
				if (parsed[key] !== undefined) {
					state[key] = parsed[key];
				}
			}
		}
	}
}
catch (error) {
	// 무시.
}


//==============================================================================
// 저장.
//==============================================================================
function persist() {
	try {
		System.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}
	catch (error) {
		// 무시.
	}
}


//==============================================================================
// 값 반환.
//==============================================================================
/**
 * @param { string } key
 * @returns { any }
 */
export function getSetting(key) {
	return state[key];
}


//==============================================================================
// 값 설정 + 리스너 알림.
//==============================================================================
/**
 * @param { string } key
 * @param { any } value
 */
export function setSetting(key, value) {
	if (!(key in DEFAULTS)) {
		return;
	}
	if (state[key] === value) {
		return;
	}
	state[key] = value;
	persist();

	for (const listener of listeners) {
		try {
			listener(key, value);
		}
		catch (error) {
			console.error("[settings]", error);
		}
	}
}


//==============================================================================
// 편의 getter / setter.
//==============================================================================
export function isBgmEnabled() {
	return !!state[SettingId.bgmEnabled];
}


//==============================================================================
// isSfxEnabled.
//==============================================================================
export function isSfxEnabled() {
	return !!state[SettingId.sfxEnabled];
}


//==============================================================================
// isVibrationEnabled.
//==============================================================================
export function isVibrationEnabled() {
	return !!state[SettingId.vibrationEnabled];
}


//==============================================================================
// getLanguage.
//==============================================================================
export function getLanguage() {
	return state[SettingId.language];
}


//==============================================================================
// setBgmEnabled.
//==============================================================================
/**
 * @param { boolean } enabled
 */
export function setBgmEnabled(enabled) {
	setSetting(SettingId.bgmEnabled, !!enabled);
}


//==============================================================================
// setSfxEnabled.
//==============================================================================
/**
 * @param { boolean } enabled
 */
export function setSfxEnabled(enabled) {
	setSetting(SettingId.sfxEnabled, !!enabled);
}


//==============================================================================
// setVibrationEnabled.
//==============================================================================
/**
 * @param { boolean } enabled
 */
export function setVibrationEnabled(enabled) {
	setSetting(SettingId.vibrationEnabled, !!enabled);
}


//==============================================================================
// setLanguage.
//==============================================================================
/**
 * @param { * } languageId
 */
export function setLanguage(languageId) {
	setSetting(SettingId.language, languageId);
}


//==============================================================================
// 리스너 등록.
//==============================================================================
/**
 * @param { (key: string, value: any) => void } listener
 */
export function addSettingChangeListener(listener) {
	listeners.add(listener);
}


//==============================================================================
// 리스너 해제.
//==============================================================================
/**
 * @param { (key: string, value: any) => void } listener
 */
export function removeSettingChangeListener(listener) {
	listeners.delete(listener);
}
