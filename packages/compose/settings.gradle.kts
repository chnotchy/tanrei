pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "tanrei-compose"
include(":tanrei")
// The fixture gallery: an app for looking at the components on a device, and the home of the instrumented tests.
// Never published.
include(":gallery")
