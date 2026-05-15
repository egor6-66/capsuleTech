package io.scriber.webstorm.settings

import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.util.xmlb.XmlSerializerUtil

@Service(Service.Level.APP)
@State(
    name = "CapsuleAgentSettings",
    storages = [Storage("capsule-agent.xml")]
)
class ScriberSettings : PersistentStateComponent<ScriberSettings.State> {

    data class State(
        // Vite dev server of apps/agent — supports HMR over WebSocket.
        var chatUrl: String = "http://localhost:2234",
        // capsule-server (Rust) — talks to Ollama.
        var engineUrl: String = "http://127.0.0.1:8787"
    )

    private var state = State()

    override fun getState(): State = state

    override fun loadState(newState: State) {
        XmlSerializerUtil.copyBean(newState, state)
    }

    companion object {
        val instance: ScriberSettings
            get() = ApplicationManager.getApplication().getService(ScriberSettings::class.java)
    }
}
