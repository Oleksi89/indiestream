package com.indiestream.telemetry.service.analytics;

import com.indiestream.telemetry.dto.analytics.TimeSeriesPointDto;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.util.List;

/**
 * Generates RFC 4180 compliant CSV exports for dashboard data.
 */
@Service
public class CsvExportService {

    public byte[] generateTimeSeriesCsv(List<TimeSeriesPointDto> dataPoints) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out);

        // CSV Header
        writer.println("Date,Plays,Unique_Listeners,Skips,Saves");

        // CSV Rows
        for (TimeSeriesPointDto point : dataPoints) {
            writer.printf("%s,%d,%d,%d,%d%n",
                    point.timestamp().toLocalDate().toString(),
                    point.plays(),
                    point.uniqueListeners(),
                    point.skips(),
                    point.likes()
            );
        }

        writer.flush();
        return out.toByteArray();
    }
}