from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import User
from ..schemas import RegisterRequest
from ..dependencies import get_current_user_required

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/check-username")
def check_username(
    username: str = Query(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$"),
    db: Session = Depends(get_db)
):
    """Check if a username is available. Returns 200 if available, 409 if taken."""
    exists = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if exists:
        raise HTTPException(status_code=409, detail="Username already taken")
    return {"available": True}


@router.get("/lookup-email")
def lookup_email(
    username: str = Query(..., min_length=3),
    db: Session = Depends(get_db)
):
    """Lookup email by username to facilitate username-based login."""
    user = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if not user or not user.email:
        # Don't reveal exactly why it failed to prevent enumeration, or return 404
        # For a chess app MVP, 404 is fine
        raise HTTPException(status_code=404, detail="Username not found")
    
    return {"email": user.email}


@router.post("/register")
def register_user(
    request: RegisterRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """
    Complete registration by setting the username for the authenticated user.
    The user is created by the dependency if they don't exist (from Firebase token),
    but the username needs to be explicitly set.
    """
    if current_user.username:
        raise HTTPException(status_code=409, detail="User already has a username")

    # Check availability again to be safe
    exists = db.query(User).filter(func.lower(User.username) == request.username.lower()).first()
    if exists:
         raise HTTPException(status_code=409, detail="Username already taken")

    current_user.username = request.username
    db.commit()
    db.refresh(current_user)

    return {"status": "success", "username": current_user.username}
