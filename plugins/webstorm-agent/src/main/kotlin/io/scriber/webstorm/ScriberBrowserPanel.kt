package io.scriber.webstorm

import com.intellij.openapi.Disposable
import com.intellij.openapi.util.Disposer
import com.intellij.ui.jcef.JBCefApp
import com.intellij.ui.jcef.JBCefBrowser
import java.awt.BorderLayout
import javax.swing.JLabel
import javax.swing.JPanel
import javax.swing.SwingConstants

class ScriberBrowserPanel(url: String) : JPanel(BorderLayout()), Disposable {

    private val browser: JBCefBrowser? = if (JBCefApp.isSupported()) {
        JBCefBrowser.createBuilder()
            .setUrl(url)
            .build()
            .also {
                Disposer.register(this, it)
                add(it.component, BorderLayout.CENTER)
            }
    } else {
        add(unsupportedRuntimeMessage(), BorderLayout.CENTER)
        null
    }

    fun loadUrl(url: String) {
        browser?.loadURL(url)
    }

    override fun dispose() = Unit

    private fun unsupportedRuntimeMessage(): JLabel = JLabel(
        """
        <html><body style='padding: 16px;'>
        JCEF is not available in this IDE runtime.<br>
        Switch to the JetBrains Runtime with JCEF enabled to use Scriber.
        </body></html>
        """.trimIndent(),
        SwingConstants.CENTER
    )
}
