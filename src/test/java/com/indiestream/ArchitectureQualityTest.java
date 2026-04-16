package com.indiestream;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.indiestream", importOptions = ImportOption.DoNotIncludeTests.class)
public class ArchitectureQualityTest {

    @ArchTest
    static final ArchRule controllersShouldNotAccessRepositoriesDirectly =
            noClasses()
                    .that().resideInAPackage("..controller..")
                    .should().dependOnClassesThat().resideInAPackage("..repository..")
                    .because("Controllers must delegate data access to Services to maintain Clean Architecture.");

    @ArchTest
    static final ArchRule domainShouldNotDependOnDto =
            noClasses()
                    .that().resideInAPackage("..domain..")
                    .should().dependOnClassesThat().resideInAPackage("..dto..")
                    .because("Domain model should be isolated and not know about data transfer objects.");
}