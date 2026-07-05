"""Persistent voice tier — MinIO/S3 object store (ADR 076).

Curated synthesis (words / accepted phrases) is static: synthesize once, store
in MinIO, serve forever. Dynamic synthesis stays in the in-memory LRU only and
never touches this module.

The store is **best-effort**: every operation swallows its own errors (MinIO
down, timeout, missing bucket) and logs a warning, so `/voice/speak` never
returns 5xx because of storage — the endpoint falls through to LRU + synthesis.
A not-found object is a normal `None`/`False`, not an error.

Layout: ``voice/<kind>/<engine>/<sha>.wav`` where ``sha`` is the canonical
synthesis hash (includes ``VOICE_MODEL_VERSION``, see api._digest).
"""

from __future__ import annotations

import logging
import threading

from .config import settings

log = logging.getLogger("capsule_voice.storage")

_client = None
_client_lock = threading.Lock()
_disabled = False  # set once when no endpoint is configured (tier off)


def key(kind: str, engine: str, sha: str) -> str:
    """Object key for a synthesized clip."""
    return f"voice/{kind}/{engine}/{sha}.wav"


def _get_client():
    """Lazily build the MinIO client (once). Returns None if the tier is off.

    A missing endpoint disables the tier permanently. A transient init failure
    (network) returns None without latching, so a later request can retry.
    """
    global _client, _disabled
    if _disabled:
        return None
    if _client is not None:
        return _client
    with _client_lock:
        if _client is not None or _disabled:
            return _client
        if not settings.minio_endpoint:
            _disabled = True
            return None
        try:
            from minio import Minio

            client = Minio(
                settings.minio_endpoint,
                access_key=settings.minio_access_key,
                secret_key=settings.minio_secret_key,
                secure=settings.minio_secure,
            )
            if not client.bucket_exists(settings.minio_bucket):
                client.make_bucket(settings.minio_bucket)
        except Exception as exc:  # noqa: BLE001 — best-effort tier, degrade gracefully
            log.warning("MinIO init failed, persist tier degraded: %s", exc)
            return None
        _client = client
        return _client


def get(obj_key: str) -> bytes | None:
    """Fetch WAV bytes, or None if absent / tier off / any error."""
    client = _get_client()
    if client is None:
        return None
    try:
        from minio.error import S3Error

        try:
            resp = client.get_object(settings.minio_bucket, obj_key)
        except S3Error as exc:
            if exc.code in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
                return None
            raise
        try:
            return resp.read()
        finally:
            resp.close()
            resp.release_conn()
    except Exception as exc:  # noqa: BLE001 — never raise to the caller
        log.warning("MinIO get(%s) failed: %s", obj_key, exc)
        return None


def put(obj_key: str, data: bytes) -> None:
    """Store WAV bytes. Best-effort — errors are logged and swallowed."""
    client = _get_client()
    if client is None:
        return
    try:
        import io

        client.put_object(
            settings.minio_bucket,
            obj_key,
            io.BytesIO(data),
            length=len(data),
            content_type="audio/wav",
        )
    except Exception as exc:  # noqa: BLE001 — never raise to the caller
        log.warning("MinIO put(%s) failed: %s", obj_key, exc)


def exists(obj_key: str) -> bool:
    """True if the object is present. False on absence / tier off / any error."""
    client = _get_client()
    if client is None:
        return False
    try:
        from minio.error import S3Error

        try:
            client.stat_object(settings.minio_bucket, obj_key)
            return True
        except S3Error as exc:
            if exc.code in {"NoSuchKey", "NoSuchObject", "NoSuchBucket"}:
                return False
            raise
    except Exception as exc:  # noqa: BLE001 — never raise to the caller
        log.warning("MinIO stat(%s) failed: %s", obj_key, exc)
        return False
