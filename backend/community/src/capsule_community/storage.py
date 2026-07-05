"""Avatar media — MinIO/S3 upload + public URL building (ADR 071 D3/D5).

The DB stores only the object key; the browser reaches media through a stable
`/media/avatars/<key>` prefix (the gateway maps that route to MinIO — architect
zone). The service only builds the path and, when configured, uploads bytes.

Storage is OPT-IN: without `S3_*` env `storage_configured()` is False and the
avatar endpoint answers 503 (the MinIO container arrives from architect next).
`minio` is a lazy import (optional `storage` extra) so the core service and its
tests never require it.
"""

from __future__ import annotations

import io

from .config import settings

AVATAR_BUCKET = "avatars"
MEDIA_AVATAR_PREFIX = "/media/avatars/"

# multipart avatar limits (ADR 071 D3).
ALLOWED_AVATAR_TYPES: dict[str, str] = {
    "image/webp": "webp",
    "image/png": "png",
    "image/jpeg": "jpg",
}
MAX_AVATAR_BYTES = 5 * 1024 * 1024  # 5 MiB


def media_url(avatar_key: str | None) -> str | None:
    """Public URL the frontend uses for an avatar (constant prefix + key)."""
    return f"{MEDIA_AVATAR_PREFIX}{avatar_key}" if avatar_key else None


def storage_configured() -> bool:
    return bool(settings.s3_url and settings.s3_access_key and settings.s3_secret_key)


def _endpoint(url: str) -> str:
    # MinIO's SDK wants a bare host:port, not a scheme; secure flag carries TLS.
    return url.removeprefix("https://").removeprefix("http://").rstrip("/")


def _client():
    """Lazily construct the MinIO client. Caller must check storage_configured()."""
    from minio import Minio  # optional `storage` extra, imported only when used

    return Minio(
        _endpoint(settings.s3_url),
        access_key=settings.s3_access_key,
        secret_key=settings.s3_secret_key,
        secure=settings.s3_secure,
    )


def put_avatar(*, user_id: int, data: bytes, content_type: str) -> str:
    """Upload avatar bytes to the public-read `avatars` bucket; return the object
    key stored in `profiles.avatar_key`. Caller guarantees storage_configured()
    and a validated `content_type`."""
    client = _client()
    if not client.bucket_exists(AVATAR_BUCKET):
        client.make_bucket(AVATAR_BUCKET)

    ext = ALLOWED_AVATAR_TYPES[content_type]
    key = f"{user_id}.{ext}"
    client.put_object(
        AVATAR_BUCKET,
        key,
        io.BytesIO(data),
        length=len(data),
        content_type=content_type,
    )
    return key
