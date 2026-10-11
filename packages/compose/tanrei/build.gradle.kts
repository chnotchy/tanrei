plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.roborazzi)
    alias(libs.plugins.maven.publish)
}

// Coordinates (GROUP, POM_ARTIFACT_ID, VERSION_NAME) come from gradle.properties.
// Publishing is a human decision: never run publish tasks from automation.
mavenPublishing {
    pom {
        name.set("Tanrei for Jetpack Compose")
        description.set("Tanrei design system components and tokens for Jetpack Compose.")
        licenses {
            license {
                name.set("Apache-2.0")
                url.set("https://www.apache.org/licenses/LICENSE-2.0.txt")
            }
        }
    }
}

android {
    namespace = "io.github.chnotchy.tanrei"
    compileSdk = 37

    defaultConfig {
        minSdk = 23
        consumerProguardFiles("consumer-rules.pro")
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            all { test ->
                test.systemProperty("robolectric.pixelCopyRenderMode", "hardware")
                test.maxHeapSize = "2g"
            }
        }
    }
}

kotlin {
    // Everything public is declared public: the surface is what the spec's `platforms.compose` block and the
    // README document, nothing more. The generated token files declare their visibility too (emit/kotlin.js).
    explicitApi()
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

roborazzi {
    // Baselines live next to the tests; the parity checker expects
    // src/test/snapshots/<component>/<fixture-id>.png.
    outputDir.set(layout.projectDirectory.dir("src/test/snapshots"))
    compare {
        outputDir.set(layout.buildDirectory.dir("outputs/roborazzi"))
    }
}

// Snapshot fixtures are read from the component specs: make them a test input so edits re-run tests.
tasks.withType<Test>().configureEach {
    inputs.files(fileTree(rootDir.resolve("../../specs")) { include("*.spec.json") })
        .withPropertyName("componentSpecs")
        .withPathSensitivity(PathSensitivity.RELATIVE)
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    api(libs.compose.runtime)
    api(libs.compose.ui)
    api(libs.compose.foundation)
    implementation(libs.compose.animation)

    testImplementation(composeBom)
    testImplementation(libs.junit)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.compose.ui.test.junit4)
    testImplementation(libs.compose.ui.test.junit4.accessibility)
    testImplementation(libs.roborazzi)
    debugImplementation(libs.compose.ui.test.manifest)
}
