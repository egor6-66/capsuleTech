"""Profile + members surface — /community/* (ADR 071 D3).

`GET /community/profile` auto-creates an empty profile on first access (nick =
auth login). Writes require a member; member-cards and single profiles are
public (guest-readable — an avatar in any app's header is fetched here).
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session as DbSession

from .. import repo, storage
from ..clients.auth import AuthUser, current_user
from ..db import get_db
from ..schemas import MemberOut, ProfileOut, ProfileUpdate

router = APIRouter(prefix="/community", tags=["profile"])

DbDep = Annotated[DbSession, Depends(get_db)]
Member = Annotated[AuthUser, Depends(current_user)]


def _profile_out(profile) -> ProfileOut:
    return ProfileOut(
        user_id=profile.user_id,
        nick=profile.nick,
        bio=profile.bio,
        avatar_url=storage.media_url(profile.avatar_key),
        contacts=profile.contacts or {},
        created_at=profile.created_at,
    )


def _member_out(profile) -> MemberOut:
    return MemberOut(
        user_id=profile.user_id,
        nick=profile.nick,
        avatar_url=storage.media_url(profile.avatar_key),
    )


@router.get("/profile", response_model=ProfileOut)
def get_own_profile(user: Member, db: DbDep) -> ProfileOut:
    profile = repo.get_or_create_profile(db, user_id=user.id, default_nick=user.login)
    return _profile_out(profile)


@router.put("/profile", response_model=ProfileOut)
def update_own_profile(body: ProfileUpdate, user: Member, db: DbDep) -> ProfileOut:
    profile = repo.get_or_create_profile(db, user_id=user.id, default_nick=user.login)
    try:
        profile = repo.update_profile(
            db, profile, nick=body.nick, bio=body.bio, contacts=body.contacts
        )
    except repo.NickTaken as exc:
        raise HTTPException(status_code=409, detail="nick already taken") from exc
    return _profile_out(profile)


@router.post("/profile/avatar", response_model=ProfileOut)
async def upload_avatar(file: UploadFile, user: Member, db: DbDep) -> ProfileOut:
    if not storage.storage_configured():
        raise HTTPException(status_code=503, detail="storage not configured")

    content_type = file.content_type or ""
    if content_type not in storage.ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=415, detail="unsupported image type")

    data = await file.read()
    if len(data) > storage.MAX_AVATAR_BYTES:
        raise HTTPException(status_code=413, detail="avatar too large")

    key = storage.put_avatar(user_id=user.id, data=data, content_type=content_type)
    profile = repo.get_or_create_profile(db, user_id=user.id, default_nick=user.login)
    profile = repo.set_avatar_key(db, profile, avatar_key=key)
    return _profile_out(profile)


@router.get("/profiles/{user_id}", response_model=ProfileOut)
def get_profile(user_id: int, db: DbDep) -> ProfileOut:
    profile = repo.get_profile(db, user_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return _profile_out(profile)


@router.get("/members", response_model=list[MemberOut])
def list_members(
    db: DbDep,
    limit: int = 100,
    offset: int = 0,
) -> list[MemberOut]:
    return [_member_out(p) for p in repo.list_members(db, limit=limit, offset=offset)]
