//==============================================================================
// 포함 모듈 목록.
//==============================================================================
const System = globalThis;


//==============================================================================
// 테마 식별자.
//==============================================================================
export const ThemeId = {
	light: "light",
	dark: "dark",
	vanilla: "vanilla",
};


//==============================================================================
// 테마 정의.
// - 색상은 Tailwind CSS 표준 팔레트 (zinc / blue / amber / red) 기반.
// - 토큰 명명은 Material Design 3 의 surface / on-surface 체계를 따른다.
//   * sceneBackground   : 캔버스 외부 영역(세이프 에어리어 바깥)
//   * background        : 앱 본문 배경 (가장 넓은 면적)
//   * surface           : 카드/팝업/버튼 등 컨텐츠 표면
//   * surfaceVariant    : surface 와 다른 톤 (네비/구분/강조용)
//   * on*               : 위 surface 위에 올라가는 텍스트/아이콘 색
//   * primary           : 주요 액션 색 (시작/확인 류)
//   * secondary         : 보조 액션 색
//   * error             : 위험 액션 색 (종료/취소 류)
//==============================================================================
const THEMES = {
	light: {
		id: "light",
		displayName: "라이트",
		// Tailwind: zinc-50 / zinc-100 / zinc-200 / zinc-600 / zinc-900
		sceneBackground:   "#000000",
		background:        "#f4f4f5", // zinc-100
		onBackground:      "#18181b", // zinc-900
		surface:           "#ffffff",
		onSurface:         "#18181b",
		surfaceVariant:    "#e4e4e7", // zinc-200
		onSurfaceVariant:  "#52525b", // zinc-600
		primary:           "#2563eb", // blue-600
		onPrimary:         "#ffffff",
		secondary:         "#71717a", // zinc-500
		onSecondary:       "#ffffff",
		error:             "#dc2626", // red-600
		onError:           "#ffffff",
		popupDimAlpha:     0.45,
	},
	dark: {
		id: "dark",
		displayName: "다크",
		// Tailwind: zinc-950 / zinc-900 / zinc-800 / zinc-400 / zinc-50
		sceneBackground:   "#000000",
		background:        "#09090b", // zinc-950
		onBackground:      "#fafafa", // zinc-50
		surface:           "#18181b", // zinc-900
		onSurface:         "#fafafa",
		surfaceVariant:    "#27272a", // zinc-800
		onSurfaceVariant:  "#a1a1aa", // zinc-400
		primary:           "#3b82f6", // blue-500
		onPrimary:         "#ffffff",
		secondary:         "#52525b", // zinc-600
		onSecondary:       "#fafafa",
		error:             "#ef4444", // red-500
		onError:           "#ffffff",
		popupDimAlpha:     0.7,
	},
	vanilla: {
		id: "vanilla",
		displayName: "바닐라",
		// Tailwind: amber-50 / amber-100 / amber-200 / amber-700 / amber-800 / amber-950
		sceneBackground:   "#1c1303",
		background:        "#fef3c7", // amber-100
		onBackground:      "#451a03", // amber-950
		surface:           "#fffbeb", // amber-50
		onSurface:         "#451a03",
		surfaceVariant:    "#fde68a", // amber-200
		onSurfaceVariant:  "#92400e", // amber-800
		primary:           "#b45309", // amber-700
		onPrimary:         "#ffffff",
		secondary:         "#a16207", // yellow-700
		onSecondary:       "#ffffff",
		error:             "#b91c1c", // red-700
		onError:           "#ffffff",
		popupDimAlpha:     0.55,
	},
};


//==============================================================================
// LocalStorage 키 및 상태.
//==============================================================================
const STORAGE_KEY = "minigame-collection.theme";
/** @type { Set<(theme: object) => void> } */
const listeners = new System.Set();
let currentThemeId = ThemeId.dark;


//==============================================================================
// 초기 로드. (LocalStorage 에서 마지막 선택 복원)
//==============================================================================
try {
	const saved = System.localStorage.getItem(STORAGE_KEY);
	if (saved && THEMES[saved]) {
		currentThemeId = saved;
	}
}
catch (error) {
	// 무시 (private 모드 등에서 LocalStorage 접근 실패 가능).
}


//==============================================================================
// 모든 테마 ID 반환.
//==============================================================================
/**
 * @returns { string[] }
 */
export function getAllThemeIds() {
	return [ThemeId.light, ThemeId.dark, ThemeId.vanilla];
}


//==============================================================================
// 특정 테마 객체 반환. (id 미지정 시 현재 테마)
//==============================================================================
/**
 * @param { string } [themeId]
 * @returns { object | null }
 */
export function getTheme(themeId) {
	const id = themeId || currentThemeId;
	return THEMES[id] || null;
}


//==============================================================================
// 현재 테마 ID 반환.
//==============================================================================
/**
 * @returns { string }
 */
export function getCurrentThemeId() {
	return currentThemeId;
}


//==============================================================================
// 현재 테마 객체 반환.
//==============================================================================
/**
 * @returns { object }
 */
export function getCurrentTheme() {
	return THEMES[currentThemeId];
}


//==============================================================================
// 현재 테마 변경 + 리스너 알림.
//==============================================================================
/**
 * @param { string } themeId
 */
export function setCurrentTheme(themeId) {
	if (!THEMES[themeId]) {
		return;
	}
	if (currentThemeId === themeId) {
		return;
	}
	currentThemeId = themeId;
	try {
		System.localStorage.setItem(STORAGE_KEY, themeId);
	}
	catch (error) {
		// 무시.
	}
	const theme = THEMES[themeId];
	for (const listener of listeners) {
		try {
			listener(theme);
		}
		catch (error) {
			console.error("[theme] 리스너 호출 실패:", error);
		}
	}
}


//==============================================================================
// 테마 변경 리스너 등록.
//==============================================================================
/**
 * @param { (theme: object) => void } listener
 */
export function addThemeChangeListener(listener) {
	listeners.add(listener);
}


//==============================================================================
// 테마 변경 리스너 제거.
//==============================================================================
/**
 * @param { (theme: object) => void } listener
 */
export function removeThemeChangeListener(listener) {
	listeners.delete(listener);
}
