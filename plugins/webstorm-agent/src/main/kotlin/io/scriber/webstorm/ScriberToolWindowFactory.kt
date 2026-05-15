package io.scriber.webstorm

import com.intellij.openapi.project.Project
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import io.scriber.webstorm.settings.ScriberSettings

class ScriberToolWindowFactory : ToolWindowFactory {
    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val state = ScriberSettings.instance.state
        val factory = ContentFactory.getInstance()

        val chatPanel = ScriberBrowserPanel(state.chatUrl)
        toolWindow.contentManager.addContent(
            factory.createContent(chatPanel, "Chat", false)
        )
    }

    override fun shouldBeAvailable(project: Project): Boolean = true
}
