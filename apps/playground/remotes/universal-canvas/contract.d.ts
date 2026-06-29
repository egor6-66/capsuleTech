// generated contract artifact (ADR 060 Phase 1) — do not edit
export interface InEvents {
  "ping": {
    "value": string;
    "ts": number;
  };
  "setComposition": {
    "schema": {
      "components": {
        "root": string;
        "nodes": Record<string, never>;
      };
    };
  };
}

export interface OutEvents {
  "canvasClick": {
    "value": string;
    "ts": number;
  };
}
