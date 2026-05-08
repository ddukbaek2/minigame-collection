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
// - Tailwind CSS 표준 팔레트 (zinc / blue / amber / red) 기반.
// - Material Design 3 의 surface / on-surface 토큰 체계.
//==============================================================================
const THEMES = {
	light: {
		id: "light",
		displayName: "라이트",
		sceneBackground:   "#000000",
		background:        "#f4f4f5",
		onBackground:      "#18181b",
		surface:           "#ffffff",
		onSurface:         "#18181b",
		surfaceVariant:    "#e4e4e7",
		onSurfaceVariant:  "#52525b",
		primary:           "#2563eb",
		onPrimary:         "#ffffff",
		secondary:         "#71717a",
		onSecondary:       "#ffffff",
		error:             "#dc2626",
		onError:           "#ffffff",
		popupDimAlpha:     0.45,
	},
	dark: {
		id: "dark",
		displayName: "다크",
		sceneBackground:   "#000000",
		background:        "#09090b",
		onBackground:      "#fafafa",
		surface:           "#18181b",
		onSurface:         "#fafafa",
		surfaceVariant:    "#27272a",
		onSurfaceVariant:  "#a1a1aa",
		primary:           "#3b82f6",
		onPrimary:         "#ffffff",
		secondary:         "#52525b",
		onSecondary:       "#fafafa",
		error:             "#ef4444",
		onError:           "#ffffff",
		popupDimAlpha:     0.7,
	},
	vanilla: {
		id: "vanilla",
		displayName: "바닐라",
		sceneBackground:   "#1c1303",
		background:        "#fef3c7",
		onBackground:      "#451a03",
		surface:           "#fffbeb",
		onSurface:         "#451a03",
		surfaceVariant:    "#fde68a",
		onSurfaceVariant:  "#92400e",
		primary:           "#b45309",
		onPrimary:         "#ffffff",
		secondary:         "#a16207",
		onSecondary:       "#ffffff",
		error:             "#b91c1c",
		onError:           "#ffffff",
		popupDimAlpha:     0.55,
	},
};


//==============================================================================
// 슬롯별 상태 (UI / Game 분리)
//==============================================================================
const STORAGE_KEY_UI = "minigame-collection.theme.ui";
const STORAGE_KEY_GAME = "minigame-collection.theme.game";

let currentUIThemeId = ThemeId.dark;
let currentGameThemeId = ThemeId.dark;

/** @type { Set<(theme: object) => void> } */
const uiListeners = new System.Set();
/** @type { Set<(theme: object) => void> } */
const gameListeners = new System.Set();


//==============================================================================
// 초기 로드. (LocalStorage)
//==============================================================================
try {
	const savedUI = System.localStorage.getItem(STORAGE_KEY_UI);
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } savedUI && THEMES[savedUI]
	 */
	if (savedUI && THEMES[savedUI]) {
		currentUIThemeId = savedUI;
	}
	const savedGame = System.localStorage.getItem(STORAGE_KEY_GAME);
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } savedGame && THEMES[savedGame]
	 */
	if (savedGame && THEMES[savedGame]) {
		currentGameThemeId = savedGame;
	}
}
catch (error) {
	// 무시.
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
// 특정 테마 객체 반환. (인자 생략 시 현재 UI 테마)
//==============================================================================
/**
 * @param { string } [themeId]
 * @returns { object | null }
 */
export function getTheme(themeId) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } themeId
	 */
	if (themeId === undefined || themeId === null) {
		return THEMES[currentUIThemeId] || null;
	}
	return THEMES[themeId] || null;
}


//==============================================================================
// UI 테마 (앱 전반 색상). ────────────────────────────────────────────────
//==============================================================================
export function getCurrentUIThemeId() {
	return currentUIThemeId;
}

//==============================================================================
// getCurrentUITheme.
//==============================================================================
export function getCurrentUITheme() {
	return THEMES[currentUIThemeId];
}

/**
 * @param { string } themeId
 */
//==============================================================================
// setCurrentUITheme.
//==============================================================================
/**
 * @param { * } themeId
 */
export function setCurrentUITheme(themeId) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } !THEMES[themeId]
	 */
	if (!THEMES[themeId]) {
		return;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } currentUIThemeId
	 */
	if (currentUIThemeId === themeId) {
		return;
	}	currentUIThemeId = themeId;
	try { System.localStorage.setItem(STORAGE_KEY_UI, themeId); } catch (e) {}
	const theme = THEMES[themeId];
	//==============================================================================
	// for.
	//==============================================================================
	/**
	 * @param { * } const listener of uiListeners
	 */
	for (const listener of uiListeners) {
		try { listener(theme); } catch (error) { console.error("[theme/ui]", error); }
	}
}

/**
 * @param { (theme: object) => void } listener
 */
//==============================================================================
// addUIThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function addUIThemeChangeListener(listener) {
	uiListeners.add(listener);
}

/**
 * @param { (theme: object) => void } listener
 */
//==============================================================================
// removeUIThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function removeUIThemeChangeListener(listener) {
	uiListeners.delete(listener);
}


//==============================================================================
// 게임 테마 (게임 컨텐츠 내부 색상). ────────────────────────────────────────
//==============================================================================
export function getCurrentGameThemeId() {
	return currentGameThemeId;
}

//==============================================================================
// getCurrentGameTheme.
//==============================================================================
export function getCurrentGameTheme() {
	return THEMES[currentGameThemeId];
}

/**
 * @param { string } themeId
 */
//==============================================================================
// setCurrentGameTheme.
//==============================================================================
/**
 * @param { * } themeId
 */
export function setCurrentGameTheme(themeId) {
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } !THEMES[themeId]
	 */
	if (!THEMES[themeId]) {
		return;
	}
	//==============================================================================
	// if.
	//==============================================================================
	/**
	 * @param { * } currentGameThemeId
	 */
	if (currentGameThemeId === themeId) {
		return;
	}	currentGameThemeId = themeId;
	try { System.localStorage.setItem(STORAGE_KEY_GAME, themeId); } catch (e) {}
	const theme = THEMES[themeId];
	//==============================================================================
	// for.
	//==============================================================================
	/**
	 * @param { * } const listener of gameListeners
	 */
	for (const listener of gameListeners) {
		try { listener(theme); } catch (error) { console.error("[theme/game]", error); }
	}
}

/**
 * @param { (theme: object) => void } listener
 */
//==============================================================================
// addGameThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function addGameThemeChangeListener(listener) {
	gameListeners.add(listener);
}

/**
 * @param { (theme: object) => void } listener
 */
//==============================================================================
// removeGameThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function removeGameThemeChangeListener(listener) {
	gameListeners.delete(listener);
}


//==============================================================================
// 호환 alias. (이전 단일 테마 API 를 사용하는 코드를 위해 UI 테마로 위임)
//==============================================================================
export function getCurrentThemeId() {
	return getCurrentUIThemeId();
}

//==============================================================================
// getCurrentTheme.
//==============================================================================
export function getCurrentTheme() {
	return getCurrentUITheme();
}

//==============================================================================
// setCurrentTheme.
//==============================================================================
/**
 * @param { * } themeId
 */
export function setCurrentTheme(themeId) {
	setCurrentUITheme(themeId);
}

//==============================================================================
// addThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function addThemeChangeListener(listener) {
	addUIThemeChangeListener(listener);
}

//==============================================================================
// removeThemeChangeListener.
//==============================================================================
/**
 * @param { * } listener
 */
export function removeThemeChangeListener(listener) {
	removeUIThemeChangeListener(listener);
}
