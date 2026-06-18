package com.indiestream.telemetry.domain;

/**
 * Defines the exact micro-frontend component where the interaction occurred.
 * Used to build engagement heatmaps.
 */
public enum UiSurface {
    CONTEXT_MENU,
    DROPDOWN_MENU,
    PLAYER_BAR,
    TRACK_CARD,
    QUICK_SEARCH_POPOVER,
    LIBRARY_SIDEBAR,
    UPLOAD_WIZARD
}