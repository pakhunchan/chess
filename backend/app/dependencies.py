from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from firebase_admin import auth as firebase_auth

from .database import get_db
from .models import User
from .services.firebase_auth import verify_token


async def get_current_user_optional(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    """Get the current user from the Authorization header, if present.

    - If no Authorization header: returns None (guest mode)
    - If valid token: returns User (creates user if first time)
    - If invalid/expired token: raises 401

    Args:
        authorization: The Authorization header value (e.g., "Bearer <token>")
        db: Database session

    Returns:
        User object if authenticated, None if guest

    Raises:
        HTTPException 401: If token is present but invalid
    """
    if not authorization:
        return None

    # Extract token from "Bearer <token>"
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

    token = parts[1]

    try:
        decoded = verify_token(token)
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(status_code=401, detail="Token expired")
    except firebase_auth.RevokedIdTokenError:
        raise HTTPException(status_code=401, detail="Token revoked")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

    # Get or create user
    firebase_uid = decoded["uid"]
    user = db.query(User).filter(User.firebase_uid == firebase_uid).first()

    if not user:
        # Create new user
        user = User(
            firebase_uid=firebase_uid,
            email=decoded.get("email"),
            username=decoded.get("username"),  # Capture username if present in claims
            display_name=decoded.get("name"),
            photo_url=decoded.get("picture"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


async def get_current_user_required(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    """Get the current user, requiring authentication.

    Raises:
        HTTPException 401: If not authenticated
    """
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user
