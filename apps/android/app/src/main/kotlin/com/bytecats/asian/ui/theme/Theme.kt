package com.bytecats.asian.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Brand = Color(0xFFF5A623)
private val BrandDark = Color(0xFF1B1F3B)

private val LightColors =
    lightColorScheme(
        primary = Brand,
        secondary = BrandDark,
    )

private val DarkColors =
    darkColorScheme(
        primary = Brand,
        secondary = BrandDark,
    )

@Composable
fun AsianTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    MaterialTheme(colorScheme = colorScheme, content = content)
}
