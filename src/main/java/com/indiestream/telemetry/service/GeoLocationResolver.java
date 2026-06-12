package com.indiestream.telemetry.service;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Resolves physical location using CDN-injected headers.
 * Prioritizes Cloudflare (CF-IPCountry), falls back to standard X-Country-Code.
 * Designed to be called at the edge (Controller/Gateway) before queueing telemetry.
 */
@Service
public class GeoLocationResolver {

    public String resolveCountry(HttpServletRequest request) {
        if (request == null) return "XX"; // Unknown standard

        // Cloudflare standard header
        String cfCountry = request.getHeader("CF-IPCountry");
        if (StringUtils.hasText(cfCountry)) {
            return cfCountry.toUpperCase();
        }

        // Generic proxy standard header
        String xCountry = request.getHeader("X-Country-Code");
        if (StringUtils.hasText(xCountry)) {
            return xCountry.toUpperCase();
        }

        // Fallback for local development or direct access without CDN
        return "XX";
    }
}