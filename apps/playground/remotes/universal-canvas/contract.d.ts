// generated contract artifact (ADR 060 Phase 1) — do not edit
export interface InEvents {
  "setMarkers": {
    "markers": {
      "id": string;
      "lat": number;
      "lng": number;
    }[];
  };
}

export interface OutEvents {
  "mounted": {
    "name": string;
    "ts": number;
  };
}
