package com.indiestream;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import org.springframework.modulith.docs.Documenter;

class ModulithDocumentationTest {

    ApplicationModules modules = ApplicationModules.of(IndiestreamApplication.class);

    @Test
    void verifyAndGenerateDocumentation() {
        modules.verify();

        new Documenter(modules)
                .writeModulesAsPlantUml()
                .writeIndividualModulesAsPlantUml();
    }
}