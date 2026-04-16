package com.indiestream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class IndiestreamApplication {

    public static void main(String[] args) {
        SpringApplication.run(IndiestreamApplication.class, args);
    }

}
