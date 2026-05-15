package io.scriber.webstorm.settings

import com.intellij.openapi.options.Configurable
import com.intellij.ui.components.JBTextField
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

class ScriberSettingsConfigurable : Configurable {

    private val chatUrlField = JBTextField()
    private val engineUrlField = JBTextField()
    private var panel: JPanel? = null

    override fun getDisplayName(): String = "Capsule Agent"

    override fun createComponent(): JComponent {
        val state = ScriberSettings.instance.state
        chatUrlField.text = state.chatUrl
        engineUrlField.text = state.engineUrl

        val built = FormBuilder.createFormBuilder()
            .addLabeledComponent("Web UI URL (apps/agent dev server):", chatUrlField, 1, false)
            .addLabeledComponent("Engine URL (capsule-server):", engineUrlField, 1, false)
            .addComponentFillVertically(JPanel(), 0)
            .panel

        panel = built
        return built
    }

    override fun isModified(): Boolean {
        val state = ScriberSettings.instance.state
        return chatUrlField.text != state.chatUrl ||
            engineUrlField.text != state.engineUrl
    }

    override fun apply() {
        val state = ScriberSettings.instance.state
        state.chatUrl = chatUrlField.text
        state.engineUrl = engineUrlField.text
    }

    override fun reset() {
        val state = ScriberSettings.instance.state
        chatUrlField.text = state.chatUrl
        engineUrlField.text = state.engineUrl
    }

    override fun disposeUIResources() {
        panel = null
    }
}
