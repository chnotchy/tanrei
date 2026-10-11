plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

// The fixture gallery (never published): every fixture of every component spec, under every shipped design system,
// with theme and contrast switches — and the instrumented tests that need a real device (the Accessibility Test
// Framework sees Compose's accessibility nodes only there).
//
// The fixtures are NOT copied by hand: the component specs are packaged as assets and read at runtime.
abstract class CopyComponentSpecs : DefaultTask() {
    @get:InputFiles
    @get:PathSensitive(PathSensitivity.NAME_ONLY)
    abstract val specs: ConfigurableFileCollection

    @get:OutputDirectory
    abstract val output: DirectoryProperty

    @TaskAction
    fun copy() {
        val target = output.get().asFile.resolve("specs")
        target.deleteRecursively()
        target.mkdirs()
        specs.forEach { it.copyTo(target.resolve(it.name)) }
    }
}

val copyComponentSpecs = tasks.register<CopyComponentSpecs>("copyComponentSpecs") {
    specs.from(fileTree(rootDir.resolve("../../specs")) { include("*.spec.json") })
}

androidComponents {
    onVariants { variant -> variant.sources.assets?.addGeneratedSourceDirectory(copyComponentSpecs, CopyComponentSpecs::output) }
}

android {
    namespace = "io.github.chnotchy.tanrei.gallery"
    compileSdk = 37

    defaultConfig {
        applicationId = "io.github.chnotchy.tanrei.gallery"
        minSdk = 23
        targetSdk = 37
        versionCode = 1
        versionName = "0.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform(libs.compose.bom)
    implementation(composeBom)
    // Only the library's PUBLIC surface: the gallery is its first consumer outside the module.
    implementation(project(":tanrei"))
    implementation(libs.activity.compose)

    androidTestImplementation(composeBom)
    androidTestImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.compose.ui.test.junit4)
    androidTestImplementation(libs.compose.ui.test.junit4.accessibility)
    debugImplementation(libs.compose.ui.test.manifest)
}
