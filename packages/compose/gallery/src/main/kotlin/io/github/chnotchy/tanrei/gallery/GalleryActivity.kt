package io.github.chnotchy.tanrei.gallery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

/** Opens the fixture gallery: `./gradlew :gallery:installDebug`, then launch "Tanrei Gallery". */
class GalleryActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val specs = loadGallerySpecs(this)
        setContent { Gallery(specs) }
    }
}
