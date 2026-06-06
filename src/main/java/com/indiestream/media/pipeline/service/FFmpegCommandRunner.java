package com.indiestream.media.pipeline.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * Utility for executing OS-level FFmpeg/FFprobe binaries.
 * Implements strict stream handling to prevent OS buffer deadlocks and enforces hard timeouts.
 */
@Slf4j
@Component
public class FFmpegCommandRunner {

    private static final long DEFAULT_TIMEOUT_MINUTES = 5;

    /**
     * Executes a process, capturing its output asynchronously.
     *
     * @param command The OS command and its arguments.
     * @return The standard output/error of the process.
     * @throws RuntimeException If the process fails, times out, or returns a non-zero exit code.
     */
    public String run(String... command) {
        Process process = null;
        try {
            if (log.isDebugEnabled()) {
                log.debug("Executing native command: {}", Arrays.toString(command));
            }

            ProcessBuilder processBuilder = new ProcessBuilder(command);
            // Redirect error stream to input stream to capture all output in one pipe
            processBuilder.redirectErrorStream(true);

            process = processBuilder.start();
            Process finalProcess = process;

            // Consume the stream asynchronously to prevent the OS buffer from filling up and deadlocking the FFmpeg process
            CompletableFuture<String> outputFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return new String(finalProcess.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                } catch (IOException e) {
                    log.error("Failed to read process output stream", e);
                    return "";
                }
            });

            // Enforce time bounding
            boolean finished = process.waitFor(DEFAULT_TIMEOUT_MINUTES, TimeUnit.MINUTES);

            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("Process timed out after " + DEFAULT_TIMEOUT_MINUTES + " minutes: " + Arrays.toString(command));
            }

            String output = outputFuture.join();

            if (process.exitValue() != 0) {
                log.error("Command failed with exit code {}. Output: {}", process.exitValue(), output);
                throw new RuntimeException("Command execution failed. Exit code: " + process.exitValue());
            }

            return output;

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            if (process != null) {
                process.destroyForcibly();
            }
            throw new RuntimeException("Command execution was interrupted", e);
        } catch (IOException e) {
            throw new RuntimeException("Failed to start process", e);
        }
    }
}